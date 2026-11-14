// Port of src/all/mangadex/.../MangaDex.kt @ d9420cd1. Method names follow the original.
//
// Files: api.ts (every API URL), parse.ts (entities → SManga/SChapter/Page; MangaDexHelper.kt),
// dto.ts (dto/*.kt), filters.ts (MangaDexFilters.kt), settings.ts (preferences), constants.ts
// (MDConstants.kt: URLs, limits, preference keys), intl.ts (assets/i18n).
import {
  type ClientBuilder,
  defineExtension,
  Fetch,
  type FilterList,
  type Headers,
  type HttpUrl,
  type ImageRequest,
  type Intl,
  KeiSource,
  MangasPage,
  type Page,
  type PreferenceScreen,
  type Response,
  type SChapter,
  type SManga,
  SMangaUpdate,
  toHttpUrl,
} from "@sdk";
import * as api from "./api";
import * as MD from "./constants";
import {
  type AggregateDto,
  type AggregateVolume,
  type AtHomeDto,
  type ChapterDto,
  type ChapterListDto,
  type CoverArtListDto,
  firstRelationship,
  hasNextPage,
  isInvalid,
  type ListDto,
  MANGA,
  type MangaDataDto,
  type MangaDto,
  type MangaListDto,
  relationshipsOfType,
} from "./dto";
import { getMDFilterList } from "./filters";
import { intlFor } from "./intl";
import {
  coverFileName,
  createBasicManga,
  createChapter,
  createManga,
  firstVolumeCoverFileNames,
  getUUIDFromUrl,
  mangaIdsOfFeed,
  pageListParse,
  titleToSlug,
} from "./parse";
import * as settings from "./settings";

// Upstream's languages, in its order. Each is part of that source's ID ("mangadex/<lang>/1"),
// which must stay equal to the keiyoushi APK's: never rename one.
// prettier-ignore
const LANGS = [
  "all", "af", "sq", "ar", "az", "eu", "be", "bn", "bg", "my", "ca", "zh-Hans", "zh-Hant",
  "cv", "hr", "cs", "da", "nl", "en", "eo", "et", "fil", "fi", "fr", "ka", "de", "el",
  "he", "hi", "hu", "ga", "id", "it", "ja", "jv", "kk", "ko", "la", "lt", "ms", "mn",
  "ne", "no", "fa", "pl", "pt-BR", "pt", "ro", "ru", "sr", "sk", "es-419", "es", "sv",
  "ta", "te", "th", "tr", "uk", "ur", "uz", "vi",
];

/** The at-home server for a chapter: `getValidImageUrlForPage` refreshes it after five minutes. */
interface AtHomeServer {
  baseUrl: string;
  fetchedAt: number;
}

class MangaDex extends KeiSource {
  readonly name = "MangaDex";
  readonly baseUrl = "https://mangadex.org";

  constructor(readonly lang: string) {
    super();
  }

  private get dexLang(): string {
    switch (this.lang) {
      case "zh-Hans":
        return "zh";
      case "zh-Hant":
        return "zh-hk";
      case "fil":
        return "tl";
      case "pt-BR":
        return "pt-br";
      case "es-419":
        return "es-la";
      default:
        return this.lang;
    }
  }

  private get translatedLanguages(): string[] {
    return this.dexLang === MD.ALL_LANGUAGES ? [] : [this.dexLang];
  }

  private intlValue: Intl | null = null;

  private get intl(): Intl {
    return (this.intlValue ??= intlFor(this.lang));
  }

  /** The settings every list request filters by, read fresh. */
  private get listPrefs(): api.ListPrefs {
    const { preferences, dexLang } = this;
    return {
      translatedLanguages: this.translatedLanguages,
      contentRating: settings.contentRating(preferences, dexLang),
      originalLanguages: settings.originalLanguages(preferences, dexLang),
      blockedGroups: settings.blockedGroups(preferences, dexLang),
      blockedUploaders: settings.blockedUploaders(preferences, dexLang),
    };
  }

  /**
   * Upstream identifies itself to MangaDex (which asks clients not to pose as browsers) with
   * `User-Agent: Tachiyomi <Android http.agent>` and an `Extra` header naming the app and
   * extension versions. Scripts cannot read either, so both name this port instead.
   */
  protected override configureHeaders(headers: Headers): Headers {
    return { ...headers, "User-Agent": "Tachiyomi (tachiyomi-ios-extensions)", Extra: "MangaDex JS port of Keiyoushi" };
  }

  /** `rateLimit(3)`: three requests a second, to every host. */
  protected override configureClient(builder: ClientBuilder): void {
    builder.rateLimit(3);
  }

  // Popular manga section

  async getPopularManga(page: number): Promise<MangasPage> {
    return this.parseMangasPage(await this.client.get(api.popularMangaUrl(page, this.listPrefs), Fetch.XHR));
  }

  private async parseMangasPage(response: Response): Promise<MangasPage> {
    if (response.code === 204) return new MangasPage([], false);

    const mangaListDto = response.parseAs<MangaListDto>();
    const data = mangaListDto.data ?? [];
    return new MangasPage(await this.basicMangas(data), hasNextPage(mangaListDto));
  }

  /** Browse entries for `list`, with the first volume's cover (looked up for all of `data`) when that setting is on. */
  private async basicMangas(data: MangaDataDto[], list = data): Promise<SManga[]> {
    const firstVolumeCovers = (await this.fetchFirstVolumeCovers(data)) ?? new Map<string, string>();
    const coverSuffix = settings.coverQuality(this.preferences, this.dexLang);
    const preferExtensionLangTitle = settings.preferExtensionLangTitle(this.preferences, this.dexLang);
    return list.map((mangaDataDto) =>
      createBasicManga(mangaDataDto, firstVolumeCovers.get(mangaDataDto.id) ?? coverFileName(mangaDataDto), coverSuffix, this.dexLang, preferExtensionLangTitle),
    );
  }

  // Latest manga section

  async getLatestUpdates(page: number): Promise<MangasPage> {
    return this.latestUpdatesParse(await this.client.get(api.latestUpdatesUrl(page, this.listPrefs), Fetch.XHR));
  }

  /** The chapter feed names the manga; a second request loads them, kept in feed order. */
  private async latestUpdatesParse(response: Response): Promise<MangasPage> {
    const chapterListDto = response.parseAs<ChapterListDto>();
    const mangaIds = mangaIdsOfFeed(chapterListDto);
    // Upstream asks with limit=0 when the feed is empty; there is nothing to ask for.
    if (mangaIds.length === 0) return new MangasPage([], hasNextPage(chapterListDto));

    const mangaApiUrl = api.mangaByIdsUrl(mangaIds, settings.contentRating(this.preferences, this.dexLang));
    const data = (await this.client.get(mangaApiUrl, Fetch.XHR)).parseAs<MangaListDto>().data ?? [];
    const mangaDtoMap = new Map(data.map((manga) => [manga.id, manga]));
    const inFeedOrder = mangaIds.map((id) => mangaDtoMap.get(id)).filter((manga): manga is MangaDataDto => manga != null);
    return new MangasPage(await this.basicMangas(data, inFeedOrder), hasNextPage(chapterListDto));
  }

  // Search manga section

  protected override async getMangasByUrl(url: HttpUrl, page: number): Promise<MangasPage> {
    if (url.host.endsWith("mangadex.org") || url.host === "canary.mangadex.dev") {
      const first = url.pathSegments[0];
      const searchPrefix = first ? MD.pathToSearchPrefix[first] : undefined;
      if (searchPrefix) {
        const match = MD.uuidRegex.exec(url.toString());
        if (match) return this.getSearchMangaList(page, searchPrefix + match[0], this.getFilterList());
      }
    }
    return this.getSearchMangaList(page, url.toString(), this.getFilterList());
  }

  async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    // Not upstream: a bare UUID (copied from a title page) is looked up as `id:<uuid>`.
    if (MD.isUuid(query.trim())) query = MD.PREFIX_ID_SEARCH + query.trim();

    if (query.startsWith(MD.PREFIX_CH_SEARCH)) {
      const mangaId = await this.getMangaIdFromChapterId(query.slice(MD.PREFIX_CH_SEARCH.length));
      return this.parseMangasPage(await this.client.get(this.searchMangaUrl(page, MD.PREFIX_ID_SEARCH + mangaId, filters), Fetch.XHR));
    }
    if (query.startsWith(MD.PREFIX_USER_SEARCH)) {
      const url = api.searchMangaUploaderUrl(page, query.slice(MD.PREFIX_USER_SEARCH.length), this.listPrefs);
      return this.latestUpdatesParse(await this.client.get(url, Fetch.XHR));
    }
    if (query.startsWith(MD.PREFIX_LIST_SEARCH)) {
      const response = await this.client.get(api.listUrl(query.slice(MD.PREFIX_LIST_SEARCH.length)), Fetch.XHR);
      return this.searchMangaListParse(response, page, filters);
    }
    return this.parseMangasPage(await this.client.get(this.searchMangaUrl(page, query.trim(), filters), Fetch.XHR));
  }

  private async getMangaIdFromChapterId(id: string): Promise<string> {
    const response = await this.client.get(api.chapterUrl(id), { fetch: Fetch.XHR, ensureSuccess: false });
    if (!response.isSuccessful) throw new Error(this.intl.format("unable_to_process_chapter_request", response.code));
    const chapter = response.parseAs<ChapterDto>().data;
    const manga = chapter ? firstRelationship(chapter, MANGA) : null;
    if (!manga) throw new Error(this.intl.format("unable_to_process_chapter_request", response.code));
    return manga.id;
  }

  private searchMangaUrl(page: number, query: string, filters: FilterList): HttpUrl {
    return api.searchMangaUrl(page, query, filters.length ? filters : this.getFilterList(), this.dexLang, this.intl);
  }

  private async searchMangaListParse(response: Response, page: number, filters: FilterList): Promise<MangasPage> {
    const listDto = response.parseAs<ListDto>();
    const listDtoFiltered = listDto.data ? relationshipsOfType(listDto.data, MANGA) : [];
    const amount = listDtoFiltered.length;
    if (amount < 1) throw new Error(this.intl.get("no_series_in_list"));

    const minIndex = (page - 1) * MD.MANGA_LIMIT;
    const ids = [...new Set(listDtoFiltered.slice(minIndex, minIndex + MD.MANGA_LIMIT).map((manga) => manga.id))];
    const finalUrl = api.listMangaUrl(ids, filters.length ? filters : this.getFilterList(), this.dexLang);
    const mangaList = (await this.parseMangasPage(await this.client.get(finalUrl, Fetch.XHR))).mangas;
    const more = amount / MD.MANGA_LIMIT - (page - 1) > 1 && ids.length === MD.MANGA_LIMIT;
    return new MangasPage(mangaList, more);
  }

  // Manga Details section

  override getMangaUrl(manga: SManga): string {
    return `${this.baseUrl}${manga.url.replace("/manga/", "/title/")}/${titleToSlug(manga.title)}`;
  }

  /** The API entry for a manga URL; old (pre-UUID) URLs ask the user to migrate. */
  protected override async getMangaByUrl(url: HttpUrl): Promise<SManga> {
    if (!MD.containsUuid(url.toString())) throw new Error(this.intl.get("migrate_warning"));
    return this.mangaDetails(url.pathSegments[1]);
  }

  private async mangaDetails(mangaId: string): Promise<SManga> {
    const data = (await this.client.get(api.mangaDetailsUrl(mangaId), Fetch.XHR)).parseAs<MangaDto>().data;
    if (!data) throw new Error(`MangaDex has no manga ${mangaId}`);
    const chapters = await this.fetchSimpleChapterList(data);
    const firstVolumeCover = await this.fetchFirstVolumeCover(data);
    const { preferences, dexLang } = this;
    return createManga(this.intl, data, chapters, firstVolumeCover, {
      lang: dexLang,
      coverSuffix: settings.coverQuality(preferences, dexLang),
      altTitlesInDesc: settings.altTitlesInDesc(preferences, dexLang),
      preferExtensionLangTitle: settings.preferExtensionLangTitle(preferences, dexLang),
      finalChapterInDesc: settings.finalChapterInDesc(preferences, dexLang),
    });
  }

  /**
   * A quick list of the chapters, to tell a finished series from one still missing chapters.
   * Uses the 'aggregate' endpoint; see getPublicationStatus.
   */
  private async fetchSimpleChapterList(manga: MangaDataDto): Promise<Record<string, AggregateVolume> | AggregateVolume[]> {
    try {
      const response = await this.client.get(api.aggregateUrl(manga.id, this.translatedLanguages), { fetch: Fetch.XHR, ensureSuccess: false });
      return response.parseAs<AggregateDto>().volumes ?? {};
    } catch {
      return {};
    }
  }

  private async fetchFirstVolumeCover(manga: MangaDataDto): Promise<string | null> {
    return (await this.fetchFirstVolumeCovers([manga]))?.get(manga.id) ?? null;
  }

  /** The first volume's cover in the original language, when that setting is on. Uses the 'covers' endpoint. */
  private async fetchFirstVolumeCovers(mangaList: MangaDataDto[]): Promise<Map<string, string> | null> {
    if (!settings.tryUsingFirstVolumeCover(this.preferences, this.dexLang) || mangaList.length === 0) return null;

    const safeMangaList = mangaList.filter((manga) => manga.attributes?.originalLanguage);
    const mangaMap = new Map(safeMangaList.map((manga) => [manga.id, manga.attributes!]));
    const locales = [...new Set(safeMangaList.map((manga) => manga.attributes!.originalLanguage!))];
    const limit = Math.min(mangaMap.size * locales.length, 100);

    let covers: CoverArtListDto["data"];
    try {
      covers = (await this.client.get(api.coverListUrl(mangaMap.keys(), locales, limit), Fetch.XHR)).parseAs<CoverArtListDto>().data ?? [];
    } catch {
      return null;
    }
    return firstVolumeCoverFileNames(covers, mangaMap);
  }

  // Chapter list section

  private async getChapterList(manga: SManga): Promise<SChapter[]> {
    if (!MD.containsUuid(manga.url)) throw new Error(this.intl.get("migrate_warning"));

    const mangaId = getUUIDFromUrl(manga.url);
    const response = await this.client.get(this.paginatedChapterListUrl(mangaId, 0), Fetch.XHR);
    if (response.code === 204) return [];

    const chapterListResponse = response.parseAs<ChapterListDto>();
    const chapterListResults = [...(chapterListResponse.data ?? [])];
    let offset = chapterListResponse.offset ?? 0;
    let more = hasNextPage(chapterListResponse);

    // Max results that can be returned is 500 so need to make more API
    // calls if the chapter list response has a next page.
    while (more) {
      offset += chapterListResponse.limit ?? 500;
      const newChapterList = (await this.client.get(this.paginatedChapterListUrl(mangaId, offset), Fetch.XHR)).parseAs<ChapterListDto>();
      chapterListResults.push(...(newChapterList.data ?? []));
      more = hasNextPage(newChapterList);
    }

    return chapterListResults.filter((chapter) => chapter.attributes && !isInvalid(chapter.attributes)).map((chapter) => createChapter(this.intl, this.lang, chapter));
  }

  private paginatedChapterListUrl(mangaId: string, offset: number): HttpUrl {
    return api.paginatedChapterListUrl(mangaId, offset, this.listPrefs, settings.includeUnavailable(this.preferences, this.dexLang));
  }

  override getChapterUrl(chapter: SChapter): string {
    return this.baseUrl + chapter.url;
  }

  async fetchMangaUpdate(manga: SManga, chapters: SChapter[], fetchDetails: boolean, fetchChapters: boolean): Promise<SMangaUpdate> {
    const [details, chapterList] = await Promise.all([
      fetchDetails ? this.getMangaByUrl(toHttpUrl(this.getMangaUrl(manga))) : Promise.resolve(manga),
      fetchChapters ? this.getChapterList(manga) : Promise.resolve(chapters),
    ]);
    return new SMangaUpdate(details, chapterList);
  }

  // Pages

  /** The last at-home answer per request URL, standing in for upstream's HTTP cache of it. */
  private readonly atHomeServers = new Map<string, AtHomeServer>();

  async getPageList(chapter: SChapter): Promise<Page[]> {
    if (!MD.containsUuid(chapter.url)) throw new Error(this.intl.get("migrate_warning"));

    const chapterId = chapter.url.slice(chapter.url.indexOf("/chapter/") + "/chapter/".length);
    const url = api.atHomeServerUrl(chapterId, settings.forceStandardHttps(this.preferences, this.dexLang));
    const atHomeDto = (await this.client.get(url, Fetch.XHR)).parseAs<AtHomeDto>();

    // Have to add the time, and url to the page because pages timeout within 30 minutes now.
    const now = Date.now();
    this.atHomeServers.set(url, { baseUrl: atHomeDto.baseUrl, fetchedAt: now });
    return pageListParse(atHomeDto, url, settings.useDataSaver(this.preferences, this.dexLang), now);
  }

  /** `getValidImageUrlForPage`: the page's server while it is fresh, else the chapter's current one. */
  override async getImageRequest(page: Page): Promise<ImageRequest> {
    const [host, tokenRequestUrl, time] = page.url.split(",");
    if (!page.imageUrl || !tokenRequestUrl) throw new Error(`Page ${page.index + 1} has no image URL`);
    const server = Date.now() - Number(time) > MD.MD_AT_HOME_TOKEN_LIFESPAN ? await this.getMdAtHomeUrl(tokenRequestUrl) : host;
    return { url: server + page.imageUrl, headers: this.headers };
  }

  private async getMdAtHomeUrl(tokenRequestUrl: string): Promise<string> {
    const known = this.atHomeServers.get(tokenRequestUrl);
    if (known && Date.now() - known.fetchedAt <= MD.MD_AT_HOME_TOKEN_LIFESPAN) return known.baseUrl;
    const baseUrl = (await this.client.get(tokenRequestUrl, Fetch.XHR)).parseAs<AtHomeDto>().baseUrl;
    this.atHomeServers.set(tokenRequestUrl, { baseUrl, fetchedAt: Date.now() });
    return baseUrl;
  }

  // Settings and filters

  override setupPreferenceScreen(screen: PreferenceScreen): void {
    settings.setupPreferenceScreen(screen, this.intl, this.dexLang);
  }

  override getFilterList(): FilterList {
    return getMDFilterList(this.preferences, this.dexLang, this.intl);
  }
}

export default defineExtension(LANGS.map((lang) => new MangaDex(lang)));
