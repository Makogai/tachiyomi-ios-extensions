// Port of src/all/comicklive/.../Dto.kt @ d9420cd1.
import { SManga } from "@sdk";

export interface Data<T> {
  data: T;
}

export interface SearchResponse {
  data: BrowseComic[];
  next_cursor?: string | null;
}

export interface BrowseComic {
  default_thumbnail: string;
  slug: string;
  title: string;
}

export function browseComicToSManga(comic: BrowseComic): SManga {
  const manga = SManga.create();
  manga.url = comic.slug;
  manga.title = comic.title;
  manga.thumbnail_url = comic.default_thumbnail;
  return manga;
}

export interface MetadataName {
  name: string;
  slug: string;
}

export interface Metadata {
  genres: MetadataName[];
  tags: MetadataName[];
}

export interface ComicData {
  title: string;
  slug: string;
  default_thumbnail: string;
  status: number;
  translation_completed: boolean;
  artists: { name: string }[];
  authors: { name: string }[];
  desc: string;
  content_rating: string;
  country: string;
  md_comic_md_genres: { md_genres: { name: string } }[];
  /** A list, or an object whose values are the titles (upstream's `TitleTransform`). */
  md_titles: { title: string }[] | Record<string, { title: string }>;
}

/** `TitleTransform`: an object becomes the list of its values. */
export function comicTitles(data: ComicData): { title: string }[] {
  const titles = data.md_titles;
  return Array.isArray(titles) ? titles : Object.values(titles ?? {});
}

export interface ChapterListChapter {
  hid: string;
  chap: string;
  vol: string | null;
  lang: string;
  title: string | null;
  created_at: string;
  group_name: string[];
}

export interface ChapterList {
  data: ChapterListChapter[];
  pagination: {
    current_page: number;
    last_page: number;
  };
}

export interface PageListData {
  chapter: {
    images: { url: string }[];
  };
}
