// Port of src/en/comix/.../Dto.kt and Comix.kt @ d9420cd1: site data → SManga, SChapter and the chapter list.
// The SDK has no `memo`, so a chapter's votes, group and "official" flag travel as a ChapterMeta.
import { type HttpUrl, HttpUrl as Url, type Response, removePrefix, removeSuffix, SChapter, SManga, substringBefore, type WebViewResult } from "@sdk";
import type { ScrambleInfo } from "./descrambler";
import type { CaptureMessage, Chapter, ChapterMeta, Manga, PageMessage, Poster, Queries, SearchItems } from "./dto";
import { MarkdownDescriptionBuilder } from "./markdown";
import { messagesOf } from "./webview";

const OFFICIAL_GROUP_ID = 10702;

// Browse

export function posterFrom(poster: Poster | null | undefined, baseUrl: HttpUrl, quality: string | null): string | null {
  if (!poster) return null;
  let path: string | null | undefined;
  if (quality === "large") path = poster.large ?? poster.medium ?? poster.small;
  else if (quality === "small") path = poster.small ?? poster.medium ?? poster.large;
  else path = poster.medium ?? poster.large ?? poster.small;
  return path ? (baseUrl.resolve(path)?.toString() ?? null) : null;
}

const substringAfterTitle = (url: string) => {
  const index = url.indexOf("/title");
  return index < 0 ? url : url.slice(index + "/title".length);
};

export function toBasicSManga(manga: Manga, baseUrl: HttpUrl, posterQuality: string | null): SManga {
  const result = SManga.create();
  result.url = manga.url != null ? substringAfterTitle(manga.url) : `/${manga.hid}`;
  result.title = manga.title;
  result.thumbnail_url = posterFrom(manga.poster, baseUrl, posterQuality);
  return result;
}

export function hasNextPage(items: SearchItems): boolean {
  const meta = items.meta ?? items.pagination;
  if (!meta) return false;
  return (meta.page ?? 1) < Math.max(meta.lastPage ?? 1, meta.last_page ?? 1);
}

// Details

/** The manga detail among the title page's initial-data queries (upstream's JsonObject.mangaDetail). */
export function mangaDetail(queries: Queries): Manga {
  const entry = Object.entries(queries).find(([key]) => key.includes('"detail"'));
  if (!entry || !entry[1] || typeof entry[1] !== "object") throw new Error("Could not find manga detail in queries");
  return entry[1] as Manga;
}

function getTrackerLinks(links: Record<string, string | null> | null | undefined): [string, string | null][] {
  if (!links) return [];
  const siteNames: Record<string, string> = { al: "AniList", mal: "MyAnimeList", mu: "MangaUpdates", md: "MangaDex", mb: "MangaBaka" };
  const known = Object.entries(siteNames).map(([key, name]): [string, string | null] => [name, links[key] ?? null]);
  const unknown = Object.entries(links)
    .filter(([key]) => !(key in siteNames))
    .map(([key, url]): [string, string | null] => [key.toUpperCase(), url?.startsWith("http") ? url : null]);
  return [...known, ...unknown];
}

// Tags are separate from the curated genres in the site's detail UI.
function getGenres(manga: Manga, showTags: boolean): string {
  const list: string[] = [];
  switch (manga.type ?? "") {
    case "manhwa":
      list.push("Manhwa");
      break;
    case "manhua":
      list.push("Manhua");
      break;
    case "manga":
      list.push("Manga");
      break;
    default:
      list.push("Other");
  }
  (manga.genres ?? manga.genre)?.forEach((it) => list.push(it.title));
  (manga.demographics ?? manga.demographic)?.forEach((it) => list.push(it.title));
  if (showTags) manga.tags?.forEach((it) => list.push(it.title));
  const contentRating = manga.contentRating ?? "safe";
  if (contentRating === "erotica" || contentRating === "pornographic") list.push("NSFW");
  return [...new Set(list)].join(", ");
}

export function toSManga(
  manga: Manga,
  baseUrl: HttpUrl,
  posterQuality: string | null,
  altTitlesInDesc: boolean,
  scorePosition: string,
  showExtraInfo: boolean,
  showTags: boolean,
): SManga {
  const result = toBasicSManga(manga, baseUrl, posterQuality);
  result.author = (manga.authors ?? manga.author)?.map((it) => it.title).join(", ") ?? null;
  result.artist = (manga.artists ?? manga.artist)?.map((it) => it.title).join(", ") ?? null;

  const builder = new MarkdownDescriptionBuilder();
  const score = (manga.ratedAvg ?? 0) > 0 ? manga.ratedAvg! : null;
  if (scorePosition === "top") builder.rating(score);
  builder.markdown(manga.synopsis);
  if (altTitlesInDesc) builder.altTitles(manga.altTitles?.length ? manga.altTitles : (manga.alt_titles ?? []));
  if (showExtraInfo) {
    const contentRating = manga.contentRating ?? "safe";
    builder.field("Year", manga.year != null && manga.year > 0 ? String(manga.year) : null);
    builder.field("Language", manga.originalLanguage?.toUpperCase());
    builder.field("Content rating", contentRating.charAt(0).toUpperCase() + contentRating.slice(1));
    builder.field("Rank", (manga.rank ?? 0) > 0 ? `#${manga.rank}` : null);
    builder.field("Rated by", (manga.ratedCount ?? 0) > 0 ? String(manga.ratedCount) : null);
    builder.field("Followed by", (manga.followsTotal ?? 0) > 0 ? String(manga.followsTotal) : null);
    builder.links(getTrackerLinks(manga.links), "Trackers");
  }
  if (scorePosition === "bottom") builder.rating(score);
  result.description = builder.build();
  result.initialized = true;
  switch (manga.status ?? "") {
    case "releasing":
      result.status = SManga.ONGOING;
      break;
    case "on_hiatus":
      result.status = SManga.ON_HIATUS;
      break;
    case "finished":
      result.status = SManga.COMPLETED;
      break;
    case "discontinued":
      result.status = SManga.CANCELLED;
      break;
    default:
      result.status = SManga.UNKNOWN;
  }
  result.genre = getGenres(manga, showTags);
  return result;
}

// Chapters

export function chapterToSChapter(chapter: Chapter, mangaSlug: string): { chapter: SChapter; meta: ChapterMeta } {
  const result = SChapter.create();
  const url = chapter.url ?? "";
  const number = removeSuffix(String(chapter.number), ".0");
  const index = url.indexOf("/title/");
  result.url = index !== -1 ? url.slice(index + 1) : `title/${mangaSlug}/${chapter.id}-chapter-${number}`;
  result.name = `Chapter ${number}` + (chapter.name ? `: ${chapter.name}` : "");
  result.date_upload = parseRelativeDate(chapter.createdAtFormatted ?? "");
  result.chapter_number = chapter.number;
  result.scanlator = chapter.group != null ? chapter.group.name : chapter.isOfficial ? "Official" : "Unknown";
  return {
    chapter: result,
    meta: { id: chapter.id, votes: chapter.votes ?? 0, official: chapter.isOfficial ?? false, groupId: chapter.group?.id ?? null },
  };
}

/** A chapter's numeric ID, from its meta or from its URL (upstream reads it from the memo). */
export function chapterId(chapter: SChapter, chapterUrl: string, metas?: Map<string, ChapterMeta>): number | null {
  const meta = metas?.get(chapter.url);
  if (meta) return meta.id;
  const segments = Url.parse(chapterUrl)?.pathSegments;
  const last = segments?.[segments.length - 1];
  if (last === undefined) return null;
  const id = substringBefore(last, "-chapter-");
  return /^-?\d+$/.test(id) ? Number(id) : null;
}

/** The manga's numeric ID, the part of its URL before the first "-". */
export function mangaIdOf(mangaUrl: string): string {
  return substringBefore(removePrefix(mangaUrl, "/"), "-");
}

/** Upstream's selectChapters and deduplicateChapters: unique, not blacklisted, best of each number, newest first. */
export function selectChapters(
  allChapters: SChapter[],
  shouldDeduplicate: boolean,
  scanlatorBlacklist: Set<string>,
  metas: Map<string, ChapterMeta>,
  chapterUrl: (chapter: SChapter) => string,
): SChapter[] {
    const seenUrls = new Set<string>();
    const uniqueChapters = allChapters.filter((it) => (seenUrls.has(it.url) ? false : (seenUrls.add(it.url), true)));
    const groupId = (chapter: SChapter) => metas.get(chapter.url)?.groupId ?? null;
    const filteredChapters =
      scanlatorBlacklist.size === 0
        ? uniqueChapters
        : uniqueChapters.filter(
            (chapter) =>
              !scanlatorBlacklist.has((chapter.scanlator ?? "").trim().toLowerCase()) &&
              !(groupId(chapter) !== null && scanlatorBlacklist.has(String(groupId(chapter)))),
          );

    let finalChapters = filteredChapters;
    if (shouldDeduplicate) {
      const chapterMap = new Map<number, SChapter>();
      const votes = (chapter: SChapter) => metas.get(chapter.url)?.votes ?? 0;
      const isOfficial = (chapter: SChapter) => metas.get(chapter.url)?.official === true;
      for (const ch of filteredChapters) {
        const key = ch.chapter_number;
        const current = chapterMap.get(key);
        if (current === undefined) {
          chapterMap.set(key, ch);
          continue;
        }
        const newIsOfficial = isOfficial(ch);
        const currentIsOfficial = isOfficial(current);
        const newIsOfficialGroup = groupId(ch) === OFFICIAL_GROUP_ID;
        const currentIsOfficialGroup = groupId(current) === OFFICIAL_GROUP_ID;
        let better: boolean;
        if (newIsOfficial && !currentIsOfficial) better = true;
        else if (!newIsOfficial && currentIsOfficial) better = false;
        else if (newIsOfficialGroup && !currentIsOfficialGroup) better = true;
        else if (!newIsOfficialGroup && currentIsOfficialGroup) better = false;
        else if (votes(ch) !== votes(current)) better = votes(ch) > votes(current);
        else better = (chapterId(ch, chapterUrl(ch), metas) ?? 0) > (chapterId(current, chapterUrl(current), metas) ?? 0);
        if (better) chapterMap.set(key, ch);
      }
      finalChapters = [...chapterMap.values()];
    }
    return [...finalChapters].sort((a, b) => b.chapter_number - a.chapter_number);
  }

const DATE_REGEX = /^(\d+)\s*(s|m|h|d|w|mo|mos|y|yr|yrs|min|mins|sec|secs|hr|hrs|day|days|week|weeks|month|months|year|years)$/;

// Relative site date ("2w ago"); with latest, the latest time the text can stand for
export function parseRelativeDate(dateStr: string, latest = false, now: Date = new Date()): number {
  if (dateStr === "") return 0;
  const trimmed = removeSuffix(dateStr.trim().toLowerCase(), " ago");
  const match = DATE_REGEX.exec(trimmed);
  if (!match) return 0;
  const amount = Number(match[1]) - (latest ? 1 : 0);
  const date = new Date(now.getTime());
  switch (match[2]) {
    case "s":
    case "sec":
    case "secs":
      date.setSeconds(date.getSeconds() - amount);
      break;
    case "m":
    case "min":
    case "mins":
      date.setMinutes(date.getMinutes() - amount);
      break;
    case "h":
    case "hr":
    case "hrs":
      date.setHours(date.getHours() - amount);
      break;
    case "d":
    case "day":
    case "days":
      date.setDate(date.getDate() - amount);
      break;
    case "w":
    case "week":
    case "weeks":
      date.setDate(date.getDate() - amount * 7);
      break;
    case "mo":
    case "mos":
    case "month":
    case "months":
      date.setMonth(date.getMonth() - amount);
      break;
    default:
      date.setFullYear(date.getFullYear() - amount);
  }
  return date.getTime();
}

// Pages

/** Scramble parameters from a `#scramble=<seed>,<grid>,<algo>,<hash>` fragment on an image URL. */
export function scrambleInfoFromFragment(fragment: string | null): ScrambleInfo | null {
  if (!fragment?.startsWith("scramble=")) return null;
  const [seed, grid, algo, hash] = fragment.slice("scramble=".length).split(",");
  const orNull = (value: string | undefined) => (value === undefined || value === "" ? null : value);
  return { seed: orNull(seed), grid: orNull(grid), algo: orNull(algo), hash: orNull(hash) };
}

/** Scramble parameters from the image response's x-scramble-* headers. */
export function scrambleInfoFromHeaders(response: Response): ScrambleInfo {
  return {
    seed: response.header("x-scramble-seed"),
    grid: response.header("x-scramble-grid"),
    algo: response.header("x-scramble-algo"),
    hash: response.header("x-scramble-hash"),
  };
}

/** What a reader walk captured: the page count, each page's image URL, and its error. */
export interface ReaderWalk {
  total: number | null;
  pages: Map<number, string>;
  error: string | null;
}

export function readerWalkOf(result: WebViewResult): ReaderWalk {
  let total: number | null = null;
  let error: string | null = result.timedOut ? "Timed out loading the reader" : null;
  const pages = new Map<number, string>();
  for (const message of messagesOf(result) as (PageMessage & CaptureMessage)[]) {
    if (message.type === "total" && message.total != null) total = message.total;
    else if (message.type === "page" && message.index != null && message.url) pages.set(message.index, message.url);
    else if (message.type === "error") error = message.message ?? "WebView failed";
  }
  return { total, pages, error };
}
