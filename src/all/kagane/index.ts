// Port of src/all/kagane/.../Kagane.kt @ d9420cd1. Method names follow the original.
import {
  type ClientBuilder,
  defineExtension,
  Fetch,
  type FilterList,
  Header,
  type HttpUrl,
  type ImageRequest,
  jsonBody,
  KeiSource,
  ListPreference,
  MangasPage,
  MultiSelectListPreference,
  Page,
  type PreferenceScreen,
  type SChapter,
  type SManga,
  SMangaUpdate,
  Separator,
  SwitchPreferenceCompat,
  toHttpUrl,
} from "@sdk";
import {
  type Book,
  type BookIndexDto,
  bookToSChapter,
  bookToSManga,
  type ChallengeDto,
  type DetailsDto,
  detailsToSManga,
  type GenreDto,
  type GroupSearchDto,
  hasNextPage,
  type IntegrityDto,
  type SearchDto,
  type SourcesDto,
  type StaffSearchDto,
  type TagDto,
  toBooks,
  type TrackerDto,
} from "./dto";
import { FILTER_FETCH_HINT, FilterDataCache } from "./filterCache";
import {
  ChapterCountFilter,
  compare,
  CONTENT_RATING_LABELS,
  CONTENT_RATINGS,
  ContentRatingFilter,
  FilterData,
  FORMAT_OPTIONS,
  FormatFilter,
  GenresFilter,
  getGenresList,
  GroupsSearchFilter,
  isJsonFilter,
  type JsonObject,
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

const TOKEN_REFRESH_INTERVAL_MS = 60_000;
const LINK_HOSTS = new Set(["kagane.cx", "kagane.moe", "kagane.net"]);
const MAX_SOURCE_FILTER = 50;
const CONTENT_RATING = "pref_content_rating";

// Legacy values (safe/suggestive/erotica/pornographic) are mapped on read.
const CONTENT_RATING_DEFAULT = "safe";

const PORN_PREF = "pref_show_pornographic";
const DISTURBING_PREF = "pref_show_disturbing";

const GENRES_ID_PREF = "pref_genre_id_exclude";
const FORMATS_PREF = "pref_format_exclude";

const SOURCE_DISPLAY_MODE = "pref_source_display_mode";
const SOURCE_DISPLAY_MODE_DEFAULT = "all";

const CLEAN_TITLE = "pref_clean_title";
const CLEAN_TITLE_DEFAULT = false;

const SHOW_SOURCE = "pref_show_source";
const SHOW_SOURCE_DEFAULT = false;

const SHOW_EDITION = "pref_show_edition";
const SHOW_EDITION_DEFAULT = false;

const SHOW_DETAILS = "pref_show_details";
const SHOW_DETAILS_DEFAULT = true;

const DATA_SAVER = "data_saver_default";

const CHAPTER_TITLE_MODE = "chapter_title_mode";
const CHAPTER_TITLE_MODE_DEFAULT = "optional";
const CHAPTER_TITLE_MODES = ["optional", "always", "vol_local", "vol_chapter"];
const CHAPTER_TITLE_MODE_NAMES = [
  "Title only (e.g. 'Manga Title' / 'Ch.5')",
  "Ch.X + title (e.g. 'Ch.5 Manga Title')",
  "Vol.X Ch.Y (e.g. 'Vol.1 Ch.5')",
  "Vol.X Ch.Y + title (e.g. 'Vol.1 Ch.5 Manga Title')",
];

interface PageToken {
  value: string;
  issuedAt: number;
}

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
      const token = this.pageTokens.get(chapterId)?.value ?? urlToken;
      url = parsed.newBuilder().setQueryParameter("token", token).build().toString();
    }
    return { url, headers: { ...this.headers, Origin: this.baseUrl } };
  }

  // ============================== Popular ===============================

  async getPopularManga(page: number): Promise<MangasPage> {
    return this.getSearchMangaList(page, "", [
      new SortFilter({ index: 1, ascending: false }),
      new ContentRatingFilter(new Set(this.contentRating), this.showPornographic, this.showDisturbing),
      new FormatFilter(this.excludedFormats),
      new GenresFilter([], this.excludedGenreIds),
    ]);
  }

  // =============================== Latest ===============================

  async getLatestUpdates(page: number): Promise<MangasPage> {
    return this.getSearchMangaList(page, "", [
      new SortFilter({ index: 6, ascending: false }),
      new ContentRatingFilter(new Set(this.contentRating), this.showPornographic, this.showDisturbing),
      new FormatFilter(this.excludedFormats),
      new GenresFilter([], this.excludedGenreIds),
    ]);
  }

  // =============================== Search ===============================

  async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    let sortParam = "";

    const body: JsonObject = {};
    if (query.trim() !== "") {
      body["title"] = query;
    }

    const displayMode = this.sourceDisplayMode;
    body["source_type"] = displayMode === "official" ? ["Official"] : ["Official", "Unofficial", "Mixed"];

    let genresMatchAll: boolean | null = null;
    let tagsMatchAll: boolean | null = null;

    for (const filter of filters) {
      if (filter instanceof MatchAllGenresFilter) {
        genresMatchAll = filter.state ? true : null;
      } else if (filter instanceof MatchAllTagsFilter) {
        tagsMatchAll = filter.state ? true : null;
      } else if (filter instanceof SortFilter) {
        sortParam = filter.toUriPart();
      }
    }

    for (const filter of filters) {
      if (filter instanceof GenresFilter) {
        filter.addToJsonObject(body, "genres", genresMatchAll);
      } else if (filter instanceof TagsSearchFilter) {
        const rawInput = filter.state.trim();
        if (rawInput !== "") {
          const tagEntries = rawInput
            .split(",")
            .map((entry) => entry.trim())
            .filter((entry) => entry !== "");

          const includeIds: string[] = [];
          const excludeIds: string[] = [];

          for (const entry of tagEntries) {
            const isExclude = entry.startsWith("-");
            const tagName = isExclude ? entry.slice(1).trim() : entry;

            const tagId = filter.tagData[tagName.toLowerCase()];
            if (tagId !== undefined) {
              if (isExclude) excludeIds.push(tagId);
              else includeIds.push(tagId);
            }
          }

          if (includeIds.length > 0 || excludeIds.length > 0) {
            const tags: JsonObject = {};
            if (tagsMatchAll === true) {
              tags["match_all"] = true;
            }
            tags["values"] = includeIds;
            if (excludeIds.length > 0) {
              tags["exclude"] = excludeIds;
            }
            body["tags"] = tags;
          }
        }
      } else if (filter instanceof SourcesFilter) {
        if (filter.state.filter((option) => option.state).length > MAX_SOURCE_FILTER) {
          throw new Error(`Select at most ${MAX_SOURCE_FILTER} sources in the Sources filter`);
        }
        filter.addToJsonObject(body);
      } else if (filter instanceof StaffSearchFilter) {
        const [include, exclude] = await this.resolveMemberEntries(filter.state, (name) => this.searchStaff(name));
        if (include.length > 0 || exclude.length > 0) {
          const staff: JsonObject = { values: [...new Set(include)] };
          if (exclude.length > 0) staff["exclude"] = [...new Set(exclude)];
          body["staff"] = staff;
        }
      } else if (filter instanceof GroupsSearchFilter) {
        const [include, exclude] = await this.resolveMemberEntries(filter.state, (name) => this.searchGroups(name));
        if (include.length > 0 || exclude.length > 0) {
          const groups: JsonObject = { values: [...new Set(include)] };
          if (exclude.length > 0) groups["exclude"] = [...new Set(exclude)];
          body["groups"] = groups;
        }
      } else if (filter instanceof YearFilter) {
        const range = filter.parseRange();
        if (range !== null) {
          const year: JsonObject = {};
          if (range[0] !== null) year["min"] = range[0];
          if (range[1] !== null) year["max"] = range[1];
          body["start_year"] = year;
        }
      } else if (filter instanceof ChapterCountFilter) {
        const range = filter.parseRange();
        if (range !== null) {
          const books: JsonObject = {};
          if (range[0] !== null) books["min"] = range[0];
          if (range[1] !== null) books["max"] = range[1];
          body["current_books"] = books;
        }
      } else if (isJsonFilter(filter)) {
        filter.addToJsonObject(body);
      }
    }

    // Add languages specific to this source instance
    body["content_lang"] = this.kaganeLangs;

    const url = toHttpUrl(`${this.apiUrl}/search/series`).newBuilder();
    url.addQueryParameter("page", String(page - 1));
    url.addQueryParameter("size", String(35)); // Default items per request
    if (sortParam !== "") url.addQueryParameter("sort", sortParam);

    const response = await this.client.post(url.build(), jsonBody(body), Fetch.XHR);
    const dto = response.parseAs<SearchDto>();
    const sources = this.sources;
    const mangas = (dto.content ?? []).map((book) =>
      bookToSManga(book.series_id, book, this.apiUrl, this.showSource, sources, this.cleanTitle),
    );
    return new MangasPage(mangas, hasNextPage(dto));
  }

  private async resolveMemberEntries(
    input: string,
    search: (name: string) => Promise<string[]>,
  ): Promise<[string[], string[]]> {
    const include: string[] = [];
    const exclude: string[] = [];
    for (const entry of input.split(",")) {
      const trimmed = entry.trim();
      if (trimmed === "") continue;
      const isExclude = trimmed.startsWith("-");
      const name = isExclude ? trimmed.slice(1).trim() : trimmed;
      if (name === "") continue;
      for (const id of await search(name)) {
        if (isExclude) exclude.push(id);
        else include.push(id);
      }
    }
    return [include, exclude];
  }

  private async searchStaff(name: string): Promise<string[]> {
    const lower = name.toLowerCase();
    const response = await this.client.post(`${this.apiUrl}/search/staff`, jsonBody({ name }), Fetch.XHR);
    return (response.parseAs<StaffSearchDto>().content ?? [])
      .filter(
        (staff) =>
          staff.name.toLowerCase() === lower ||
          staff.native_name?.toLowerCase() === lower ||
          (staff.alternate_names ?? []).some((alt) => alt.toLowerCase() === lower),
      )
      .map((staff) => staff.staff_id);
  }

  private async searchGroups(name: string): Promise<string[]> {
    const url = toHttpUrl(`${this.apiUrl}/groups/search`)
      .newBuilder()
      .addQueryParameter("q", name)
      .addQueryParameter("limit", "8")
      .build();
    const response = await this.client.get(url, Fetch.XHR);
    return (response.parseAs<GroupSearchDto>().items ?? [])
      .filter((group) => group.title.toLowerCase() === name.toLowerCase())
      .map((group) => group.group_id);
  }

  // ====================== Manga Details + Chapters ======================

  private async getMangaById(seriesId: string): Promise<DetailsDto> {
    const url = `${this.apiUrl}/series/${seriesId}`;
    return (await this.client.get(url, Fetch.XHR)).parseAs<DetailsDto>();
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
    const sourceName = details.source_id != null ? (this.sources.get(details.source_id) ?? null) : null;
    return detailsToSManga(
      details,
      this.apiUrl,
      sourceName,
      this.baseUrl,
      this.showEdition,
      this.showSource,
      this.showDetails,
      this.cleanTitle,
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

  async fetchMangaUpdate(
    manga: SManga,
    chapters: SChapter[],
    fetchDetails: boolean,
    fetchChapters: boolean,
  ): Promise<SMangaUpdate> {
    const seriesId = manga.url;

    let updatedManga = manga;
    if (fetchDetails) {
      const dto = await this.getMangaById(seriesId);
      updatedManga = this.parseMangaDetails(dto);
      this.rememberManga(seriesId, dto);
    }

    let updatedChapters = chapters;
    if (fetchChapters) {
      const index = (await this.client.get(`${this.apiUrl}/series/${seriesId}/books/index?fields=List`, Fetch.XHR)).parseAs<BookIndexDto>();
      updatedChapters = this.parseChapterList(toBooks(index), this.chapterFormat(seriesId, updatedManga), seriesId);
    }

    return new SMangaUpdate(updatedManga, updatedChapters);
  }

  private chapterFormat(seriesId: string, manga: SManga): string | null {
    const format = this.mangaMemo.get(seriesId)?.format;
    if (format != null && format.trim() !== "") return format;
    return manga.genre != null ? manga.genre.split(", ")[0] : null;
  }

  private parseChapterList(books: Book[], format: string | null, seriesId: string): SChapter[] {
    const useSourceChapterNumber =
      format !== null && ["Dark Horse Comics", "Flame Comics", "MangaDex", "Square Enix Manga"].includes(format);

    return [...books]
      .sort((a, b) => b.number - a.number)
      .map((book) => bookToSChapter(book, seriesId, useSourceChapterNumber, this.chapterTitleMode));
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

    const response = await this.client.get(`${this.apiUrl}/trackers/${trackerId}/series`, Fetch.XHR);
    const sources = this.sources;
    return (response.parseAs<TrackerDto>().book_series ?? []).map((book) =>
      bookToSManga(book.id, book, this.apiUrl, this.showSource, sources, this.cleanTitle),
    );
  }

  // =============================== Pages ================================

  async getPageList(chapter: SChapter): Promise<Page[]> {
    if (chapter.url.includes(";")) {
      throw new Error("Outdated chapter URL. Please refresh the chapter list");
    }

    const segments = toHttpUrl(`${this.baseUrl}${chapter.url}`).pathSegments;
    const chapterId = segments[segments.length - 1].slice(-36);
    const challengeResp = await this.getChallengeResponse(chapterId);

    const accessToken = challengeResp.access_token;
    this.putPageToken(chapterId, { value: accessToken, issuedAt: Date.now() });
    const cacheUrl = challengeResp.cache_url;

    const pageList = challengeResp.manifest?.pages ?? [];

    return pageList.map((page) => {
      const pageUrl = toHttpUrl(`${cacheUrl}/api/v2/books/page`)
        .newBuilder()
        .addPathSegment(this.dataSaver ? "datasaver" : "original")
        .addPathSegment(chapterId)
        .addPathSegment(`${page.page_id}.${page.ext ?? "jxl"}`)
        .addQueryParameter("token", accessToken)
        .build()
        .toString();

      return new Page(page.page_no, pageUrl, pageUrl);
    });
  }

  // Tokens are valid for one book only
  private readonly pageTokens = new Map<string, PageToken>();

  /** `LruCache<String, PageToken>(16)`. */
  private putPageToken(chapterId: string, token: PageToken): void {
    this.pageTokens.delete(chapterId);
    this.pageTokens.set(chapterId, token);
    while (this.pageTokens.size > 16) {
      this.pageTokens.delete(this.pageTokens.keys().next().value as string);
    }
  }

  /**
   * Upstream's `refreshToken`, called by the interceptor after the image host rejects a token.
   * Kept for when the SDK can retry image requests; nothing calls it yet.
   */
  async refreshToken(chapterId: string, rejected: string): Promise<string> {
    const known = this.pageTokens.get(chapterId);
    if (known !== undefined && known.value !== rejected) return known.value;

    const now = Date.now();
    if (known !== undefined && now - known.issuedAt < TOKEN_REFRESH_INTERVAL_MS) {
      throw new Error("Failed to retrieve token");
    }

    this.putPageToken(chapterId, { value: rejected, issuedAt: now });
    let challenge: ChallengeDto;
    try {
      challenge = await this.getChallengeResponse(chapterId);
    } catch {
      throw new Error("Failed to retrieve token");
    }

    this.putPageToken(chapterId, { value: challenge.access_token, issuedAt: now });
    return challenge.access_token;
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

    const challengeUrl = toHttpUrl(`${this.apiUrl}/books/${chapterId}`)
      .newBuilder()
      .addQueryParameter("intent", "Read")
      .build();

    // `"".toRequestBody()`: an empty body with no content type.
    const response = await this.client.post(challengeUrl, null, {
      headers: { "x-integrity-token": integrityToken },
      fetch: Fetch.XHR,
    });

    return response.parseAs<ChallengeDto>();
  }

  // ============================ Preferences =============================

  private get contentRating(): string[] {
    const stored = removeLegacyRating(this.preferences.getString(CONTENT_RATING, ""));
    const maxRating = stored ?? CONTENT_RATING_DEFAULT;
    const index = CONTENT_RATINGS.indexOf(maxRating);
    return CONTENT_RATINGS.slice(0, Math.max(index, 0) + 1);
  }

  private get showPornographic(): boolean {
    const ratings = this.contentRating;
    return ratings[ratings.length - 1] === "eighteenplus" && this.preferences.getBoolean(PORN_PREF, false);
  }

  private get showDisturbing(): boolean {
    const ratings = this.contentRating;
    return ratings[ratings.length - 1] === "eighteenplus" && this.preferences.getBoolean(DISTURBING_PREF, false);
  }

  private get excludedGenreIds(): Set<string> {
    return this.preferences.getStringSet(GENRES_ID_PREF, []);
  }

  private get excludedFormats(): Set<string> {
    return this.preferences.getStringSet(FORMATS_PREF, []);
  }

  private get sourceDisplayMode(): string {
    return this.preferences.getString(SOURCE_DISPLAY_MODE, SOURCE_DISPLAY_MODE_DEFAULT);
  }

  private get cleanTitle(): boolean {
    return this.preferences.getBoolean(CLEAN_TITLE, CLEAN_TITLE_DEFAULT);
  }

  private get showEdition(): boolean {
    return !this.cleanTitle && this.preferences.getBoolean(SHOW_EDITION, SHOW_EDITION_DEFAULT);
  }

  private get showSource(): boolean {
    return !this.cleanTitle && this.preferences.getBoolean(SHOW_SOURCE, SHOW_SOURCE_DEFAULT);
  }

  private get showDetails(): boolean {
    return this.preferences.getBoolean(SHOW_DETAILS, SHOW_DETAILS_DEFAULT);
  }

  private get dataSaver(): boolean {
    return this.preferences.getBoolean(DATA_SAVER, false);
  }

  private get chapterTitleMode(): string {
    return this.preferences.getString(CHAPTER_TITLE_MODE, CHAPTER_TITLE_MODE_DEFAULT);
  }

  // Visibility and enabled states, and the change listeners that update them, have no SDK
  // equivalent: every setting is always shown.
  override setupPreferenceScreen(screen: PreferenceScreen): void {
    screen.addPreference(
      new ListPreference({
        key: CONTENT_RATING,
        title: "Content Rating",
        entries: CONTENT_RATINGS.map((it) => CONTENT_RATING_LABELS[it]),
        entryValues: CONTENT_RATINGS,
        summary: "%s",
        defaultValue: CONTENT_RATING_DEFAULT,
      }),
    );

    screen.addPreference(
      new SwitchPreferenceCompat({
        key: PORN_PREF,
        title: "Show pornographic",
        summary: "Sexually explicit content",
        defaultValue: true,
      }),
    );

    screen.addPreference(
      new SwitchPreferenceCompat({
        key: DISTURBING_PREF,
        title: "Show disturbing",
        summary: "Series marked disturbing, such as graphic violence or abuse",
        defaultValue: true,
      }),
    );

    const genreFilter = this.getFilterList().find((filter) => filter instanceof GenresFilter) as GenresFilter | undefined;
    const genreMap = new Map<string, string>(
      (genreFilter?.state ?? []).map((option) => [option.id, option.name.charAt(0).toUpperCase() + option.name.slice(1)]),
    );
    const excludedGenreIds = this.excludedGenreIds;

    screen.addPreference(
      new MultiSelectListPreference({
        key: GENRES_ID_PREF,
        title: "Exclude Genres",
        entries: [...genreMap.values()],
        entryValues: [...genreMap.keys()],
        summary: [...genreMap.keys()]
          .filter((id) => excludedGenreIds.has(id))
          .map((id) => genreMap.get(id))
          .join(", "),
        defaultValue: [],
      }),
    );

    const excludedFormats = this.excludedFormats;
    screen.addPreference(
      new MultiSelectListPreference({
        key: FORMATS_PREF,
        title: "Exclude Formats",
        entries: FORMAT_OPTIONS,
        entryValues: FORMAT_OPTIONS,
        summary: FORMAT_OPTIONS.filter((it) => excludedFormats.has(it)).join(", "),
        defaultValue: [],
      }),
    );

    screen.addPreference(
      new ListPreference({
        key: SOURCE_DISPLAY_MODE,
        title: "Source Display Selection",
        summary: "%s",
        entries: ["Show All (Official + Scanlations)", "Official Sources Only"],
        entryValues: ["all", "official"],
        defaultValue: SOURCE_DISPLAY_MODE_DEFAULT,
      }),
    );

    screen.addPreference(
      new SwitchPreferenceCompat({ key: SHOW_EDITION, title: "Show edition name in title", defaultValue: SHOW_EDITION_DEFAULT }),
    );

    screen.addPreference(
      new SwitchPreferenceCompat({ key: SHOW_SOURCE, title: "Show source name in title", defaultValue: SHOW_SOURCE_DEFAULT }),
    );

    screen.addPreference(
      new SwitchPreferenceCompat({
        key: CLEAN_TITLE,
        title: "Clean title",
        summary: "Removes extra brackets or parentheses in title (Disables others)",
        defaultValue: CLEAN_TITLE_DEFAULT,
      }),
    );

    screen.addPreference(
      new SwitchPreferenceCompat({
        key: SHOW_DETAILS,
        title: "Show details in description",
        summary: "Rating, content rating, format, languages, year, volumes, views and links",
        defaultValue: SHOW_DETAILS_DEFAULT,
      }),
    );

    screen.addPreference(new SwitchPreferenceCompat({ key: DATA_SAVER, title: "Data saver", defaultValue: false }));

    screen.addPreference(
      new ListPreference({
        key: CHAPTER_TITLE_MODE,
        title: "Chapter title format",
        entries: CHAPTER_TITLE_MODE_NAMES,
        entryValues: CHAPTER_TITLE_MODES,
        summary: "How the chapter title should be displayed",
        defaultValue: CHAPTER_TITLE_MODE_DEFAULT,
      }),
    );
  }

  // ============================= Filters ==============================

  private readonly filterCache = new FilterDataCache<MetadataDto>(this, () => this.fetchFilterData());

  private async fetchFilterData(): Promise<MetadataDto> {
    const [genres, tags, sources] = await Promise.all([
      this.client.get(`${this.apiUrl}/genres/list`, Fetch.XHR).then((response) => {
        const map: Record<string, string> = {};
        for (const genre of response.parseAs<GenreDto[]>()) map[genre.id] = genre.genre_name;
        return map;
      }),
      this.client.get(`${this.apiUrl}/tags/list`, Fetch.XHR).then((response) => {
        const map: Record<string, string> = {};
        for (const tag of response.parseAs<TagDto[]>()) map[tag.tag_name.toLowerCase()] = tag.id;
        return map;
      }),
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

    const filters: FilterList = [
      new SortFilter(),
      new ContentRatingFilter(new Set(this.contentRating), this.showPornographic, this.showDisturbing),
      new FormatFilter(this.excludedFormats),
      new PublicationStatusFilter(),
      new Separator(),
    ];

    if (meta !== null) {
      this.sourceCache = new Map(meta.sources.map((source) => [source.source_id, source.title]));

      const displayMode = this.sourceDisplayMode;
      const validSources = meta.sources.filter((source) =>
        displayMode === "official" ? source.source_type.toLowerCase() === "official" : true,
      );

      const sourceFilters = validSources
        .map((source) => new FilterData(source.source_id, source.title))
        .sort((a, b) => compare(a.name, b.name));

      filters.push(
        new GenresFilter(getGenresList(meta), this.excludedGenreIds),
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

// Legacy value mapping from before the site-model settings change; kept so existing
// installs keep their content rating.
function removeLegacyRating(value: string | null): string | null {
  switch (value) {
    case "safe":
    case "fifteenplus":
    case "eighteenplus":
      return value;
    case "suggestive":
      return "fifteenplus";
    case "erotica":
    case "pornographic":
      return "eighteenplus";
    default:
      return null;
  }
}

const LANGS = ["en", "ja", "ko", "zh", "es", "es-419", "fr", "de", "pt", "pt-BR", "ru", "it", "id", "vi", "th", "pl", "hi", "ar"];

export default defineExtension(LANGS.map((lang) => new Kagane(lang)));
