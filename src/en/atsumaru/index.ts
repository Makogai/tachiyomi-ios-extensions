// Port of src/en/atsumaru/.../Atsumaru.kt @ d9420cd1. Method names follow the original.
import {
  type ClientBuilder,
  defineExtension,
  EditTextPreference,
  Fetch,
  type FilterList,
  type Headers,
  type HttpUrl,
  KeiSource,
  MangasPage,
  MultiSelectListPreference,
  Page,
  type PreferenceScreen,
  SChapter,
  SManga,
  SMangaUpdate,
  SwitchPreferenceCompat,
  toHttpUrl,
  TriState,
} from "@sdk";
import {
  type AllChaptersDto,
  type BrowseMangaDto,
  type ChapterDto,
  chapterToSChapter,
  dateUploadMillis,
  type FilterData,
  filterDataToFilters,
  hasNextPage,
  type MangaDto,
  type MangaObjectDto,
  mangaToSManga,
  type PageObjectDto,
  type SearchResultsDto,
} from "./dto";
import {
  AdultFilter,
  GenreFilter,
  MinChaptersFilter,
  OfficialFilter,
  SortFilter,
  StatusFilter,
  TagFilters,
  TypeFilter,
  YearFilter,
} from "./filters";

const PREF_SHOW_18 = "pref_18_mode";
const PREF_EXCLUDE_GENRES = "pref_exclude_genres";
const PREF_DEDUPLICATE_CHAPTERS = "pref_deduplicate_chapters";
const PREF_SCANLATOR_BLACKLIST = "pref_scanlator_blacklist";
const BROWSE_LIMIT = 40;

const PROTOCOL_REGEX = /^https?:?\/\//;

// Upstream's `supportsFilterFetching`: the app caches `fetchFilterData()` and passes it to
// `getFilterList(data)`. Here the data is cached in the source's settings and refreshed once per
// launch, the first time the source is browsed.
const FILTER_DATA_KEY = "filter_data_cache";

/** Kotlin's `compareBy` on nullable strings: nulls first, then `String.compareTo`. */
function compareNullable(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

class Atsumaru extends KeiSource {

  readonly name = "Atsumaru";
  readonly lang = "en";
  readonly baseUrl = "https://atsu.moe";
  override readonly versionId = 2;

  protected override configureClient(builder: ClientBuilder): void {
    builder.rateLimit(2);
  }

  protected override configureHeaders(headers: Headers): Headers {
    return { ...headers, "Content-Type": "application/json" };
  }

  // ============================== Popular ===============================

  async getPopularManga(page: number): Promise<MangasPage> {
    const offset = (page - 1) * BROWSE_LIMIT;
    const [, response] = await Promise.all([
      this.ensureFilterData(),
      this.client.get(
        `${this.baseUrl}/api/home2/popular?offset=${offset}&limit=${BROWSE_LIMIT}` +
          `&types=Manga,Manwha,Manhua,OEL&mediums=Comic&timeframe=daily${this.get18Mode()}${this.excludedGenresQuery()}`,
        Fetch.XHR,
      ),
    ]);
    const data = response.parseAs<BrowseMangaDto>();

    return new MangasPage(
      data.items.map((it) => mangaToSManga(it, this.baseUrl)),
      true,
    );
  }

  // =============================== Latest ===============================

  async getLatestUpdates(page: number): Promise<MangasPage> {
    const offset = (page - 1) * BROWSE_LIMIT;
    const [, response] = await Promise.all([
      this.ensureFilterData(),
      this.client.get(
        `${this.baseUrl}/api/home2/recentlyUpdated?offset=${offset}&limit=${BROWSE_LIMIT}` +
          `&types=Manga,Manwha,Manhua,OEL&mediums=Comic${this.get18Mode()}${this.excludedGenresQuery()}`,
        Fetch.XHR,
      ),
    ]);
    const data = response.parseAs<BrowseMangaDto>();

    return new MangasPage(
      data.items.map((it) => mangaToSManga(it, this.baseUrl)),
      true,
    );
  }

  // =============================== Search ===============================

  async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    const url = toHttpUrl(`${this.baseUrl}/collections/manga/documents/search`).newBuilder();
    url.addQueryParameter("q", query === "" ? "*" : query);

    const filterBy: string[] = [];
    filterBy.push("hidden:!=true");

    const includedGenres: string[] = [];
    const excludedGenres: string[] = [];
    const includedTags: string[] = [];
    const excludedTags: string[] = [];
    const typesList: string[] = [];
    const statuses: string[] = [];
    let year: number | null = null;
    let minChapters: number | null = null;
    let showAdult = false;
    let officialTranslation = false;
    let sortBy = "";

    const toIntOrNull = (text: string) => (/^[+-]?\d+$/.test(text) ? Number(text) : null);

    for (const filter of filters) {
      if (filter instanceof GenreFilter) {
        filter.state.forEach((state, index) => {
          if (state.state === TriState.STATE_INCLUDE) includedGenres.push(filter.genreIds[index]);
          else if (state.state === TriState.STATE_EXCLUDE) excludedGenres.push(filter.genreIds[index]);
        });
      } else if (filter instanceof TagFilters) {
        for (const letter of filter.state) {
          letter.state.forEach((state, index) => {
            if (state.state === TriState.STATE_INCLUDE) includedTags.push(letter.tagIds[index]);
            else if (state.state === TriState.STATE_EXCLUDE) excludedTags.push(letter.tagIds[index]);
          });
        }
      } else if (filter instanceof TypeFilter) {
        filter.state.forEach((checkBox, index) => {
          if (checkBox.state) typesList.push(filter.ids[index]);
        });
      } else if (filter instanceof StatusFilter) {
        filter.state.forEach((checkBox, index) => {
          if (checkBox.state) statuses.push(filter.ids[index]);
        });
      } else if (filter instanceof YearFilter) {
        if (filter.state !== "") year = toIntOrNull(filter.state);
      } else if (filter instanceof MinChaptersFilter) {
        if (filter.state !== "") minChapters = toIntOrNull(filter.state);
      } else if (filter instanceof SortFilter) {
        const direction = filter.state!.ascending ? "asc" : "desc";
        sortBy = `${SortFilter.VALUES[filter.state!.index]}:${direction}`;
      } else if (filter instanceof AdultFilter) {
        showAdult = filter.state || this.get18Mode() !== "";
      } else if (filter instanceof OfficialFilter) {
        officialTranslation = filter.state;
      }
    }

    if (includedGenres.length > 0) {
      filterBy.push(includedGenres.map((it) => `genreIds:=\`${it}\``).join(" && "));
    }
    if (excludedGenres.length > 0) {
      filterBy.push(`genreIds:!=[${excludedGenres.map((it) => `\`${it}\``).join(",")}]`);
    }

    if (includedTags.length > 0) {
      filterBy.push(includedTags.map((it) => `tagIds:=\`${it}\``).join(" && "));
    }
    if (excludedTags.length > 0) {
      filterBy.push(`tagIds:!=[${excludedTags.map((it) => `\`${it}\``).join(",")}]`);
    }

    if (typesList.length > 0) {
      filterBy.push(`type:=[${typesList.map((it) => `\`${it}\``).join(",")}]`);
    }

    if (statuses.length > 0) {
      filterBy.push(`status:=[${statuses.map((it) => `\`${it}\``).join(",")}]`);
    }

    if (year !== null) filterBy.push(`releaseYear:=[${year}]`);

    if (minChapters !== null) filterBy.push(`chapterCount:>=${minChapters}`);

    if (!showAdult) filterBy.push(`isAdult:=${showAdult}`);

    if (officialTranslation) filterBy.push(`officialTranslation:=${officialTranslation}`);

    filterBy.push("(mbContentRating:=[`Safe`,`Suggestive`,`Erotica`] || mbContentRating:!=*)");
    filterBy.push("medium:!=[`Novel`]");
    filterBy.push("views:>0");

    url.addQueryParameter("filter_by", filterBy.join(" && "));

    if (sortBy !== "") url.addQueryParameter("sort_by", sortBy);

    if (query !== "") {
      url.addQueryParameter("query_by", "title,englishTitle,otherNames,authors");
      url.addQueryParameter("query_by_weights", "4,3,2,1");
      url.addQueryParameter("num_typos", "4,3,2,1");
    }

    url.addQueryParameter("page", String(page));
    url.addQueryParameter("per_page", "40");

    const response = await this.client.get(url.build(), Fetch.XHR);
    const body = response.body;

    if (body.includes('"hits"')) {
      const data = response.parseAs<SearchResultsDto>();
      return new MangasPage(
        data.hits.map((it) => mangaToSManga(it.document, this.baseUrl)),
        hasNextPage(data),
      );
    } else {
      const data = response.parseAs<BrowseMangaDto>();
      return new MangasPage(
        data.items.map((it) => mangaToSManga(it, this.baseUrl)),
        true,
      );
    }
  }

  protected override async getMangaByUrl(url: HttpUrl): Promise<SManga | null> {
    if (url.host !== toHttpUrl(this.baseUrl).host) return null;
    if (url.pathSegments[0] !== "manga") return null;
    const id = url.pathSegments[1];
    if (id === undefined) return null;

    const manga = SManga.create();
    manga.url = id;
    const updated = (await this.fetchMangaUpdate(manga, [], true, false)).manga;
    updated.initialized = true;
    return updated;
  }

  // =============================== Filters ===============================

  private async fetchFilterData(): Promise<FilterData> {
    const filters = (await this.client.get(`${this.baseUrl}/api/explore/availableFilters`, Fetch.XHR)).parseAs<FilterData>();
    // Keep only what the filters use.
    const entries = (list: FilterData["genres"]) => list?.map(({ id, name }) => ({ id, name })) ?? null;
    return {
      genres: entries(filters.genres),
      tags: entries(filters.tags),
      types: entries(filters.types),
      statuses: entries(filters.statuses),
    };
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

  private get filterData(): FilterData | null {
    const json = this.preferences.getString(FILTER_DATA_KEY, "");
    if (json === "") return null;
    try {
      return JSON.parse(json) as FilterData;
    } catch {
      return null;
    }
  }

  override getFilterList(): FilterList {
    const excludedGenres = this.preferences.getStringSet(PREF_EXCLUDE_GENRES, []);
    const data = this.filterData;
    const filters: FilterList = data !== null ? filterDataToFilters(data, excludedGenres) : [];

    return [
      ...filters,
      new YearFilter(),
      new MinChaptersFilter(),
      new SortFilter(),
      new AdultFilter(this.get18Mode() !== ""),
      new OfficialFilter(),
    ];
  }

  // =========================== Manga Details ============================

  override getMangaUrl(manga: SManga): string {
    return `${this.baseUrl}/manga/${manga.url}`;
  }

  async fetchMangaUpdate(
    manga: SManga,
    chapters: SChapter[],
    fetchDetails: boolean,
    fetchChapters: boolean,
  ): Promise<SMangaUpdate> {
    const [details, chaptersDto] = await Promise.all([
      fetchDetails || fetchChapters
        ? this.client
            .get(`${this.baseUrl}/api/manga/page?id=${manga.url}`, Fetch.XHR)
            .then((response) => response.parseAs<MangaObjectDto>().mangaPage)
        : Promise.resolve(null),
      fetchChapters
        ? this.client
            .get(`${this.baseUrl}/api/manga/allChapters?mangaId=${manga.url}`, Fetch.XHR)
            .then((response) => response.parseAs<AllChaptersDto>())
        : Promise.resolve(null),
    ]);

    const updatedManga = fetchDetails && details !== null ? mangaToSManga(details, this.baseUrl) : manga;

    let updatedChapters: SChapter[];
    if (fetchChapters && chaptersDto !== null) {
      updatedChapters = this.chaptersFromDto(manga, details, chaptersDto.chapters);
    } else {
      updatedChapters = chapters;
    }

    return new SMangaUpdate(updatedManga, updatedChapters);
  }

  private chaptersFromDto(manga: SManga, details: MangaDto | null, chapters: ChapterDto[]): SChapter[] {
    const scanlatorMap = new Map((details?.scanlators ?? []).map((it) => [it.id, it.name]));
    const blacklist = this.scanlatorBlacklist;
    const filteredChapters =
      blacklist.size === 0
        ? chapters
        : chapters.filter((chapter) => {
            const name = chapter.scanlationMangaId != null ? scanlatorMap.get(chapter.scanlationMangaId) : undefined;
            return name === undefined || !blacklist.has(name.trim().toLowerCase());
          });

    let chapterDtos: ChapterDto[];
    if (this.deduplicateChapters) {
      const scores = new Map((details?.scanlators ?? []).map((it) => [it.id, it.score]));
      const score = (it: ChapterDto) =>
        (it.scanlationMangaId != null ? scores.get(it.scanlationMangaId) : undefined) ?? Number.MIN_SAFE_INTEGER;
      const groups = new Map<number, ChapterDto[]>();
      for (const chapter of filteredChapters) {
        const list = groups.get(chapter.number) ?? [];
        list.push(chapter);
        groups.set(chapter.number, list);
      }
      chapterDtos = [...groups.values()].map((uploads) =>
        uploads.reduce((max, it) => {
          const byScore = score(max) - score(it);
          const compare = byScore !== 0 ? byScore : dateUploadMillis(max) - dateUploadMillis(it);
          return compare < 0 ? it : max;
        }),
      );
    } else {
      chapterDtos = filteredChapters;
    }

    return chapterDtos
      .map((it) =>
        chapterToSChapter(it, manga.url, it.scanlationMangaId != null ? (scanlatorMap.get(it.scanlationMangaId) ?? null) : null),
      )
      .sort(
        (a, b) =>
          b.chapter_number - a.chapter_number ||
          compareNullable(a.scanlator, b.scanlator) ||
          b.date_upload - a.date_upload,
      );
  }

  // ============================== Chapters ==============================

  override getChapterUrl(chapter: SChapter): string {
    const [slug, name] = chapter.url.split("/");
    return `${this.baseUrl}/read/${slug}/${name}`;
  }

  // =============================== Pages ================================

  async getPageList(chapter: SChapter): Promise<Page[]> {
    const [slug, name] = chapter.url.split("/");
    const url = toHttpUrl(`${this.baseUrl}/api/read/chapter`)
      .newBuilder()
      .addQueryParameter("mangaId", slug)
      .addQueryParameter("chapterId", name)
      .build();

    const data = (await this.client.get(url, Fetch.XHR)).parseAs<PageObjectDto>();
    return data.readChapter.pages.map((page, index) => {
      let imageUrl: string;
      if (page.image.startsWith("http")) {
        imageUrl = page.image;
      } else if (page.image.startsWith("//")) {
        imageUrl = `https:${page.image}`;
      } else {
        let path = page.image.startsWith("/") ? page.image.slice(1) : page.image;
        path = path.startsWith("static/") ? path.slice("static/".length) : path;
        imageUrl = `${this.baseUrl}/static/${path}`;
      }
      return new Page(index, "", imageUrl.replace(PROTOCOL_REGEX, "https://cdn."));
    });
  }

  private get18Mode(): string {
    const isEnabled = this.preferences.getBoolean(PREF_SHOW_18, false);
    return isEnabled ? "&adult=1" : "";
  }

  private excludedGenresQuery(): string {
    const ids = this.preferences.getStringSet(PREF_EXCLUDE_GENRES, []);
    if (ids.size === 0) return "";
    return `&excludedTags=${[...ids].join(",")}`;
  }

  private get deduplicateChapters(): boolean {
    return this.preferences.getBoolean(PREF_DEDUPLICATE_CHAPTERS, false);
  }

  private get scanlatorBlacklist(): Set<string> {
    return new Set(
      this.preferences
        .getString(PREF_SCANLATOR_BLACKLIST, "")
        .split(",")
        .map((it) => it.trim().toLowerCase())
        .filter((it) => it !== ""),
    );
  }

  override setupPreferenceScreen(screen: PreferenceScreen): void {
    screen.addPreference(
      new SwitchPreferenceCompat({
        key: PREF_SHOW_18,
        title: "Toggle adult mode",
        // Upstream: summaryOff "Safe (default)", summaryOn "+18".
        summary: "Off: Safe (default). On: +18",
        defaultValue: false,
      }),
    );

    const genreFilter = this.getFilterList().find((filter) => filter instanceof GenreFilter) as GenreFilter | undefined;
    const genres = genreFilter?.state ?? [];
    const genreIds = genreFilter?.genreIds ?? [];
    const selected = this.preferences.getStringSet(PREF_EXCLUDE_GENRES, []);
    const entryMap = new Map(genreIds.map((id, index) => [id, genres[index].name]));

    screen.addPreference(
      new MultiSelectListPreference({
        key: PREF_EXCLUDE_GENRES,
        title: "Exclude Genres from Browse",
        summary: selected.size === 0 ? "None" : [...selected].map((it) => entryMap.get(it) ?? it).join(", "),
        entries: genres.map((it) => it.name),
        entryValues: genreIds,
        defaultValue: [],
      }),
    );

    screen.addPreference(
      new SwitchPreferenceCompat({
        key: PREF_DEDUPLICATE_CHAPTERS,
        title: "Deduplicate chapters",
        summary: "Show one upload per chapter, from the highest rated group that has it",
        defaultValue: false,
      }),
    );

    screen.addPreference(
      new EditTextPreference({
        key: PREF_SCANLATOR_BLACKLIST,
        title: "Excluded scanlators",
        summary: "Comma-separated group names to exclude from the chapter list",
        defaultValue: "",
      }),
    );
  }
}

export default defineExtension([new Atsumaru()]);
