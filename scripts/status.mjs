// A table of every extension: version, upstream commit, theme, test counts and fixture age.
//
//   npm run status [-- --json]
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { findExtensions, readMeta, readTests, root, themeOf } from "./lib/extensions.mjs";

/** Date of the last commit touching `dir`, or its newest file's mtime when uncommitted. */
function lastChanged(dir) {
  if (!existsSync(dir)) return null;
  try {
    const date = execFileSync("git", ["-C", root, "log", "-1", "--format=%cs", "--", path.relative(root, dir)], { encoding: "utf8" }).trim();
    if (date) return date;
  } catch {
    // Not a git checkout.
  }
  const newest = Math.max(0, ...readdirSync(dir).map((name) => statSync(path.join(dir, name)).mtimeMs));
  return newest ? new Date(newest).toISOString().slice(0, 10) : null;
}

const rows = findExtensions().map((extension) => {
  const meta = readMeta(extension);
  const tests = readTests(extension);
  return {
    pkg: extension.pkg,
    name: meta.name,
    versionCode: meta.versionCode,
    upstream: meta.upstream?.commit ?? "",
    theme: themeOf(extension) ?? "",
    nsfw: meta.nsfw,
    cases: tests.cases.length,
    live: tests.live.length,
    fixtures: tests.routes.length,
    fixturesUpdated: lastChanged(path.join(extension.dir, "fixtures")) ?? "",
  };
});

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const columns = [
    ["pkg", "Extension"],
    ["versionCode", "Version"],
    ["upstream", "Upstream"],
    ["theme", "Theme"],
    ["cases", "Cases"],
    ["live", "Live"],
    ["fixtures", "Routes"],
    ["fixturesUpdated", "Fixtures updated"],
  ];
  const widths = columns.map(([key, label]) => Math.max(label.length, ...rows.map((row) => String(row[key]).length)));
  const line = (cells) => cells.map((cell, index) => String(cell).padEnd(widths[index])).join("  ");
  console.log(line(columns.map(([, label]) => label)));
  console.log(widths.map((width) => "-".repeat(width)).join("  "));
  for (const row of rows) console.log(line(columns.map(([key]) => row[key])));
  const untested = rows.filter((row) => row.cases === 0).map((row) => row.pkg);
  console.log(`\n${rows.length} extensions, ${rows.reduce((sum, row) => sum + row.cases, 0)} fixture cases${untested.length ? `; no fixture cases: ${untested.join(", ")}` : ""}`);
}
