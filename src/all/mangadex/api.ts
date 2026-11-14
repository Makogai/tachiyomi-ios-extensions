// Port of src/all/mangadex/.../MangaDex.kt and MangaDexHelper.kt @ d9420cd1: every API URL the source requests.
// Query parameters are added in upstream's order, so request URLs (and fixture routes) match it.
import { type FilterList, type HttpUrl, type HttpUrlBuilder, type Intl, toHttpUrl } from "@sdk";
import * as MD from "./constants";
import { ARTIST, AUTHOR, COVER_ART, SCANLATION_GROUP, USER } from "./dto";
import { addFiltersToUrl, formatNoOffset } from "./filters";

/** The settings and language every list request filters by (read by index.ts from the preferences). */
export interface ListPrefs {
  translatedLanguages: string[];
  contentRating: string[];
  originalLanguages: string[];
  blockedGroups: string[];
  blockedUploaders: string[];
}

/** Upstream's `HttpUrl.Builder.addQueryParameter(name, Set<String>)`: one parameter per value. */
function addAll(url: HttpUrlBuilder, name: string, values: Iterable<string> | null | undefined): HttpUrlBuilder {
  for (const value of values ?? []) url.addQueryParameter(name, value);
  return url;
}

const getMangaListOffset = (page: number) => String(MD.MANGA_LIMIT * (page - 1));
const getLatestChapterOffset = (page: number) => String(MD.LATEST_CHAPTER_LIMIT * (page - 1));

// Popular

export function popularMangaUrl(page: number, prefs: ListPrefs): HttpUrl {
  const url = toHttpUrl(MD.API_MANGA_URL).newBuilder();
  url.addQueryParameter("order[followedCount]", "desc");
  url.addQueryParameter("hasAvailableChapters", "true");
  addAll(url, "availableTranslatedLanguage[]", prefs.translatedLanguages);
  url.addQueryParameter("limit", String(MD.MANGA_LIMIT));
  url.addQueryParameter("offset", getMangaListOffset(page));
  url.addQueryParameter("includes[]", COVER_ART);
  addAll(url, "contentRating[]", prefs.contentRating);
  addAll(url, "originalLanguage[]", prefs.originalLanguages);
  // LocalDate.now().minusDays(30).atStartOfDay().atZone(UTC): today's local date, at 00:00 UTC.
  const now = new Date();
  url.addQueryParameter("createdAtSince", formatNoOffset(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 30))));
  return url.build();
}

// Latest

export function latestUpdatesUrl(page: number, prefs: ListPrefs): HttpUrl {
  const url = toHttpUrl(MD.API_CHAPTER_URL).newBuilder();
  url.addQueryParameter("offset", getLatestChapterOffset(page));
  url.addQueryParameter("limit", String(MD.LATEST_CHAPTER_LIMIT));
  addAll(url, "translatedLanguage[]", prefs.translatedLanguages);
  url.addQueryParameter("order[publishAt]", "desc");
  // Upstream sends 1 only for Komikku/TachiyomiSY's delegated sources.
  url.addQueryParameter("includeFutureUpdates", "0");
  addAll(url, "originalLanguage[]", prefs.originalLanguages);
  addAll(url, "contentRating[]", prefs.contentRating);
  addAll(url, "excludedGroups[]", new Set([...MD.defaultBlockedGroups, ...prefs.blockedGroups]));
  addAll(url, "excludedUploaders[]", prefs.blockedUploaders);
  url.addQueryParameter("includeFuturePublishAt", "0");
  url.addQueryParameter("includeEmptyPages", "0");
  return url.build();
}

/** The manga a chapter feed names, in one request (latestUpdatesParse). */
export function mangaByIdsUrl(mangaIds: string[], contentRating: string[]): HttpUrl {
  const url = toHttpUrl(MD.API_MANGA_URL).newBuilder();
  url.addQueryParameter("includes[]", COVER_ART);
  url.addQueryParameter("limit", String(mangaIds.length));
  addAll(url, "contentRating[]", contentRating);
  addAll(url, "ids[]", mangaIds);
  return url.build();
}

// Search

export const chapterUrl = (chapterId: string) => `${MD.API_CHAPTER_URL}/${chapterId}`;

export const listUrl = (listId: string) => `${MD.API_LIST_URL}/${listId}`;

/** `filters` must be the request's filters, or the defaults when it has none. */
export function searchMangaUrl(page: number, query: string, filters: FilterList, dexLang: string, intl: Intl): HttpUrl {
  if (query.startsWith(MD.PREFIX_ID_SEARCH)) {
    const mangaId = query.slice(MD.PREFIX_ID_SEARCH.length);
    if (!MD.containsUuid(mangaId)) throw new Error(intl.get("invalid_manga_id"));
    const url = toHttpUrl(MD.API_MANGA_URL).newBuilder();
    url.addQueryParameter("ids[]", mangaId);
    url.addQueryParameter("includes[]", COVER_ART);
    addAll(url, "contentRating[]", MD.allContentRatings);
    return url.build();
  }

  const tempUrl = toHttpUrl(MD.API_MANGA_URL).newBuilder();
  tempUrl.addQueryParameter("limit", String(MD.MANGA_LIMIT));
  tempUrl.addQueryParameter("offset", getMangaListOffset(page));
  tempUrl.addQueryParameter("includes[]", COVER_ART);

  if (query.startsWith(MD.PREFIX_GRP_SEARCH)) {
    const groupId = query.slice(MD.PREFIX_GRP_SEARCH.length);
    if (!MD.containsUuid(groupId)) throw new Error(intl.get("invalid_group_id"));
    tempUrl.addQueryParameter("group", groupId);
  } else if (query.startsWith(MD.PREFIX_AUTHOR_SEARCH)) {
    const authorId = query.slice(MD.PREFIX_AUTHOR_SEARCH.length);
    if (!MD.containsUuid(authorId)) throw new Error(intl.get("invalid_author_id"));
    tempUrl.addQueryParameter("authorOrArtist", authorId);
  } else {
    const actualQuery = query.replace(/\s/g, " ");
    if (actualQuery.trim() !== "") tempUrl.addQueryParameter("title", actualQuery);
  }

  return addFiltersToUrl(tempUrl, filters, dexLang).build();
}

/** One page of a custom list's manga (searchMangaListParse); `filters` as for searchMangaUrl. */
export function listMangaUrl(ids: string[], filters: FilterList, dexLang: string): HttpUrl {
  const tempUrl = toHttpUrl(MD.API_MANGA_URL).newBuilder();
  tempUrl.addQueryParameter("limit", String(MD.MANGA_LIMIT));
  tempUrl.addQueryParameter("offset", "0");
  tempUrl.addQueryParameter("includes[]", COVER_ART);
  addAll(tempUrl, "ids[]", ids);
  return addFiltersToUrl(tempUrl, filters, dexLang).build();
}

export function searchMangaUploaderUrl(page: number, uploader: string, prefs: ListPrefs): HttpUrl {
  const url = toHttpUrl(MD.API_CHAPTER_URL).newBuilder();
  url.addQueryParameter("offset", getLatestChapterOffset(page));
  url.addQueryParameter("limit", String(MD.LATEST_CHAPTER_LIMIT));
  addAll(url, "translatedLanguage[]", prefs.translatedLanguages);
  url.addQueryParameter("order[publishAt]", "desc");
  url.addQueryParameter("includeFutureUpdates", "0");
  url.addQueryParameter("includeFuturePublishAt", "0");
  url.addQueryParameter("includeEmptyPages", "0");
  url.addQueryParameter("uploader", uploader);
  addAll(url, "originalLanguage[]", prefs.originalLanguages);
  addAll(url, "contentRating[]", prefs.contentRating);
  addAll(url, "excludedGroups[]", new Set([...MD.defaultBlockedGroups, ...prefs.blockedGroups]));
  addAll(url, "excludedUploaders[]", prefs.blockedUploaders);
  return url.build();
}

// Details

export function mangaDetailsUrl(mangaId: string): HttpUrl {
  const url = toHttpUrl(`${MD.API_URL}/manga/${mangaId}`).newBuilder();
  url.addQueryParameter("includes[]", COVER_ART);
  url.addQueryParameter("includes[]", AUTHOR);
  url.addQueryParameter("includes[]", ARTIST);
  return url.build();
}

/** The 'aggregate' endpoint: a quick list of the chapters (fetchSimpleChapterList). */
export function aggregateUrl(mangaId: string, translatedLanguages: string[]): HttpUrl {
  const url = toHttpUrl(`${MD.API_MANGA_URL}/${mangaId}/aggregate`).newBuilder();
  addAll(url, "translatedLanguage[]", translatedLanguages);
  return url.build();
}

/** The 'cover' endpoint, for the first volume's cover in each manga's original language. */
export function coverListUrl(mangaIds: Iterable<string>, locales: string[], limit: number): HttpUrl {
  const apiUrl = toHttpUrl(`${MD.API_URL}/cover`).newBuilder();
  apiUrl.addQueryParameter("order[volume]", "asc");
  addAll(apiUrl, "manga[]", mangaIds);
  addAll(apiUrl, "locales[]", locales);
  apiUrl.addQueryParameter("limit", String(limit));
  apiUrl.addQueryParameter("offset", "0");
  return apiUrl.build();
}

// Chapters

/** Required because the chapter list API endpoint is paginated (helper.getChapterEndpoint). */
export function paginatedChapterListUrl(mangaId: string, offset: number, prefs: ListPrefs, includeUnavailable: boolean): HttpUrl {
  const url = toHttpUrl(`${MD.API_MANGA_URL}/${mangaId}/feed`).newBuilder();
  url.addQueryParameter("includes[]", SCANLATION_GROUP);
  url.addQueryParameter("includes[]", USER);
  url.addQueryParameter("limit", "500");
  url.addQueryParameter("offset", String(offset));
  url.addQueryParameter("order[volume]", "desc");
  url.addQueryParameter("order[chapter]", "desc");
  url.addQueryParameter("includeFuturePublishAt", "0");
  addAll(url, "translatedLanguage[]", prefs.translatedLanguages);
  addAll(url, "contentRating[]", MD.allContentRatings);
  addAll(url, "excludedGroups[]", prefs.blockedGroups);
  addAll(url, "excludedUploaders[]", prefs.blockedUploaders);
  url.addQueryParameter("includeUnavailable", includeUnavailable ? "1" : "0");
  return url.build();
}

// Pages

/** The MD@Home server for a chapter's images; also the URL to ask again when it expires. */
export function atHomeServerUrl(chapterId: string, forceStandardHttps: boolean): string {
  return forceStandardHttps ? `${MD.API_URL}/at-home/server/${chapterId}?forcePort443=true` : `${MD.API_URL}/at-home/server/${chapterId}`;
}
