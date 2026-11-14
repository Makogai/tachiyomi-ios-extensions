// Port of src/all/kagane/.../Dto.kt @ d9420cd1: the shapes of the API responses. Turning them into
// SManga/SChapter is in parse.ts.

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

export interface BookIndexDto {
  count: number;
  fields: string[];
  groups: { title: string }[];
  books: unknown[][];
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
