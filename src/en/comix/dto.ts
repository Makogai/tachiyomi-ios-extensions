// Port of src/en/comix/.../Dto.kt @ d9420cd1: the shapes of the site data and the page-script messages.
// Turning them into SManga/SChapter is in parse.ts.

export interface Term {
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

export interface SearchItems {
  items?: Manga[];
  meta?: { page?: number; lastPage?: number; last_page?: number } | null;
  pagination?: { page?: number; lastPage?: number; last_page?: number } | null;
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

// One message from the reader page walk
export interface CaptureMessage {
  type: string;
  total?: number;
  index?: number;
  url?: string;
}

/** A message the page scripts post: data, a capture message, or an error. */
export interface PageMessage {
  type: string;
  message?: string;
  result?: unknown;
}

/** The title page's `script#initial-data` queries, keyed by the site's query keys. */
export type Queries = Record<string, unknown>;
