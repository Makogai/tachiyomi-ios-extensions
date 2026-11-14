// Bundles extensions with esbuild into dist/<pkg>.js, copies icons to dist/icon/<pkg>.png and
// builds the index entries the apps read (fields must stay as they are: see docs/ARCHITECTURE.md).
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import * as esbuild from "esbuild";
import { distDir, findExtensions, readMeta, root } from "./extensions.mjs";
import { generateId } from "../source-id.mjs";

/** Loads a built bundle with a stub host and returns what each source says about itself. */
export function describeSources(code, pkg) {
  const stubHost = {
    apiLevel: 1,
    prefGet: () => null,
    prefSet: () => {},
    log: () => {},
  };
  const sandbox = { __host: stubHost };
  vm.createContext(sandbox);
  vm.runInContext(`${code}\n;globalThis.__result = __extension.default;`, sandbox, { filename: `${pkg}.js` });
  const exported = sandbox.__result;
  if (!exported || !Array.isArray(exported.sources)) throw new Error(`${pkg}: no default defineExtension(...) export`);
  return { api: exported.api, sources: exported.sources.map((_, index) => JSON.parse(exported.describe(index))) };
}

/** Copies src/<lang>/<name>/icon.png to dist/icon/<pkg>.png; returns its path relative to the index. */
async function copyIcon(extension) {
  const source = path.join(extension.dir, "icon.png");
  try {
    await stat(source);
  } catch {
    console.warn(`${extension.pkg}: no icon.png`);
    return undefined;
  }
  const relative = `icon/${extension.pkg}.png`;
  await mkdir(path.join(distDir, "icon"), { recursive: true });
  await copyFile(source, path.join(distDir, relative));
  return relative;
}

/** Bundles one extension and returns its index entry. */
export async function buildExtension(extension) {
  const meta = readMeta(extension);
  const outfile = path.join(distDir, `${extension.pkg}.js`);
  await esbuild.build({
    entryPoints: [path.join(extension.dir, "index.ts")],
    outfile,
    bundle: true,
    format: "iife",
    globalName: "__extension",
    target: "es2020",
    platform: "neutral",
    charset: "utf8",
    legalComments: "none",
    absWorkingDir: root,
    // "@sdk" and "@sdk/themes/<name>" resolve through tsconfig.json's paths.
    tsconfig: path.join(root, "tsconfig.json"),
    banner: { js: `// ${meta.name} ${meta.versionCode} for tachiyomi-ios. Ported from keiyoushi/extensions-source (Apache-2.0).` },
    logLevel: "warning",
  });
  const code = await readFile(outfile);
  const { api, sources } = describeSources(code.toString("utf8"), extension.pkg);
  const icon = await copyIcon(extension);
  return {
    name: meta.name,
    pkg: extension.pkg,
    versionCode: meta.versionCode,
    versionName: `${api}.${meta.versionCode}`,
    lang: meta.lang,
    nsfw: Boolean(meta.nsfw),
    api,
    file: `${extension.pkg}.js`,
    sha256: createHash("sha256").update(code).digest("hex"),
    ...(icon ? { icon } : {}),
    sources: sources.map((source) => ({
      name: source.name,
      lang: source.lang,
      id: source.id ?? generateId(source.name, source.lang, source.versionId ?? 1),
      baseUrl: source.baseUrl,
    })),
  };
}

/**
 * Builds `only` (package names), or everything. A full build clears dist/ and writes
 * dist/index.json; a partial one only replaces those bundles.
 */
export async function build(only = [], { quiet = false } = {}) {
  const extensions = findExtensions().filter((extension) => only.length === 0 || only.includes(extension.pkg));
  const unknown = only.filter((pkg) => !extensions.some((extension) => extension.pkg === pkg));
  if (unknown.length) throw new Error(`Unknown extension(s): ${unknown.join(", ")}`);
  if (only.length === 0) await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  const index = [];
  for (const extension of extensions) {
    const entry = await buildExtension(extension);
    index.push(entry);
    if (!quiet) console.log(`built ${entry.pkg} v${entry.versionName} (${entry.sources.length} source${entry.sources.length === 1 ? "" : "s"})`);
  }
  if (only.length === 0) {
    await writeFile(path.join(distDir, "index.json"), JSON.stringify(index, null, 2) + "\n");
    if (!quiet) console.log(`wrote dist/index.json with ${index.length} extension(s)`);
  }
  return index;
}
