// Port of src/en/weebcentral/.../WeebCentral.kt @ d9420cd1. Method names follow the original.
//
// The source's flow. URLs are built in api.ts, HTML is read in parse.ts, the filters and the
// setting live in filters.ts and settings.ts.
import {
  type ClientBuilder,
  defineExtension,
  Fetch,
  type FilterList,
  type HttpUrl,
  KeiSource,
  type MangasPage,
  type Page,
  type PreferenceScreen,
  type SChapter,
  SManga,
  SMangaUpdate,
  seconds,
  toHttpUrl,
} from "@sdk";
import { chapterListUrl, pageListUrl, searchUrl } from "./api";
import { defaultFilterList, SortFilter } from "./filters";
import { chapterListParse, mangaDetailsParse, pageListParse, searchMangaParse } from "./parse";
import * as settings from "./settings";

class WeebCentral extends KeiSource {
  readonly name = "Weeb Central";
  readonly lang = "en";
  readonly baseUrl = "https://weebcentral.com";

  private get baseUrlHost(): string {
    return toHttpUrl(this.baseUrl).host;
  }

  protected override configureClient(builder: ClientBuilder): void {
    builder.rateLimit(1, seconds(2), (url) => url.host === this.baseUrlHost);
  }

  // ============================== Popular ===============================

  getPopularManga(page: number): Promise<MangasPage> {
    return this.getSearchMangaList(page, "", defaultFilterList(new SortFilter("Popularity")));
  }

  // =============================== Latest ===============================

  getLatestUpdates(page: number): Promise<MangasPage> {
    return this.getSearchMangaList(page, "", defaultFilterList(new SortFilter("Latest Updates")));
  }

  // =============================== Search ===============================

  async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    const filterList = filters.length > 0 ? filters : this.getFilterList();
    const document = (await this.client.get(searchUrl(this.baseUrl, page, query, filterList), Fetch.DOCUMENT)).asJsoup();
    return searchMangaParse(document);
  }

  protected override async getMangaByUrl(url: HttpUrl): Promise<SManga | null> {
    if (url.host !== this.baseUrlHost || url.pathSegments.length < 3) {
      return null;
    }

    const manga = SManga.create();
    manga.url = `/series/${url.pathSegments[1]}/${url.pathSegments[2]}`;

    const updated = (await this.fetchMangaUpdate(manga, [], true, false)).manga;
    updated.initialized = true;
    return updated;
  }

  // =============================== Filters ==============================

  override getFilterList(): FilterList {
    return defaultFilterList(new SortFilter());
  }

  // =========================== Manga Updates ============================

  async fetchMangaUpdate(
    manga: SManga,
    chapters: SChapter[],
    fetchDetails: boolean,
    fetchChapters: boolean,
  ): Promise<SMangaUpdate> {
    const [updatedManga, updatedChapters] = await Promise.all([
      fetchDetails ? this.getMangaDetails(manga) : Promise.resolve(manga),
      fetchChapters ? this.getChapterList(manga) : Promise.resolve(chapters),
    ]);

    return new SMangaUpdate(updatedManga, updatedChapters);
  }

  private async getMangaDetails(manga: SManga): Promise<SManga> {
    const document = (await this.client.get(this.baseUrl + manga.url, Fetch.DOCUMENT)).asJsoup();
    return mangaDetailsParse(document, settings.cleanTitle(this.preferences));
  }

  // Related manga (`fetchRelatedMangaList`) is not ported: the host API has no related-manga call.

  private async getChapterList(manga: SManga): Promise<SChapter[]> {
    const document = (await this.client.get(chapterListUrl(this.baseUrl, manga.url), Fetch.DOCUMENT)).asJsoup();
    return chapterListParse(document);
  }

  // =============================== Pages ================================

  async getPageList(chapter: SChapter): Promise<Page[]> {
    const document = (await this.client.get(pageListUrl(this.baseUrl, chapter.url), Fetch.DOCUMENT)).asJsoup();
    return pageListParse(document);
  }

  // Upstream's getImageRequest only adds `Host: <image host>`, which every request carries
  // already; the default request (with the Referer header) is the same.

  // ============================== Settings ==============================

  override setupPreferenceScreen(screen: PreferenceScreen): void {
    settings.setupPreferenceScreen(screen);
  }
}

export default defineExtension([new WeebCentral()]);
