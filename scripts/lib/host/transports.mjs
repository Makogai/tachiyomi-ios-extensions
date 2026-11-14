// Where the fake host's HTTP requests go: saved fixtures (tests) or the real site (debug, live).
import { readFileSync } from "node:fs";
import path from "node:path";

const stripFragment = (url) => url.split("#")[0];

/** Content type the app's test stub sends for a fixture file. */
export const fixtureContentType = (file) => (file.endsWith(".json") ? "application/json" : "text/html; charset=utf-8");

/**
 * Serves `tests.json` routes the way the app's ExtensionConformanceTests do: exact URL or
 * `"match": "prefix"`, ignoring the fragment; anything else is a 404 naming the URL.
 */
export function fixtureTransport(routes, directory) {
  const loaded = routes.map((route) => ({ ...route, data: readFileSync(path.join(directory, route.file)) }));
  return async (payload) => {
    const url = stripFragment(payload.url);
    const route = loaded.find((candidate) => (candidate.match === "prefix" ? url.startsWith(candidate.url) : url === candidate.url));
    if (!route) return { status: 404, url: payload.url, headers: { "content-type": "text/plain" }, body: `No fixture for ${payload.url}`, unmatched: true };
    return { status: 200, url: payload.url, headers: { "content-type": fixtureContentType(route.file) }, body: route.data, route };
  };
}

// Roughly the headers Safari sends, which the app adds for `Fetch` kinds.
const SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const FETCH_HEADERS = {
  document: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Sec-Fetch-Dest": "document", "Sec-Fetch-Mode": "navigate" },
  xhr: { Accept: "*/*", "Sec-Fetch-Dest": "empty", "Sec-Fetch-Mode": "cors" },
  image: { Accept: "image/webp,image/avif,image/jxl,image/heic,image/heic-sequence,video/*;q=0.8,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5", "Sec-Fetch-Dest": "image", "Sec-Fetch-Mode": "no-cors" },
};

export class CloudflareError extends Error {
  constructor(url) {
    super(`${new URL(url).host} is showing a Cloudflare check. The harness does not bypass it; check this source in the app.`);
    this.name = "CloudflareError";
  }
}

function isCloudflareChallenge(status, headers, body) {
  if (headers.get("cf-mitigated") === "challenge") return true;
  if (status !== 403 && status !== 503 && status !== 429) return false;
  const text = body.subarray(0, 20000).toString("utf8");
  return /Just a moment\.\.\.|cf-browser-verification|challenge-platform|cf_chl_/i.test(text);
}

/**
 * Sends requests to the real site with Node's fetch: Safari-like headers, a cookie jar, the source's
 * cookie rules and rate limits. A Cloudflare challenge fails the request with `CloudflareError`.
 *
 * @param {object} [options]
 * @param {(index: number) => {permits:number, periodMs:number, intervalMs:number}[]} [options.rateLimits]
 */
export function liveTransport({ rateLimits = () => [] } = {}) {
  const jar = new Map(); // host → Map(name → value)
  const lastRequest = new Map(); // "source:rule" → time
  return async (payload) => {
    if (payload.rateLimit !== null && payload.rateLimit !== undefined) {
      const rule = rateLimits(payload.source)[payload.rateLimit];
      if (rule) {
        const key = `${payload.source}:${payload.rateLimit}`;
        const gap = Math.max(rule.intervalMs, rule.periodMs / Math.max(rule.permits, 1));
        const wait = (lastRequest.get(key) ?? 0) + gap - Date.now();
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        lastRequest.set(key, Date.now());
      }
    }
    const url = new URL(payload.url);
    const cookies = new Map(jar.get(url.host) ?? []);
    for (const [name, value] of payload.cookies ?? []) cookies.set(name, value);
    const headers = { "User-Agent": SAFARI_UA, "Accept-Language": "en-US,en;q=0.9", ...(FETCH_HEADERS[payload.fetch] ?? {}), ...payload.headers };
    if (cookies.size > 0) headers.Cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
    const body = payload.bodyBase64 ? Buffer.from(payload.bodyBase64, "base64") : (payload.body ?? undefined);
    const response = await fetch(payload.url, { method: payload.method, headers, body, redirect: "follow" });
    const bytes = Buffer.from(await response.arrayBuffer());
    const stored = jar.get(url.host) ?? new Map();
    for (const cookie of response.headers.getSetCookie?.() ?? []) {
      const [pair] = cookie.split(";");
      const index = pair.indexOf("=");
      if (index > 0) stored.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    }
    jar.set(url.host, stored);
    if (isCloudflareChallenge(response.status, response.headers, bytes)) throw new CloudflareError(payload.url);
    return { status: response.status, url: response.url || payload.url, headers: Object.fromEntries(response.headers), body: bytes };
  };
}
