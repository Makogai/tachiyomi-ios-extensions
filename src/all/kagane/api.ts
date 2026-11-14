// Port of src/all/kagane/.../Kagane.kt @ d9420cd1: the API URLs and the search request body.
import { type FilterList, type HttpUrl, toHttpUrl } from "@sdk";
import {
  ChapterCountFilter,
  GenresFilter,
  GroupsSearchFilter,
  isJsonFilter,
  type JsonObject,
  MatchAllGenresFilter,
  MatchAllTagsFilter,
  SortFilter,
  SourcesFilter,
  StaffSearchFilter,
  TagsSearchFilter,
  YearFilter,
} from "./filters";

const MAX_SOURCE_FILTER = 50;

// Search

/** `/search/series`, zero-based pages of 35, sorted by the Sort filter's value. */
export function searchMangaUrl(apiUrl: string, page: number, sortParam: string): HttpUrl {
  const url = toHttpUrl(`${apiUrl}/search/series`).newBuilder();
  url.addQueryParameter("page", String(page - 1));
  url.addQueryParameter("size", String(35)); // Default items per request
  if (sortParam !== "") url.addQueryParameter("sort", sortParam);
  return url.build();
}

/** The Sort filter's value, or "" (the API's default order). */
export function sortParamOf(filters: FilterList): string {
  let sortParam = "";
  for (const filter of filters) {
    if (filter instanceof SortFilter) sortParam = filter.toUriPart();
  }
  return sortParam;
}

/**
 * The JSON body of a search, from the query, the filters, the source display mode and the
 * source's languages. Staff and group names are turned into IDs with the given lookups, which
 * run in filter order as upstream's do.
 */
export async function searchMangaBody(
  query: string,
  filters: FilterList,
  displayMode: string,
  langs: string[],
  resolveStaff: (input: string) => Promise<[string[], string[]]>,
  resolveGroups: (input: string) => Promise<[string[], string[]]>,
): Promise<JsonObject> {
  const body: JsonObject = {};
  if (query.trim() !== "") {
    body["title"] = query;
  }

  body["source_type"] = displayMode === "official" ? ["Official"] : ["Official", "Unofficial", "Mixed"];

  let genresMatchAll: boolean | null = null;
  let tagsMatchAll: boolean | null = null;

  for (const filter of filters) {
    if (filter instanceof MatchAllGenresFilter) {
      genresMatchAll = filter.state ? true : null;
    } else if (filter instanceof MatchAllTagsFilter) {
      tagsMatchAll = filter.state ? true : null;
    }
  }

  for (const filter of filters) {
    if (filter instanceof GenresFilter) {
      filter.addToJsonObject(body, "genres", genresMatchAll);
    } else if (filter instanceof TagsSearchFilter) {
      const rawInput = filter.state.trim();
      if (rawInput !== "") {
        const tagEntries = rawInput
          .split(",")
          .map((entry) => entry.trim())
          .filter((entry) => entry !== "");

        const includeIds: string[] = [];
        const excludeIds: string[] = [];

        for (const entry of tagEntries) {
          const isExclude = entry.startsWith("-");
          const tagName = isExclude ? entry.slice(1).trim() : entry;

          const tagId = filter.tagData[tagName.toLowerCase()];
          if (tagId !== undefined) {
            if (isExclude) excludeIds.push(tagId);
            else includeIds.push(tagId);
          }
        }

        if (includeIds.length > 0 || excludeIds.length > 0) {
          const tags: JsonObject = {};
          if (tagsMatchAll === true) {
            tags["match_all"] = true;
          }
          tags["values"] = includeIds;
          if (excludeIds.length > 0) {
            tags["exclude"] = excludeIds;
          }
          body["tags"] = tags;
        }
      }
    } else if (filter instanceof SourcesFilter) {
      if (filter.state.filter((option) => option.state).length > MAX_SOURCE_FILTER) {
        throw new Error(`Select at most ${MAX_SOURCE_FILTER} sources in the Sources filter`);
      }
      filter.addToJsonObject(body);
    } else if (filter instanceof StaffSearchFilter) {
      const [include, exclude] = await resolveStaff(filter.state);
      if (include.length > 0 || exclude.length > 0) {
        const staff: JsonObject = { values: [...new Set(include)] };
        if (exclude.length > 0) staff["exclude"] = [...new Set(exclude)];
        body["staff"] = staff;
      }
    } else if (filter instanceof GroupsSearchFilter) {
      const [include, exclude] = await resolveGroups(filter.state);
      if (include.length > 0 || exclude.length > 0) {
        const groups: JsonObject = { values: [...new Set(include)] };
        if (exclude.length > 0) groups["exclude"] = [...new Set(exclude)];
        body["groups"] = groups;
      }
    } else if (filter instanceof YearFilter) {
      const range = filter.parseRange();
      if (range !== null) {
        const year: JsonObject = {};
        if (range[0] !== null) year["min"] = range[0];
        if (range[1] !== null) year["max"] = range[1];
        body["start_year"] = year;
      }
    } else if (filter instanceof ChapterCountFilter) {
      const range = filter.parseRange();
      if (range !== null) {
        const books: JsonObject = {};
        if (range[0] !== null) books["min"] = range[0];
        if (range[1] !== null) books["max"] = range[1];
        body["current_books"] = books;
      }
    } else if (isJsonFilter(filter)) {
      filter.addToJsonObject(body);
    }
  }

  // Add languages specific to this source instance
  body["content_lang"] = langs;
  return body;
}

/** Comma-separated names, `-name` to exclude, turned into [include, exclude] IDs with `search`. */
export async function resolveMemberEntries(input: string, search: (name: string) => Promise<string[]>): Promise<[string[], string[]]> {
  const include: string[] = [];
  const exclude: string[] = [];
  for (const entry of input.split(",")) {
    const trimmed = entry.trim();
    if (trimmed === "") continue;
    const isExclude = trimmed.startsWith("-");
    const name = isExclude ? trimmed.slice(1).trim() : trimmed;
    if (name === "") continue;
    for (const id of await search(name)) {
      if (isExclude) exclude.push(id);
      else include.push(id);
    }
  }
  return [include, exclude];
}

export function groupSearchUrl(apiUrl: string, name: string): HttpUrl {
  return toHttpUrl(`${apiUrl}/groups/search`).newBuilder().addQueryParameter("q", name).addQueryParameter("limit", "8").build();
}

// Details and chapters

export function seriesUrl(apiUrl: string, seriesId: string): string {
  return `${apiUrl}/series/${seriesId}`;
}

export function bookIndexUrl(apiUrl: string, seriesId: string): string {
  return `${apiUrl}/series/${seriesId}/books/index?fields=List`;
}

export function trackerSeriesUrl(apiUrl: string, trackerId: string): string {
  return `${apiUrl}/trackers/${trackerId}/series`;
}

// Pages

/** The read challenge for a book; answered with the page manifest and an access token. */
export function challengeUrl(apiUrl: string, chapterId: string): HttpUrl {
  return toHttpUrl(`${apiUrl}/books/${chapterId}`).newBuilder().addQueryParameter("intent", "Read").build();
}

export function pageImageUrl(cacheUrl: string, dataSaver: boolean, chapterId: string, file: string, token: string): string {
  return toHttpUrl(`${cacheUrl}/api/v2/books/page`)
    .newBuilder()
    .addPathSegment(dataSaver ? "datasaver" : "original")
    .addPathSegment(chapterId)
    .addPathSegment(file)
    .addQueryParameter("token", token)
    .build()
    .toString();
}

/** A page URL with the book's token replaced by `token` (the first half of upstream's Request.withToken). */
export function withToken(url: HttpUrl, token: string): string {
  return url.newBuilder().setQueryParameter("token", token).build().toString();
}
