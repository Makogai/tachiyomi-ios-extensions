// Port of src/en/comix/.../Comix.kt @ d9420cd1: the browse, search and tag URLs, and the WebView runs that load them.
import { type FilterList, type HttpUrl, type HttpUrlBuilder, toHttpUrl, type WebViewOptions } from "@sdk";
import { isTermFilter, isUriFilter } from "./filters";
import { bootstrapScript, browseFlow, chaptersFlow, INITIAL_DATA_POLL, readerFlow } from "./webview";

const WEBVIEW_TIMEOUT_MS = 120_000;
const CHAPTER_LIST_TIMEOUT_MS = 20 * 60_000;
export const READER_TIMEOUT_MS = 240_000;
export const READER_PAGE_TIMEOUT_MS = 120_000;

// Browse and search

/** `/browse` sorted by `order` (a query key such as `order[score]`), with the settings' default filters. */
export function browseUrl(baseUrl: string, order: string, page: number, preferenceFilters: FilterList): HttpUrl {
  const builder = toHttpUrl(baseUrl).newBuilder();
  builder.addPathSegment("browse");
  builder.addQueryParameter(order, "desc");
  builder.addQueryParameter("page", String(page));
  applyPreferenceFilters(builder, preferenceFilters);
  return builder.build();
}

/** Popular and latest apply only the filters that stand for settings (upstream's PreferenceFilter). */
export function applyPreferenceFilters(builder: HttpUrlBuilder, filters: FilterList): void {
  for (const filter of filters) {
    if (isUriFilter(filter) && filter.isPreferenceFilter) filter.addToUri(builder);
  }
}

/** Resolved author, artist and tag IDs from the text filters. */
export interface TermIds {
  authorIds: string[];
  artistIds: string[];
  tagIds: string[];
}

export function searchUrl(baseUrl: string, page: number, query: string, filters: FilterList, ids: TermIds): HttpUrl {
  const hasTermSelection = filters.some((it) => isTermFilter(it) && it.hasSelection) || ids.tagIds.length > 0;
  const builder = toHttpUrl(baseUrl).newBuilder().addPathSegment("browse");
  for (const filter of filters) {
    if (!isUriFilter(filter)) continue;
    if (filter.requiresTermSelection && !hasTermSelection) continue;
    filter.addToUri(builder, query);
  }
  ids.authorIds.forEach((it) => builder.addQueryParameter("authors[]", it));
  ids.artistIds.forEach((it) => builder.addQueryParameter("artists[]", it));
  ids.tagIds.forEach((it) => builder.addQueryParameter("genres_in[]", it));
  if (query.trim() !== "") builder.addQueryParameter("keyword", query);
  builder.addQueryParameter("page", String(page));
  return builder.build();
}

/** The site's tag search (`type` is author, artist or tag), answered over plain HTTP. */
export function tagSearchUrl(baseUrl: string, type: string, name: string): HttpUrl {
  return toHttpUrl(baseUrl)
    .newBuilder()
    .addPathSegments("api/v1/tags/search")
    .addQueryParameter("type", type)
    .addQueryParameter("q", name)
    .addQueryParameter("limit", "20")
    .build();
}

// WebView runs (upstream's runInWebView calls)

export function browseWebView(url: HttpUrl, solveCaptchas: boolean): WebViewOptions {
  return { url: url.toString(), script: bootstrapScript(solveCaptchas, browseFlow()), timeoutMs: WEBVIEW_TIMEOUT_MS, loadImages: false };
}

/** The title page, read until its `script#initial-data` is complete. */
export function detailsWebView(url: string, solveCaptchas: boolean): WebViewOptions {
  return { url, script: bootstrapScript(solveCaptchas, ""), pollScript: INITIAL_DATA_POLL, timeoutMs: WEBVIEW_TIMEOUT_MS };
}

export function chaptersWebView(mangaUrl: string, mangaId: string, knownIds: number[], solveCaptchas: boolean): WebViewOptions {
  return {
    url: mangaUrl,
    script: bootstrapScript(solveCaptchas, chaptersFlow(mangaId, knownIds)),
    timeoutMs: CHAPTER_LIST_TIMEOUT_MS,
    loadImages: false,
  };
}

export function readerWebView(chapterUrl: string, seek: number, onlyIndex: number, timeoutMs: number, solveCaptchas: boolean): WebViewOptions {
  return { url: chapterUrl, script: bootstrapScript(solveCaptchas, readerFlow(seek, onlyIndex)), timeoutMs, loadImages: true };
}
