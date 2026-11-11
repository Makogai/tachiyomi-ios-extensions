// Builds every extension under src/<lang>/<name>/ into dist/<pkg>.js, copies its icon.png to
// dist/icon/<pkg>.png (as keiyoushi publishes icons) and writes dist/index.json.
//
// Usage: node scripts/build.mjs [pkg ...]   (no arguments builds everything)
import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import * as esbuild from "esbuild";
import { generateId } from "./source-id.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const srcDir = path.join(root, "src");
const distDir = path.join(root, "dist");

async function findExtensions() {
  const found = [];
  for (const lang of await readdir(srcDir)) {
    const langDir = path.join(srcDir, lang);
    if (!(await stat(langDir)).isDirectory()) continue;
    for (const name of await readdir(langDir)) {
      const dir = path.join(langDir, name);
      try {
        await stat(path.join(dir, "extension.json"));
        found.push({ pkg: `${lang}.${name}`, dir });
      } catch {
        // Not an extension folder.
      }
    }
  }
  return found.sort((a, b) => a.pkg.localeCompare(b.pkg));
}

/** Loads a built bundle with a stub host and returns what each source says about itself. */
function describeSources(code, pkg) {
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

async function build(extension) {
  const meta = JSON.parse(await readFile(path.join(extension.dir, "extension.json"), "utf8"));
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
    alias: { "@sdk": path.join(root, "sdk/src/index.ts") },
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

const only = process.argv.slice(2);
const extensions = (await findExtensions()).filter((extension) => only.length === 0 || only.includes(extension.pkg));
if (only.length === 0) await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

const index = [];
for (const extension of extensions) {
  const entry = await build(extension);
  index.push(entry);
  console.log(`built ${entry.pkg} v${entry.versionName} (${entry.sources.length} source${entry.sources.length === 1 ? "" : "s"})`);
}
if (only.length === 0) {
  await writeFile(path.join(distDir, "index.json"), JSON.stringify(index, null, 2) + "\n");
  console.log(`wrote dist/index.json with ${index.length} extension(s)`);
}
