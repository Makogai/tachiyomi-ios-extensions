// Port of src/en/asurascans/.../Dto.kt @ d9420cd1: the API and Astro prop shapes. Mapping them is in parse.ts.

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

export interface MangaUrlDto {
  publicUrl: string;
  seriesSlug: string;
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
