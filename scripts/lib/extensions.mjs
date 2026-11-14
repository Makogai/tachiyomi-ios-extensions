// Finding extensions and reading their files. Shared by every script.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const srcDir = path.join(root, "src");
export const distDir = path.join(root, "dist");
export const themesDir = path.join(root, "sdk/themes");

/** Every `src/<lang>/<name>/` with an extension.json, sorted by package name. */
export function findExtensions() {
  const found = [];
  for (const lang of readdirSync(srcDir)) {
    const langDir = path.join(srcDir, lang);
    if (!statSync(langDir).isDirectory()) continue;
    for (const name of readdirSync(langDir)) {
      const dir = path.join(langDir, name);
      if (existsSync(path.join(dir, "extension.json"))) found.push({ pkg: `${lang}.${name}`, lang, name, dir });
    }
  }
  return found.sort((a, b) => a.pkg.localeCompare(b.pkg));
}

/**
 * Resolves what a person typed (`en.mangahere`, `mangahere`, `src/en/mangahere`) to one extension.
 * Throws with the close matches when it is ambiguous or unknown.
 */
export function resolveExtension(query) {
  const all = findExtensions();
  const cleaned = query.replace(/\/+$/, "").replace(/^(\.\/)?src\//, "").replace("/", ".");
  const exact = all.find((extension) => extension.pkg === cleaned);
  if (exact) return exact;
  const byName = all.filter((extension) => extension.name === cleaned);
  if (byName.length === 1) return byName[0];
  const similar = all.filter((extension) => extension.pkg.includes(cleaned)).map((extension) => extension.pkg);
  throw new Error(
    byName.length > 1
      ? `'${query}' is ambiguous: ${byName.map((extension) => extension.pkg).join(", ")}`
      : `No extension '${query}'.${similar.length ? ` Did you mean ${similar.join(", ")}?` : ""}`,
  );
}

export function readJSON(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function readMeta(extension) {
  return readJSON(path.join(extension.dir, "extension.json"));
}

/** tests.json, or an empty spec when there is none. */
export function readTests(extension) {
  const file = path.join(extension.dir, "tests.json");
  if (!existsSync(file)) return { routes: [], cases: [], live: [] };
  const spec = readJSON(file);
  return { routes: spec.routes ?? [], cases: spec.cases ?? [], live: spec.live ?? [] };
}

/** The theme an extension builds on, from its `@sdk/themes/<name>` import, or null. */
export function themeOf(extension) {
  const files = readdirSync(extension.dir).filter((file) => file.endsWith(".ts"));
  for (const file of files) {
    const match = /from\s+["']@sdk\/themes\/([\w-]+)["']/.exec(readFileSync(path.join(extension.dir, file), "utf8"));
    if (match) return match[1];
  }
  return null;
}
