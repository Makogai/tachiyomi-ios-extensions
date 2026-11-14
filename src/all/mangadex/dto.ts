// src/all/mangadex/.../dto/*.kt @ d9420cd1. Upstream decodes `relationships` polymorphically by
// `type`; here every entity is one shape and helpers pick relationships by type.

export const CHAPTER = "chapter";
export const MANGA = "manga";
export const COVER_ART = "cover_art";
export const SCANLATION_GROUP = "scanlation_group";
export const USER = "user";
export const AUTHOR = "author";
export const ARTIST = "artist";
export const TAG = "tag";
export const LIST = "custom_list";

/** `EntityDto`: any API entity. `attributes` is absent on relationships the request did not include. */
export interface EntityDto<A = Record<string, unknown>> {
  id: string;
  type: string;
  attributes?: A | null;
  relationships?: EntityDto[];
}

export function relationshipsOfType<A>(entity: EntityDto<unknown>, type: string): EntityDto<A>[] {
  return (entity.relationships ?? []).filter((relationship) => relationship.type === type) as EntityDto<A>[];
}

/** `relationships.firstInstanceOrNull<T>()` */
export function firstRelationship<A>(entity: EntityDto<unknown>, type: string): EntityDto<A> | null {
  return relationshipsOfType<A>(entity, type)[0] ?? null;
}

/** `PaginatedResponseDto` */
export interface PaginatedResponseDto<T> {
  result: string;
  response?: string;
  data?: T[];
  limit?: number;
  offset?: number;
  total?: number;
}

export function hasNextPage(page: PaginatedResponseDto<unknown>): boolean {
  return (page.limit ?? 0) + (page.offset ?? 0) < (page.total ?? 0);
}

/** `ResponseDto` */
export interface ResponseDto<T> {
  result: string;
  response?: string;
  data?: T | null;
}

/**
 * `LocalizedString`. The API sometimes sends `[]` instead of `{}`; upstream's serializer turns
 * anything that is not an object into an empty map (see `localized`).
 */
export type LocalizedString = Record<string, string | null>;

export function localized(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, text]) => [key, typeof text === "string" ? text : ""]));
}

export interface MangaAttributesDto {
  title: LocalizedString;
  altTitles: LocalizedString[];
  description: LocalizedString;
  originalLanguage: string | null;
  lastVolume: string | null;
  lastChapter: string | null;
  contentRating?: string | null;
  publicationDemographic?: string | null;
  status?: string | null;
  tags: EntityDto<TagAttributesDto>[];
}

export type MangaDataDto = EntityDto<MangaAttributesDto>;
export type MangaListDto = PaginatedResponseDto<MangaDataDto>;
export type MangaDto = ResponseDto<MangaDataDto>;

export interface TagAttributesDto {
  group: string;
}

export interface ChapterAttributesDto {
  title: string | null;
  volume: string | null;
  chapter: string | null;
  translatedLanguage: string;
  pages: number;
  publishAt: string;
  updatedAt: string;
  readableAt: string;
  externalUrl: string | null;
  isUnavailable?: boolean;
}

export type ChapterDataDto = EntityDto<ChapterAttributesDto>;
export type ChapterListDto = PaginatedResponseDto<ChapterDataDto>;
export type ChapterDto = ResponseDto<ChapterDataDto>;

/**
 * `ChapterAttributesDto.isInvalid`: an external chapter with no pages, or with one page and
 * updated after it was readable (the external chapter was removed and replaced by a notice page).
 */
export function isInvalid(attributes: ChapterAttributesDto): boolean {
  return attributes.externalUrl != null && (attributes.pages === 0 || (attributes.pages === 1 && attributes.updatedAt !== attributes.readableAt));
}

export interface CoverArtAttributesDto {
  fileName?: string | null;
  locale?: string | null;
}

export type CoverArtDto = EntityDto<CoverArtAttributesDto>;
export type CoverArtListDto = PaginatedResponseDto<CoverArtDto>;

export interface AuthorArtistAttributesDto {
  name: string;
}

export interface ScanlationGroupAttributes {
  name: string;
}

export interface UserAttributes {
  username: string;
}

export interface ListAttributesDto {
  name: string;
  visibility: string;
  version: number;
}

export type ListDto = ResponseDto<EntityDto<ListAttributesDto>>;

export interface AggregateChapter {
  chapter: string;
  count: string | number;
}

export interface AggregateVolume {
  volume: string;
  count: string | number;
  chapters: Record<string, AggregateChapter>;
}

export interface AggregateDto {
  result: string;
  /** `[]` when there are none. */
  volumes?: Record<string, AggregateVolume> | AggregateVolume[] | null;
}

export interface AtHomeDto {
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
}
