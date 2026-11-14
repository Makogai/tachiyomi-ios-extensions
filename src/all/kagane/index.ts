// Port of src/all/kagane/.../Kagane.kt @ d9420cd1. Method names follow the original.
//
// Files: api.ts (URLs and the search body), parse.ts (API responses → models), dto.ts (response
// shapes), filters.ts, settings.ts (preferences), tokens.ts (page tokens), markdown.ts (description
// builder).
import {
  type ClientBuilder,
  defineExtension,
  Fetch,
  FILTER_FETCH_HINT,
  FilterDataCache,
  type FilterList,
  Header,
  type HttpUrl,
  type ImageRequest,
  jsonBody,
  KeiSource,
  MangasPage,
  type Page,
  type PreferenceScreen,
  type SChapter,
  type SManga,
  SMangaUpdate,
  Separator,
  toHttpUrl,
} from "@sdk";
import {
  bookIndexUrl,
  challengeUrl,
  groupSearchUrl,
  resolveMemberEntries,
  searchMangaBody,
  searchMangaUrl,
  seriesUrl,
  sortParamOf,
  trackerSeriesUrl,
  withToken,
} from "./api";
import type { BookIndexDto, ChallengeDto, DetailsDto, GenreDto, GroupSearchDto, IntegrityDto, SearchDto, SourcesDto, StaffSearchDto, TagDto, TrackerDto } from "./dto";
import {
  ChapterCountFilter,
  compare,
  ContentRatingFilter,
  FilterData,
  FormatFilter,
  GenresFilter,
  getGenresList,
  GroupsSearchFilter,
  MatchAllGenresFilter,
  MatchAllTagsFilter,
  type MetadataDto,
  PublicationStatusFilter,
  SortFilter,
  SourcesFilter,
  StaffSearchFilter,
  TagsSearchFilter,
  YearFilter,
} from "./filters";
import {
  bookToSManga,
  detailsToSManga,
  genresParse,
  groupIdsNamed,
  hasNextPage,
  pageListParse,
  parseChapterList,
  staffIdsNamed,
  tagsParse,
  toBooks,
} from "./parse";
import * as settings from "./settings";
import { PageTokens } from "./tokens";

const LINK_HOSTS = new Set(["kagane.cx", "kagane.moe", "kagane.net"]);

/** What upstream keeps in `SManga.memo`; the SDK's models have no memo, so it lives in memory. */
interface MangaMemo {
  trackerId?: string;
  format: string;
  slug?: string;
}

class Kagane extends KeiSource {
  readonly name = "Kagane";
  // Upstream picks a mirror from the hub (fetchBaseUrls); the SDK has a fixed base URL.
  readonly baseUrl = "https://kagane.moe";

  constructor(readonly lang: string) {
    super();
  }

  private get kaganeLangs(): string[] {
    return [this.lang];
  }

  private get apiUrl(): string {
    return `${this.baseUrl}/api/v2`;
  }

  private readonly mangaMemo = new Map<string, MangaMemo>();

  // Tokens are valid for one book only
  private readonly pageTokens = new PageTokens();

  protected override configureClient(builder: ClientBuilder): void {
    // addInterceptor(::refreshTokenInterceptor): see getImageRequest.
    builder.rateLimit(3);
  }

  /**
   * The first half of upstream's `refreshTokenInterceptor`: page URLs carry the book's token, and
   * the newest token known for the book replaces it. Upstream also asks for a new token when the
   * image host answers 401/403/507; the SDK has no hook on image responses for that.
   *
   * `imageFetch = Fetch.XHR` upstream: the image host 404s without the site's Origin.
   */
  override getImageRequest(page: Page): ImageRequest {
    if (!page.imageUrl) throw new Error(`Page ${page.index + 1} has no image URL`);
    let url = page.imageUrl;
    const parsed = toHttpUrl(url);
    const urlToken = parsed.queryParameter("token");
    if (urlToken !== null) {
      const segments = parsed.pathSegments;
      const chapterId = segments[segments.length - 2];
      url = withToken(parsed, this.pageTokens.get(chapterId)?.value ?? urlToken);
    }
    return { url, headers: { ...this.headers, Origin: this.baseUrl } };
  }

  // ========================= Popular and latest =========================

  async getPopularManga(page: number): Promise<MangasPage> {
    return this.getSearchMangaList(page, "", [new SortFilter({ index: 1, ascending: false }), ...this.preferenceFilters()]);
  }

  async getLatestUpdates(page: number): Promise<MangasPage> {
    return this.getSearchMangaList(page, "", [new SortFilter({ index: 6, ascending: false }), ...this.preferenceFilters()]);
  }

  /** The filters popular and latest take from the settings. */
  private preferenceFilters(): FilterList {
    const prefs = this.preferences;
    return [
      new ContentRatingFilter(new Set(settings.contentRating(prefs)), settings.showPornographic(prefs), settings.showDisturbing(prefs)),
      new FormatFilter(settings.excludedFormats(prefs)),
      new GenresFilter([], settings.excludedGenreIds(prefs)),
    ];
  }

  // =============================== Search ===============================

  async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    const sortParam = sortParamOf(filters);
    const body = await searchMangaBody(
      query,
      filters,
      settings.sourceDisplayMode(this.preferences),
      this.kaganeLangs,
      (input) => resolveMemberEntries(input, (name) => this.searchStaff(name)),
      (input) => resolveMemberEntries(input, (name) => this.searchGroups(name)),
    );

    const response = await this.client.post(searchMangaUrl(this.apiUrl, page, sortParam), jsonBody(body), Fetch.XHR);
    const dto = response.parseAs<SearchDto>();
    const sources = this.sources;
    const showSource = settings.showSource(this.preferences);
    const cleanTitle = settings.cleanTitle(this.preferences);
    const mangas = (dto.content ?? []).map((book) => bookToSManga(book.series_id, book, this.apiUrl, showSource, sources, cleanTitle));
    return new MangasPage(mangas, hasNextPage(dto));
  }

  private async searchStaff(name: string): Promise<string[]> {
    const response = await this.client.post(`${this.apiUrl}/search/staff`, jsonBody({ name }), Fetch.XHR);
    return staffIdsNamed(response.parseAs<StaffSearchDto>(), name);
  }

  private async searchGroups(name: string): Promise<string[]> {
    const response = await this.client.get(groupSearchUrl(this.apiUrl, name), Fetch.XHR);
    return groupIdsNamed(response.parseAs<GroupSearchDto>(), name);
  }

  // ====================== Manga Details + Chapters ======================

  private async getMangaById(seriesId: string): Promise<DetailsDto> {
    return (await this.client.get(seriesUrl(this.apiUrl, seriesId), Fetch.XHR)).parseAs<DetailsDto>();
  }

  protected override async getMangaByUrl(url: HttpUrl): Promise<SManga | null> {
    if (!LINK_HOSTS.has(url.host)) return null;
    const segments = url.pathSegments;
    if (segments.length < 2 || segments[0] !== "series") return null;
    const seriesId = segments[1].slice(-36);
    const dto = await this.getMangaById(seriesId);
    const manga = this.parseMangaDetails(dto);
    manga.url = seriesId;
    manga.initialized = true;
    this.rememberManga(seriesId, dto);
    return manga;
  }

  private parseMangaDetails(details: DetailsDto): SManga {
    const prefs = this.preferences;
    const sourceName = details.source_id != null ? (this.sources.get(details.source_id) ?? null) : null;
    return detailsToSManga(
      details,
      this.apiUrl,
      sourceName,
      this.baseUrl,
      settings.showEdition(prefs),
      settings.showSource(prefs),
      settings.showDetails(prefs),
      settings.cleanTitle(prefs),
    );
  }

  private rememberManga(seriesId: string, dto: DetailsDto): MangaMemo {
    const memo: MangaMemo = { format: dto.format ?? "" };
    if (dto.tracker_id != null && dto.tracker_id !== "") memo.trackerId = dto.tracker_id;
    if (dto.slug != null && dto.slug.trim() !== "") memo.slug = dto.slug;
    this.mangaMemo.set(seriesId, memo);
    return memo;
  }

  override getMangaUrl(manga: SManga): string {
    const slug = this.mangaMemo.get(manga.url)?.slug;
    const seriesSegment = slug != null ? `${slug}-${manga.url}` : manga.url;
    return `${this.baseUrl}/series/${seriesSegment}`;
  }

  async fetchMangaUpdate(manga: SManga, chapters: SChapter[], fetchDetails: boolean, fetchChapters: boolean): Promise<SMangaUpdate> {
    const seriesId = manga.url;

    let updatedManga = manga;
    if (fetchDetails) {
      const dto = await this.getMangaById(seriesId);
      updatedManga = this.parseMangaDetails(dto);
      this.rememberManga(seriesId, dto);
    }

    let updatedChapters = chapters;
    if (fetchChapters) {
      const index = (await this.client.get(bookIndexUrl(this.apiUrl, seriesId), Fetch.XHR)).parseAs<BookIndexDto>();
      const titleMode = settings.chapterTitleMode(this.preferences);
      updatedChapters = parseChapterList(toBooks(index), this.chapterFormat(seriesId, updatedManga), seriesId, titleMode);
    }

    return new SMangaUpdate(updatedManga, updatedChapters);
  }

  private chapterFormat(seriesId: string, manga: SManga): string | null {
    const format = this.mangaMemo.get(seriesId)?.format;
    if (format != null && format.trim() !== "") return format;
    return manga.genre != null ? manga.genre.split(", ")[0] : null;
  }

  override getChapterUrl(chapter: SChapter): string {
    const parts = chapter.url.split("/");
    const slug = parts.length === 5 ? this.mangaMemo.get(parts[2].slice(-36))?.slug : undefined;
    if (slug == null || parts.length !== 5) return `${this.baseUrl}${chapter.url}`;
    return `${this.baseUrl}/series/${slug}-${parts[2].slice(-36)}/reader/${parts[4]}`;
  }

  // =========================== Related Manga ============================

  /** Upstream's `fetchRelatedMangaList`; the SDK has no related-manga call yet. */
  async fetchRelatedMangaList(manga: SManga): Promise<SManga[]> {
    const trackerId = this.mangaMemo.get(manga.url)?.trackerId;
    if (trackerId == null) return [];

    const response = await this.client.get(trackerSeriesUrl(this.apiUrl, trackerId), Fetch.XHR);
    const sources = this.sources;
    const showSource = settings.showSource(this.preferences);
    const cleanTitle = settings.cleanTitle(this.preferences);
    return (response.parseAs<TrackerDto>().book_series ?? []).map((book) => bookToSManga(book.id, book, this.apiUrl, showSource, sources, cleanTitle));
  }

  // =============================== Pages ================================

  async getPageList(chapter: SChapter): Promise<Page[]> {
    if (chapter.url.includes(";")) {
      throw new Error("Outdated chapter URL. Please refresh the chapter list");
    }

    const segments = toHttpUrl(`${this.baseUrl}${chapter.url}`).pathSegments;
    const chapterId = segments[segments.length - 1].slice(-36);
    const challengeResp = await this.getChallengeResponse(chapterId);
    this.pageTokens.put(chapterId, { value: challengeResp.access_token, issuedAt: Date.now() });
    return pageListParse(challengeResp, chapterId, settings.dataSaver(this.preferences));
  }

  /** Upstream's `refreshToken`; see tokens.ts. */
  async refreshToken(chapterId: string, rejected: string): Promise<string> {
    return this.pageTokens.refreshToken(chapterId, rejected, async () => (await this.getChallengeResponse(chapterId)).access_token);
  }

  private integrityToken = "";
  private integrityExp = 0;

  private async getIntegrityToken(): Promise<string> {
    if (this.integrityExp < Date.now()) {
      // `"".toJsonRequestBody()` encodes the empty string as JSON: `""`.
      const res = (await this.client.post(`${this.baseUrl}/api/integrity`, jsonBody(""), Fetch.XHR)).parseAs<IntegrityDto>();
      this.integrityToken = res.token;
      this.integrityExp = res.exp * 1000;
    }

    return this.integrityToken;
  }

  private async getChallengeResponse(chapterId: string): Promise<ChallengeDto> {
    const integrityToken = await this.getIntegrityToken();
    // `"".toRequestBody()`: an empty body with no content type.
    const response = await this.client.post(challengeUrl(this.apiUrl, chapterId), null, {
      headers: { "x-integrity-token": integrityToken },
      fetch: Fetch.XHR,
    });
    return response.parseAs<ChallengeDto>();
  }

  // ============================ Preferences =============================

  override setupPreferenceScreen(screen: PreferenceScreen): void {
    const genreFilter = this.getFilterList().find((filter) => filter instanceof GenresFilter) as GenresFilter | undefined;
    const genreMap = new Map<string, string>(
      (genreFilter?.state ?? []).map((option) => [option.id, option.name.charAt(0).toUpperCase() + option.name.slice(1)]),
    );
    settings.setupPreferenceScreen(screen, this.preferences, genreMap);
  }

  // ============================= Filters ==============================

  private readonly filterCache = new FilterDataCache<MetadataDto>(this, () => this.fetchFilterData());

  private async fetchFilterData(): Promise<MetadataDto> {
    const [genres, tags, sources] = await Promise.all([
      this.client.get(`${this.apiUrl}/genres/list`, Fetch.XHR).then((response) => genresParse(response.parseAs<GenreDto[]>())),
      this.client.get(`${this.apiUrl}/tags/list`, Fetch.XHR).then((response) => tagsParse(response.parseAs<TagDto[]>())),
      this.client
        .post(`${this.apiUrl}/sources/list`, jsonBody({ source_types: null }), Fetch.XHR)
        .then((response) => response.parseAs<SourcesDto>().sources),
    ]);

    return { genres, tags, sources };
  }

  sourceCache: Map<string, string> | null = null;

  get sources(): Map<string, string> {
    if (this.sourceCache === null || this.sourceCache.size === 0) {
      this.getFilterList();
    }
    return (this.sourceCache ??= new Map());
  }

  override getFilterList(): FilterList {
    const meta = this.filterCache.read();
    const prefs = this.preferences;

    const filters: FilterList = [
      new SortFilter(),
      new ContentRatingFilter(new Set(settings.contentRating(prefs)), settings.showPornographic(prefs), settings.showDisturbing(prefs)),
      new FormatFilter(settings.excludedFormats(prefs)),
      new PublicationStatusFilter(),
      new Separator(),
    ];

    if (meta !== null) {
      this.sourceCache = new Map(meta.sources.map((source) => [source.source_id, source.title]));

      const displayMode = settings.sourceDisplayMode(prefs);
      const validSources = meta.sources.filter((source) =>
        displayMode === "official" ? source.source_type.toLowerCase() === "official" : true,
      );

      const sourceFilters = validSources
        .map((source) => new FilterData(source.source_id, source.title))
        .sort((a, b) => compare(a.name, b.name));

      filters.push(
        new GenresFilter(getGenresList(meta), settings.excludedGenreIds(prefs)),
        new MatchAllGenresFilter(),
        new TagsSearchFilter(meta.tags),
        new MatchAllTagsFilter(),
        new SourcesFilter(sourceFilters),
        new Separator(),
      );
    }

    filters.push(new YearFilter(), new ChapterCountFilter(), new StaffSearchFilter(), new GroupsSearchFilter());

    if (meta === null) filters.push(new Separator(), new Header(FILTER_FETCH_HINT));

    return filters;
  }
}

const LANGS = ["en", "ja", "ko", "zh", "es", "es-419", "fr", "de", "pt", "pt-BR", "ru", "it", "id", "vi", "th", "pl", "hi", "ar"];

export default defineExtension(LANGS.map((lang) => new Kagane(lang)));
