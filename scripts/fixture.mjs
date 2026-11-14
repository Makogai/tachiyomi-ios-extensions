// Saves one response into an extension's fixtures/ and routes its URL in tests.json.
//
//   npm run fixture -- <ext> <url> [name]
//   options: --prefix            route every URL starting with <url> (for changing query strings)
//            --post <body>       send a POST with this form body instead of a GET
//            --header "K: V"     extra request header (repeatable)
//            --refresh           overwrite the fixture when the URL already has one
//
// The request looks like the app's (Safari headers, Referer: the site). A Cloudflare challenge
// is reported, not bypassed; capture such pages from a browser and save them by hand.
import { parseArgs } from "node:util";
import { resolveExtension } from "./lib/extensions.mjs";
import { saveFixture } from "./lib/fixtures.mjs";
import { CloudflareError, liveTransport } from "./lib/host/transports.mjs";

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    prefix: { type: "boolean", default: false },
    post: { type: "string" },
    header: { type: "string", multiple: true, default: [] },
    refresh: { type: "boolean", default: false },
  },
});
const [query, url, name] = positionals;
if (!query || !url) {
  console.error("Usage: npm run fixture -- <ext> <url> [name] [--prefix] [--post <body>] [--header 'K: V']");
  process.exit(2);
}

const extension = resolveExtension(query);
const headers = { Referer: `${new URL(url).origin}/` };
for (const header of options.header) {
  const index = header.indexOf(":");
  if (index > 0) headers[header.slice(0, index).trim()] = header.slice(index + 1).trim();
}
if (options.post !== undefined) headers["Content-Type"] ??= "application/x-www-form-urlencoded";

try {
  const response = await liveTransport()({
    source: 0,
    url,
    method: options.post !== undefined ? "POST" : "GET",
    headers,
    body: options.post ?? null,
    fetch: options.post !== undefined ? "xhr" : "document",
    cookies: [],
    rateLimit: null,
  });
  if (response.status < 200 || response.status > 299) {
    console.error(`HTTP ${response.status} from ${url}; nothing saved.`);
    process.exit(1);
  }
  const contentType = response.headers["content-type"] ?? "";
  const file = saveFixture(extension, { url, body: response.body, contentType, name, match: options.prefix ? "prefix" : undefined, refresh: options.refresh });
  if (!file) {
    console.log(`${url} already has a fixture; add --refresh to overwrite it.`);
  } else {
    console.log(`Saved ${response.body.length} B (${contentType || "no content type"}) to ${extension.pkg}/${file} and routed it in tests.json.`);
    console.log("Check it for anything personal before committing.");
  }
} catch (error) {
  console.error(error instanceof CloudflareError ? error.message : `Request failed: ${error.message}`);
  process.exit(1);
}
