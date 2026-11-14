// Runs one call of an extension and shows what happened: every request, every selector and how
// many nodes it matched, and the result.
//
//   npm run debug -- <ext> popular [page]
//   npm run debug -- <ext> latest [page]
//   npm run debug -- <ext> search "<query>" [page]
//   npm run debug -- <ext> details <manga url or path>
//   npm run debug -- <ext> chapters <manga url or path>
//   npm run debug -- <ext> mangaUpdate <manga url or path>
//   npm run debug -- <ext> pages <chapter url or path>
//   npm run debug -- <ext> imageURL <page url>
//   npm run debug -- <ext> filters
//
// Options:
//   --fixtures   answer from tests.json routes instead of the site
//   --save       save every response into fixtures/, route it in tests.json and add the call as a
//                case with first expectations (review them before committing). URLs that already
//                have a route keep their fixture unless you add --refresh.
//   --verbose    request and response headers, and every selector (not only the empty ones)
//   --full       print the whole result instead of the first items
//   --source <n> the source index in a multi-source extension (default 0)
//   --no-build   use the bundle already in dist/
import { parseArgs } from "node:util";
import { build } from "./lib/build.mjs";
import { readTests, resolveExtension } from "./lib/extensions.mjs";
import { addCase, saveFixture, suggestExpectations } from "./lib/fixtures.mjs";
import { createHost } from "./lib/host/fake-host.mjs";
import { CloudflareError, fixtureTransport, liveTransport } from "./lib/host/transports.mjs";
import { CALLS, LoadedExtension, performCall } from "./lib/runner.mjs";

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    fixtures: { type: "boolean", default: false },
    save: { type: "boolean", default: false },
    refresh: { type: "boolean", default: false },
    verbose: { type: "boolean", short: "v", default: false },
    full: { type: "boolean", default: false },
    source: { type: "string", default: "0" },
    "no-build": { type: "boolean", default: false },
  },
});

const [query, call, ...rest] = positionals;
if (!query || !call || !CALLS.includes(call)) {
  console.error(`Usage: npm run debug -- <ext> <${CALLS.join("|")}> [args] [--fixtures] [--save] [--verbose]`);
  process.exit(2);
}
if (options.save && options.fixtures) {
  console.error("--save records the live site; leave out --fixtures.");
  process.exit(2);
}

const color = process.stdout.isTTY ? (code, text) => `\x1b[${code}m${text}\x1b[0m` : (_, text) => text;
const dim = (text) => color(2, text);
const red = (text) => color(31, text);
const green = (text) => color(32, text);

const extension = resolveExtension(query);
const sourceIndex = Number(options.source);
if (!options["no-build"]) await build([extension.pkg], { quiet: true });

const spec = readTests(extension);
const responses = [];
let selectsSinceResponse = [];

/** Prints the selectors used since the last request, grouped: calls, nodes found, and empty calls. */
function flushSelects() {
  const groups = new Map();
  for (const event of selectsSinceResponse) {
    const group = groups.get(event.selector) ?? { calls: 0, nodes: 0, empty: 0 };
    group.calls++;
    group.nodes += event.count;
    if (event.count === 0) group.empty++;
    groups.set(event.selector, group);
  }
  let hidden = 0;
  for (const [selector, group] of groups) {
    if (!options.verbose && group.empty === 0) {
      hidden++;
      continue;
    }
    const calls = group.calls > 1 ? ` x${group.calls}` : "";
    const empty = group.empty === 0 ? "" : group.empty === group.calls ? red(" 0 nodes") : red(` 0 nodes in ${group.empty} of ${group.calls} calls`);
    const found = group.nodes > 0 ? ` ${group.nodes} node${group.nodes === 1 ? "" : "s"}` : "";
    console.log(`      select ${JSON.stringify(selector)}${calls} ->${found}${empty}`);
  }
  if (hidden > 0) console.log(dim(`      ${hidden} more selector(s) matched (--verbose lists them)`));
  selectsSinceResponse = [];
}

const observer = (event) => {
  switch (event.type) {
    case "request": {
      flushSelects();
      const { method, url, headers, body } = event.payload;
      console.log(`-> ${method} ${url}`);
      if (options.verbose) {
        for (const [name, value] of Object.entries(headers ?? {})) console.log(dim(`     ${name}: ${value}`));
        if (body) console.log(dim(`     body: ${body.slice(0, 500)}`));
      }
      break;
    }
    case "response": {
      const { status, headers, body, route, unmatched } = event.response;
      const type = headers?.["content-type"] ?? headers?.["Content-Type"] ?? "";
      const label = status >= 200 && status < 300 ? green(String(status)) : red(String(status));
      const where = route ? dim(` (${route.file})`) : unmatched ? red(" (no route in tests.json)") : "";
      console.log(`<- ${label} ${body.length} B ${event.ms} ms ${type}${where}`);
      if (options.verbose) for (const [name, value] of Object.entries(headers ?? {})) console.log(dim(`     ${name}: ${value}`));
      responses.push({ url: event.payload.url, status, contentType: type, body, call });
      break;
    }
    case "error":
      console.log(red(`<- ${event.error instanceof Error ? event.error.message : String(event.error)}`));
      break;
    case "select":
      selectsSinceResponse.push(event);
      break;
    case "log":
      console.log(`   log.${event.level}: ${event.message}`);
      break;
  }
};

let loaded;
const rateLimits = (index) => loaded?.sources[index]?.client?.rateLimits ?? [];
const transport = options.fixtures ? fixtureTransport(spec.routes, extension.dir) : liveTransport({ rateLimits });
const host = createHost({ transport, observer });
loaded = new LoadedExtension(extension.pkg, host);
const source = loaded.sources[sourceIndex];
if (!source) {
  console.error(`${extension.pkg} has ${loaded.sources.length} source(s); --source ${sourceIndex} does not exist.`);
  process.exit(2);
}

/** A manga/chapter argument: a full URL on the source's site becomes a path. */
function urlArgument(value) {
  if (!value) {
    console.error(`${call} needs a URL or path.`);
    process.exit(2);
  }
  return value.startsWith(source.baseUrl) ? value.slice(source.baseUrl.length) || "/" : value;
}

let args;
switch (call) {
  case "popular":
  case "latest":
    args = [Number(rest[0] ?? 1)];
    break;
  case "search":
    args = [Number(rest[1] ?? 1), rest[0] ?? ""];
    break;
  case "details":
  case "chapters":
  case "mangaUpdate":
    args = [{ url: urlArgument(rest[0]), title: "" }];
    break;
  case "pages":
    args = [{ url: urlArgument(rest[0]), name: "" }];
    break;
  case "imageURL":
    args = [{ index: 0, url: rest[0] ?? "" }];
    break;
  default:
    args = [];
}

console.log(dim(`${extension.pkg} [${source.name} (${source.lang}) ${source.baseUrl}] ${call} ${JSON.stringify(args)} ${options.fixtures ? "against fixtures" : "live"}\n`));

function preview(result) {
  if (options.full) return result;
  const trim = (list) => (list.length > 3 ? [...list.slice(0, 3), `… ${list.length - 3} more (--full shows all)`] : list);
  if (Array.isArray(result)) return trim(result);
  if (result && Array.isArray(result.mangas)) return { ...result, mangas: trim(result.mangas) };
  if (result && Array.isArray(result.chapters)) return { ...result, chapters: trim(result.chapters) };
  return result;
}

let result;
try {
  result = await performCall(loaded, sourceIndex, call, args);
  flushSelects();
} catch (error) {
  flushSelects();
  console.log(`\n${red("FAILED")} ${error.message}`);
  if (error instanceof CloudflareError || /Cloudflare check/.test(error.message)) {
    console.log("\nThe site is behind a Cloudflare challenge. The harness does not bypass it; test this source in the app,\nwhich can solve the check in its WebView, or capture fixtures from a browser.");
  } else if (/no route in tests.json|No fixture for/.test(error.message) || responses.some((response) => response.status === 404 && options.fixtures)) {
    console.log("\nA request has no fixture. Run without --fixtures to see the live site, or add it with npm run fixture.");
  }
  process.exitCode = 1;
}

if (result !== undefined) {
  console.log(`\n${green("Result")}`);
  console.log(JSON.stringify(preview(result), null, 2));
  const counts = Array.isArray(result) ? `${result.length} item(s)` : result?.mangas ? `${result.mangas.length} manga, hasNextPage=${result.hasNextPage}` : result?.chapters ? `${result.chapters.length} chapter(s)` : "";
  if (counts) console.log(dim(counts));
  const empty = (Array.isArray(result) && result.length === 0) || (result?.mangas && result.mangas.length === 0);
  if (empty) console.log(red("\nEmpty result. Look for selectors with 0 nodes above: the site's markup probably changed."));
}

if (options.save) {
  const saved = [];
  const seen = new Set();
  for (const response of responses) {
    if (response.status < 200 || response.status > 299) continue;
    const url = response.url.split("#")[0];
    if (seen.has(url)) {
      console.log(dim(`Kept the first response for ${url}: tests.json routes match on the URL only, not the method or body.`));
      continue;
    }
    seen.add(url);
    const file = saveFixture(extension, { url: response.url, body: response.body, contentType: response.contentType, refresh: options.refresh });
    if (file) saved.push(file);
    else console.log(dim(`Kept the existing fixture for ${url} (--refresh overwrites it).`));
  }
  console.log(`\nSaved ${saved.length} fixture(s): ${saved.join(", ")}`);
  if (result !== undefined) {
    const name = `${call} ${rest.join(" ")}`.trim() + (sourceIndex !== 0 ? ` (${source.lang})` : "");
    addCase(extension, { name, ...(sourceIndex !== 0 ? { source: sourceIndex } : {}), call, args, expect: suggestExpectations(call, result) });
    console.log(`Added case "${name}" to tests.json with first expectations: review them, then npm run test:ext ${extension.pkg}`);
  }
  console.log("Check the saved files for anything personal (account names, tokens) before committing.");
}
