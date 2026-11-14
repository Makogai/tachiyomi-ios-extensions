// Bumps versionCode in extension.json.
//
//   npm run bump -- <ext> [<ext> …]    those extensions
//   npm run bump -- --changed          every extension whose built script differs from the
//                                      published one at the same versionCode (what validate flags)
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { build } from "./lib/build.mjs";
import { findExtensions, resolveExtension, root } from "./lib/extensions.mjs";

const { values: options, positionals } = parseArgs({ allowPositionals: true, options: { changed: { type: "boolean", default: false }, published: { type: "string" } } });

let targets = positionals.map(resolveExtension);
const publishedVersion = new Map();
if (options.changed) {
  const repo = process.env.GITHUB_REPOSITORY ?? /github\.com[:/]([^/]+\/[^/.]+)/.exec(readFileSync(path.join(root, ".git/config"), "utf8"))?.[1];
  const source = options.published ?? `https://raw.githubusercontent.com/${repo}/repo/index.json`;
  const published = /^https?:/.test(source) ? await (await fetch(source)).json() : JSON.parse(readFileSync(source, "utf8"));
  const index = await build([], { quiet: true });
  const changed = index.filter((entry) => {
    const old = published.find((candidate) => candidate.pkg === entry.pkg);
    if (old) publishedVersion.set(entry.pkg, old.versionCode);
    return old && old.sha256 !== entry.sha256 && old.versionCode >= entry.versionCode;
  });
  targets = findExtensions().filter((extension) => changed.some((entry) => entry.pkg === extension.pkg));
}
if (targets.length === 0) {
  console.log("Nothing to bump.");
  process.exit(0);
}
for (const extension of targets) {
  const file = path.join(extension.dir, "extension.json");
  const text = readFileSync(file, "utf8");
  const meta = JSON.parse(text);
  const next = Math.max(meta.versionCode, publishedVersion.get(extension.pkg) ?? 0) + 1;
  writeFileSync(file, text.replace(/("versionCode"\s*:\s*)\d+/, `$1${next}`));
  console.log(`${extension.pkg}: versionCode ${meta.versionCode} -> ${next}`);
}
