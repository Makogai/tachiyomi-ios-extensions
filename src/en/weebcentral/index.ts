// Port of src/en/weebcentral/.../WeebCentral.kt @ d9420cd1. Method names follow the original.
import {
  type ClientBuilder,
  defineExtension,
  type Element,
  Fetch,
  type FilterList,
  type HttpUrl,
  KeiSource,
  MangasPage,
  Page,
  parseIsoDate,
  type PreferenceScreen,
  SChapter,
  SManga,
  SMangaUpdate,
  seconds,
  SwitchPreferenceCompat,
  toHttpUrl,
  toHttpUrlOrNull,
} from "@sdk";
import {
  AdultContentFilter,
  AnimeAdaptationFilter,
  AuthorFilter,
  isUriFilter,
  OfficialTranslationFilter,
  SortFilter,
  SortOrderFilter,
  StatusFilter,
  TagFilter,
  TypeFilter,
} from "./filters";

// The related "&limit=" query parameter of the api is currently non functional
// and always returns 32 entries per request
const FETCH_LIMIT = 32;

const excludedSearchCharacters = /[!#:(),-]/g;

const seasonRegex = /(Season|S)\s*\d+/i;

const BRACKET_REGEX = /(\([^()]*\)|\[[^[\]]*])\s*$/;

const PREF_CLEAN_TITLE = "pref_clean_title";
const PREF_CLEAN_TITLE_DEFAULT = false;

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
    return this.getSearchMangaList(page, "", this.defaultFilterList(new SortFilter("Popularity")));
  }

  // =============================== Latest ===============================

  getLatestUpdates(page: number): Promise<MangasPage> {
    return this.getSearchMangaList(page, "", this.defaultFilterList(new SortFilter("Latest Updates")));
  }

  // =============================== Search ===============================

  async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    const filterList = filters.length > 0 ? filters : this.getFilterList();
    const builder = toHttpUrl(`${this.baseUrl}/search/data`).newBuilder();
    builder.addQueryParameter("text", query.replace(excludedSearchCharacters, " ").trim());
    for (const filter of filterList) {
      if (isUriFilter(filter)) filter.addToUri(builder);
    }
    builder.addQueryParameter("limit", String(FETCH_LIMIT));
    builder.addQueryParameter("offset", String((page - 1) * FETCH_LIMIT));
    builder.addQueryParameter("display_mode", "Full Display");
    const url = builder.build();

    const document = (await this.client.get(url, Fetch.DOCUMENT)).asJsoup();
    const mangas = document.select("article > section > a").map((element) => {
      const manga = SManga.create();
      manga.thumbnail_url = this.sourceImg(element);
      manga.title = element.selectFirst("div:not([class]):last-child")!.text();
      manga.setUrlWithoutDomain(element.attr("abs:href"));
      return manga;
    });
    const hasNextPage = document.selectFirst("button") !== null;
    return new MangasPage([...mangas], hasNextPage);
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
    return this.defaultFilterList(new SortFilter());
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
    const sections = document.select("section[x-data] > section");
    const result = SManga.create();

    {
      const section = sections[0];
      if (!section) throw new Error("Series page has no details section");
      result.thumbnail_url = this.sourceImg(section);
      result.author = section
        .select("ul > li:has(strong:contains(Author)) > span > a")
        .map((element) => element.text())
        .join(", ");
      result.genre = section
        .select("ul > li:has(strong:contains(Tag),strong:contains(Type)) a")
        .map((element) => element.text())
        .join(", ");
      result.status = this.parseStatus(section.selectFirst("ul > li:has(strong:contains(Status)) > a"));
    }

    {
      const section = sections[1];
      if (!section) throw new Error("Series page has no title section");
      result.title = this.cleanTitleIfNeeded(section.selectFirst("h1")!.text());

      let description = "";
      const synopsis = section.selectFirst("li:has(strong:contains(Description)) > p")?.text();
      if (synopsis !== undefined) {
        description += synopsis.replaceAll("NOTE: ", "\n\nNOTE: ");
      }

      const relatedSeries = section.select("li:has(strong:contains(Related Series)) li");
      if (relatedSeries.isNotEmpty()) {
        description += "\n\nRelated Series(s):";
        for (const series of relatedSeries) {
          const link = series.selectFirst("a")!;
          const relation = series.selectFirst("span")?.text() ?? "";
          description += `\n- [${link.text()}](${link.attr("abs:href")}) ${relation}`.trimEnd();
        }
      }

      const alternateTitles = section.select("li:has(strong:contains(Associated Name)) li");
      if (alternateTitles.isNotEmpty()) {
        description += "\n\nAssociated Name(s):";
        for (const title of alternateTitles) description += `\n- ${title.text()}`;
      }

      const trackers = document.select("li:has(strong:contains(Track)) span[data-tip] > a");
      if (trackers.isNotEmpty()) {
        description += "\n\nTracker(s):";
        for (const tracker of trackers) {
          const name = tracker.parent()!.attr("data-tip");
          description += `\n- [${name}](${tracker.attr("abs:href")})`;
        }
      }

      result.description = description;
    }

    result.setUrlWithoutDomain(document.location());
    return result;
  }

  // Related manga (`fetchRelatedMangaList`) is not ported: the host API has no related-manga call.

  private parseStatus(element: Element | null): number {
    switch (element?.text()?.toLowerCase()) {
      case "ongoing":
        return SManga.ONGOING;
      case "complete":
        return SManga.COMPLETED;
      case "hiatus":
        return SManga.ON_HIATUS;
      case "canceled":
        return SManga.CANCELLED;
      default:
        return SManga.UNKNOWN;
    }
  }

  private async getChapterList(manga: SManga): Promise<SChapter[]> {
    const seriesId = toHttpUrl(this.baseUrl + manga.url).pathSegments[1];
    const url = `${this.baseUrl}/series/${seriesId}/full-chapter-list`;

    const document = (await this.client.get(url, Fetch.DOCUMENT)).asJsoup();

    // Descending
    const chapters = document.select("div[x-data] > a");

    let useIndexing = false;
    return chapters.map((element, index) => {
      const chapter = SChapter.create();
      chapter.name = element.selectFirst("span.flex > span")!.text();
      useIndexing = seasonRegex.test(chapter.name);
      chapter.setUrlWithoutDomain(element.attr("abs:href"));
      const time = element.selectFirst("time[datetime]");
      if (time) chapter.date_upload = parseIsoDate(time.attr("datetime"));
      if (useIndexing) chapter.chapter_number = chapters.length - index;

      const isOfficial = element.select("img").some((img) => img.attr("src").toLowerCase().includes("official"));
      chapter.scanlator = isOfficial ? "Official" : "Unknown";
      return chapter;
    });
  }

  // =============================== Pages ================================

  async getPageList(chapter: SChapter): Promise<Page[]> {
    const newUrl =
      toHttpUrlOrNull(this.baseUrl + chapter.url)
        ?.newBuilder()
        .addPathSegment("images")
        .addQueryParameter("is_prev", "False")
        .addQueryParameter("reading_style", "long_strip")
        .build()
        .toString() ?? this.baseUrl + chapter.url;

    const document = (await this.client.get(newUrl, Fetch.DOCUMENT)).asJsoup();
    return document
      .select("section[x-data~=scroll] > img")
      .map((element, index) => new Page(index, "", element.attr("abs:src")));
  }

  // Upstream's getImageRequest only adds `Host: <image host>`, which every request carries
  // already; the default request (with the Referer header) is the same.

  override setupPreferenceScreen(screen: PreferenceScreen): void {
    screen.addPreference(
      new SwitchPreferenceCompat({
        key: PREF_CLEAN_TITLE,
        title: "Clean title",
        summary: "Removes extra brackets or parentheses in title",
        defaultValue: PREF_CLEAN_TITLE_DEFAULT,
      }),
    );
  }

  // ============================= Utilities ==============================

  private get cleanTitle(): boolean {
    // The host returns `undefined` (not null) for an unset key, which SharedPreferences.read
    // then fails to JSON-parse; fall back to the default until the SDK handles it.
    try {
      return this.preferences.getBoolean(PREF_CLEAN_TITLE, PREF_CLEAN_TITLE_DEFAULT);
    } catch {
      return PREF_CLEAN_TITLE_DEFAULT;
    }
  }

  private cleanTitleIfNeeded(title: string): string {
    return this.cleanTitle ? title.replace(BRACKET_REGEX, "").trim() : title.trim();
  }

  private sourceImg(element: Element): string | null {
    const source = element.selectFirst("source");
    if (source) return source.attr("srcset").replaceAll("small", "normal");
    return element.selectFirst("img")?.attr("abs:src") ?? null;
  }

  private defaultFilterList(sortFilter: SortFilter): FilterList {
    return [
      sortFilter,
      new SortOrderFilter(),
      new OfficialTranslationFilter(),
      new AnimeAdaptationFilter(),
      new AdultContentFilter(),
      new AuthorFilter(),
      new StatusFilter(),
      new TypeFilter(),
      new TagFilter(),
    ];
  }
}

export default defineExtension([new WeebCentral()]);
