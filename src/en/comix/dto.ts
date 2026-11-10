// Port of Dto.kt @ d9420cd1, plus keiyoushi's MarkdownDescription.Builder (core/utils/Markdown.kt),
// which the SDK does not have. The SDK has no `memo`, so chapter metadata travels separately.
import { type HttpUrl, removeSuffix, SChapter, SManga } from "@sdk";

interface Term {
  title: string;
}

export interface TagSearchResponse {
  result?: { id: number; label: string }[];
}

export interface Poster {
  small?: string | null;
  medium?: string | null;
  large?: string | null;
}

export interface Manga {
  hid: string;
  title: string;
  altTitles?: string[];
  alt_titles?: string[];
  synopsis?: string | null;
  type?: string;
  poster?: Poster | null;
  status?: string;
  contentRating?: string;
  authors?: Term[] | null;
  author?: Term[] | null;
  artists?: Term[] | null;
  artist?: Term[] | null;
  genres?: Term[] | null;
  genre?: Term[] | null;
  tags?: Term[] | null;
  demographics?: Term[] | null;
  demographic?: Term[] | null;
  ratedAvg?: number;
  ratedCount?: number;
  followsTotal?: number;
  rank?: number;
  year?: number | null;
  originalLanguage?: string | null;
  links?: Record<string, string | null> | null;
  url?: string | null;
  chapterUpdatedAtFormatted?: string | null;
}

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

// MarkdownDescription

const MARKDOWN_INDENT = /^[ \t]+/gm;
const MARKDOWN_INLINE = /[\\*_[\]<]/g;
const MARKDOWN_BACKTICK = /`(?=[^`]*`)/g;
const MARKDOWN_BLOCK = /^(?:>|#{1,6}(?=\s|$)|[-+](?=\s|$)|~{3}|[-=:|~][-=:|~ \t]*$)|(?<=^\d{1,9})[.)](?=\s|$)/gm;

function escapeMarkdown(text: string): string {
  return text
    .replace(MARKDOWN_INDENT, "")
    .replace(MARKDOWN_INLINE, (it) => `\\${it}`)
    .replace(MARKDOWN_BLOCK, (it) => `\\${it}`)
    .replace(MARKDOWN_BACKTICK, (it) => `\\${it}`);
}

function ratingStars(rating: number, max = 10): string {
  const halves = Math.min(10, Math.max(0, Math.ceil((rating * 10) / max - 0.5)));
  return "★".repeat(Math.floor(halves / 2)) + "✬".repeat(halves % 2) + "☆".repeat(5 - Math.floor((halves + 1) / 2));
}

function markdownList(label: string, items: string[]): string | null {
  const lines = items.filter((it) => it.trim() !== "");
  if (lines.length === 0) return null;
  return `**${escapeMarkdown(label)}:**\n` + lines.map((it) => `- ${it}`).join("\n");
}

const encodeMarkdownUrl = (url: string) =>
  url.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/`/g, "%60");

export class MarkdownDescriptionBuilder {
  private readonly sections: string[] = [];
  private lastIsInline = false;
  private lastIsRating = false;

  private add(section: string | null | undefined): this {
    if (section == null || section.trim() === "") return this;
    this.sections.push(section);
    this.lastIsInline = false;
    this.lastIsRating = false;
    return this;
  }

  private addInline(text: string | null | undefined): this {
    if (text == null || text.trim() === "") return this;
    if (this.lastIsRating) this.sections[this.sections.length - 1] += `\n${text}`;
    else if (this.lastIsInline) this.sections[this.sections.length - 1] += ` · ${text}`;
    else this.sections.push(text);
    this.lastIsInline = true;
    this.lastIsRating = false;
    return this;
  }

  rating(rating: number | null | undefined, max = 10): this {
    if (rating == null || !Number.isFinite(rating)) return this;
    const number = String(Number(rating.toFixed(2)));
    this.add(`${ratingStars(rating, max)} ${number}`);
    this.lastIsRating = true;
    return this;
  }

  markdown(markdown: string | null | undefined): this {
    return this.add(markdown?.trim());
  }

  field(label: string, value: string | null | undefined): this {
    const trimmed = value?.trim();
    return this.addInline(trimmed ? `**${escapeMarkdown(label)}:** ${escapeMarkdown(trimmed)}` : null);
  }

  altTitles(titles: string[], label = "Alternative Names"): this {
    const items = [...new Set(titles.map((it) => it.trim()).filter((it) => it !== ""))].map(escapeMarkdown);
    return this.add(markdownList(label, items));
  }

  links(links: [string, string | null | undefined][], label = "Links"): this {
    return this.add(
      markdownList(
        label,
        links.flatMap(([text, url]) => (url && url.trim() !== "" ? [`[${escapeMarkdown(text)}](${encodeMarkdownUrl(url)})`] : [])),
      ),
    );
  }

  build(): string | null {
    const text = this.sections.join("\n\n");
    return text === "" ? null : text;
  }
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

export interface SearchItems {
  items?: Manga[];
  meta?: { page?: number; lastPage?: number; last_page?: number } | null;
  pagination?: { page?: number; lastPage?: number; last_page?: number } | null;
}

export function hasNextPage(items: SearchItems): boolean {
  const meta = items.meta ?? items.pagination;
  if (!meta) return false;
  return (meta.page ?? 1) < Math.max(meta.lastPage ?? 1, meta.last_page ?? 1);
}

export interface ChapterList {
  chapters: Chapter[];
  complete: boolean;
  error?: string | null;
  queries?: Record<string, unknown> | null;
}

export interface Chapter {
  id: number;
  url?: string;
  number: number;
  name?: string;
  votes?: number;
  createdAtFormatted?: string;
  group?: { id?: number | null; name: string } | null;
  isOfficial?: boolean;
}

/** What upstream keeps in the chapter's memo. */
export interface ChapterMeta {
  id: number;
  votes: number;
  official: boolean;
  groupId: number | null;
}

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

// One message from the reader page walk
export interface CaptureMessage {
  type: string;
  total?: number;
  index?: number;
  url?: string;
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
