// Port of lib-multisrc/mangathemesia/.../MangaThemesia.kt @ d9420cd1 (formerly WPMangaStream and
// WPMangaReader). Kotlin `open val`s are getters, so a site overrides them safely.
//
// Differences from upstream: the post ID for the view counter is read from the page each time
// (upstream keeps it in `memo`, which the host contract does not carry); related manga and the
// image Accept-header interceptor are not ported (the app sends browser image headers itself);
// dates are parsed in English (`parseDate`), so non-English month names need `parseChapterDate`.
import {
  base64Decode,
  type Document,
  type Element,
  type Elements,
  Fetch,
  FilterDataCache,
  type FilterList,
  FormBody,
  Group,
  Header,
  type HttpUrl,
  type HttpUrlBuilder,
  KeiSource,
  log,
  MangasPage,
  Page,
  parseDate,
  SChapter,
  SManga,
  SMangaUpdate,
  Separator,
  substringAfter,
  Text,
  toHttpUrl,
  TriState,
  ValueSelect,
  ValueTriState,
} from "@sdk";
import { intlFor } from "./intl";

const MANGA_PAGE_ID_REGEX = /(?:post_id["']?\s*:\s*|ts_dynamic_ajax_view\D*|tsUpdateView\D*)(\d+)/;
const CHAPTER_PAGE_ID_REGEX = /chapter_id\s*=\s*(\d+);/;
export const JSON_IMAGE_LIST_REGEX = /["']?(?:images|imageUrls)["']?\s*[:=]\s*(\[.*?])/;
const ALT_NAME_SEPARATOR = /[|/•,;]/;

// Filters

export class AuthorFilter extends Text {}

export class YearFilter extends Text {}

/** Upstream's `SelectFilter(displayName, vals, defaultValue)`. */
export class SelectFilter extends ValueSelect {}

export class StatusFilter extends SelectFilter {}

export class TypeFilter extends SelectFilter {}

export class OrderByFilter extends SelectFilter {}

export class ProjectFilter extends SelectFilter {}

export interface GenreData {
  name: string;
  value: string;
  state?: number;
}

export class Genre extends ValueTriState {}

export class GenreListFilter extends Group<Genre> {}

export abstract class MangaThemesia extends KeiSource {
  protected get mangaUrlDirectory(): string {
    return "/manga";
  }

  /** A `parseDate` pattern. */
  protected get datePattern(): string {
    return "MMMM d, yyyy";
  }

  protected get projectPageString(): string {
    return "/project";
  }

  /** Set to false to stop reporting views to the site through admin-ajax.php. */
  protected get sendViewCount(): boolean {
    return true;
  }

  protected get hasProjectPage(): boolean {
    return false;
  }

  private intlCache: ReturnType<typeof intlFor> | null = null;

  protected get intl() {
    this.intlCache ??= intlFor(this.lang);
    return this.intlCache;
  }

  // Popular and latest are searches with an order and nothing else.

  protected get popularFilter(): FilterList {
    return [new OrderByFilter("", this.orderByFilterOptions, "popular")];
  }

  protected get latestFilter(): FilterList {
    return [new OrderByFilter("", this.orderByFilterOptions, "update")];
  }

  getPopularManga(page: number): Promise<MangasPage> {
    return this.getSearchMangaList(page, "", this.popularFilter);
  }

  getLatestUpdates(page: number): Promise<MangasPage> {
    return this.getSearchMangaList(page, "", this.latestFilter);
  }

  // Search

  protected override async getMangaByUrl(url: HttpUrl): Promise<SManga | null> {
    if (url.host !== toHttpUrl(this.baseUrl).host) return null;
    const manga = SManga.create();
    manga.url = url.encodedPath;
    const details = await this.getMangaDetails(manga);
    return details.title ? details : null;
  }

  protected searchMangaUrl(page: number, query: string, filters: FilterList = []): HttpUrlBuilder {
    const url = toHttpUrl(this.baseUrl).newBuilder();
    url.addPathSegment(this.mangaUrlDirectory.slice(1));
    if (query) url.addQueryParameter("title", query);
    url.addQueryParameter("page", String(page));
    for (const filter of filters) {
      if (filter instanceof StatusFilter) url.addQueryParameter("status", filter.selectedValue());
      else if (filter instanceof TypeFilter) url.addQueryParameter("type", filter.selectedValue());
      else if (filter instanceof OrderByFilter) url.addQueryParameter("order", filter.selectedValue());
      else if (filter instanceof GenreListFilter) {
        for (const genre of filter.state) {
          if (genre.state !== TriState.STATE_IGNORE) {
            url.addQueryParameter("genre[]", genre.state === TriState.STATE_EXCLUDE ? `-${genre.value}` : genre.value);
          }
        }
      } else if (filter instanceof AuthorFilter) {
        if (filter.state) url.addQueryParameter("author", filter.state);
      } else if (filter instanceof YearFilter) {
        if (filter.state) url.addQueryParameter("yearx", filter.state);
      } else if (filter instanceof ProjectFilter) {
        // If the site has a project page; hasProjectPage defaults to false.
        if (filter.selectedValue() === "project-filter-on") url.setPathSegment(0, this.projectPageString.slice(1));
      }
    }
    url.addPathSegment("");
    return url;
  }

  async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    const url = this.searchMangaUrl(page, query, filters);
    return this.searchMangaParse((await this.client.get(url.build(), Fetch.DOCUMENT)).asJsoup());
  }

  protected searchMangaParse(document: Document): MangasPage {
    const mangas = document.select(this.searchMangaSelector()).map((element) => this.searchMangaFromElement(element));
    const nextSelector = this.searchMangaNextPageSelector();
    const hasNextPage = nextSelector !== null && document.select(nextSelector).first() !== null;
    return new MangasPage([...mangas], hasNextPage);
  }

  protected searchMangaSelector(): string {
    return ".utao .uta .imgu, .listupd .bs .bsx, .listo .bs .bsx";
  }

  protected searchMangaFromElement(element: Element): SManga {
    const manga = SManga.create();
    manga.thumbnail_url = this.imgAttrOf(element.select("img"));
    manga.title = element.select("a").attr("title");
    manga.setUrlWithoutDomain(element.select("a").attr("href"));
    return manga;
  }

  protected searchMangaNextPageSelector(): string | null {
    return "div.pagination .next, div.hpage .r";
  }

  // Details and chapters

  async fetchMangaUpdate(manga: SManga): Promise<SMangaUpdate> {
    const document = (await this.client.get(this.getMangaUrl(manga), Fetch.DOCUMENT)).asJsoup();
    this.sendView(this.postId(document));
    return new SMangaUpdate(this.mangaDetailsParse(document), this.chapterListParse(document));
  }

  private static selector(selector: string, contains: string[]): string {
    return contains.map((text) => selector.replaceAll("%s", text)).join(", ");
  }

  protected get seriesDetailsSelector(): string {
    return "div.bigcontent, div.animefull, div.main-info, div.postbody";
  }

  protected get seriesTitleSelector(): string {
    return ".entry-title, .ts-breadcrumb li:last-child span";
  }

  protected get seriesArtistSelector(): string {
    return MangaThemesia.selector(
      ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .fmed b:contains(%s)+span, span:contains(%s)",
      ["artist", "Artiste", "Artista", "الرسام", "الناشر", "İllüstratör", "Çizer", "Sanatçı", "นักวาด"],
    );
  }

  protected get seriesAuthorSelector(): string {
    return MangaThemesia.selector(
      ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .fmed b:contains(%s)+span, span:contains(%s)",
      ["Author", "Auteur", "autor", "المؤلف", "Mangaka", "seniman", "Pengarang", "Yazar", "ผู้แต่ง", "นักเขียน"],
    );
  }

  protected get seriesDescriptionSelector(): string {
    return ".desc, .entry-content[itemprop=description]";
  }

  protected get seriesAltNameSelector(): string {
    return (
      ".alternative, .wd-full:contains(alt) span, .alter, .seriestualt, " +
      MangaThemesia.selector(".infotable tr:contains(%s) td:last-child", ["Alternative", "Alternatif", "الأسماء الثانوية"])
    );
  }

  protected get seriesGenreSelector(): string {
    return "div.gnr a, .mgen a, .seriestugenre a, " + MangaThemesia.selector("span:contains(%s)", ["genre", "التصنيف"]);
  }

  protected get seriesTypeSelector(): string {
    return (
      MangaThemesia.selector(
        ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .tsinfo .imptdt:contains(%s) a, .fmed b:contains(%s)+span, span:contains(%s) a",
        ["type", "ประเภท", "النوع", "tipe", "Türü"],
      ) + ", a[href*=type\\=]"
    );
  }

  protected get seriesStatusSelector(): string {
    return MangaThemesia.selector(
      ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .fmed b:contains(%s)+span span:contains(%s)",
      ["status", "Statut", "Durum", "連載状況", "Estado", "الحالة", "حالة العمل", "สถานะ", "stato", "Statüsü"],
    );
  }

  protected get seriesThumbnailSelector(): string {
    return ".infomanga > div[itemprop=image] img, .thumb img";
  }

  protected get altNamePrefix(): string {
    return `${this.intl.get("alt_names_heading")} `;
  }

  async getMangaDetails(manga: SManga): Promise<SManga> {
    return this.mangaDetailsParse((await this.client.get(this.getMangaUrl(manga), Fetch.DOCUMENT)).asJsoup());
  }

  protected mangaDetailsParse(document: Document): SManga {
    const manga = SManga.create();
    manga.setUrlWithoutDomain(document.location());
    const details = document.selectFirst(this.seriesDetailsSelector);
    if (!details) return manga;
    manga.title = details.expectFirst(this.seriesTitleSelector).text();
    manga.artist = this.removeEmptyPlaceholder(details.selectFirst(this.seriesArtistSelector)?.ownText());
    manga.author = this.removeEmptyPlaceholder(details.selectFirst(this.seriesAuthorSelector)?.ownText());
    const description = details.selectFirst(this.seriesDescriptionSelector)?.text();
    manga.description = description ? description : null;
    const altName = details.selectFirst(this.seriesAltNameSelector)?.ownText();
    if (altName && altName.trim()) {
      const names = altName
        .split(ALT_NAME_SEPARATOR)
        .map((name) => `- ${name.trim()}`)
        .join("\n");
      manga.description = (manga.description ? `${manga.description}\n\n` : "") + `${this.altNamePrefix}\n${names}`.trim();
    }
    const genres = details.select(this.seriesGenreSelector).map((element) => element.text());
    const type = details.selectFirst(this.seriesTypeSelector)?.ownText();
    if (type && type.trim()) genres.push(type);
    manga.genre = genres
      .map((genre) => {
        const lower = genre.toLocaleLowerCase(this.lang);
        return (lower.charAt(0).toLocaleUpperCase(this.lang) + lower.slice(1)).trim();
      })
      .join(", ");
    manga.status = this.parseStatus(details.selectFirst(this.seriesStatusSelector)?.text() ?? null);
    manga.thumbnail_url = this.imgAttrOf(details.select(this.seriesThumbnailSelector));
    return manga;
  }

  protected removeEmptyPlaceholder(value: string | null | undefined): string | null {
    if (!value || !value.trim() || ["-", "N/A", "n/a", "Unknown"].includes(value)) return null;
    return value;
  }

  protected parseStatus(text: string | null): number {
    if (text === null) return SManga.UNKNOWN;
    const lower = text.toLowerCase();
    const has = (words: string[]) => words.some((word) => lower.includes(word.toLowerCase()));
    if (
      has([
        "مستمرة", "en curso", "ongoing", "on going", "new season", "mass released", "ativo", "en cours", "en cours de publication",
        "đang tiến hành", "em lançamento", "онгоінг", "publishing", "devam ediyor", "em andamento", "in corso", "güncel", "berjalan",
        "продолжается", "updating", "lançando", "in arrivo", "emision", "en emision", "مستمر", "curso", "en marcha", "publicandose",
        "publicando", "连载中", "devam etmekte", "連載中",
      ])
    ) {
      return SManga.ONGOING;
    }
    if (
      has([
        "completed", "completo", "complété", "fini", "achevé", "terminé", "tamamlandı", "đã hoàn thành", "hoàn thành", "مكتملة",
        "завершено", "finished", "finalizad", "completata", "one-shot", "bitti", "tamat", "completado", "concluído", "完結",
        "concluido", "已完结", "bitmiş",
      ])
    ) {
      return SManga.COMPLETED;
    }
    if (has(["canceled", "cancelled", "cancelado", "cancellato", "cancelados", "dropped", "discontinued", "abandonné"])) return SManga.CANCELLED;
    if (has(["hiatus", "on hold", "season end", "pausado", "en espera", "en pause", "en attente", "hiato"])) return SManga.ON_HIATUS;
    return SManga.UNKNOWN;
  }

  protected chapterListSelector(): string {
    return "div.bxcl li, div.cl li, #chapterlist li, ul li:has(div.chbox):has(div.eph-num)";
  }

  protected chapterListParse(document: Document): SChapter[] {
    const chapters = document.select(this.chapterListSelector()).map((element) => this.chapterFromElement(element));
    // Give the newest chapter the "Updated On" date when the site shows no chapter dates.
    if (chapters.length > 0 && chapters[0].date_upload === 0) {
      const date = document.select(".listinfo time[itemprop=dateModified], .fmed:contains(update) time, span:contains(update) time").attr("datetime");
      if (date) chapters[0].date_upload = parseDate(date, "yyyy-MM-dd");
    }
    return [...chapters];
  }

  protected chapterFromElement(element: Element): SChapter {
    const chapter = SChapter.create();
    const urlElements = element.select("a");
    chapter.setUrlWithoutDomain(urlElements.attr("href"));
    chapter.name = element.select(".lch a, .chapternum").text() || urlElements.expectFirst("a").text();
    chapter.date_upload = this.parseChapterDate(element.selectFirst(".chapterdate")?.text() ?? null);
    return chapter;
  }

  protected parseChapterDate(date: string | null): number {
    return date ? parseDate(date, this.datePattern) : 0;
  }

  // Pages

  protected get pageSelector(): string {
    return "div#readerarea img";
  }

  async getPageList(chapter: SChapter): Promise<Page[]> {
    const document = (await this.client.get(this.getChapterUrl(chapter), Fetch.DOCUMENT)).asJsoup();
    this.sendView(this.postId(document));
    return this.pageListParse(document);
  }

  protected pageListParse(document: Document): Page[] {
    const htmlPages = document
      .select(this.pageSelector)
      .filter((img) => this.imgAttr(img) !== "")
      .map((img, index) => new Page(index, "", this.imgAttr(img)));
    // Some sites load the pages with a script instead.
    if (htmlPages.length > 0) return htmlPages;
    // "ts_reader.run({" in Base64
    const script = document.selectFirst("script[src^=data:text/javascript;base64,dHNfcmVhZGVyLnJ1bih7]");
    const docString = script ? (base64Decode(substringAfter(script.attr("src"), "base64,")) ?? "") : document.outerHtml();
    const imageListJson = JSON_IMAGE_LIST_REGEX.exec(docString)?.[1] ?? "";
    let imageList: string[] = [];
    try {
      imageList = JSON.parse(imageListJson) as string[];
    } catch {
      imageList = [];
    }
    return imageList.map((url, index) => new Page(index, "", url.startsWith("/") ? this.baseUrl + url : url));
  }

  /** Reports the view to the site, as upstream does; never fails the call. */
  protected sendView(postId: string | null): void {
    if (!this.sendViewCount || !postId) return;
    const body = new FormBody().add("action", "dynamic_view_ajax").add("post_id", postId).build();
    this.client.post(`${this.baseUrl}/wp-admin/admin-ajax.php`, body, Fetch.XHR).catch((error: unknown) => {
      try {
        log.debug(`${this.name}: view not sent: ${String(error)}`);
      } catch {
        // No host.
      }
    });
  }

  protected postId(document: Document): string | null {
    for (const script of document.select("script")) {
      const data = script.data();
      const match = MANGA_PAGE_ID_REGEX.exec(data) ?? CHAPTER_PAGE_ID_REGEX.exec(data);
      if (match) return match[1];
    }
    return null;
  }

  // Filters

  protected get statusOptions(): [string, string][] {
    return [
      [this.intl.get("status_filter_option_all"), ""],
      [this.intl.get("status_filter_option_ongoing"), "ongoing"],
      [this.intl.get("status_filter_option_completed"), "completed"],
      [this.intl.get("status_filter_option_hiatus"), "hiatus"],
      [this.intl.get("status_filter_option_dropped"), "dropped"],
    ];
  }

  protected get typeFilterOptions(): [string, string][] {
    return [
      [this.intl.get("type_filter_option_all"), ""],
      [this.intl.get("type_filter_option_manga"), "Manga"],
      [this.intl.get("type_filter_option_manhwa"), "Manhwa"],
      [this.intl.get("type_filter_option_manhua"), "Manhua"],
      [this.intl.get("type_filter_option_comic"), "Comic"],
    ];
  }

  protected get orderByFilterOptions(): [string, string][] {
    return [
      [this.intl.get("order_by_filter_default"), ""],
      [this.intl.get("order_by_filter_az"), "title"],
      [this.intl.get("order_by_filter_za"), "titlereverse"],
      [this.intl.get("order_by_filter_latest_update"), "update"],
      [this.intl.get("order_by_filter_latest_added"), "latest"],
      [this.intl.get("order_by_filter_popular"), "popular"],
    ];
  }

  protected get projectFilterOptions(): [string, string][] {
    return [
      [this.intl.get("project_filter_all_manga"), ""],
      [this.intl.get("project_filter_only_project"), "project-filter-on"],
    ];
  }

  protected readonly filterData = new FilterDataCache<GenreData[]>(this, () => this.fetchFilterData());

  protected async fetchFilterData(): Promise<GenreData[]> {
    return this.parseGenres((await this.client.get(`${this.baseUrl}${this.mangaUrlDirectory}`, Fetch.DOCUMENT)).asJsoup()) ?? [];
  }

  protected parseGenres(document: Document): GenreData[] | null {
    const list = document.selectFirst("ul.genrez");
    if (!list) return null;
    return list.select("li").map((li) => ({
      name: li.expectFirst("label").text(),
      value: li.expectFirst("input[type=checkbox]").attr("value"),
    }));
  }

  override getFilterList(): FilterList {
    const genres = (this.filterData.read() ?? []).map((genre) => new Genre(genre.name, genre.value, genre.state ?? TriState.STATE_IGNORE));
    const filters: FilterList = [
      new Separator(),
      new AuthorFilter(this.intl.get("author_filter_title")),
      new YearFilter(this.intl.get("year_filter_title")),
      new StatusFilter(this.intl.get("status_filter_title"), this.statusOptions),
      new TypeFilter(this.intl.get("type_filter_title"), this.typeFilterOptions),
      new OrderByFilter(this.intl.get("order_by_filter_title"), this.orderByFilterOptions),
    ];
    if (genres.length > 0) {
      filters.push(new Header(this.intl.get("genre_exclusion_warning")), new GenreListFilter(this.intl.get("genre_filter_title"), genres));
    }
    if (this.hasProjectPage) {
      filters.push(
        new Separator(),
        new Header(this.intl.get("project_filter_warning")),
        new Header(this.intl.format("project_filter_name", this.name)),
        new ProjectFilter(this.intl.get("project_filter_title"), this.projectFilterOptions),
      );
    }
    return filters;
  }

  // Helpers

  protected imgAttr(element: Element): string {
    if (element.hasAttr("data-lazy-src")) return element.attr("abs:data-lazy-src");
    if (element.hasAttr("data-src")) return element.attr("abs:data-src");
    if (element.hasAttr("data-cfsrc")) return element.attr("abs:data-cfsrc");
    return element.attr("abs:src");
  }

  protected imgAttrOf(elements: Elements): string {
    const first = elements.first();
    return first ? this.imgAttr(first) : "";
  }
}
