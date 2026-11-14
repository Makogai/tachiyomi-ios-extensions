// Loads a built extension (dist/<pkg>.js) into a fresh JavaScript context with the fake host and
// calls it the way the app does. Results are shaped like the app's JSON (JSSource +
// ExtensionConformanceTests), so tests.json means the same thing here and in the app.
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { distDir } from "./extensions.mjs";

export class LoadedExtension {
  constructor(pkg, host) {
    const file = path.join(distDir, `${pkg}.js`);
    const code = readFileSync(file, "utf8");
    // Only ECMAScript built-ins and __host, as in JavaScriptCore: no URL, fetch, timers or Buffer.
    const context = vm.createContext({ __host: host });
    vm.runInContext(`${code}\n;globalThis.__result = __extension.default;`, context, { filename: `${pkg}.js` });
    this.pkg = pkg;
    this.exports = context.__result;
    if (!this.exports || !Array.isArray(this.exports.sources)) throw new Error(`${pkg}: no default defineExtension(...) export`);
    this.sources = this.exports.sources.map((_, index) => JSON.parse(this.exports.describe(index)));
  }

  /** Calls `method` on source `index` through `invoke`, as the app does, and parses the JSON result. */
  invoke(index, method, args) {
    return new Promise((resolve, reject) => {
      this.exports.invoke(index, method, JSON.stringify(args), (error, json) => {
        if (error !== null && error !== undefined) reject(new Error(error));
        else resolve(JSON.parse(json ?? "null"));
      });
    });
  }
}

// The app's model types, so results drop and default fields the same way.

const MANGA_FIELDS = ["url", "title", "artist", "author", "description", "genre", "status", "thumbnail_url", "update_strategy", "initialized"];

function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== null && value !== undefined));
}

/** A `JSManga` as the app encodes it. */
export function appManga(manga) {
  return compact(Object.fromEntries(MANGA_FIELDS.map((field) => [field, manga?.[field] ?? null])));
}

/** Swift's `Float` keeps about 7 digits and prints the shortest form that round-trips. */
function float32(value) {
  const rounded = Math.fround(value);
  for (let digits = 1; digits <= 9; digits++) {
    const candidate = Number(rounded.toPrecision(digits));
    if (Math.fround(candidate) === rounded) return candidate;
  }
  return rounded;
}

export function appChapter(chapter) {
  return compact({
    url: chapter.url,
    name: chapter.name,
    date_upload: Math.trunc(chapter.date_upload ?? 0),
    chapter_number: float32(chapter.chapter_number ?? -1),
    scanlator: chapter.scanlator ?? null,
  });
}

export function appPage(page) {
  return compact({ index: page.index, url: page.url ?? "", imageUrl: page.imageUrl ?? null });
}

/** A new SManga as the app makes one from a test's `{url, title}`. */
function inputManga(arg = {}) {
  return { url: String(arg.url ?? ""), title: String(arg.title ?? ""), status: 0, update_strategy: 0, initialized: false };
}

/** `SManga.merging` from MangaCore/Models.swift. */
function mergeManga(base, other) {
  const merged = { ...base };
  if (other.url) merged.url = other.url;
  if (other.title) merged.title = other.title;
  for (const field of ["author", "artist", "description", "genre", "thumbnail_url"]) {
    if (other[field] !== null && other[field] !== undefined) merged[field] = other[field];
  }
  merged.status = other.status ?? 0;
  merged.update_strategy = other.update_strategy ?? 0;
  merged.initialized = Boolean(base.initialized || other.initialized);
  return merged;
}

export const CALLS = ["popular", "latest", "search", "details", "chapters", "mangaUpdate", "pages", "imageURL", "imageTransform", "filters"];

/** Runs one tests.json call (`popular`, `search`, `details`, …) and returns the app-shaped result. */
export async function performCall(extension, sourceIndex, call, args = []) {
  const source = extension.sources[sourceIndex];
  if (!source) throw new Error(`${extension.pkg} has no source ${sourceIndex} (it has ${extension.sources.length})`);
  const page = (result) => ({ mangas: (result?.mangas ?? []).map(appManga), hasNextPage: Boolean(result?.hasNextPage) });
  const invoke = (method, methodArgs) => extension.invoke(sourceIndex, method, methodArgs);
  switch (call) {
    case "popular":
      return page(await invoke("getPopularManga", [args[0] ?? 1]));
    case "latest":
      if (!source.supportsLatest) throw new Error("Latest updates are not supported by this source");
      return page(await invoke("getLatestUpdates", [args[0] ?? 1]));
    case "search":
      return page(await invoke("getSearchManga", [args[0] ?? 1, args[1] ?? "", args[2] ?? []]));
    case "details": {
      const manga = inputManga(args[0]);
      const update = await invoke("getMangaUpdate", [manga, [], true, false]);
      return appManga({ ...mergeManga(manga, update.manga), initialized: true });
    }
    case "chapters":
      return (await invoke("getMangaUpdate", [inputManga(args[0]), [], false, true])).chapters.map(appChapter);
    case "mangaUpdate": {
      const update = await invoke("getMangaUpdate", [inputManga(args[0]), [], true, true]);
      return { manga: appManga(update.manga), chapters: update.chapters.map(appChapter) };
    }
    case "pages": {
      const chapter = { url: String(args[0]?.url ?? ""), name: String(args[0]?.name ?? ""), date_upload: 0, chapter_number: -1 };
      return (await invoke("getPageList", [chapter])).map(appPage);
    }
    case "imageURL":
      return invoke("getImageUrl", [{ index: Number(args[0]?.index ?? 0), url: String(args[0]?.url ?? "") }]);
    case "imageTransform": {
      const pageArg = { index: Number(args[0]?.index ?? 0), url: String(args[0]?.url ?? ""), imageUrl: args[0]?.imageUrl ?? null };
      return invoke("getImageTransform", [pageArg, args[1], args[2]]);
    }
    case "filters":
      return invoke("getFilterList", []);
    default:
      throw new Error(`Unknown call ${call} in tests.json (known: ${CALLS.join(", ")})`);
  }
}
