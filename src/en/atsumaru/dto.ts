// Port of src/en/atsumaru/.../Dto.kt @ d9420cd1.
import { parseIsoDate, SChapter, SManga } from "@sdk";
import { GenreFilter, StatusFilter, TagFilters, TypeFilter } from "./filters";

type JsonElement = unknown;

export interface BrowseMangaDto {
  items: MangaDto[];
}

export interface MangaObjectDto {
  mangaPage: MangaDto;
}

export interface SearchResultsDto {
  page: number;
  found: number;
  hits: { document: MangaDto }[];
  request_params: { per_page: number };
}

export function hasNextPage(results: SearchResultsDto): boolean {
  return results.page * results.request_params.per_page < results.found;
}

export interface ScanlatorDto {
  id: string;
  name: string;
  score: number;
}

/**
 * The manga as the API sends it. `imagePath` is also read from `poster` or `image`, and `genres`
 * from `tags` (kotlinx `@JsonNames`); see `jsonNames`.
 */
export interface MangaDto {
  id: string;
  title: string;
  imagePath?: JsonElement;
  poster?: JsonElement;
  image?: JsonElement;
  largeImage?: string | null;

  // Details
  authors?: JsonElement;
  synopsis?: string | null;
  genres?: JsonElement;
  tags?: JsonElement;
  released?: number | null;
  status?: string | null;
  type?: string | null;
  views?: JsonElement;
  otherNames?: string[] | null;
  avgRating?: number | null;
  scanlators?: ScanlatorDto[] | null;

  // Chapters
  chapters?: ChapterDto[] | null;

  recommendations?: MangaDto[] | null;
}

const PROTOCOL_REGEX = /^https?:?\/\//;

/**
 * kotlinx decodes every key that names the property (its own name or a `@JsonNames` alias) in
 * document order, so when several are present the last one wins.
 */
function jsonNames(dto: object, names: string[]): JsonElement {
  let value: JsonElement = undefined;
  for (const [key, element] of Object.entries(dto)) {
    if (names.includes(key)) value = element;
  }
  return value;
}

/** `JsonPrimitive.content`: strings as is, numbers and booleans as text. */
function primitiveContent(element: JsonElement): string | null {
  if (typeof element === "string") return element;
  if (typeof element === "number" || typeof element === "boolean") return String(element);
  return null;
}

function isObject(element: JsonElement): element is Record<string, JsonElement> {
  return typeof element === "object" && element !== null && !Array.isArray(element);
}

function getImagePath(dto: MangaDto): string | null {
  const imagePath = jsonNames(dto, ["imagePath", "poster", "image"]);
  let url: string | null = dto.largeImage ?? null;
  if (url === null) {
    if (isObject(imagePath)) url = primitiveContent(imagePath.largeImage ?? imagePath.image);
    else url = primitiveContent(imagePath);
  }
  if (url === null) return null;
  url = url.startsWith("/") ? url.slice(1) : url;
  return url.startsWith("static/") ? url.slice("static/".length) : url;
}

function parseNames(element: JsonElement): string[] {
  if (!Array.isArray(element)) return [];
  return element
    .map((item: JsonElement) => (isObject(item) ? primitiveContent(item.name) : primitiveContent(item)))
    .filter((it): it is string => it !== null);
}

function parseAuthorsWithType(element: JsonElement): [string, string | null][] {
  if (!Array.isArray(element)) return [];
  const result: [string, string | null][] = [];
  for (const item of element as JsonElement[]) {
    if (isObject(item)) {
      const name = primitiveContent(item.name);
      if (name === null) continue;
      result.push([name, primitiveContent(item.type)]);
    } else {
      const name = primitiveContent(item);
      if (name !== null) result.push([name, null]);
    }
  }
  return result;
}

export function mangaToSManga(dto: MangaDto, baseUrl: string): SManga {
  const manga = SManga.create();
  manga.url = dto.id;
  manga.title = dto.title;
  const imagePath = getImagePath(dto);
  if (imagePath !== null) {
    const url = imagePath.startsWith("http")
      ? imagePath
      : imagePath.startsWith("//")
        ? `https:${imagePath}`
        : `${baseUrl}/static/${imagePath}`;
    manga.thumbnail_url = url.replace(PROTOCOL_REGEX, "https://");
  }

  const description: string[] = [];
  if (dto.avgRating != null && dto.avgRating > 0) {
    description.push(`**Rating**: ${dto.avgRating.toFixed(2)}/10`);
  }
  if (dto.released != null && dto.released > 0) {
    description.push(`**Year**: ${new Date(dto.released).getFullYear()}`);
  }
  // can be Int or formatted String
  const views = primitiveContent(dto.views);
  if (views !== null) description.push(`**Views**: ${views}`);
  if (dto.synopsis != null && dto.synopsis.trim() !== "") {
    description.push("\n");
    description.push(`**Synopsis**: ${dto.synopsis}`);
  }
  const names = dto.otherNames?.filter((it) => it !== dto.title);
  if (names && names.length > 0) {
    description.push("\n");
    description.push(`**Alternative Names**:\n${names.map((it) => `- ${it}`).join("\n")}`);
  }
  manga.description = description.join("\n");

  const genre: string[] = [];
  if (dto.type != null) genre.push(dto.type);
  genre.push(...parseNames(jsonNames(dto, ["genres", "tags"])));
  manga.genre = genre.join(", ");

  const authorsList = parseAuthorsWithType(dto.authors);
  manga.author = authorsList
    .filter((it) => it[1] === "Author" || it[1] === null)
    .map((it) => it[0])
    .join(", ");
  manga.artist = authorsList
    .filter((it) => it[1] === "Artist")
    .map((it) => it[0])
    .join(", ");

  switch (dto.status?.toLowerCase()?.trim()) {
    case "ongoing":
      manga.status = SManga.ONGOING;
      break;
    case "completed":
      manga.status = SManga.COMPLETED;
      break;
    case "hiatus":
      manga.status = SManga.ON_HIATUS;
      break;
    case "canceled":
      manga.status = SManga.CANCELLED;
      break;
    default:
      manga.status = SManga.UNKNOWN;
  }
  return manga;
}

export function recommendations(dto: MangaDto, baseUrl: string): SManga[] {
  return dto.recommendations?.map((it) => mangaToSManga(it, baseUrl)) ?? [];
}

export interface AllChaptersDto {
  chapters: ChapterDto[];
}

export interface ChapterDto {
  id: string;
  number: number;
  title: string;
  scanlationMangaId?: string | null;
  createdAt?: JsonElement;
}

export function dateUploadMillis(chapter: ChapterDto): number {
  const date = chapter.createdAt;
  if (typeof date === "number") return Number.isInteger(date) ? date : parseIsoDate(String(date));
  if (typeof date === "string") return /^[+-]?\d+$/.test(date) ? Number(date) : parseIsoDate(date);
  return 0;
}

export function chapterToSChapter(dto: ChapterDto, slug: string, scanlatorName: string | null = null): SChapter {
  const chapter = SChapter.create();
  chapter.url = `${slug}/${dto.id}`;
  chapter.chapter_number = dto.number;
  chapter.name = dto.title;
  chapter.scanlator = scanlatorName;
  if (dto.createdAt != null) chapter.date_upload = dateUploadMillis(dto);
  return chapter;
}

export interface PageObjectDto {
  readChapter: { pages: { image: string }[] };
}

export interface FilterEntry {
  id: string;
  name: string;
}

export interface FilterData {
  genres?: FilterEntry[] | null;
  tags?: FilterEntry[] | null;
  types?: FilterEntry[] | null;
  statuses?: FilterEntry[] | null;
}

export function filterDataToFilters(
  data: FilterData,
  excludedGenreIds: Set<string> = new Set(),
): (GenreFilter | TagFilters | TypeFilter | StatusFilter)[] {
  const filters: (GenreFilter | TagFilters | TypeFilter | StatusFilter)[] = [];
  if (data.genres) filters.push(new GenreFilter(data.genres.map(({ name, id }) => ({ name, id })), excludedGenreIds));
  if (data.tags) filters.push(new TagFilters(data.tags.map(({ name, id }) => ({ name, id }))));
  if (data.types) filters.push(new TypeFilter(data.types.map(({ name, id }) => ({ name, id }))));
  if (data.statuses) filters.push(new StatusFilter(data.statuses.map(({ name, id }) => ({ name, id }))));
  return filters;
}
