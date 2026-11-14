// Port of src/en/asurascans/.../AsuraScans.kt @ d9420cd1: the API and page URLs.
import { type FilterList, type HttpUrl, substringAfter, substringBefore, toHttpUrl } from "@sdk";
import { isUriFilter } from "./filters";

export const API_URL = "https://api.asurascans.com/api";

const PER_PAGE_LIMIT = 20;
const OLD_FORMAT_MANGA_REGEX = /^\/manga\/(\d+-)?([^/]+)\/?$/;

/** Popular, latest and search: the series API with the filters' parameters. */
export function searchUrl(page: number, query: string, filters: FilterList): HttpUrl {
  const url = toHttpUrl(`${API_URL}/series`).newBuilder();
  url.addQueryParameter("offset", String((page - 1) * PER_PAGE_LIMIT));
  url.addQueryParameter("limit", String(PER_PAGE_LIMIT));
  if (query.trim() !== "") {
    url.addQueryParameter("search", query);
  }

  for (const filter of filters) {
    if (isUriFilter(filter)) filter.addToUri(url);
  }
  return url.build();
}

/** The genres for the filters come from the browse page, the creators from the API. */
export function browseUrl(baseUrl: string): string {
  return `${baseUrl}/browse`;
}

export function creatorsUrl(): string {
  return `${API_URL}/creators`;
}

/** The series slug of any manga URL this source has stored (`/series/x`, `/comics/x`, old `/manga/1-x/`). */
export function getMangaSlug(url: string): string {
  if (url.includes("/series/")) return substringBefore(substringAfter(url, "/series/"), "/");
  if (url.includes("/comics/")) return substringBefore(substringAfter(url, "/comics/"), "/");
  if (url.includes("/manga/")) {
    return OLD_FORMAT_MANGA_REGEX.exec(url)?.[2] ?? substringBefore(substringAfter(url, "/manga/"), "/");
  }
  return url.replace(/^\/+|\/+$/g, "");
}
