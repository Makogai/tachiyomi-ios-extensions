/**
 * Source models, with the field names of the Kotlin API (`eu.kanade.tachiyomi.source.model`)
 * so that ported code reads like the original.
 */

/** Strip scheme and host, keeping path, query and fragment. Mirrors `setUrlWithoutDomain`. */
export function urlWithoutDomain(url: string): string {
  const match = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/?#]*(.*)$/.exec(url);
  if (!match) return url;
  return match[1] === "" ? "/" : match[1];
}

export class SManga {
  static readonly UNKNOWN = 0;
  static readonly ONGOING = 1;
  static readonly COMPLETED = 2;
  static readonly LICENSED = 3;
  static readonly PUBLISHING_FINISHED = 4;
  static readonly CANCELLED = 5;
  static readonly ON_HIATUS = 6;

  url = "";
  title = "";
  artist: string | null = null;
  author: string | null = null;
  description: string | null = null;
  genre: string | null = null;
  status = SManga.UNKNOWN;
  thumbnail_url: string | null = null;
  /** 0 = always update, 1 = only fetch once. */
  update_strategy = 0;
  initialized = false;

  static create(): SManga {
    return new SManga();
  }

  /** Builds an SManga from the JSON the app sends. */
  static from(json: Partial<SManga>): SManga {
    return Object.assign(new SManga(), json);
  }

  setUrlWithoutDomain(url: string): void {
    this.url = urlWithoutDomain(url);
  }
}

export class SChapter {
  url = "";
  name = "";
  /** Milliseconds since 1970; 0 when unknown. */
  date_upload = 0;
  /** -1 when unknown. */
  chapter_number = -1;
  scanlator: string | null = null;

  static create(): SChapter {
    return new SChapter();
  }

  static from(json: Partial<SChapter>): SChapter {
    return Object.assign(new SChapter(), json);
  }

  setUrlWithoutDomain(url: string): void {
    this.url = urlWithoutDomain(url);
  }
}

export class Page {
  constructor(
    readonly index: number,
    readonly url: string = "",
    public imageUrl: string | null = null,
  ) {}

  static from(json: { index: number; url?: string; imageUrl?: string | null }): Page {
    return new Page(json.index, json.url ?? "", json.imageUrl ?? null);
  }

  toJSON() {
    return { index: this.index, url: this.url, imageUrl: this.imageUrl };
  }
}

export class MangasPage {
  constructor(
    readonly mangas: SManga[],
    readonly hasNextPage: boolean,
  ) {}
}

export class SMangaUpdate {
  constructor(
    readonly manga: SManga,
    readonly chapters: SChapter[],
  ) {}
}
