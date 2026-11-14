// Saving responses as fixtures and routing them in tests.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const testsFile = (extension) => path.join(extension.dir, "tests.json");

export function loadTestsFile(extension) {
  const file = testsFile(extension);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { routes: [], cases: [], live: [] };
}

export function saveTestsFile(extension, spec) {
  writeFileSync(testsFile(extension), JSON.stringify(spec, null, 2) + "\n");
}

/** `fixtures/<name>.<html|json|js|txt>` from the content type (or the body when it is unclear). */
function extensionFor(contentType, body) {
  const type = (contentType ?? "").toLowerCase();
  if (type.includes("json")) return "json";
  if (type.includes("javascript")) return "js";
  if (type.includes("html") || type.includes("xml")) return "html";
  const start = body.subarray(0, 200).toString("utf8").trimStart();
  if (start.startsWith("{") || start.startsWith("[")) return "json";
  if (start.startsWith("<")) return "html";
  return "txt";
}

const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "response";

/** A default fixture name from the URL: the last meaningful path segment. */
export function nameFromUrl(url) {
  const parsed = new URL(url);
  const segments = parsed.pathname.split("/").filter(Boolean);
  return slug(segments.at(-1) ?? parsed.hostname);
}

/**
 * Writes `body` to fixtures/ and routes `url` to it (replacing an existing route for the same URL).
 * Returns the fixture's path relative to the extension, or null when the URL already has a route
 * and `refresh` is false.
 */
export function saveFixture(extension, { url, body, contentType, name, match, refresh = true }) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body ?? "", "utf8");
  const routeUrl = url.split("#")[0];
  const spec = loadTestsFile(extension);
  spec.routes ??= [];
  const existing = spec.routes.find((route) => route.url === routeUrl);
  if (existing && !refresh) return null;
  let file = existing?.file;
  if (!file) {
    const base = slug(name ?? nameFromUrl(url));
    const ext = extensionFor(contentType, bytes);
    file = `fixtures/${base}.${ext}`;
    for (let n = 2; existsSync(path.join(extension.dir, file)); n++) file = `fixtures/${base}_${n}.${ext}`;
  }
  mkdirSync(path.join(extension.dir, "fixtures"), { recursive: true });
  writeFileSync(path.join(extension.dir, file), bytes);
  if (!existing) spec.routes.push({ url: routeUrl, ...(match ? { match } : {}), file });
  saveTestsFile(extension, spec);
  return file;
}

/** A first set of expectations for a result, so a captured call becomes a test quickly. */
export function suggestExpectations(call, result) {
  const pick = (object, prefix, fields) =>
    Object.fromEntries(fields.filter((field) => object?.[field] !== undefined && object?.[field] !== null).map((field) => [`${prefix}${field}`, object[field]]));
  switch (call) {
    case "popular":
    case "latest":
    case "search":
      return { "mangas.length": result.mangas.length, ...pick(result.mangas[0], "mangas.0.", ["title", "url"]), hasNextPage: result.hasNextPage };
    case "details":
      return pick(result, "", ["title", "author", "status"]);
    case "chapters":
      return { length: result.length, ...pick(result[0], "0.", ["name", "url"]) };
    case "mangaUpdate":
      return { ...pick(result.manga, "manga.", ["title", "author", "status"]), "chapters.length": result.chapters.length, ...pick(result.chapters[0], "chapters.0.", ["name", "url"]) };
    case "pages":
      return { length: result.length, ...pick(result[0], "0.", ["imageUrl"]) };
    case "imageURL":
      return { "": result };
    default:
      return {};
  }
}

/** Adds (or replaces, by name) a fixture case. */
export function addCase(extension, testCase) {
  const spec = loadTestsFile(extension);
  spec.cases = (spec.cases ?? []).filter((existing) => existing.name !== testCase.name);
  spec.cases.push(testCase);
  saveTestsFile(extension, spec);
}
