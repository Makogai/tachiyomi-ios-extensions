// Port of src/en/asurascans/.../Dto.kt @ d9420cd1.
//
// Upstream keeps the random slug of the site's URL (`/comics/<slug>-<8 chars>`) in `SManga.memo`
// and `SChapter.memo`. The SDK's models have no memo, so the DTOs return it next to the model
// and the source keeps it in memory (see `AsuraScans.slugMemo`).
import { parseHtml, parseIsoDate, removeSuffix, SChapter, SManga, toHttpUrl } from "@sdk";

export interface DataDto<T> {
  data?: T | null;
  meta?: MetaDto | null;
}

export interface MetaDto {
  has_more?: boolean;
}

export interface MangaDto {
  public_url: string;
  slug: string;
  title: string;
  cover?: string;
  coverUrl?: string;
}

/** `slug` is what upstream puts in `memo["slug"]`: the last path segment of the public URL. */
export function mangaDtoToSManga(dto: MangaDto, baseUrl: string): { manga: SManga; slug: string } {
  const manga = SManga.create();
  manga.title = dto.title;
  manga.thumbnail_url = dto.cover ?? dto.coverUrl ?? null;
  manga.url = `/series/${dto.slug}`; // Keep the old URL structure for compatibility with existing bookmarks
  const segments = toHttpUrl(`${baseUrl}${dto.public_url}`).pathSegments;
  return { manga, slug: segments[segments.length - 1] };
}

export interface GenreDto {
  name: string;
  slug: string;
}

export interface MangaDetailsDto {
  title: string;
  coverUrl: string;
  author?: string | null;
  artist?: string | null;
  description?: string | null;
  rating?: number | null;
  bookmarkCount?: number | null;
  type?: string | null;
  popularityRank?: number | null;
  alternativeTitles?: string | null;
  genres?: GenreDto[] | null;
  status?: string | null;
}

export function toSMangaDetails(dto: MangaDetailsDto): SManga {
  const manga = SManga.create();
  manga.title = dto.title;
  manga.thumbnail_url = dto.coverUrl;
  manga.author = dto.author ?? null;
  manga.artist = dto.artist ?? null;
  manga.description = parseDescription(dto);
  const genres: string[] = [];
  if (dto.type != null) genres.push(dto.type.charAt(0).toUpperCase() + dto.type.slice(1));
  if (dto.genres != null) genres.push(...dto.genres.map((genre) => genre.name));
  manga.genre = genres.join(", ");
  manga.status = parseStatus(dto);
  manga.initialized = true;
  return manga;
}

function parseDescription(dto: MangaDetailsDto): string {
  let result = "";

  const metadata: string[] = [];
  if (dto.popularityRank != null) metadata.push(`Rank: #${dto.popularityRank}`);
  if (dto.rating != null) metadata.push(`Rating: ${dto.rating.toFixed(2)}`);
  if (dto.bookmarkCount != null) {
    const count = dto.bookmarkCount;
    const formatted =
      count >= 1_000_000
        ? `${(count / 1_000_000).toFixed(1)}M`
        : count >= 1_000
          ? `${(count / 1_000).toFixed(1)}K`
          : String(count);
    metadata.push(`Bookmarks: ${formatted}`);
  }

  if (metadata.length > 0) {
    result += metadata.join(" • ");
  }

  const description = dto.description != null ? parseHtml(dto.description).text() : "";
  if (description !== "") {
    if (result !== "") result += "\n\n";
    result += description;
  }

  const cleanAltTitles =
    dto.alternativeTitles == null
      ? null
      : (dto.alternativeTitles.includes("•") ? dto.alternativeTitles.split("•") : dto.alternativeTitles.split(","))
          .map((title) => title.trim())
          .filter((title) => title !== "");

  if (cleanAltTitles != null && cleanAltTitles.length > 0) {
    if (result !== "") result += "\n\n";
    result += "Alternative Titles:\n";
    result += cleanAltTitles.map((title) => `- ${title}`).join("\n");
  }

  return result;
}

function parseStatus(dto: MangaDetailsDto): number {
  switch (dto.status?.toLowerCase()) {
    case "ongoing":
      return SManga.ONGOING;
    case "completed":
      return SManga.COMPLETED;
    case "hiatus":
      return SManga.ON_HIATUS;
    case "dropped":
    case "axed":
      return SManga.CANCELLED;
    default:
      return SManga.UNKNOWN;
  }
}

export interface MangaUrlDto {
  publicUrl: string;
  seriesSlug: string;
}

/** Sets the URL as upstream's `MangaUrlDto.apply` and returns what it puts in `memo["slug"]`. */
export function applyMangaUrl(dto: MangaUrlDto, manga: SManga, baseUrl: string): string {
  manga.url = `/series/${dto.seriesSlug}`; // Keep the old URL structure for compatibility with existing bookmarks
  const segments = toHttpUrl(`${baseUrl}${dto.publicUrl}`).pathSegments;
  return segments[segments.length - 1];
}

export interface AvailableGenres {
  availableGenres: GenreDto[];
}

export interface Creators {
  artists: string[];
  authors: string[];
}

export interface FiltersDto {
  genres: GenreDto[];
  artists: string[];
  authors: string[];
}

export interface ChapterListDto {
  chapters?: ChapterDto[] | null;
}

export interface ChapterDto {
  number: number;
  title?: string | null;
  created_at?: string;
  is_premium?: boolean;
  is_locked?: boolean;
  early_access_until?: string | null;
  series_slug?: string | null;
}

export function isLocked(dto: ChapterDto): boolean {
  if (dto.is_premium ?? dto.is_locked ?? false) return true;
  const until = dto.early_access_until;
  if (until == null) return false;
  const time = parseIsoDate(until);
  return time !== 0 && time > Date.now();
}

export function chapterDtoToSChapter(dto: ChapterDto): SChapter {
  const chapter = SChapter.create();
  const numberStr = removeSuffix(String(dto.number), ".0");
  chapter.url = `/series/${dto.series_slug ?? null}/chapter/${numberStr}`;
  let name = "";
  if (isLocked(dto)) name += "🔒 ";
  name += `Chapter ${numberStr}`;
  if (dto.title != null) name += ` - ${dto.title}`;
  chapter.name = name;
  chapter.date_upload = parseIsoDate(dto.created_at ?? "");
  return chapter;
}

export interface PremiumPageListDto {
  data: { chapter: PageListDto };
}

export interface PageListDto {
  pages?: PageDto[];
}

export interface PageDto {
  url: string;
  tiles?: number[] | null;
  tile_cols?: number | null;
  tile_rows?: number | null;
}

export interface PageData {
  tiles: number[];
  tileCols: number;
  tileRows: number;
}
