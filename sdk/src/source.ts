import type { FilterList } from "./filters.js";
import { ClientBuilder, type Headers, HttpClient } from "./http.js";
import { MangasPage, type Page, type SChapter, SManga, type SMangaUpdate } from "./models.js";
import { PreferenceScreen, SharedPreferences } from "./preferences.js";
import { HttpUrl } from "./url.js";

export interface ImageRequest {
  url: string;
  headers: Headers;
}

/**
 * Base class for a source. Mirrors keiyoushi's `KeiSource` (an `HttpSource` with lib 1.6's
 * `getMangaUpdate`), so a port overrides the same methods as its Kotlin original:
 * `configureClient`, `configureHeaders`, `getPopularManga`, `getLatestUpdates`,
 * `getSearchMangaList`, `getFilterList`, `fetchMangaUpdate`, `getPageList` and, if needed,
 * `getImageUrl`, `getImageRequest`, `getMangaByUrl` and `setupPreferenceScreen`.
 */
export abstract class KeiSource {
  abstract readonly name: string;
  abstract readonly lang: string;
  abstract readonly baseUrl: string;
  /** Bump when the site changes so much that old URLs are useless; it changes the ID. */
  readonly versionId: number = 1;
  /** A fixed ID (decimal string) when upstream hard-codes one in `build.gradle.kts`. */
  readonly id: string | null = null;
  readonly supportsLatest: boolean = true;

  /** Set by the runtime: this source's position in the extension. */
  index = -1;

  private builtClient: { builder: ClientBuilder; client: HttpClient } | null = null;

  /** Override to add rate limits and cookies. Mirrors `OkHttpClient.Builder.configureClient()`. */
  protected configureClient(_builder: ClientBuilder): void {}

  /** Override to add or replace headers. Mirrors `Headers.Builder.configureHeaders()`. */
  protected configureHeaders(headers: Headers): Headers {
    return headers;
  }

  /** Headers for every request: `Referer: <baseUrl>/` plus `configureHeaders`. Read fresh each time. */
  get headers(): Headers {
    return this.configureHeaders({ Referer: `${this.baseUrl}/` });
  }

  get clientBuilder(): ClientBuilder {
    return this.ensureClient().builder;
  }

  get client(): HttpClient {
    return this.ensureClient().client;
  }

  private ensureClient() {
    if (!this.builtClient) {
      const builder = new ClientBuilder();
      this.configureClient(builder);
      this.builtClient = { builder, client: new HttpClient(() => this.index, builder, () => this.headers) };
    }
    return this.builtClient;
  }

  readonly preferences = new SharedPreferences(() => this.index);

  /** Override to declare settings. Mirrors `ConfigurableSource.setupPreferenceScreen`. */
  setupPreferenceScreen(_screen: PreferenceScreen): void {}

  // Browsing

  abstract getPopularManga(page: number): Promise<MangasPage>;

  abstract getLatestUpdates(page: number): Promise<MangasPage>;

  abstract getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage>;

  /** When the query is a URL, look it up instead of searching, as `KeiSource.getSearchManga` does. */
  async getSearchManga(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    const url = HttpUrl.parse(query);
    if (url) return this.getMangasByUrl(url, page);
    return this.getSearchMangaList(page, query, filters);
  }

  protected async getMangaByUrl(_url: HttpUrl): Promise<SManga | null> {
    throw new Error("getMangaByUrl not implemented");
  }

  protected async getMangasByUrl(url: HttpUrl, _page: number): Promise<MangasPage> {
    const manga = await this.getMangaByUrl(url);
    return new MangasPage(manga ? [manga] : [], false);
  }

  getFilterList(): FilterList {
    return [];
  }

  // Manga and chapters

  abstract fetchMangaUpdate(
    manga: SManga,
    chapters: SChapter[],
    fetchDetails: boolean,
    fetchChapters: boolean,
  ): Promise<SMangaUpdate>;

  abstract getPageList(chapter: SChapter): Promise<Page[]>;

  async getImageUrl(_page: Page): Promise<string> {
    throw new Error("getImageUrl not implemented");
  }

  getImageRequest(page: Page): ImageRequest {
    if (!page.imageUrl) throw new Error(`Page ${page.index + 1} has no image URL`);
    return { url: page.imageUrl, headers: this.headers };
  }

  /** The page a person would open for this manga. Used by "Open in WebView". */
  getMangaUrl(manga: SManga): string {
    return this.baseUrl + manga.url;
  }

  getChapterUrl(chapter: SChapter): string {
    return this.baseUrl + chapter.url;
  }

  toString(): string {
    return `${this.name} (${this.lang.toUpperCase()})`;
  }
}

export { SManga };
