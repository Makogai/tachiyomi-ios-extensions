// Which ports are behind keiyoushi: compares each extension's recorded upstream commit (and its
// theme's) with upstream's newest commit for those paths. Read-only, unauthenticated GitHub API
// (60 requests an hour), or a local checkout when KEIYOUSHI_DIR (or ../extensions-source) exists.
//
//   npm run upstream [-- <ext> …]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { findExtensions, readMeta, resolveExtension, themeOf, themesDir } from "./lib/extensions.mjs";
import { compareUrl, latestCommit, localCheckout } from "./lib/upstream.mjs";

const positionals = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const extensions = positionals.length ? positionals.map(resolveExtension) : findExtensions();
const checkout = process.argv.includes("--github") ? null : localCheckout();

if (checkout) {
  try {
    execFileSync("git", ["-C", checkout, "fetch", "-q", "origin"], { stdio: "ignore" });
  } catch {
    console.log(`(could not fetch ${checkout}; comparing with what it has)`);
  }
}

/** Upstream commits after `base` touching `paths`, newest first: [{sha, date, message}]. */
async function newerCommits(base, paths) {
  if (checkout) {
    const out = execFileSync("git", ["-C", checkout, "log", "--format=%h%x09%cs%x09%s", `${base}..origin/main`, "--", ...paths], { encoding: "utf8" }).trim();
    return out ? out.split("\n").map((line) => {
      const [sha, date, message] = line.split("\t");
      return { sha, date, message };
    }) : [];
  }
  const latest = await latestCommit(paths);
  if (!latest || latest.sha.startsWith(base)) return [];
  return [{ sha: latest.sha.slice(0, 8), date: latest.date.slice(0, 10), message: `${latest.message} (newest; see the compare link for all)` }];
}

const behind = [];
for (const extension of extensions) {
  const meta = readMeta(extension);
  if (!meta.upstream?.path) {
    console.log(`${extension.pkg.padEnd(22)} no upstream recorded`);
    continue;
  }
  const theme = themeOf(extension);
  const themeUpstream = theme ? JSON.parse(readFileSync(path.join(themesDir, theme, "theme.json"), "utf8")) : null;
  const paths = [meta.upstream.path, ...(themeUpstream ? [themeUpstream.upstream] : [])];
  try {
    const commits = await newerCommits(meta.upstream.commit, [meta.upstream.path]);
    const themeCommits = themeUpstream ? await newerCommits(themeUpstream.commit, [themeUpstream.upstream]) : [];
    if (commits.length === 0 && themeCommits.length === 0) {
      console.log(`${extension.pkg.padEnd(22)} up to date (${meta.upstream.commit})`);
      continue;
    }
    behind.push(extension.pkg);
    console.log(`${extension.pkg.padEnd(22)} BEHIND`);
    for (const commit of commits) console.log(`    ${commit.sha} ${commit.date} ${commit.message}`);
    if (commits.length) console.log(`    diff: ${compareUrl(meta.upstream.commit)} (files under ${meta.upstream.path})`);
    if (themeCommits.length) {
      console.log(`    theme ${theme} (sdk/themes/${theme}, ported at ${themeUpstream.commit}):`);
      for (const commit of themeCommits) console.log(`      ${commit.sha} ${commit.date} ${commit.message}`);
      console.log(`      diff: ${compareUrl(themeUpstream.commit)} (files under ${themeUpstream.upstream})`);
    }
    if (checkout) console.log(`    git -C ${path.relative(process.cwd(), checkout) || "."} diff ${meta.upstream.commit}..origin/main -- ${paths.join(" ")}`);
  } catch (error) {
    console.log(`${extension.pkg.padEnd(22)} could not check: ${error.message}`);
  }
}
console.log(behind.length ? `\n${behind.length} behind: ${behind.join(", ")}` : "\nEverything is up to date.");
