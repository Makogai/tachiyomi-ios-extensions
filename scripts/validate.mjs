// Checks the repository before publishing: extension.json schema, required files, file headers,
// the standalone layout, tests.json (including cases that would never run or check anything),
// unique packages and source IDs, and that every changed extension bumps its versionCode against
// the published index (the apps only update when versionCode grows).
//
//   npm run validate                       builds everything, then checks
//   options: --published <file|url>        index to compare against (default: the repo branch)
//            --offline                     skip the published-index comparison
//            --no-build                    use dist/ as it is
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { build } from "./lib/build.mjs";
import { OPERATORS, TEST_CALLS } from "./lib/expect.mjs";
import { distDir, findExtensions, readJSON, root, themeOf, themesDir } from "./lib/extensions.mjs";
import { TODO_MARKER } from "./lib/template.mjs";

const { values: options } = parseArgs({
  options: {
    published: { type: "string" },
    offline: { type: "boolean", default: false },
    "no-build": { type: "boolean", default: false },
  },
});

const errors = [];
const warnings = [];
const error = (where, message) => errors.push(`${where}: ${message}`);
const warn = (where, message) => warnings.push(`${where}: ${message}`);

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const LANG = /^(all|[a-z]{2,3}(-[A-Za-z0-9]{2,8})*)$/;
const EXTENSION_KEYS = new Set(["name", "lang", "versionCode", "nsfw", "upstream"]);
const TESTS_KEYS = new Set(["routes", "cases", "live"]);
const CASE_KEYS = new Set(["name", "call", "args", "expect", "source"]);
/** A standalone index.ts above this should be split (docs/ADDING-A-SOURCE.md#the-layout). */
const SINGLE_FILE_LINES = 200;
/** index.ts should show the source's flow on a screen or so; above this the logic belongs in the other files. */
const INDEX_MAX_LINES = 400;

// extension.json

function checkExtensionJson(extension) {
  const where = `${extension.pkg}/extension.json`;
  let meta;
  try {
    meta = readJSON(path.join(extension.dir, "extension.json"));
  } catch (cause) {
    error(where, `not valid JSON (${cause.message})`);
    return null;
  }
  if (typeof meta.name !== "string" || meta.name.trim() === "") error(where, `"name" must be a non-empty string`);
  if (typeof meta.lang !== "string" || !LANG.test(meta.lang)) error(where, `"lang" must be "all" or a language tag such as "en" or "pt-BR"`);
  else if (meta.lang !== "all" && meta.lang.split("-")[0].toLowerCase() !== extension.lang) error(where, `"lang" ${meta.lang} does not belong in src/${extension.lang}/`);
  else if (meta.lang === "all" && extension.lang !== "all") error(where, `"lang": "all" belongs in src/all/`);
  if (!Number.isInteger(meta.versionCode) || meta.versionCode < 1) error(where, `"versionCode" must be an integer >= 1`);
  if (typeof meta.nsfw !== "boolean") error(where, `"nsfw" must be true or false`);
  if (meta.upstream !== undefined) {
    if (typeof meta.upstream !== "object" || typeof meta.upstream.path !== "string" || !meta.upstream.path.startsWith("src/")) {
      error(where, `"upstream.path" must be the keiyoushi path, such as "src/en/mangahere"`);
    }
    if (typeof meta.upstream?.commit !== "string" || !/^[0-9a-f]{7,40}$/.test(meta.upstream.commit)) {
      error(where, `"upstream.commit" must be the upstream commit the port was taken from (7–40 hex digits)`);
    }
  }
  for (const key of Object.keys(meta)) if (!EXTENSION_KEYS.has(key)) warn(where, `unknown key "${key}"`);
  if (!/^[a-z0-9]+$/.test(extension.name)) error(extension.pkg, "the folder name must be lowercase letters and digits");
  return meta;
}

// Files

function checkFiles(extension) {
  if (!existsSync(path.join(extension.dir, "index.ts"))) error(extension.pkg, "index.ts is missing");
  const icon = path.join(extension.dir, "icon.png");
  if (!existsSync(icon)) error(extension.pkg, "icon.png is missing (upstream's res/mipmap-xxxhdpi/ic_launcher.png)");
  else if (!readFileSync(icon).subarray(0, 8).equals(PNG)) error(extension.pkg, "icon.png is not a PNG");
  if (!existsSync(path.join(extension.dir, "tests.json"))) error(extension.pkg, "tests.json is missing (npm run new creates one)");
}

// Source files: headers, the standalone layout, leftovers

/** Every .ts file of the extension (not fixtures), relative to its folder. */
function sourceFiles(extension) {
  return readdirSync(extension.dir).filter((name) => name.endsWith(".ts") && statSync(path.join(extension.dir, name)).isFile());
}

const lineCount = (text) => text.split("\n").length - (text.endsWith("\n") ? 1 : 0);

function checkSources(extension, meta) {
  const files = sourceFiles(extension);
  const texts = new Map(files.map((file) => [file, readFileSync(path.join(extension.dir, file), "utf8")]));

  // Headers: a reviewer diffing against keiyoushi needs to know which file and commit each port
  // came from, and the commit must follow extension.json when the port is updated.
  const commit = meta?.upstream?.commit;
  for (const [file, text] of texts) {
    const where = `${extension.pkg}/${file}`;
    const first = text.split("\n", 1)[0];
    if (!first.startsWith("// ")) {
      error(where, meta?.upstream ? `must start with a one-line header naming the upstream file and commit, such as "// Port of ${meta.upstream.path}/.../X.kt @ ${commit}."` : `must start with a one-line "// " header saying what the file is`);
      continue;
    }
    if (!meta?.upstream || typeof commit !== "string") continue;
    const named = /@ ([0-9a-f]{7,40})\b/.exec(first)?.[1];
    if (!/\b(src|lib-multisrc|lib|core|common)\/\S+/.test(first) || !named) {
      error(where, `the first line must name the upstream path and commit, such as "// Port of ${meta.upstream.path}/.../X.kt @ ${commit}."`);
    } else if (!named.startsWith(commit) && !commit.startsWith(named)) {
      error(where, `the header names upstream commit ${named}, but extension.json says ${commit}; update the header when you update the port`);
    }
  }

  // Placeholders `npm run new` leaves for the contributor.
  for (const [file, text] of texts) {
    const lines = text.split("\n").flatMap((line, index) => (line.includes(TODO_MARKER) ? [index + 1] : []));
    if (lines.length) error(`${extension.pkg}/${file}`, `${TODO_MARKER} placeholders from the template are left on line ${lines.join(", ")}`);
  }

  // Files nothing imports are never bundled (and so never run).
  const reached = new Set();
  const visit = (file) => {
    if (reached.has(file) || !texts.has(file)) return;
    reached.add(file);
    for (const match of texts.get(file).matchAll(/(?:from|import)\s*\(?\s*["']\.\/([\w.-]+?)(?:\.ts|\.js)?["']/g)) visit(`${match[1]}.ts`);
  };
  visit("index.ts");
  for (const file of files) {
    if (!reached.has(file)) warn(`${extension.pkg}/${file}`, "not imported from index.ts (directly or through another file), so it is not in the bundle");
  }

  // Unit tests only run when named <anything>.test.mjs.
  for (const name of readdirSync(extension.dir)) {
    if (/\.(test|spec)\.(js|cjs|ts|mts)$|\.spec\.mjs$/.test(name)) {
      error(`${extension.pkg}/${name}`, "never runs: npm test only runs src/**/*.test.mjs files");
    }
  }

  // The standalone layout (docs/ADDING-A-SOURCE.md#the-layout). Warnings: a reviewer's hint, not a rule.
  if (!texts.has("index.ts") || themeOf(extension)) return;
  const indexLines = lineCount(texts.get("index.ts"));
  if (indexLines <= SINGLE_FILE_LINES) return;
  const hints = [];
  if (indexLines > INDEX_MAX_LINES) hints.push(`over ${INDEX_MAX_LINES} lines`);
  const missing = ["api.ts", "parse.ts"].filter((file) => !texts.has(file));
  if (missing.length) hints.push(`no ${missing.join(" or ")}`);
  if (/new (ListPreference|MultiSelectListPreference|EditTextPreference|SwitchPreferenceCompat)\(/.test(texts.get("index.ts")) && !texts.has("settings.ts")) {
    hints.push("settings built inline instead of in settings.ts");
  }
  if (hints.length) {
    warn(`${extension.pkg}/index.ts`, `${indexLines} lines: ${hints.join(", ")}; split it into the standard layout (docs/ADDING-A-SOURCE.md#the-layout)`);
  }
}

// tests.json

function checkExpect(where, expect) {
  if (!expect || typeof expect !== "object" || Array.isArray(expect)) {
    error(where, `"expect" must be an object of path → value`);
    return;
  }
  for (const [key, value] of Object.entries(expect)) {
    if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 1 && !OPERATORS.includes(Object.keys(value)[0])) {
      error(where, `"${key}": unknown expectation ${Object.keys(value)[0]} (known: ${OPERATORS.join(", ")})`);
    }
  }
}

function checkTests(extension) {
  const file = path.join(extension.dir, "tests.json");
  if (!existsSync(file)) return;
  const where = `${extension.pkg}/tests.json`;
  let spec;
  try {
    spec = readJSON(file);
  } catch (cause) {
    error(where, `not valid JSON (${cause.message})`);
    return;
  }
  // A misspelt key ("case", "tests") is silently ignored by both test runners: its cases never run.
  for (const key of Object.keys(spec)) {
    if (!TESTS_KEYS.has(key)) error(where, `unknown key "${key}": only ${[...TESTS_KEYS].join(", ")} are read, so anything under it never runs`);
  }
  for (const route of spec.routes ?? []) {
    if (typeof route.url !== "string" || !/^https?:\/\//.test(route.url)) error(where, `route URL ${JSON.stringify(route.url)} is not absolute`);
    if (route.match !== undefined && route.match !== "prefix") error(where, `route match must be "prefix" or absent, not ${JSON.stringify(route.match)}`);
    if (typeof route.file !== "string" || !existsSync(path.join(extension.dir, route.file))) error(where, `route file ${route.file} does not exist`);
  }
  const urls = (spec.routes ?? []).map((route) => route.url);
  for (const url of new Set(urls.filter((url, index) => urls.indexOf(url) !== index))) warn(where, `two routes for ${url}; the first wins`);
  for (const group of ["cases", "live"]) {
    const names = new Set();
    for (const testCase of spec[group] ?? []) {
      const label = `${where} ${group} "${testCase.name}"`;
      if (!testCase.name) error(where, `a ${group} entry has no name`);
      if (names.has(testCase.name)) error(label, "duplicate name (the app runs cases by name)");
      names.add(testCase.name);
      if (!TEST_CALLS.includes(testCase.call)) error(label, `unknown call ${testCase.call} (the app knows ${TEST_CALLS.join(", ")})`);
      if (testCase.args !== undefined && !Array.isArray(testCase.args)) error(label, `"args" must be an array`);
      for (const key of Object.keys(testCase)) {
        if (!CASE_KEYS.has(key)) error(label, `unknown key "${key}" (a case has ${[...CASE_KEYS].join(", ")}); the runners ignore it`);
      }
      if (testCase.source !== undefined && !(Number.isInteger(testCase.source) && testCase.source >= 0)) error(label, `"source" must be a source index (0, 1, …)`);
      // A case without expectations passes whatever the source returns.
      if (testCase.expect && typeof testCase.expect === "object" && Object.keys(testCase.expect).length === 0) error(label, `"expect" is empty, so the case checks nothing`);
      if (testCase.expect === undefined) {
        error(label, `no "expect", so the case checks nothing`);
        continue;
      }
      // The apps' conformance tests search with the default filters; filter states in args[2]
      // would only apply in Node, so the case would pass here and hit an unrouted URL there.
      if (testCase.call === "search" && Array.isArray(testCase.args) && testCase.args.length > 2) {
        error(label, "search takes [page, query]: the apps' conformance tests ignore filter states, so test filtered URLs in a unit test");
      }
      checkExpect(label, testCase.expect);
    }
  }
  // Fixtures that no route uses are dead weight.
  const fixturesDir = path.join(extension.dir, "fixtures");
  if (existsSync(fixturesDir)) {
    const used = new Set((spec.routes ?? []).map((route) => path.normalize(route.file)));
    for (const name of readdirSync(fixturesDir)) {
      if (name.startsWith(".")) continue;
      if (!used.has(path.normalize(`fixtures/${name}`))) warn(`${extension.pkg}/fixtures/${name}`, "not used by any route");
    }
  }
}

// Personal data in the public repo

const PRIVATE_PATTERNS = [
  [/\/Users\/[A-Za-z0-9._-]+\//, "a local macOS path"],
  [/\/home\/[a-z][a-z0-9._-]*\//, "a local Linux path"],
  [/[A-Z]:\\Users\\/, "a local Windows path"],
  [/\bAuthorization:\s*Bearer\s+[A-Za-z0-9._-]{20,}/i, "a bearer token"],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, "a GitHub token"],
];

function scanForPrivateData(extension) {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const file = path.join(dir, name);
      if (statSync(file).isDirectory()) walk(file);
      else if (!name.endsWith(".png")) files.push(file);
    }
  };
  walk(extension.dir);
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const [pattern, label] of PRIVATE_PATTERNS) {
      if (pattern.test(text)) error(path.relative(root, file), `contains ${label}; remove it before committing (the repo is public)`);
    }
  }
}

// Themes

function checkThemes() {
  for (const theme of readdirSync(themesDir)) {
    const dir = path.join(themesDir, theme);
    if (!statSync(dir).isDirectory()) continue;
    if (!existsSync(path.join(dir, "index.ts"))) error(`sdk/themes/${theme}`, "index.ts is missing");
    try {
      const info = readJSON(path.join(dir, "theme.json"));
      if (!info.baseClass || !info.upstream || !info.commit) error(`sdk/themes/${theme}/theme.json`, "needs baseClass, upstream and commit");
    } catch {
      error(`sdk/themes/${theme}`, "theme.json is missing or invalid");
    }
  }
}

// The published index

function repository() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  try {
    const remote = execFileSync("git", ["-C", root, "remote", "get-url", "origin"], { encoding: "utf8" }).trim();
    return /github\.com[:/]([^/]+\/[^/.]+)/.exec(remote)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function loadPublished() {
  if (options.published) {
    if (/^https?:/.test(options.published)) return (await fetch(options.published)).json();
    return readJSON(path.resolve(options.published));
  }
  const repo = repository();
  if (!repo) throw new Error("no GitHub remote; pass --published");
  const response = await fetch(`https://raw.githubusercontent.com/${repo}/repo/index.json`);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`HTTP ${response.status} for the published index`);
  return response.json();
}

function checkAgainstPublished(index, published) {
  for (const entry of index) {
    const old = published.find((candidate) => candidate.pkg === entry.pkg);
    if (!old) continue;
    if (entry.versionCode < old.versionCode) {
      error(entry.pkg, `versionCode ${entry.versionCode} is lower than the published ${old.versionCode}`);
    } else if (entry.sha256 !== old.sha256 && entry.versionCode === old.versionCode) {
      error(entry.pkg, `the built script differs from the published one but versionCode is still ${old.versionCode}; bump it to ${old.versionCode + 1} in extension.json so the apps update (SDK and theme changes count too)`);
    }
    for (const source of old.sources) {
      const now = entry.sources.find((candidate) => candidate.lang === source.lang && candidate.name === source.name);
      if (now && now.id !== source.id) error(entry.pkg, `source ID of ${source.name} (${source.lang}) changed from ${source.id} to ${now.id}; that orphans every library entry`);
      if (!entry.sources.some((candidate) => candidate.id === source.id)) warn(entry.pkg, `published source ${source.name} (${source.lang}, ${source.id}) is gone`);
    }
  }
}

// Run

const extensions = findExtensions();
for (const extension of extensions) {
  const meta = checkExtensionJson(extension);
  checkFiles(extension);
  checkSources(extension, meta);
  checkTests(extension);
  scanForPrivateData(extension);
}
checkThemes();

const sourcesMd = readFileSync(path.join(root, "SOURCES.md"), "utf8");
for (const extension of extensions) {
  if (!sourcesMd.includes(`\`${extension.pkg}\``)) error(extension.pkg, "not listed in SOURCES.md");
}

let index = null;
if (errors.length === 0) {
  try {
    index = options["no-build"] ? readJSON(path.join(distDir, "index.json")) : await build([], { quiet: true });
  } catch (cause) {
    error("build", cause.message);
  }
}

if (index) {
  const ids = new Map();
  for (const entry of index) {
    for (const source of entry.sources) {
      const other = ids.get(source.id);
      if (other) error(entry.pkg, `source ID ${source.id} (${source.name}, ${source.lang}) is also used by ${other}`);
      ids.set(source.id, `${entry.pkg} ${source.name} (${source.lang})`);
    }
  }
  if (!options.offline) {
    try {
      checkAgainstPublished(index, await loadPublished());
    } catch (cause) {
      warn("published index", `not compared (${cause.message}); use --published <file|url> or --offline`);
    }
  }
}

for (const message of warnings) console.log(`warning  ${message}`);
for (const message of errors) console.log(`error    ${message}`);
console.log(`\n${extensions.length} extensions checked: ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exitCode = errors.length > 0 ? 1 : 0;
