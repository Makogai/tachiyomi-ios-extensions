// Runs each extension's tests.json cases against its fixtures, in Node, with the fake host.
// The app's ExtensionConformanceTests (JavaScriptCore + SwiftSoup) remain the authority; this is
// the fast local and CI loop.
//
// Usage:
//   node scripts/test.mjs                    all extensions
//   node scripts/test.mjs <ext> [<ext> …]    some (en.mangahere, or just mangahere)
//   options: --case <text>  only cases whose name contains <text>
//            --verbose      print every request and selector of failing cases
//            --no-build     use the bundles already in dist/
import { parseArgs } from "node:util";
import { build } from "./lib/build.mjs";
import { checkExpectations, TEST_CALLS } from "./lib/expect.mjs";
import { findExtensions, readTests, resolveExtension } from "./lib/extensions.mjs";
import { createHost } from "./lib/host/fake-host.mjs";
import { fixtureTransport } from "./lib/host/transports.mjs";
import { LoadedExtension, performCall } from "./lib/runner.mjs";

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    case: { type: "string" },
    verbose: { type: "boolean", short: "v", default: false },
    "no-build": { type: "boolean", default: false },
  },
});

let extensions;
try {
  extensions = positionals.length ? positionals.map(resolveExtension) : findExtensions();
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

if (!options["no-build"]) await build(extensions.map((extension) => extension.pkg), { quiet: true });

const totals = { passed: 0, failed: 0, extensionsWithoutCases: [] };

for (const extension of extensions) {
  const spec = readTests(extension);
  const cases = spec.cases.filter((testCase) => !options.case || testCase.name.includes(options.case));
  if (spec.cases.length === 0) totals.extensionsWithoutCases.push(extension.pkg);
  for (const testCase of cases) {
    const events = [];
    const started = Date.now();
    let failures;
    try {
      if (!TEST_CALLS.includes(testCase.call)) throw new Error(`Unknown call ${testCase.call} (the app's tests know ${TEST_CALLS.join(", ")})`);
      const host = createHost({ transport: fixtureTransport(spec.routes, extension.dir), observer: (event) => events.push(event) });
      const loaded = new LoadedExtension(extension.pkg, host);
      const result = await performCall(loaded, testCase.source ?? 0, testCase.call, testCase.args ?? []);
      failures = checkExpectations(result, testCase.expect ?? {});
    } catch (error) {
      failures = [`${testCase.call} failed: ${error.message}`];
    }
    const ms = Date.now() - started;
    if (failures.length === 0) {
      totals.passed++;
      console.log(`ok    ${extension.pkg}: ${testCase.name} (${ms} ms)`);
      continue;
    }
    totals.failed++;
    console.log(`FAIL  ${extension.pkg}: ${testCase.name}`);
    for (const failure of failures) console.log(`        ${failure.replace(/\n/g, "\n        ")}`);
    const unmatched = events.filter((event) => event.type === "response" && event.response.unmatched);
    for (const event of unmatched) console.log(`        no route for ${event.payload.method} ${event.payload.url}`);
    if (options.verbose) {
      for (const event of events) {
        if (event.type === "response") console.log(`        ${event.payload.method} ${event.payload.url} -> ${event.response.status}${event.response.route ? ` (${event.response.route.file})` : ""}`);
        else if (event.type === "select") console.log(`          select ${JSON.stringify(event.selector)} -> ${event.count}`);
        else if (event.type === "log") console.log(`        log.${event.level}: ${event.message}`);
      }
    }
  }
}

console.log(`\n${totals.passed} passed, ${totals.failed} failed`);
if (totals.extensionsWithoutCases.length) console.log(`no fixture cases: ${totals.extensionsWithoutCases.join(", ")}`);
process.exitCode = totals.failed > 0 ? 1 : 0;
