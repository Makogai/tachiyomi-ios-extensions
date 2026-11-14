// Port of src/en/weebcentral/.../WeebCentral.kt @ d9420cd1: the URLs each call requests.
import { type FilterList, type HttpUrl, toHttpUrl, toHttpUrlOrNull } from "@sdk";
import { isUriFilter } from "./filters";

// The related "&limit=" query parameter of the api is currently non functional
// and always returns 32 entries per request
const FETCH_LIMIT = 32;

const excludedSearchCharacters = /[!#:(),-]/g;

/** Popular, latest and search all use the search endpoint; the filters add their parameters. */
export function searchUrl(baseUrl: string, page: number, query: string, filters: FilterList): HttpUrl {
  const builder = toHttpUrl(`${baseUrl}/search/data`).newBuilder();
  builder.addQueryParameter("text", query.replace(excludedSearchCharacters, " ").trim());
  for (const filter of filters) {
    if (isUriFilter(filter)) filter.addToUri(builder);
  }
  builder.addQueryParameter("limit", String(FETCH_LIMIT));
  builder.addQueryParameter("offset", String((page - 1) * FETCH_LIMIT));
  builder.addQueryParameter("display_mode", "Full Display");
  return builder.build();
}

/** Every chapter of a series, newest first (the series page only shows the latest few). */
export function chapterListUrl(baseUrl: string, mangaUrl: string): string {
  const seriesId = toHttpUrl(baseUrl + mangaUrl).pathSegments[1];
  return `${baseUrl}/series/${seriesId}/full-chapter-list`;
}

/** A chapter's images in long-strip mode. */
export function pageListUrl(baseUrl: string, chapterUrl: string): string {
  return (
    toHttpUrlOrNull(baseUrl + chapterUrl)
      ?.newBuilder()
      .addPathSegment("images")
      .addQueryParameter("is_prev", "False")
      .addQueryParameter("reading_style", "long_strip")
      .build()
      .toString() ?? baseUrl + chapterUrl
  );
}
