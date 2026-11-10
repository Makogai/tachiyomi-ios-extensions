// Port of Dto.kt @ d9420cd1.
import { removeSuffix, SChapter, SManga } from "@sdk";

export interface ApiResponse<T> {
  items?: T[];
  meta?: ApiMeta | null;
}

export interface ApiMeta {
  lastPage?: number;
  hasNext?: boolean;
}

export interface TagResponse {
  data?: TagDto[];
}

export interface TagDto {
  id: number;
  type: string;
}

interface PosterDto {
  small?: string | null;
  medium?: string | null;
  large?: string | null;
}

interface EntityDto {
  title: string;
}

export interface MangaDto {
  hid: string;
  slug?: string | null;
  title: string;
  poster?: PosterDto | null;
}

export function mangaToSManga(dto: MangaDto): SManga {
  const manga = SManga.create();
  manga.url = `/title/${dto.hid}${dto.slug != null ? `-${dto.slug}` : ""}`;
  manga.title = dto.title;
  manga.thumbnail_url = dto.poster?.large ?? dto.poster?.medium ?? dto.poster?.small ?? null;
  manga.initialized = false;
  return manga;
}

export interface MangaDetailsResponse {
  data: MangaDetailsDto;
}

export interface MangaDetailsDto extends MangaDto {
  type?: string | null;
  status?: string | null;
  synopsisHtml?: string | null;
  authors?: EntityDto[] | null;
  artists?: EntityDto[] | null;
  genres?: EntityDto[] | null;
  themes?: EntityDto[] | null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (match, name: string) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    return ENTITIES[name.toLowerCase()] ?? match;
  });
}

/** A small stand-in for keiyoushi's `Element.toMarkdown()`: paragraphs, breaks, emphasis and links. */
export function htmlToMarkdown(html: string): string {
  const text = html
    .replace(/\r/g, "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<(b|strong)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, "**$3**")
    .replace(/<(i|em)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, "*$3*")
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(text)
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function detailsToSManga(dto: MangaDetailsDto): SManga {
  const manga = mangaToSManga(dto);
  manga.author = dto.authors?.map((it) => it.title).join(", ") ?? null;
  manga.artist = dto.artists?.map((it) => it.title).join(", ") ?? null;
  manga.description = dto.synopsisHtml != null ? htmlToMarkdown(dto.synopsisHtml) : null;
  const genres: string[] = [];
  if (dto.type != null) genres.push(dto.type.charAt(0).toUpperCase() + dto.type.slice(1));
  dto.genres?.forEach((it) => genres.push(it.title));
  dto.themes?.forEach((it) => genres.push(it.title));
  manga.genre = genres.join(", ");
  switch (dto.status?.toLowerCase()) {
    case "releasing":
      manga.status = SManga.ONGOING;
      break;
    case "finished":
      manga.status = SManga.COMPLETED;
      break;
    case "on_hiatus":
      manga.status = SManga.ON_HIATUS;
      break;
    case "discontinued":
      manga.status = SManga.CANCELLED;
      break;
    default:
      manga.status = SManga.UNKNOWN;
  }
  manga.initialized = true;
  return manga;
}

export interface VolumeDto {
  id: number;
  number: number;
  name?: string | null;
  chapterCount: number;
  language: string;
}

export function volumeToSChapter(dto: VolumeDto, mangaUrl: string): SChapter {
  const chapter = SChapter.create();
  chapter.url = `${mangaUrl}/volume/${dto.id}`;
  chapter.chapter_number = dto.number;
  chapter.name = `Vol. ${dto.number}` + (dto.name ? ` - ${dto.name}` : "");
  chapter.scanlator = `${dto.chapterCount} chapters`;
  return chapter;
}

export interface ChapterDto {
  id: number;
  number: number;
  name?: string | null;
  createdAt?: number | null;
  type?: string | null;
}

const chapterRegex = /(?<=\b(?:ch(?:\.|apter)?|ep(?:\.|isode)?)\s?)\d+(?:\.\d+)?/i;

/** Kotlin's `Float.toString().removeSuffix(".0")` for the numbers the site uses. */
function numberText(number: number): string {
  return removeSuffix(String(number), ".0");
}

export function chapterToSChapter(dto: ChapterDto, mangaUrl: string, langCode: string): SChapter {
  const chapter = SChapter.create();
  const number = numberText(dto.number);
  chapter.url = `${mangaUrl}/${dto.id}-chapter-${number}-${langCode}`;
  if (!dto.name || dto.name.trim() === "") {
    chapter.chapter_number = dto.number;
    chapter.name = `Ch. ${number}`;
  } else {
    const match = chapterRegex.exec(dto.name)?.[0];
    const extracted = match !== undefined ? parseFloat(match) : NaN;
    if (Number.isNaN(extracted)) {
      chapter.chapter_number = dto.number;
      chapter.name = `Ch. ${number} - ${dto.name}`;
    } else {
      chapter.chapter_number = extracted;
      chapter.name = dto.name;
    }
  }
  chapter.scanlator = dto.type ?? "Unknown";
  chapter.date_upload = dto.createdAt != null ? dto.createdAt * 1000 : 0;
  return chapter;
}

export interface PagesResponse {
  data: { pages: { url: string }[] };
}
