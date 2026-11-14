// Opt-in smoke test against the real sites: popular → details → chapters → pages for each source,
// printed as a report. A Cloudflare challenge is reported ("check in the app"), never bypassed.
//
//   npm run live -- <ext> [<ext> …]     (or --all; every source of a multi-source extension with --sources)
//   options: --sources   test every source, not only the first
//            --no-build  use the bundles already in dist/
import { parseArgs } from "node:util";
import { build } from "./lib/build.mjs";
import { findExtensions, resolveExtension } from "./lib/extensions.mjs";
import { createHost } from "./lib/host/fake-host.mjs";
import { CloudflareError, liveTransport } from "./lib/host/transports.mjs";
import { LoadedExtension, performCall } from "./lib/runner.mjs";

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    all: { type: "boolean", default: false },
    sources: { type: "boolean", default: false },
    "no-build": { type: "boolean", default: false },
  },
});

if (!options.all && positionals.length === 0) {
  console.error("Usage: npm run live -- <ext> [<ext> …] | --all   (goes to the real sites)");
  process.exit(2);
}
const extensions = options.all ? findExtensions() : positionals.map(resolveExtension);
if (!options["no-build"]) await build(extensions.map((extension) => extension.pkg), { quiet: true });

const summary = [];

async function step(report, label, run, describe) {
  const started = Date.now();
  try {
    const result = await run();
    report.push(`  ok    ${label.padEnd(8)} ${describe(result)} (${Date.now() - started} ms)`);
    return result;
  } catch (error) {
    const blocked = error instanceof CloudflareError || /Cloudflare check/.test(error.message);
    const message = blocked ? "blocked by Cloudflare: check this source in the app" : error.message.split("\n")[0];
    report.push(`  ${blocked ? "CF  " : "FAIL"}  ${label.padEnd(8)} ${message}`);
    throw Object.assign(new Error(message), { blocked });
  }
}

for (const extension of extensions) {
  let requests = 0;
  const host = createHost({
    transport: liveTransport({ rateLimits: (index) => loaded.sources[index]?.client?.rateLimits ?? [] }),
    observer: (event) => {
      if (event.type === "request") requests++;
    },
  });
  const loaded = new LoadedExtension(extension.pkg, host);
  const indexes = options.sources ? loaded.sources.map((_, index) => index) : [0];
  for (const index of indexes) {
    const source = loaded.sources[index];
    const report = [];
    let status = "ok";
    try {
      const popular = await step(report, "popular", () => performCall(loaded, index, "popular", [1]), (page) => `${page.mangas.length} manga, next page: ${page.hasNextPage}`);
      const manga = popular.mangas[0];
      if (!manga) throw Object.assign(new Error("popular returned no manga"), { blocked: false });
      report.push(`        first: ${manga.title} (${manga.url})`);
      await step(report, "details", () => performCall(loaded, index, "details", [manga]), (result) => `${result.title || "(no title)"}, status ${result.status}, ${result.genre ? `genres: ${result.genre.slice(0, 60)}` : "no genres"}`);
      const chapters = await step(report, "chapters", () => performCall(loaded, index, "chapters", [manga]), (list) => `${list.length} chapter(s)${list[0] ? `, newest: ${list[0].name} (${list[0].date_upload ? new Date(list[0].date_upload).toISOString().slice(0, 10) : "no date"})` : ""}`);
      const chapter = chapters[0];
      if (!chapter) throw Object.assign(new Error("no chapters to open"), { blocked: false });
      await step(report, "pages", () => performCall(loaded, index, "pages", [chapter]), (pages) => `${pages.length} page(s)${pages[0] ? `, first: ${(pages[0].imageUrl ?? pages[0].url).slice(0, 90)}` : ""}`);
    } catch (error) {
      status = error.blocked ? "blocked" : "failed";
      if (!report.some((line) => line.includes(error.message))) report.push(`  FAIL  ${error.message}`);
    }
    console.log(`\n${extension.pkg} ${source.name} (${source.lang}) ${source.baseUrl}`);
    for (const line of report) console.log(line);
    summary.push({ name: `${extension.pkg}${indexes.length > 1 ? `#${index}` : ""}`, status });
  }
  console.log(`  ${requests} request(s)`);
}

console.log("\nSummary");
for (const { name, status } of summary) console.log(`  ${status.padEnd(8)} ${name}`);
process.exitCode = summary.some(({ status }) => status === "failed") ? 1 : 0;
