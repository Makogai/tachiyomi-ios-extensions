// Port of lib-multisrc/mmrcms/.../MMRCMS.kt @ d9420cd1 (the theme ReadComicsOnline is built on).
// Kotlin `open val`s are getters here so that subclasses can override them without
// field-initialisation order problems.
import {
  type Document,
  type Element,
  type Elements,
  Fetch,
  type FilterList,
  FormBody,
  Header,
  type HttpUrl,
  KeiSource,
  MangasPage,
  Page,
  parseDate,
  parseHtml,
  type Response,
  SChapter,
  SManga,
  SMangaUpdate,
  Separator,
  substringAfterLast,
  toHttpUrl,
} from "@sdk";
import { isUriFilter, SortFilter, TextFilter, UriMultiSelectFilter, UriPartFilter } from "./filters";
import { Intl } from "./intl";

export interface SuggestionDto {
  value: string;
  data: string;
}

export interface SearchResultDto {
  suggestions: SuggestionDto[];
}

export interface FilterData {
  categories: [string, string][];
  statuses: [string, string][];
  tags: [string, string][];
  sortOptions: [string, string][];
}

/**
 * dateFormat The date format used for parsing chapter dates.
 * itemPath The path used in the URL for entries.
 * fetchFilterOptions Whether to fetch filtering options (categories, types, tags).
 * supportsAdvancedSearch Whether the source supports advanced search under /advanced-search.
 * detailsTitleSelector Selector for the entry's title in its details page.
 * chapterNamePrefix A word that always precedes the chapter title, e.g. "Scan "
 * chapterString The word for "Chapter" in the source's language.
 */
export abstract class MMRCMS extends KeiSource {
  /** A `parseDate` pattern (upstream: `DateTimeFormatter.ofPattern("d MMM. yyyy", Locale.US)`). */
  protected get dateFormat(): string {
    return "d MMM. yyyy";
  }

  protected get itemPath(): string {
    return "manga";
  }

  protected get fetchFilterOptions(): boolean {
    return true;
  }

  protected get supportsAdvancedSearch(): boolean {
    return true;
  }

  protected get detailsTitleSelector(): string {
    return ".listmanga-header, .widget-title";
  }

  protected get chapterNamePrefix(): string {
    return "";
  }

  protected get chapterString(): string {
    switch (this.lang) {
      case "es":
        return "Capítulo";
      case "fr":
        return "Chapitre";
      default:
        return "Chapter";
    }
  }

  protected get intl(): Intl {
    return new Intl(this.lang);
  }

  protected popularMangaUrl(page: number): string {
    return `${this.baseUrl}/filterList?page=${page}&sortBy=views&asc=false`;
  }

  async getPopularManga(page: number): Promise<MangasPage> {
    return this.popularMangaParse((await this.client.get(this.popularMangaUrl(page), Fetch.DOCUMENT)).asJsoup());
  }

  protected popularMangaParse(document: Document): MangasPage {
    const mangas = document.select(this.popularMangaSelector()).map((element) => this.popularMangaFromElement(element));
    const nextPageSelector = this.popularMangaNextPageSelector();
    const hasNextPage = nextPageSelector !== null ? document.selectFirst(nextPageSelector) !== null : false;
    return new MangasPage([...mangas], hasNextPage);
  }

  protected popularMangaSelector(): string {
    return this.searchMangaSelector();
  }

  protected popularMangaFromElement(element: Element): SManga {
    return this.searchMangaFromElement(element);
  }

  protected popularMangaNextPageSelector(): string | null {
    return this.searchMangaNextPageSelector();
  }

  protected latestUpdatesUrl(page: number): string {
    return `${this.baseUrl}/latest-release?page=${page}`;
  }

  async getLatestUpdates(page: number): Promise<MangasPage> {
    return this.latestUpdatesParse(await this.client.get(this.latestUpdatesUrl(page), Fetch.DOCUMENT));
  }

  protected latestUpdatesParse(response: Response): MangasPage {
    const document = response.asJsoup();
    const seen = new Set<string>();
    const manga = document
      .select(this.latestUpdatesSelector())
      .map((element) => this.latestUpdatesFromElement(element))
      .filter((item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      });
    const nextPageSelector = this.latestUpdatesNextPageSelector();
    const hasNextPage = nextPageSelector !== null ? document.selectFirst(nextPageSelector) !== null : false;

    return new MangasPage(manga, hasNextPage);
  }

  protected latestUpdatesSelector(): string {
    return "div.mangalist div.manga-item";
  }

  protected latestUpdatesFromElement(element: Element): SManga {
    return this.popularMangaFromElement(element);
  }

  protected latestUpdatesNextPageSelector(): string | null {
    return this.popularMangaNextPageSelector();
  }

  private readonly searchTokenRegex = /['"]_token['"]\s*:\s*['"]([0-9A-Za-z]+)['"]/;

  async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    if (query.length === 0 && this.supportsAdvancedSearch) {
      const document = (await this.client.get(`${this.baseUrl}/advanced-search`, Fetch.DOCUMENT)).asJsoup();
      const paramsBuilder = toHttpUrl(this.baseUrl).newBuilder();
      for (const filter of filters) {
        if (isUriFilter(filter)) filter.addToUri(paramsBuilder);
      }
      const params = paramsBuilder.build().encodedQuery ?? "";

      const body = new FormBody();
      body.add("params", params);
      body.add("page", String(page));

      const script = document.selectFirst("script:containsData(_token)")?.data();
      if (script !== undefined) {
        const token = this.searchTokenRegex.exec(script)?.[1];
        if (token !== undefined) body.add("_token", token);
      }

      const resDoc = (
        await this.client.post(`${this.baseUrl}/advSearchFilter`, body.build(), Fetch.DOCUMENT)
      ).asJsoup();
      const mangas = resDoc.select(this.searchMangaSelector()).map((element) => this.searchMangaFromElement(element));
      const nextPageSelector = this.searchMangaNextPageSelector();
      const hasNextPage = nextPageSelector !== null ? resDoc.selectFirst(nextPageSelector) !== null : false;
      return new MangasPage([...mangas], hasNextPage);
    }

    const url = this.searchMangaUrl(page, query, filters);
    return this.searchMangaParse(await this.client.get(url, Fetch.DOCUMENT), page, url);
  }

  protected searchMangaUrl(page: number, query: string, filters: FilterList): string {
    const builder = toHttpUrl(this.baseUrl).newBuilder();
    if (query.length > 0) {
      builder.addPathSegment("search");
      builder.addQueryParameter("query", query);
    } else {
      builder.addPathSegment("filterList");
      builder.addQueryParameter("page", String(page));
      for (const filter of filters) {
        if (isUriFilter(filter)) filter.addToUri(builder);
      }
    }
    return builder.build().toString();
  }

  /** `requestUrl` stands in for upstream's `response.request.url`. */
  protected searchMangaParse(response: Response, page: number, requestUrl: string): MangasPage {
    const segments = toHttpUrl(requestUrl).pathSegments;
    const searchType = segments[segments.length - 1];

    if (searchType === "filterList") {
      const document = response.asJsoup();
      const mangas = document.select(this.searchMangaSelector()).map((element) => this.searchMangaFromElement(element));
      const nextPageSelector = this.searchMangaNextPageSelector();
      const hasNextPage = nextPageSelector !== null ? document.selectFirst(nextPageSelector) !== null : false;
      return new MangasPage([...mangas], hasNextPage);
    }

    return this.parseSearchDirectory(response.parseAs<SearchResultDto>().suggestions, page);
  }

  protected searchMangaSelector(): string {
    return "div.media";
  }

  protected searchMangaFromElement(element: Element): SManga {
    const manga = SManga.create();
    const anchor = element.selectFirst(".media-heading a, .manga-heading a")!;

    manga.setUrlWithoutDomain(anchor.absUrl("href"));
    manga.title = anchor.text();
    manga.thumbnail_url = this.guessCover(manga.url, this.imgAttrOrNull(element.selectFirst("img")));
    return manga;
  }

  protected searchMangaNextPageSelector(): string | null {
    return ".pagination a[rel=next]";
  }

  protected parseSearchDirectory(searchDirectory: SuggestionDto[], page: number): MangasPage {
    const manga = searchDirectory.slice((page - 1) * 24, Math.min(page * 24, searchDirectory.length)).map((it) => {
      const item = SManga.create();
      item.url = `/${this.itemPath}/${it.data}`;
      item.title = it.value;
      item.thumbnail_url = this.guessCover(item.url, null);
      return item;
    });
    const hasNextPage = (page + 1) * 24 <= searchDirectory.length;

    return new MangasPage(manga, hasNextPage);
  }

  protected override async getMangaByUrl(url: HttpUrl): Promise<SManga | null> {
    if (url.host !== toHttpUrl(this.baseUrl).host || url.pathSegments.length < 2 || url.pathSegments[0] !== this.itemPath) {
      return null;
    }

    const manga = this.mangaDetailsParse((await this.client.get(url, Fetch.DOCUMENT)).asJsoup());
    manga.setUrlWithoutDomain(url.toString());
    return manga;
  }

  // Details and chapters come from the same page
  async fetchMangaUpdate(manga: SManga): Promise<SMangaUpdate> {
    const document = (await this.client.get(this.getMangaUrl(manga), Fetch.DOCUMENT)).asJsoup();
    return new SMangaUpdate(this.mangaDetailsParse(document), await this.chapterListParse(document));
  }

  protected readonly detailAuthor = new Set(["author(s)", "autor(es)", "auteur(s)", "著作", "yazar(lar)", "mangaka(lar)", "pengarang/penulis", "pengarang", "penulis", "autor", "المؤلف", "перевод", "autor/autorzy"]);
  protected readonly detailArtist = new Set(["artist(s)", "artiste(s)", "sanatçi(lar)", "artista(s)", "artist(s)/ilustrator", "الرسام", "seniman", "rysownik/rysownicy", "artista"]);
  protected readonly detailGenre = new Set(["categories", "categorías", "catégories", "ジャンル", "kategoriler", "categorias", "kategorie", "التصنيفات", "жанр", "kategori", "tagi", "género"]);
  protected readonly detailStatus = new Set(["status", "statut", "estado", "状態", "durum", "الحالة", "статус"]);
  protected readonly detailStatusComplete = new Set(["complete", "مكتملة", "complet", "completo", "zakończone", "concluído", "finalizado"]);
  protected readonly detailStatusOngoing = new Set(["ongoing", "مستمرة", "en cours", "em lançamento", "prace w toku", "ativo", "em andamento", "activo", "publicándose", "publicandose"]);
  protected readonly detailStatusDropped = new Set(["dropped"]);

  protected parseDetailStatus(text: string): number {
    const status = text.toLowerCase();
    if (this.detailStatusComplete.has(status)) return SManga.COMPLETED;
    if (this.detailStatusOngoing.has(status)) return SManga.ONGOING;
    if (this.detailStatusDropped.has(status)) return SManga.CANCELLED;
    return SManga.UNKNOWN;
  }

  protected mangaDetailsParse(document: Document): SManga {
    const manga = SManga.create();
    manga.title = document.selectFirst(this.detailsTitleSelector)!.text();
    manga.thumbnail_url = this.guessCover(
      document.location(),
      this.imgAttrOrNull(document.selectFirst(".row img.img-responsive")),
    );
    manga.description = this.textWithNewlines(document.select(".row .well"), ["h5"]);

    for (const element of document.select(".row .dl-horizontal dt")) {
      let key = element.text().toLowerCase();
      if (key.endsWith(":")) key = key.slice(0, -1);
      if (this.detailAuthor.has(key)) {
        manga.author = element.nextElementSibling()!.text();
      } else if (this.detailArtist.has(key)) {
        manga.artist = element.nextElementSibling()!.text();
      } else if (this.detailGenre.has(key)) {
        manga.genre = element
          .nextElementSibling()!
          .select("a")
          .map((it) => it.text())
          .join(", ");
      } else if (this.detailStatus.has(key)) {
        manga.status = this.parseDetailStatus(element.nextElementSibling()!.text());
      }
    }
    return manga;
  }

  protected async chapterListParse(document: Document): Promise<SChapter[]> {
    const title = document.selectFirst(this.detailsTitleSelector)!.text();

    return [...document.select(this.chapterListSelector()).map((element) => this.chapterFromElement(element, title))];
  }

  protected chapterListSelector(): string {
    return "ul.chapters > li:not(.btn)";
  }

  protected chapterFromElement(element: Element, mangaTitle: string): SChapter {
    const chapter = SChapter.create();
    const titleWrapper = element.selectFirst(".chapter-title-rtl")!;
    const anchor = titleWrapper.selectFirst("a")!;

    chapter.setUrlWithoutDomain(anchor.absUrl("href"));
    chapter.name = this.cleanChapterName(mangaTitle, titleWrapper.text());
    const dateStr = element.selectFirst(".date-chapter-title-rtl")?.text();
    chapter.date_upload = this.tryParseDate(dateStr);
    return chapter;
  }

  /** Upstream's `DateTimeFormatter.tryParseDate`: 0 for null or unparseable text. */
  protected tryParseDate(text: string | null | undefined): number {
    return text == null ? 0 : parseDate(text, this.dateFormat);
  }

  /**
   * Function to clean up chapter names. Mostly useful for sites that
   * don't know what a chapter title is and do "One Piece 1234 : Chapter 1234".
   */
  protected cleanChapterName(mangaTitle: string, name: string): string {
    const initialName = name.replace(this.chapterNamePrefix + mangaTitle, () => this.chapterString);

    const colon = initialName.indexOf(":");
    const splits = (colon < 0 ? [initialName] : [initialName.slice(0, colon), initialName.slice(colon + 1)]).map((it) =>
      it.trim(),
    );

    return splits.length < 2 || splits[0] === splits[1] ? splits[0] : `${splits[0]}: ${splits[1]}`;
  }

  async getPageList(chapter: SChapter): Promise<Page[]> {
    return this.pageListParse((await this.client.get(this.getChapterUrl(chapter), Fetch.DOCUMENT)).asJsoup());
  }

  protected pageListParse(document: Document): Page[] {
    return document.select("#all > img.img-responsive").map((it, i) => new Page(i, "", this.imgAttr(it)));
  }

  // Upstream fetches filter options (fetchFilterData) when fetchFilterOptions is true; the SDK has
  // no filter-data call, so getFilterList always gets no data, as upstream does before a fetch.
  override getFilterList(data: FilterData | null = null): FilterList {
    const categories = data?.categories ?? [];
    const statuses = data?.statuses ?? [];
    const tags = data?.tags ?? [];
    const sortOptions = data?.sortOptions ?? [];
    const intl = this.intl;

    const filters: FilterList = [];
    filters.push(new Header(intl.get("filter_warning")));
    filters.push(new Separator());

    if (this.supportsAdvancedSearch) {
      if (categories.length > 0) {
        filters.push(new UriMultiSelectFilter(intl.get("category_filter_title"), "categories[]", categories));
      }

      if (statuses.length > 0) {
        filters.push(new UriMultiSelectFilter(intl.get("status_filter_title"), "status[]", statuses));
      }

      if (tags.length > 0) {
        filters.push(new UriMultiSelectFilter(intl.get("type_filter_title"), "types[]", tags));
      }

      filters.push(new TextFilter(intl.get("year_filter_title"), "release"));
      filters.push(new TextFilter(intl.get("author_filter_title"), "author"));
    } else {
      if (categories.length > 0) {
        filters.push(new UriPartFilter(intl.get("category_filter_title"), "cat", [["Any", ""], ...categories]));
      }

      filters.push(new UriPartFilter(intl.get("title_begins_with_filter_title"), "alpha", this.alphaOptions));

      if (tags.length > 0) {
        filters.push(new UriPartFilter(intl.get("tag_filter_title"), "tag", [["Any", ""], ...tags]));
      }

      if (sortOptions.length > 0) {
        filters.push(new SortFilter(intl, sortOptions));
      }
    }

    return filters;
  }

  private get alphaOptions(): [string, string][] {
    return [["Any", ""], ...[..."#ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((it): [string, string] => [it, it])];
  }

  protected guessCover(mangaUrl: string, url: string | null | undefined): string {
    if (url == null || url.endsWith("no-image.png")) {
      return `${this.baseUrl}/uploads/manga/${substringAfterLast(mangaUrl, "/")}/cover/cover_250x350.jpg`;
    }
    return url;
  }

  protected imgAttr(element: Element): string {
    if (element.hasAttr("data-background-image")) return element.absUrl("data-background-image");
    if (element.hasAttr("data-cfsrc")) return element.absUrl("data-cfsrc");
    if (element.hasAttr("data-lazy-src")) return element.absUrl("data-lazy-src");
    if (element.hasAttr("data-src")) return element.absUrl("data-src");
    return element.absUrl("src");
  }

  protected imgAttrOrNull(element: Element | null): string | null {
    return element ? this.imgAttr(element) : null;
  }

  /**
   * Upstream removes `removeSelectors` and prepends a "\n" marker to every `p` and `br` in place,
   * then takes the text. The SDK's elements are read-only, so this does the same on the HTML.
   */
  protected textWithNewlines(elements: Elements, removeSelectors: string[] = []): string {
    const html = elements
      .map((element) => {
        let markup = element.outerHtml();
        for (const tag of removeSelectors) {
          markup = markup.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "gi"), "");
        }
        return markup.replace(/<p\b([^>]*)>/gi, "<p$1>\\n").replace(/<br\b[^>]*>/gi, "\\n<br>");
      })
      .join("");
    return parseHtml(html)
      .select("body > *")
      .text()
      .replaceAll("\\n", "\n")
      .replaceAll("\n ", "\n");
  }
}
