// Port of src/all/mangadex @ d9420cd1. Method names follow the original (MangaDex.kt,
// MangaDexHelper.kt, MDConstants.kt, MangaDexFilters.kt).
import {
  type ClientBuilder,
  defineExtension,
  EditTextPreference,
  Fetch,
  type FilterList,
  type Headers,
  type HttpUrl,
  type HttpUrlBuilder,
  type ImageRequest,
  type Intl,
  KeiSource,
  ListPreference,
  MangasPage,
  MultiSelectListPreference,
  Page,
  type PreferenceScreen,
  type Response,
  type SChapter,
  type SManga,
  SMangaUpdate,
  SwitchPreferenceCompat,
  toHttpUrl,
} from "@sdk";
import * as MD from "./constants";
import {
  ARTIST,
  AUTHOR,
  type AggregateDto,
  type AggregateVolume,
  type AtHomeDto,
  type ChapterDto,
  type ChapterListDto,
  COVER_ART,
  type CoverArtAttributesDto,
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
  SCANLATION_GROUP,
  USER,
} from "./dto";
import { addFiltersToUrl, formatNoOffset, getMDFilterList } from "./filters";
import { createBasicManga, createChapter, createManga, getUUIDFromUrl, titleToSlug } from "./helper";
import { intlFor } from "./intl";

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

  private addAll(url: HttpUrlBuilder, name: string, values: Iterable<string> | null | undefined): HttpUrlBuilder {
    for (const value of values ?? []) url.addQueryParameter(name, value);
    return url;
  }

  // Popular manga section

  async getPopularManga(page: number): Promise<MangasPage> {
    const url = toHttpUrl(MD.API_MANGA_URL).newBuilder();
    url.addQueryParameter("order[followedCount]", "desc");
    url.addQueryParameter("hasAvailableChapters", "true");
    this.addAll(url, "availableTranslatedLanguage[]", this.translatedLanguages);
    url.addQueryParameter("limit", String(MD.MANGA_LIMIT));
    url.addQueryParameter("offset", this.getMangaListOffset(page));
    url.addQueryParameter("includes[]", COVER_ART);
    this.addAll(url, "contentRating[]", this.contentRating);
    this.addAll(url, "originalLanguage[]", this.originalLanguages);
    // LocalDate.now().minusDays(30).atStartOfDay().atZone(UTC): today's local date, at 00:00 UTC.
    const now = new Date();
    url.addQueryParameter("createdAtSince", formatNoOffset(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 30))));

    return this.parseMangasPage(await this.client.get(url.build(), Fetch.XHR));
  }

  private async parseMangasPage(response: Response): Promise<MangasPage> {
    if (response.code === 204) return new MangasPage([], false);

    const mangaListDto = response.parseAs<MangaListDto>();
    const data = mangaListDto.data ?? [];
    const coverSuffix = this.coverQuality;
    const firstVolumeCovers = (await this.fetchFirstVolumeCovers(data)) ?? new Map<string, string>();

    const mangaList = data.map((mangaDataDto) =>
      createBasicManga(mangaDataDto, firstVolumeCovers.get(mangaDataDto.id) ?? this.coverFileName(mangaDataDto), coverSuffix, this.dexLang, this.preferExtensionLangTitle),
    );
    return new MangasPage(mangaList, hasNextPage(mangaListDto));
  }

  private coverFileName(manga: MangaDataDto): string | null {
    return firstRelationship<CoverArtAttributesDto>(manga, COVER_ART)?.attributes?.fileName ?? null;
  }

  private getMangaListOffset(page: number): string {
    return String(MD.MANGA_LIMIT * (page - 1));
  }

  private getLatestChapterOffset(page: number): string {
    return String(MD.LATEST_CHAPTER_LIMIT * (page - 1));
  }

  // Latest manga section

  private latestUpdatesUrl(page: number): HttpUrl {
    const url = toHttpUrl(MD.API_CHAPTER_URL).newBuilder();
    url.addQueryParameter("offset", this.getLatestChapterOffset(page));
    url.addQueryParameter("limit", String(MD.LATEST_CHAPTER_LIMIT));
    this.addAll(url, "translatedLanguage[]", this.translatedLanguages);
    url.addQueryParameter("order[publishAt]", "desc");
    // Upstream sends 1 only for Komikku/TachiyomiSY's delegated sources.
    url.addQueryParameter("includeFutureUpdates", "0");
    this.addAll(url, "originalLanguage[]", this.originalLanguages);
    this.addAll(url, "contentRating[]", this.contentRating);
    this.addAll(url, "excludedGroups[]", new Set([...MD.defaultBlockedGroups, ...this.blockedGroups]));
    this.addAll(url, "excludedUploaders[]", this.blockedUploaders);
    url.addQueryParameter("includeFuturePublishAt", "0");
    url.addQueryParameter("includeEmptyPages", "0");
    return url.build();
  }

  async getLatestUpdates(page: number): Promise<MangasPage> {
    return this.latestUpdatesParse(await this.client.get(this.latestUpdatesUrl(page), Fetch.XHR));
  }

  /** The chapter feed names the manga; a second request loads them, kept in feed order. */
  private async latestUpdatesParse(response: Response): Promise<MangasPage> {
    const chapterListDto = response.parseAs<ChapterListDto>();
    const mangaIds = [...new Set((chapterListDto.data ?? []).flatMap((chapter) => relationshipsOfType(chapter, MANGA)).map((manga) => manga.id))];
    // Upstream asks with limit=0 when the feed is empty; there is nothing to ask for.
    if (mangaIds.length === 0) return new MangasPage([], hasNextPage(chapterListDto));

    const mangaApiUrl = toHttpUrl(MD.API_MANGA_URL).newBuilder();
    mangaApiUrl.addQueryParameter("includes[]", COVER_ART);
    mangaApiUrl.addQueryParameter("limit", String(mangaIds.length));
    this.addAll(mangaApiUrl, "contentRating[]", this.contentRating);
    this.addAll(mangaApiUrl, "ids[]", mangaIds);

    const mangaListDto = (await this.client.get(mangaApiUrl.build(), Fetch.XHR)).parseAs<MangaListDto>();
    const data = mangaListDto.data ?? [];
    const firstVolumeCovers = (await this.fetchFirstVolumeCovers(data)) ?? new Map<string, string>();
    const mangaDtoMap = new Map(data.map((manga) => [manga.id, manga]));
    const coverSuffix = this.coverQuality;

    const mangaList = mangaIds
      .map((id) => mangaDtoMap.get(id))
      .filter((manga): manga is MangaDataDto => manga != null)
      .map((mangaDataDto) =>
        createBasicManga(mangaDataDto, firstVolumeCovers.get(mangaDataDto.id) ?? this.coverFileName(mangaDataDto), coverSuffix, this.dexLang, this.preferExtensionLangTitle),
      );
    return new MangasPage(mangaList, hasNextPage(chapterListDto));
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
      return this.latestUpdatesParse(await this.client.get(this.searchMangaUploaderUrl(page, query.slice(MD.PREFIX_USER_SEARCH.length)), Fetch.XHR));
    }
    if (query.startsWith(MD.PREFIX_LIST_SEARCH)) {
      const response = await this.client.get(`${MD.API_LIST_URL}/${query.slice(MD.PREFIX_LIST_SEARCH.length)}`, Fetch.XHR);
      return this.searchMangaListParse(response, page, filters);
    }
    return this.parseMangasPage(await this.client.get(this.searchMangaUrl(page, query.trim(), filters), Fetch.XHR));
  }

  private async getMangaIdFromChapterId(id: string): Promise<string> {
    const response = await this.client.get(`${MD.API_CHAPTER_URL}/${id}`, { fetch: Fetch.XHR, ensureSuccess: false });
    if (!response.isSuccessful) throw new Error(this.intl.format("unable_to_process_chapter_request", response.code));
    const chapter = response.parseAs<ChapterDto>().data;
    const manga = chapter ? firstRelationship(chapter, MANGA) : null;
    if (!manga) throw new Error(this.intl.format("unable_to_process_chapter_request", response.code));
    return manga.id;
  }

  private searchMangaUrl(page: number, query: string, filters: FilterList): HttpUrl {
    if (query.startsWith(MD.PREFIX_ID_SEARCH)) {
      const mangaId = query.slice(MD.PREFIX_ID_SEARCH.length);
      if (!MD.containsUuid(mangaId)) throw new Error(this.intl.get("invalid_manga_id"));
      const url = toHttpUrl(MD.API_MANGA_URL).newBuilder();
      url.addQueryParameter("ids[]", mangaId);
      url.addQueryParameter("includes[]", COVER_ART);
      this.addAll(url, "contentRating[]", MD.allContentRatings);
      return url.build();
    }

    const tempUrl = toHttpUrl(MD.API_MANGA_URL).newBuilder();
    tempUrl.addQueryParameter("limit", String(MD.MANGA_LIMIT));
    tempUrl.addQueryParameter("offset", this.getMangaListOffset(page));
    tempUrl.addQueryParameter("includes[]", COVER_ART);

    if (query.startsWith(MD.PREFIX_GRP_SEARCH)) {
      const groupId = query.slice(MD.PREFIX_GRP_SEARCH.length);
      if (!MD.containsUuid(groupId)) throw new Error(this.intl.get("invalid_group_id"));
      tempUrl.addQueryParameter("group", groupId);
    } else if (query.startsWith(MD.PREFIX_AUTHOR_SEARCH)) {
      const authorId = query.slice(MD.PREFIX_AUTHOR_SEARCH.length);
      if (!MD.containsUuid(authorId)) throw new Error(this.intl.get("invalid_author_id"));
      tempUrl.addQueryParameter("authorOrArtist", authorId);
    } else {
      const actualQuery = query.replace(/\s/g, " ");
      if (actualQuery.trim() !== "") tempUrl.addQueryParameter("title", actualQuery);
    }

    return addFiltersToUrl(tempUrl, filters.length ? filters : this.getFilterList(), this.dexLang).build();
  }

  private async searchMangaListParse(response: Response, page: number, filters: FilterList): Promise<MangasPage> {
    const listDto = response.parseAs<ListDto>();
    const listDtoFiltered = listDto.data ? relationshipsOfType(listDto.data, MANGA) : [];
    const amount = listDtoFiltered.length;
    if (amount < 1) throw new Error(this.intl.get("no_series_in_list"));

    const minIndex = (page - 1) * MD.MANGA_LIMIT;
    const tempUrl = toHttpUrl(MD.API_MANGA_URL).newBuilder();
    tempUrl.addQueryParameter("limit", String(MD.MANGA_LIMIT));
    tempUrl.addQueryParameter("offset", "0");
    tempUrl.addQueryParameter("includes[]", COVER_ART);
    const ids = [...new Set(listDtoFiltered.slice(minIndex, minIndex + MD.MANGA_LIMIT).map((manga) => manga.id))];
    this.addAll(tempUrl, "ids[]", ids);

    const finalUrl = addFiltersToUrl(tempUrl, filters.length ? filters : this.getFilterList(), this.dexLang).build();
    const mangaList = (await this.parseMangasPage(await this.client.get(finalUrl, Fetch.XHR))).mangas;
    const more = amount / MD.MANGA_LIMIT - (page - 1) > 1 && ids.length === MD.MANGA_LIMIT;
    return new MangasPage(mangaList, more);
  }

  private searchMangaUploaderUrl(page: number, uploader: string): HttpUrl {
    const url = toHttpUrl(MD.API_CHAPTER_URL).newBuilder();
    url.addQueryParameter("offset", this.getLatestChapterOffset(page));
    url.addQueryParameter("limit", String(MD.LATEST_CHAPTER_LIMIT));
    this.addAll(url, "translatedLanguage[]", this.translatedLanguages);
    url.addQueryParameter("order[publishAt]", "desc");
    url.addQueryParameter("includeFutureUpdates", "0");
    url.addQueryParameter("includeFuturePublishAt", "0");
    url.addQueryParameter("includeEmptyPages", "0");
    url.addQueryParameter("uploader", uploader);
    this.addAll(url, "originalLanguage[]", this.originalLanguages);
    this.addAll(url, "contentRating[]", this.contentRating);
    this.addAll(url, "excludedGroups[]", new Set([...MD.defaultBlockedGroups, ...this.blockedGroups]));
    this.addAll(url, "excludedUploaders[]", this.blockedUploaders);
    return url.build();
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
    const url = toHttpUrl(`${MD.API_URL}/manga/${mangaId}`).newBuilder();
    url.addQueryParameter("includes[]", COVER_ART);
    url.addQueryParameter("includes[]", AUTHOR);
    url.addQueryParameter("includes[]", ARTIST);
    const data = (await this.client.get(url.build(), Fetch.XHR)).parseAs<MangaDto>().data;
    if (!data) throw new Error(`MangaDex has no manga ${mangaId}`);
    const chapters = await this.fetchSimpleChapterList(data);
    const firstVolumeCover = await this.fetchFirstVolumeCover(data);
    return createManga(this.intl, data, chapters, firstVolumeCover, {
      lang: this.dexLang,
      coverSuffix: this.coverQuality,
      altTitlesInDesc: this.altTitlesInDesc,
      preferExtensionLangTitle: this.preferExtensionLangTitle,
      finalChapterInDesc: this.finalChapterInDesc,
    });
  }

  /**
   * A quick list of the chapters, to tell a finished series from one still missing chapters.
   * Uses the 'aggregate' endpoint; see getPublicationStatus.
   */
  private async fetchSimpleChapterList(manga: MangaDataDto): Promise<Record<string, AggregateVolume> | AggregateVolume[]> {
    const url = toHttpUrl(`${MD.API_MANGA_URL}/${manga.id}/aggregate`).newBuilder();
    this.addAll(url, "translatedLanguage[]", this.translatedLanguages);
    try {
      const response = await this.client.get(url.build(), { fetch: Fetch.XHR, ensureSuccess: false });
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
    if (!this.tryUsingFirstVolumeCover || mangaList.length === 0) return null;

    const safeMangaList = mangaList.filter((manga) => manga.attributes?.originalLanguage);
    const mangaMap = new Map(safeMangaList.map((manga) => [manga.id, manga.attributes!]));
    const locales = [...new Set(safeMangaList.map((manga) => manga.attributes!.originalLanguage!))];
    const limit = Math.min(mangaMap.size * locales.length, 100);

    const apiUrl = toHttpUrl(`${MD.API_URL}/cover`).newBuilder();
    apiUrl.addQueryParameter("order[volume]", "asc");
    this.addAll(apiUrl, "manga[]", mangaMap.keys());
    this.addAll(apiUrl, "locales[]", locales);
    apiUrl.addQueryParameter("limit", String(limit));
    apiUrl.addQueryParameter("offset", "0");

    let covers: CoverArtListDto["data"];
    try {
      covers = (await this.client.get(apiUrl.build(), Fetch.XHR)).parseAs<CoverArtListDto>().data ?? [];
    } catch {
      return null;
    }

    const byManga = new Map<string, NonNullable<CoverArtListDto["data"]>>();
    for (const cover of covers) {
      const mangaId = firstRelationship(cover, MANGA)?.id;
      if (mangaId) byManga.set(mangaId, [...(byManga.get(mangaId) ?? []), cover]);
    }
    const result = new Map<string, string>();
    for (const [mangaId, list] of byManga) {
      const fileName = list.find((cover) => cover.attributes?.locale === mangaMap.get(mangaId)?.originalLanguage)?.attributes?.fileName;
      if (fileName) result.set(mangaId, fileName);
    }
    return result;
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

  /** Required because the chapter list API endpoint is paginated. */
  private paginatedChapterListUrl(mangaId: string, offset: number): HttpUrl {
    const url = toHttpUrl(`${MD.API_MANGA_URL}/${mangaId}/feed`).newBuilder();
    url.addQueryParameter("includes[]", SCANLATION_GROUP);
    url.addQueryParameter("includes[]", USER);
    url.addQueryParameter("limit", "500");
    url.addQueryParameter("offset", String(offset));
    url.addQueryParameter("order[volume]", "desc");
    url.addQueryParameter("order[chapter]", "desc");
    url.addQueryParameter("includeFuturePublishAt", "0");
    this.addAll(url, "translatedLanguage[]", this.translatedLanguages);
    this.addAll(url, "contentRating[]", MD.allContentRatings);
    this.addAll(url, "excludedGroups[]", this.blockedGroups);
    this.addAll(url, "excludedUploaders[]", this.blockedUploaders);
    url.addQueryParameter("includeUnavailable", this.includeUnavailable ? "1" : "0");
    return url.build();
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
    const url = this.forceStandardHttps ? `${MD.API_URL}/at-home/server/${chapterId}?forcePort443=true` : `${MD.API_URL}/at-home/server/${chapterId}`;
    const atHomeDto = (await this.client.get(url, Fetch.XHR)).parseAs<AtHomeDto>();
    const host = atHomeDto.baseUrl;

    // Have to add the time, and url to the page because pages timeout within 30 minutes now.
    const now = Date.now();
    this.atHomeServers.set(url, { baseUrl: host, fetchedAt: now });

    const hash = atHomeDto.chapter.hash;
    const pageSuffix = this.useDataSaver ? atHomeDto.chapter.dataSaver.map((file) => `/data-saver/${hash}/${file}`) : atHomeDto.chapter.data.map((file) => `/data/${hash}/${file}`);
    return pageSuffix.map((imgUrl, index) => new Page(index, `${host},${url},${now}`, imgUrl));
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

  // Settings

  override setupPreferenceScreen(screen: PreferenceScreen): void {
    const intl = this.intl;
    const dexLang = this.dexLang;
    const toggle = (key: string, title: string, summary: string, defaultValue: boolean) =>
      new SwitchPreferenceCompat({ key, title: intl.get(title), summary: intl.get(summary), defaultValue });

    screen.addPreference(
      new ListPreference({
        key: MD.getCoverQualityPreferenceKey(dexLang),
        title: intl.get("cover_quality"),
        summary: "%s",
        entries: MD.getCoverQualityPreferenceEntries(intl),
        entryValues: MD.getCoverQualityPreferenceEntryValues(),
        defaultValue: MD.getCoverQualityPreferenceDefaultValue(),
      }),
    );
    screen.addPreference(toggle(MD.getTryUsingFirstVolumeCoverPrefKey(dexLang), "try_using_first_volume_cover", "try_using_first_volume_cover_summary", MD.TRY_USING_FIRST_VOLUME_COVER_DEFAULT));
    screen.addPreference(toggle(MD.getDataSaverPreferenceKey(dexLang), "data_saver", "data_saver_summary", false));
    screen.addPreference(toggle(MD.getStandardHttpsPreferenceKey(dexLang), "standard_https_port", "standard_https_port_summary", false));
    screen.addPreference(toggle(MD.getAltTitlesInDescPrefKey(dexLang), "alternative_titles_in_description", "alternative_titles_in_description_summary", false));
    screen.addPreference(toggle(MD.getPreferExtensionLangTitlePrefKey(dexLang), "prefer_title_in_extension_language", "prefer_title_in_extension_language_summary", true));
    screen.addPreference(toggle(MD.getFinalChapterInDescPrefKey(dexLang), "final_chapter_in_description", "final_chapter_in_description_summary", true));
    screen.addPreference(toggle(MD.getIncludeUnavailablePrefKey(dexLang), "include_unavailable", "include_unavailable_summary", false));
    screen.addPreference(
      new MultiSelectListPreference({
        key: MD.getContentRatingPrefKey(dexLang),
        title: intl.get("standard_content_rating"),
        summary: intl.get("standard_content_rating_summary"),
        entries: [intl.get("content_rating_safe"), intl.get("content_rating_suggestive"), intl.get("content_rating_erotica"), intl.get("content_rating_pornographic")],
        entryValues: MD.allContentRatings,
        defaultValue: MD.contentRatingPrefDefaults,
      }),
    );
    screen.addPreference(
      new MultiSelectListPreference({
        key: MD.getOriginalLanguagePrefKey(dexLang),
        title: intl.get("filter_original_languages"),
        summary: intl.get("filter_original_languages_summary"),
        entries: [MD.languageDisplayName(intl, MD.JAPANESE), MD.languageDisplayName(intl, MD.CHINESE), MD.languageDisplayName(intl, MD.KOREAN)],
        entryValues: [MD.ORIGINAL_LANGUAGE_PREF_VAL_JAPANESE, MD.ORIGINAL_LANGUAGE_PREF_VAL_CHINESE, MD.ORIGINAL_LANGUAGE_PREF_VAL_KOREAN],
        defaultValue: MD.originalLanguagePrefDefaults,
      }),
    );
    // Upstream checks the UUIDs as they are typed; the apps have no such hook, so invalid ones
    // are ignored when read (uuidList).
    screen.addPreference(new EditTextPreference({ key: MD.getBlockedGroupsPrefKey(dexLang), title: intl.get("block_group_by_uuid"), summary: intl.get("block_group_by_uuid_summary"), defaultValue: "" }));
    screen.addPreference(new EditTextPreference({ key: MD.getBlockedUploaderPrefKey(dexLang), title: intl.get("block_uploader_by_uuid"), summary: intl.get("block_uploader_by_uuid_summary"), defaultValue: "" }));
  }

  override getFilterList(): FilterList {
    return getMDFilterList(this.preferences, this.dexLang, this.intl);
  }

  // Preferences, read fresh on every call.

  private get contentRating(): string[] {
    return [...this.preferences.getStringSet(MD.getContentRatingPrefKey(this.dexLang), MD.contentRatingPrefDefaults)];
  }

  private get originalLanguages(): string[] {
    const originalLanguages = this.preferences.getStringSet(MD.getOriginalLanguagePrefKey(this.dexLang), MD.originalLanguagePrefDefaults);
    if (originalLanguages.has(MD.ORIGINAL_LANGUAGE_PREF_VAL_CHINESE)) originalLanguages.add(MD.ORIGINAL_LANGUAGE_PREF_VAL_CHINESE_HK);
    return [...originalLanguages];
  }

  private get coverQuality(): string {
    return this.preferences.getString(MD.getCoverQualityPreferenceKey(this.dexLang), "");
  }

  private get tryUsingFirstVolumeCover(): boolean {
    return this.preferences.getBoolean(MD.getTryUsingFirstVolumeCoverPrefKey(this.dexLang), MD.TRY_USING_FIRST_VOLUME_COVER_DEFAULT);
  }

  /** A comma-separated list of UUIDs, trimmed, deduplicated and sorted; invalid entries are dropped. */
  private uuidList(key: string): string[] {
    const values = this.preferences
      .getString(key, "")
      .split(",")
      .map((value) => value.trim())
      .filter(MD.isUuid);
    return [...new Set(values)].sort();
  }

  private get blockedGroups(): string[] {
    return this.uuidList(MD.getBlockedGroupsPrefKey(this.dexLang));
  }

  private get blockedUploaders(): string[] {
    return this.uuidList(MD.getBlockedUploaderPrefKey(this.dexLang));
  }

  private get forceStandardHttps(): boolean {
    return this.preferences.getBoolean(MD.getStandardHttpsPreferenceKey(this.dexLang), false);
  }

  private get useDataSaver(): boolean {
    return this.preferences.getBoolean(MD.getDataSaverPreferenceKey(this.dexLang), false);
  }

  private get altTitlesInDesc(): boolean {
    return this.preferences.getBoolean(MD.getAltTitlesInDescPrefKey(this.dexLang), false);
  }

  private get preferExtensionLangTitle(): boolean {
    return this.preferences.getBoolean(MD.getPreferExtensionLangTitlePrefKey(this.dexLang), true);
  }

  private get finalChapterInDesc(): boolean {
    return this.preferences.getBoolean(MD.getFinalChapterInDescPrefKey(this.dexLang), true);
  }

  private get includeUnavailable(): boolean {
    return this.preferences.getBoolean(MD.getIncludeUnavailablePrefKey(this.dexLang), false);
  }
}

export default defineExtension(LANGS.map((lang) => new MangaDex(lang)));
