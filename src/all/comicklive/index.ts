// Port of src/all/comicklive/.../Comick.kt @ d9420cd1. Method names follow the original.
import {
  type ClientBuilder,
  defineExtension,
  Fetch,
  Header,
  type FilterList,
  HttpError,
  type HttpUrl,
  KeiSource,
  ListPreference,
  MangasPage,
  MultiSelectListPreference,
  Page,
  parseHtml,
  parseIsoDate,
  type PreferenceScreen,
  type Response,
  SChapter,
  SManga,
  SMangaUpdate,
  Separator,
  toHttpUrl,
} from "@sdk";
import {
  type BrowseComic,
  browseComicToSManga,
  type ChapterList,
  type ComicData,
  comicTitles,
  type Data,
  type Metadata,
  type PageListData,
  type SearchResponse,
} from "./dto";
import {
  ContentRatingFilter,
  CreatedAtFilter,
  DemographicFilter,
  GenreFilter,
  MinimumChaptersFilter,
  ReleaseFrom,
  ReleaseTo,
  SortFilter,
  StatusFilter,
  TagFilters,
  TagFilterText,
  TypeFilter,
} from "./filters";

// `baseUrl { mirrors(...) }` in build.gradle.kts: keiyoushi's MirrorPreferences.
const MIRRORS = ["https://comick.live", "https://comick.art"];
const PREF_MIRROR = "preferred_mirror";

const LANGUAGE_WHITELIST = "language_whitelist";
const LANGUAGES: [string, string][] = [
  ["English", "en"],
  ["Russian", "ru"],
  ["Vietnamese", "vi"],
  ["French", "fr"],
  ["Polish", "pl"],
  ["Indonesian", "id"],
  ["Turkish", "tr"],
  ["Italian", "it"],
  ["Spanish", "es"],
  ["Ukrainian", "uk"],
  ["German", "de"],
  ["Korean", "ko"],
  ["Thai", "th"],
  ["Romanian", "ro"],
  ["Malay", "ms"],
  ["Japanese", "ja"],
  ["Swedish", "sv"],
  ["Norwegian", "no"],
];

// Upstream's `supportsFilterFetching`: the app caches `fetchFilterData()` and passes it to
// `getFilterList(data)`. Here the data is cached in the source's settings and refreshed once per
// launch, the first time the source is browsed.
const FILTER_DATA_KEY = "filter_data_cache";

function firstInstance<T>(filters: FilterList, type: abstract new (...args: never[]) => T): T {
  const found = firstInstanceOrNull(filters, type);
  if (found === null) throw new Error(`No filter of type ${type.name}`);
  return found;
}

function firstInstanceOrNull<T>(filters: FilterList, type: abstract new (...args: never[]) => T): T | null {
  return (filters.find((filter) => filter instanceof type) as T | undefined) ?? null;
}

class Comick extends KeiSource {

  readonly name = "Comick (Unoriginal)";
  readonly lang = "all";
  override readonly id = "4972933717624256217";

  get baseUrl(): string {
    const index = Number.parseInt(this.preferences.getString(PREF_MIRROR, "0"), 10);
    return MIRRORS[Number.isNaN(index) ? 0 : Math.min(Math.max(index, 0), MIRRORS.length - 1)];
  }

  protected override configureClient(builder: ClientBuilder): void {
    // The 429 retry interceptor lives in `get` below.
    builder.rateLimit(2, 1000, (url) => !url.pathSegments.includes("covers"));
  }

  /**
   * `client.get` with upstream's interceptor: on HTTP 429, retry up to 10 times. Upstream sleeps
   * 500 ms between tries; scripts have no timers, so the retries go through the rate limit instead.
   */
  private async get(url: string | HttpUrl, fetch: Fetch): Promise<Response> {
    let response = await this.client.get(url, { fetch, ensureSuccess: false });
    let retries = 0;
    while (response.code === 429 && retries++ < 10) {
      response = await this.client.get(url, { fetch, ensureSuccess: false });
    }
    if (!response.isSuccessful) throw new HttpError(`HTTP error ${response.code}`);
    return response;
  }

  async getPopularManga(page: number): Promise<MangasPage> {
    const days = page === 1 || page === 4 ? 7 : page === 2 || page === 5 ? 30 : page === 3 || page === 6 ? 90 : null;
    const type = page >= 1 && page <= 3 ? "follow" : page >= 4 && page <= 6 ? "most_follow_new" : null;
    if (days === null || type === null) throw new Error("UnsupportedOperationException");
    const url = toHttpUrl(`${this.baseUrl}/api/comics/top`)
      .newBuilder()
      .addQueryParameter("day", String(days))
      .addQueryParameter("type", type)
      .build();

    const [, response] = await Promise.all([this.ensureFilterData(), this.get(url, Fetch.XHR)]);
    const data = response.parseAs<Data<BrowseComic[]>>();

    return new MangasPage(data.data.map(browseComicToSManga), page < 6);
  }

  private latestNextCursor: string | null = null;
  private searchNextCursor: string | null = null;

  async getLatestUpdates(page: number): Promise<MangasPage> {
    if (page === 1) this.latestNextCursor = null;

    const url = toHttpUrl(`${this.baseUrl}/api/chapters/latest`).newBuilder();
    url.addQueryParameter("order", "new");
    url.addQueryParameter("page", String(page));
    if (page > 1) url.addQueryParameter("cursor", this.latestNextCursor);

    const [, response] = await Promise.all([this.ensureFilterData(), this.get(url.build(), Fetch.XHR)]);
    const data = response.parseAs<SearchResponse>();

    this.latestNextCursor = data.next_cursor ?? null;

    return new MangasPage(data.data.map(browseComicToSManga), data.next_cursor != null);
  }

  protected override async getMangaByUrl(url: HttpUrl): Promise<SManga | null> {
    return this.parseDetails(await this.get(url, Fetch.DOCUMENT));
  }

  private readonly spaceSlashRegex = /[ /]/g;

  async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    if (page === 1) this.searchNextCursor = null;

    const url = toHttpUrl(`${this.baseUrl}/api/search`).newBuilder();

    const sort = firstInstance(filters, SortFilter);
    url.addQueryParameter("order_by", sort.selected);
    url.addQueryParameter("order_direction", sort.state!.ascending ? "asc" : "desc");

    const genre = firstInstanceOrNull(filters, GenreFilter);
    if (genre !== null) {
      for (const it of genre.included) url.addQueryParameter("genres", it);
      for (const it of genre.excluded) url.addQueryParameter("excludes", it);
    }

    const text = firstInstanceOrNull(filters, TagFilterText);
    if (text !== null) {
      for (const it of text.state.split(",").filter((s) => s.trim() !== "")) {
        const value = it.trim().toLowerCase().replace(this.spaceSlashRegex, "-");
        // `replaceFirst("-", "")`: the first dash, wherever it is.
        url.addQueryParameter(value.startsWith("-") ? "excluded_tags" : "tags", value.replace("-", ""));
      }
    }

    const tags = firstInstanceOrNull(filters, TagFilters);
    if (tags !== null) {
      for (const letter of tags.state) {
        for (const it of letter.included) url.addQueryParameter("tags", it);
        for (const it of letter.excluded) url.addQueryParameter("excluded_tags", it);
      }
    }

    for (const it of firstInstance(filters, DemographicFilter).checked) url.addQueryParameter("demographic", it);

    const time = firstInstance(filters, CreatedAtFilter).selected;
    if (time !== null) url.addQueryParameter("time", time);

    for (const it of firstInstance(filters, TypeFilter).checked) url.addQueryParameter("country", it);

    const minimum = firstInstance(filters, MinimumChaptersFilter).state;
    if (minimum.trim() !== "") {
      if (!/^[+-]?\d+$/.test(minimum) || Math.abs(Number(minimum)) > 2147483647) {
        throw new Error(`Invalid minimum chapters value: ${minimum}`);
      }
      url.addQueryParameter("minimum", minimum);
    }

    const status = firstInstance(filters, StatusFilter).selected;
    if (status !== null) url.addQueryParameter("status", status);

    const from = firstInstance(filters, ReleaseFrom).selected;
    if (from !== null) url.addQueryParameter("from", from);

    const to = firstInstance(filters, ReleaseTo).selected;
    if (to !== null) url.addQueryParameter("to", to);

    const contentRating = firstInstance(filters, ContentRatingFilter).selected;
    if (contentRating !== null) url.addQueryParameter("content_rating", contentRating);

    url.addQueryParameter("showAll", "false");
    url.addQueryParameter("exclude_mylist", "false");
    if (query.trim() !== "") {
      if (query.trim().length < 3) {
        throw new Error("Query must be at least 3 characters");
      }
      url.addQueryParameter("q", query.trim());
    }
    url.addQueryParameter("type", "comic");
    if (page > 1) {
      url.addQueryParameter("cursor", this.searchNextCursor);
    }

    const data = (await this.get(url.build(), Fetch.XHR)).parseAs<SearchResponse>();

    this.searchNextCursor = data.next_cursor ?? null;

    return new MangasPage(data.data.map(browseComicToSManga), data.next_cursor != null);
  }

  override getMangaUrl(manga: SManga): string {
    return `${this.baseUrl}/comic/${manga.url}`;
  }

  async fetchMangaUpdate(
    manga: SManga,
    chapters: SChapter[],
    fetchDetails: boolean,
    fetchChapters: boolean,
  ): Promise<SMangaUpdate> {
    const [details, chapterList] = await Promise.all([
      fetchDetails ? this.get(this.getMangaUrl(manga), Fetch.DOCUMENT).then((r) => this.parseDetails(r)) : manga,
      fetchChapters ? this.getChapterList(manga) : chapters,
    ]);
    return new SMangaUpdate(details, chapterList);
  }

  private parseDetails(response: Response): SManga {
    const data = JSON.parse(response.asJsoup().selectFirst("#comic-data")!.data()) as ComicData;

    const manga = SManga.create();
    manga.title = data.title;
    manga.url = data.slug;
    manga.thumbnail_url = data.default_thumbnail;
    switch (data.status) {
      case 1:
        manga.status = SManga.ONGOING;
        break;
      case 2:
        manga.status = data.translation_completed ? SManga.COMPLETED : SManga.PUBLISHING_FINISHED;
        break;
      case 3:
        manga.status = SManga.CANCELLED;
        break;
      case 4:
        manga.status = SManga.ON_HIATUS;
        break;
      default:
        manga.status = SManga.UNKNOWN;
    }
    manga.author = data.authors.map((it) => it.name).join(", ");
    manga.artist = data.artists.map((it) => it.name).join(", ");

    let description = (parseHtml(`<body>${data.desc}</body>`).selectFirst("body")?.wholeText() ?? "")
      .replace(/\s+/g, " ") // collapse multiple whitespaces into a single space
      .replace(/(?<=[^.]{12})(?<!\bMr|\bMs|\bMrs|\bDr|\bProf|\bSr|\bJr|\bVol|\bCh)\.\s+/g, ".\n\n") // insert line breaks after periods
      .replace(/(?<=[^:]{12})(?<!\b[a-zA-Z]{1,10}):\s+/g, ":\n\n") // insert line breaks after colons
      .trim();
    const titles = comicTitles(data);
    if (titles.length > 0) {
      description += "\n\n Alternative Titles: \n";
      for (const it of titles) description += `- ${it.title.trim()}\n`;
    }
    manga.description = description.trim();

    const genres: string[] = [];
    switch (data.country) {
      case "jp":
        genres.push("Manga");
        break;
      case "cn":
        genres.push("Manhua");
        break;
      case "ko":
        genres.push("Manhwa");
        break;
    }
    switch (data.content_rating) {
      case "suggestive":
        genres.push("Content Rating: Suggestive");
        break;
      case "erotica":
        genres.push("Content Rating: Erotica");
        break;
    }
    genres.push(...data.md_comic_md_genres.map((it) => it.md_genres.name));
    manga.genre = genres.join(", ");

    return manga;
  }

  private async getChapterList(manga: SManga): Promise<SChapter[]> {
    const whitelist = this.languageWhitelist;
    const langParam = whitelist.size === 1 ? `?lang=${[...whitelist][0]}` : "";
    const url = `${this.baseUrl}/api/comics/${manga.url}/chapter-list${langParam}`;

    const data = (await this.get(url, Fetch.XHR)).parseAs<ChapterList>();
    const chapters = [...data.data];

    const pages: Promise<ChapterList["data"]>[] = [];
    for (let page = 2; page <= data.pagination.last_page; page++) {
      const pageUrl = toHttpUrl(url).newBuilder().addQueryParameter("page", String(page)).build();
      pages.push(this.get(pageUrl, Fetch.XHR).then((response) => response.parseAs<ChapterList>().data));
    }
    for (const pageData of await Promise.all(pages)) chapters.push(...pageData);

    return chapters
      .filter((it) => whitelist.size === 0 || whitelist.has(it.lang))
      .map((it) => {
        const chapter = SChapter.create();
        chapter.url = `/comic/${manga.url}/${it.hid}-chapter-${it.chap}-${it.lang}`;
        let name = "";
        if (it.vol != null && it.vol.trim() !== "") name += `Vol. ${it.vol} `;
        name += `Ch. ${it.chap}`;
        if (it.title != null && it.title.trim() !== "") name += `: ${it.title}`;
        chapter.name = name;
        chapter.date_upload = parseIsoDate(it.created_at);
        chapter.scanlator = it.group_name.join(", ");
        return chapter;
      });
  }

  async getPageList(chapter: SChapter): Promise<Page[]> {
    const document = (await this.get(this.getChapterUrl(chapter), Fetch.DOCUMENT)).asJsoup();
    const data = JSON.parse(document.selectFirst("#sv-data")!.data()) as PageListData;

    return data.chapter.images.map((image, index) => new Page(index, "", image.url));
  }

  // Filters

  private async fetchFilterData(): Promise<Metadata> {
    const metadata = (await this.get(`${this.baseUrl}/api/metadata`, Fetch.XHR)).parseAs<Metadata>();
    // Keep only what the filters use.
    const names = (list: Metadata["genres"]) => (list ?? []).map(({ name, slug }) => ({ name, slug }));
    return { genres: names(metadata.genres), tags: names(metadata.tags) };
  }

  private filterFetchStarted = false;

  private async ensureFilterData(): Promise<void> {
    if (this.filterFetchStarted) return;
    this.filterFetchStarted = true;
    try {
      const data = await this.fetchFilterData();
      this.preferences.edit().putString(FILTER_DATA_KEY, JSON.stringify(data)).apply();
    } catch {
      this.filterFetchStarted = false;
    }
  }

  private get filterData(): Metadata | null {
    const json = this.preferences.getString(FILTER_DATA_KEY, "");
    if (json === "") return null;
    try {
      return JSON.parse(json) as Metadata;
    } catch {
      return null;
    }
  }

  override getFilterList(): FilterList {
    const filters: FilterList = [new SortFilter(), new DemographicFilter(), new TypeFilter()];

    const metadata = this.filterData;
    if (metadata?.genres && metadata.genres.length > 0) filters.push(new GenreFilter(metadata.genres));
    if (metadata?.tags && metadata.tags.length > 0) filters.push(new TagFilters(metadata.tags));

    filters.push(
      new Separator(),
      new Header("Separate tags with commas (,)"),
      new Header("Prepend with dash (-) to exclude"),
      new TagFilterText(),
      new Separator(),
      new CreatedAtFilter(),
      new MinimumChaptersFilter(),
      new StatusFilter(),
      new ContentRatingFilter(),
      new ReleaseFrom(),
      new ReleaseTo(),
    );

    return filters;
  }

  // Settings

  private get languageWhitelist(): Set<string> {
    return this.preferences.getStringSet(LANGUAGE_WHITELIST, ["en"]);
  }

  override setupPreferenceScreen(screen: PreferenceScreen): void {
    screen.addPreference(
      new ListPreference({
        key: PREF_MIRROR,
        title: "Preferred Mirror",
        entries: MIRRORS.map((url) => toHttpUrl(url).host),
        entryValues: MIRRORS.map((_, index) => String(index)),
        defaultValue: "0",
      }),
    );
    screen.addPreference(
      new MultiSelectListPreference({
        key: LANGUAGE_WHITELIST,
        title: "Chapter Languages",
        summary: "Leave empty for All",
        entries: LANGUAGES.map((it) => it[0]),
        entryValues: LANGUAGES.map((it) => it[1]),
        defaultValue: ["en"],
      }),
    );
  }
}

export default defineExtension([new Comick()]);
