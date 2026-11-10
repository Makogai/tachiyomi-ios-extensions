// Port of src/all/kagane/.../Dto.kt @ d9420cd1.
import { parseHtml, parseIsoDate, SChapter, SManga } from "@sdk";
import { MarkdownDescriptionBuilder } from "./markdown";

export interface GenreDto {
  id: string;
  genre_name: string;
}

export interface TagDto {
  id: string;
  tag_name: string;
}

export interface SourcesDto {
  sources: SourceDto[];
}

export interface SourceDto {
  source_id: string;
  source_type: string; // "Official", "Unofficial", "Mixed"
  title: string;
}

export interface SearchDto {
  content?: SearchBook[];
  last?: boolean;
  total_elements?: number;
  total_pages?: number;
}

export function hasNextPage(dto: SearchDto): boolean {
  return !(dto.last ?? true);
}

export interface SearchBook {
  series_id: string;
  title: string;
  source_id?: string | null;
  current_books: number;
  start_year?: number | null;
  cover_image_id?: string | null;
  alternate_titles?: string[];
}

export interface TrackerDto {
  book_series?: TrackerBook[];
}

export interface TrackerBook {
  id: string;
  title: string;
  source_id?: string | null;
  current_books: number;
  cover_image_id?: string | null;
}

/** `SearchDto.Book.toSManga` (and `TrackerDto.Book.toSManga`, which differs only in the ID field). */
export function bookToSManga(
  id: string,
  book: { title: string; source_id?: string | null; cover_image_id?: string | null },
  apiUrl: string,
  showSource: boolean,
  sources: Map<string, string>,
  cleanTitle: boolean,
): SManga {
  const manga = SManga.create();
  manga.title =
    showSource && sources.size > 0
      ? `${book.title.trim()} [${sources.get(book.source_id ?? "") ?? null}]`
      : clean(book.title, cleanTitle);
  manga.url = id;
  manga.thumbnail_url = book.cover_image_id != null ? `${apiUrl}/image/${book.cover_image_id}` : null;
  return manga;
}

export interface StaffSearchDto {
  content?: Staff[];
}

export interface Staff {
  staff_id: string;
  name: string;
  native_name?: string | null;
  alternate_names?: string[];
}

export interface GroupSearchDto {
  items?: { group_id: string; title: string }[];
}

export interface SeriesStaff {
  staff_id: string;
  name: string;
  native_name?: string | null;
  role: string;
  priority?: number;
}

export interface SeriesLink {
  url: string;
  label?: string | null;
  kind?: string | null;
}

export interface DetailsDto {
  title: string;
  slug?: string | null;
  description?: string | null;
  upload_status: string;
  format?: string | null;
  source_id?: string | null;
  series_staff?: SeriesStaff[];
  genres?: { genre_name: string }[];
  tags?: { tag_name: string }[];
  series_alternate_titles?: { title: string; label?: string | null }[];
  edition_info?: string | null;
  tracker_id?: string | null;
  series_links?: SeriesLink[];
  average_rating?: number | null;
  total_ratings?: number | null;
  series_covers?: { image_id: string }[];
  age_rating?: string | null;
  is_pornographic?: boolean | null;
  is_disturbing?: boolean | null;
  original_language?: string | null;
  translated_language?: string | null;
  start_year?: number | null;
  end_year?: number | null;
  current_volumes?: number | null;
  total_views?: number | null;
  subscriber_count?: number | null;
}

export function detailsToSManga(
  dto: DetailsDto,
  apiUrl: string,
  sourceName: string | null,
  baseUrl: string,
  showEdition: boolean,
  showSource: boolean,
  showDetails: boolean,
  cleanTitle: boolean,
): SManga {
  const manga = SManga.create();
  const base = dto.title.trim();
  const withEdition = showEdition && dto.edition_info?.trim() ? `${base} (${dto.edition_info})` : base;
  manga.title = showSource && sourceName != null ? `${withEdition} [${sourceName}]` : clean(withEdition, cleanTitle);
  const covers = dto.series_covers ?? [];
  manga.thumbnail_url = covers.length > 0 ? `${apiUrl}/image/${covers[0].image_id}` : null;

  const seriesStaff = dto.series_staff ?? [];
  const byAuthorRoles = seriesStaff.filter((staff) => roleIs(staff, BOOK_CREATOR_ROLES));
  const byArtistRoles = seriesStaff.filter((staff) => roleIs(staff, ARTIST_ROLES));

  const builder = new MarkdownDescriptionBuilder();
  builder.markdown(dto.description != null ? parseHtml(dto.description.trim().replace(/\n/g, "<br>")).wholeText() : null);

  if (showDetails) {
    const originalName = dto.original_language != null ? (LANGUAGE_NAMES[dto.original_language] ?? null) : null;
    builder.rating(dto.average_rating != null ? dto.average_rating / 10 : null, 10, dto.total_ratings ?? null);
    builder.field(
      "Content Rating",
      dto.age_rating != null ? toContentRating(dto.age_rating, dto.is_pornographic, dto.is_disturbing) : null,
    );
    builder.field(
      "Followers",
      dto.subscriber_count != null && dto.subscriber_count > 0 ? toCompactCount(dto.subscriber_count) : null,
    );
    builder.field("Format", dto.format);
    builder.field("Original Language", originalName);
    const translatedName =
      dto.translated_language != null ? (LANGUAGE_NAMES[dto.translated_language] ?? null) : null;
    builder.field("Translated Language", translatedName !== originalName ? translatedName : null);
    builder.field("Views", dto.total_views != null && dto.total_views > 0 ? toCompactCount(dto.total_views) : null);
    builder.field(
      "Volumes",
      dto.current_volumes != null && dto.current_volumes > 0 ? String(dto.current_volumes) : null,
    );
    const start = dto.start_year != null && dto.start_year > 0 ? dto.start_year : null;
    builder.field(
      "Year",
      start == null ? null : dto.end_year != null && dto.end_year > start ? `${start}–${dto.end_year}` : `${start}`,
    );
  }

  const others = seriesStaff
    .filter((staff) => !roleIs(staff, BOOK_CREATOR_ROLES) && !roleIs(staff, ARTIST_ROLES))
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  const byRole = new Map<string, SeriesStaff[]>();
  for (const staff of others) {
    const list = byRole.get(staff.role) ?? [];
    list.push(staff);
    byRole.set(staff.role, list);
  }
  for (const [role, members] of byRole) {
    builder.field(
      role,
      members.map((member) => displayWithNative(member.name, member.native_name)),
    );
  }

  if (sourceName != null && dto.source_id != null) {
    builder.links([[sourceName, `${baseUrl}/sources/${dto.source_id}`]], "Source");
  }

  if (showDetails) {
    const links = dto.series_links ?? [];
    const byLabel = (list: SeriesLink[]) => list.map((link): [string, string] => [link.label ?? link.url, link.url]);
    builder.links(byLabel(links.filter((link) => link.kind === "Official")), "Official Link(s)");
    builder.links(byLabel(links.filter((link) => link.kind === "Tracker")), "Tracker(s)");
    builder.links(
      byLabel(links.filter((link) => link.kind != null && link.kind !== "Official" && link.kind !== "Tracker")),
      "Other(s)",
    );
  }

  builder.altTitles(
    (dto.series_alternate_titles ?? []).map((title) => title.title),
    "Associated Name(s)",
  );
  manga.description = builder.build();

  manga.author = distinctByStaffId(byAuthorRoles).map((staff) => staff.name).join(", ");
  manga.artist = distinctByStaffId(byArtistRoles).map((staff) => staff.name).join(", ");
  manga.genre = (dto.genres ?? []).map((genre) => genre.genre_name).join(", ");
  manga.status = toStatus(dto.upload_status);
  return manga;
}

function distinctByStaffId(staff: SeriesStaff[]): SeriesStaff[] {
  const seen = new Set<string>();
  return [...staff]
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .filter((member) => {
      if (seen.has(member.staff_id)) return false;
      seen.add(member.staff_id);
      return true;
    });
}

function toStatus(status: string): number {
  switch (status.toUpperCase()) {
    case "ONGOING":
      return SManga.ONGOING;
    case "COMPLETED":
      return SManga.COMPLETED;
    case "HIATUS":
      return SManga.ON_HIATUS;
    case "ABANDONED":
      return SManga.CANCELLED;
    default:
      return SManga.UNKNOWN;
  }
}

export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  es: "Spanish",
  "es-419": "Latin American Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  "pt-BR": "Brazilian Portuguese",
  ru: "Russian",
  it: "Italian",
  id: "Indonesian",
  vi: "Vietnamese",
  th: "Thai",
  pl: "Polish",
  hi: "Hindi",
  ar: "Arabic",
};

const BOOK_CREATOR_ROLES = new Set(["author", "story", "original creator"]);
const ARTIST_ROLES = new Set(["artist", "art"]);

const CAMEL_CASE_WEIGHT = /(?<!^)([A-Z])/g;

function toCompactCount(value: number): string {
  const format = (n: number) => n.toFixed(1).replace(/\.0$/, "");
  if (value >= 1_000_000_000) return `${format(value / 1_000_000_000)}B`;
  if (value >= 1_000_000) return `${format(value / 1_000_000)}M`;
  if (value >= 1_000) return `${format(value / 1_000)}K`;
  return String(value);
}

function roleIs(staff: SeriesStaff, roles: Set<string>): boolean {
  return roles.has(staff.role.trim().toLowerCase());
}

function displayWithNative(name: string, native: string | null | undefined): string {
  return native == null || native.trim() === "" || native === name ? name : `${name} (${native})`;
}

function toContentRating(rating: string, isPornographic?: boolean | null, isDisturbing?: boolean | null): string {
  let base: string;
  switch (rating) {
    case "Safe":
      base = "Safe";
      break;
    case "FifteenPlus":
      base = "Fifteen Plus";
      break;
    case "EighteenPlus":
      base = "Eighteen Plus";
      break;
    default:
      base = rating.replace(CAMEL_CASE_WEIGHT, " $1").trim();
  }
  const flags: string[] = [];
  if (isPornographic === true) flags.push("Pornographic");
  if (isDisturbing === true) flags.push("Disturbing");
  return flags.length === 0 ? base : `${base} (${flags.join(", ")})`;
}

export interface BookIndexDto {
  count: number;
  fields: string[];
  groups: { title: string }[];
  books: unknown[][];
}

export function toBooks(index: BookIndexDto): Book[] {
  if (index.books.length !== index.count) throw new Error("Incomplete Kagane chapter index");
  // The compact index declares its column order in fields.
  return index.books.map((row) => {
    const values = new Map<string, unknown>();
    index.fields.forEach((field, i) => {
      if (i < row.length) values.set(field, row[i]);
    });
    const value = (key: string): unknown => {
      if (!values.has(key)) throw new Error(`Key ${key} is missing in the map.`);
      return values.get(key);
    };
    const releasedAt = value("released_at") as number | null;
    return {
      id: value("book_id") as string,
      title: value("title") as string,
      createdAt: releasedAt != null ? new Date(releasedAt * 1000).toISOString() : null,
      pagesCount: value("page_count") as number,
      number: value("sort_no") as number,
      chapterNo: value("chapter_no") as string | null,
      volumeNo: value("volume_no") as string | null,
      groups: (value("group_ix") as number[]).map((ix) => index.groups[ix]),
    };
  });
}

/** `ChapterDto.Book`. */
export interface Book {
  id: string;
  title: string;
  createdAt: string | null;
  pagesCount: number;
  number: number;
  chapterNo: string | null;
  volumeNo: string | null;
  groups: { title: string }[];
}

export function bookToSChapter(
  book: Book,
  seriesId: string,
  useSourceChapterNumber = false,
  chapterTitleMode = "optional",
): SChapter {
  const chapter = SChapter.create();
  chapter.url = `/series/${seriesId}/reader/${book.id}`;
  chapter.name = buildChapterName(book, chapterTitleMode);
  chapter.date_upload = book.createdAt != null ? parseIsoDate(book.createdAt) : 0;
  if (useSourceChapterNumber) {
    chapter.chapter_number = book.number;
  }
  let scanlator = book.groups.map((group) => group.title).join(", ");

  // Extract group tags in chapter title
  const stripped = book.title.trim().replace(METADATA_REGEX, "");
  const match = CHAPTER_GROUP_REGEX.exec(stripped);
  if (match !== null && match[0] === stripped) {
    const groupTag = match[1] ?? match[2];
    if (groupTag != null) scanlator += ` (${groupTag})`;
  }
  chapter.scanlator = scanlator;
  return chapter;
}

function isNullOrBlank(text: string | null | undefined): boolean {
  return text == null || text.trim() === "";
}

function buildChapterName(book: Book, mode = "optional"): string {
  const trimmedTitle = book.title.trim();
  const { chapterNo, volumeNo } = book;
  switch (mode) {
    case "optional":
      if (trimmedTitle === "" && isNullOrBlank(chapterNo) && !isNullOrBlank(volumeNo)) {
        return buildChapterName(book, "vol_chapter");
      }
      if (trimmedTitle === "" && !isNullOrBlank(chapterNo)) return `Ch.${chapterNo}`;
      return trimmedTitle;

    case "always":
      if (isNullOrBlank(chapterNo) && !isNullOrBlank(volumeNo)) return buildChapterName(book, "vol_chapter");
      if (trimmedTitle === "") return `Ch.${chapterNo}`;
      return `Ch.${chapterNo} ${trimmedTitle}`;

    case "vol_chapter":
    case "vol_local": {
      const volPart = !isNullOrBlank(volumeNo) ? `Vol.${volumeNo} ` : "";
      const chPart = !isNullOrBlank(chapterNo) ? `Ch.${chapterNo}` : "";
      const numPart = `${volPart}${chPart}`.trim();
      if (numPart === "") return trimmedTitle;
      if (trimmedTitle === "" || mode === "vol_local") return numPart;
      return `${numPart} ${trimmedTitle}`;
    }

    default:
      return trimmedTitle;
  }
}

export interface ChallengeDto {
  access_token: string;
  cache_url: string;
  manifest?: { pages?: PageDto[] } | null;
}

export interface PageDto {
  page_no: number;
  page_id: string;
  ext?: string | null;
}

export interface IntegrityDto {
  token: string;
  exp: number;
}

const BRACKET_REGEX = /(\([^()]*\)|\[[^[\]]*\])\s*$/;

const METADATA_REGEX = /(?:\s*\{[^{}]*\})+\s*$/;

const CHAPTER_GROUP_REGEX = /^Chapter\s+.*(?:-\s*Volume\s+.*\(([^()]+)\)|\[([^[\]]+)\])\s*$/i;

export function clean(text: string, removeExtras: boolean): string {
  return removeExtras ? text.replace(BRACKET_REGEX, "").trim() : text.trim();
}
