// Port of lib-multisrc/madara/.../MadaraBase.kt @ d9420cd1.
//
// Differences from upstream, because the host contract has no `memo` on SManga/SChapter:
// - Manga URLs are paths (`/manga/<slug>/`), as Madara used before lib 1.6, instead of the post ID
//   plus a memo. A numeric (post ID) URL from older data still opens through `/?p=<id>`.
// - Chapter URLs are paths (`/manga/<slug>/<chapter>/`) instead of the chapter slug plus a memo.
// - Related manga (`fetchRelatedMangaList`) is not in the contract, so it is not ported.
// Kotlin `open val`s are getters, so a site overrides them without initialisation-order problems.
import {
  cryptoJsDecrypt,
  type Document,
  type Element,
  Fetch,
  FilterDataCache,
  type FilterList,
  FormBody,
  type Headers,
  type HttpUrl,
  type ImageRequest,
  KeiSource,
  log,
  Page,
  parseDate,
  type Response,
  SChapter,
  SManga,
  SMangaUpdate,
  substringAfter,
  substringAfterLast,
  substringBefore,
  substringBeforeLast,
  toHttpUrl,
  urlWithoutDomain,
  base64Decode,
} from "@sdk";
import type { GenreRoute } from "./filters";
import { intlFor } from "./intl";

export enum ChapterMode {
  /** Chapters are in the manga page. */
  MangaPage = "MangaPage",
  /** POST admin-ajax.php `action=manga_get_chapters`. */
  AdminAjax = "AdminAjax",
  /** POST `<manga>/ajax/chapters/`. */
  MangaAjax = "MangaAjax",
  /** POST `<manga>/ajax/chapters/?t=<page>` until a page repeats or 404s. */
  MangaAjaxPaginated = "MangaAjaxPaginated",
  /** POST index.php `maction=get_chapters`. */
  MangaAjaxQuery = "MangaAjaxQuery",
}

export interface SearchCard {
  title: string;
  path: string;
  thumbnail: string | null;
}

const GENERIC_URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/;
const IMAGE_DESCRIPTOR_REGEX = /^(\d+|\d+\.\d+)[wx]$/;

// Keywords must not be preceded by a letter, otherwise "ay" matches inside "mayıs", "may" and "days".
const wordRegex = (...words: string[]) =>
  new RegExp(`(?<!\\p{L})(?:${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "u");
const YEAR_WORDS = wordRegex("year", "año", "ano", "năm", "yıl", "سنة", "سنوات");
const MONTH_WORDS = wordRegex("month", "mes", "tháng", "ay", "شهر", "أشهر", "شهور");
const WEEK_WORDS = wordRegex("week", "semana", "tuần", "hafta", "أسبوع", "أسابيع");
const DAY_WORDS = wordRegex("day", "día", "dia", "jour", "hari", "gün", "ngày", "giorni", "أيام", "天");
const HOUR_WORDS = wordRegex("hour", "hora", "heure", "jam", "saat", "giờ", "ore", "ساعة", "ساعات", "小时");
const MINUTE_WORDS = wordRegex("minute", "minuto", "min", "menit", "dakika", "phút", "دقيقة", "دقائق");
const SECOND_WORDS = wordRegex("second", "segundo", "sec", "detik", "giây", "ثانية", "ثوان");
const ARABIC_DUALS: [string, string][] = [
  ["ثانيتين", "2 ثوان"],
  ["دقيقتين", "2 دقائق"],
  ["ساعتين", "2 ساعات"],
  ["يومين", "2 أيام"],
  ["أسبوعين", "2 أسابيع"],
  ["شهرين", "2 أشهر"],
  ["سنتين", "2 سنوات"],
];

const isDigits = (text: string) => /^\d+$/.test(text);
const lastPathSegment = (path: string) => substringAfterLast(path.replace(/\/+$/, ""), "/");

/** Midnight UTC of the local calendar day `millis` falls on (upstream parses `LocalDate` at UTC). */
function utcMidnight(millis: number): number {
  if (millis === 0) return 0;
  const date = new Date(millis);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export abstract class MadaraBase extends KeiSource {
  // Options a site overrides.

  protected get supportsPostId(): boolean {
    return true;
  }

  protected get chapterMode(): ChapterMode {
    return ChapterMode.MangaPage;
  }

  protected get mangaSubString(): string {
    return "manga";
  }

  protected get genreDirectory(): string {
    return "manga-genre";
  }

  protected get filterNonMangaItems(): boolean {
    return true;
  }

  protected get sendViewCount(): boolean {
    return true;
  }

  private intlCache: ReturnType<typeof intlFor> | null = null;

  protected get intl() {
    this.intlCache ??= intlFor(this.lang);
    return this.intlCache;
  }

  protected get statusFilterOptions(): [string, string][] {
    return [
      [this.intl.get("status_filter_completed"), "end"],
      [this.intl.get("status_filter_ongoing"), "on-going"],
      [this.intl.get("status_filter_canceled"), "canceled"],
      [this.intl.get("status_filter_on_hold"), "on-hold"],
    ];
  }

  protected get orderByFilterOptions(): [string, string][] {
    return [
      [this.intl.get("order_by_filter_relevance"), ""],
      [this.intl.get("order_by_filter_latest"), "latest"],
      [this.intl.get("order_by_filter_az"), "alphabet"],
      [this.intl.get("order_by_filter_rating"), "rating"],
      [this.intl.get("order_by_filter_trending"), "trending"],
      [this.intl.get("order_by_filter_views"), "views"],
      [this.intl.get("order_by_filter_new"), "new-manga"],
    ];
  }

  protected get genreConditionFilterOptions(): [string, string][] {
    return [
      [this.intl.get("genre_condition_filter_or"), ""],
      [this.intl.get("genre_condition_filter_and"), "1"],
    ];
  }

  protected get adultFilterOptions(): [string, string][] {
    return [
      [this.intl.get("adult_content_filter_all"), ""],
      [this.intl.get("adult_content_filter_none"), "0"],
      [this.intl.get("adult_content_filter_only"), "1"],
    ];
  }

  protected get xhrHeaders(): Headers {
    return { ...this.headers, "X-Requested-With": "XMLHttpRequest" };
  }

  // Selectors a site overrides.

  protected archiveSelector(): string {
    return "div.page-item-detail, .manga__item, .c-tabs-item__content";
  }

  protected searchCardSelector(): string {
    return ".c-tabs-item__content";
  }

  protected get archiveTitleSelector(): string | null {
    return null;
  }

  protected get archiveUrlSelector(): string {
    return ".post-title a";
  }

  protected get mangaDetailsSelectorTitle(): string {
    return "div.post-title h3, div.post-title h1, #manga-title > h1";
  }

  protected get mangaDetailsSelectorAuthor(): string {
    return "div.author-content > a, div.manga-authors > a";
  }

  protected get mangaDetailsSelectorArtist(): string {
    return "div.artist-content > a";
  }

  protected get mangaDetailsSelectorStatus(): string {
    return "div.summary-content, div.summary-heading:contains(Status) + div";
  }

  protected get mangaDetailsSelectorDescription(): string {
    return "div.description-summary div.summary__content, div.summary_content div.post-content_item > h5 + div, div.summary_content div.manga-excerpt";
  }

  protected get mangaDetailsSelectorThumbnail(): string {
    return "div.summary_image img";
  }

  protected get mangaDetailsSelectorGenre(): string {
    return "div.genres-content a";
  }

  protected get mangaDetailsSelectorTag(): string {
    return "div.tags-content a";
  }

  protected get seriesTypeSelector(): string {
    return ".post-content_item:contains(Type) .summary-content";
  }

  protected get altNameSelector(): string {
    return ".post-content_item:contains(Alt) .summary-content";
  }

  protected get updatingRegex(): RegExp {
    return /Updating|Atualizando/i;
  }

  protected chapterListSelector(): string {
    return "li.wp-manga-chapter";
  }

  protected get chapterNameSelector(): string | null {
    return null;
  }

  protected get chapterUrlSelector(): string {
    return "a";
  }

  protected get chapterDateSelector(): string {
    return "span.chapter-release-date";
  }

  protected get pageListParseSelector(): string {
    return "div.page-break, li.blocks-gallery-item, .reading-content .text-left:not(:has(.blocks-gallery-item))";
  }

  protected get filterGenresSelector(): string {
    return "div.genres";
  }

  /** A `parseDate` pattern (upstream: `DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH)`). */
  protected get chapterDateFormat(): string {
    return "MMMM d, yyyy";
  }

  // Filter data (genres), fetched in the background and kept in settings.

  protected readonly filterData = new FilterDataCache<GenreRoute[]>(this, () => this.fetchFilterData());

  protected async fetchFilterData(): Promise<GenreRoute[]> {
    const document = (await this.client.get(`${this.baseUrl}/${this.mangaSubString}/`, Fetch.DOCUMENT)).asJsoup();
    const seen = new Set<string>();
    const routes: GenreRoute[] = [];
    for (const element of document.select(this.filterGenresSelector).select(`a[href*='/${this.genreDirectory}/']`)) {
      const href = element.attr("abs:href");
      const name = element.text();
      if (!href || !name) continue;
      const path = toHttpUrl(href).encodedPath;
      const slug = lastPathSegment(path);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      routes.push({ name, slug, path });
    }
    return routes;
  }

  override getFilterList(): FilterList {
    return this.getFilterListFromData(this.filterData.read() ?? []);
  }

  protected abstract getFilterListFromData(genres: GenreRoute[]): FilterList;

  // Manga

  protected override async getMangaByUrl(url: HttpUrl): Promise<SManga | null> {
    if (url.host !== toHttpUrl(this.baseUrl).host) return null;
    const document = (await this.client.get(url, Fetch.DOCUMENT)).asJsoup();
    const manga = this.parseDetails(document);
    manga.initialized = true;
    return manga;
  }

  override getMangaUrl(manga: SManga): string {
    return isDigits(manga.url) ? `${this.baseUrl}/?p=${manga.url}` : toHttpUrl(this.baseUrl).resolve(manga.url)?.toString() ?? this.baseUrl + manga.url;
  }

  async fetchMangaUpdate(manga: SManga, chapters: SChapter[], _fetchDetails: boolean, fetchChapters: boolean): Promise<SMangaUpdate> {
    const document = (await this.client.get(this.getMangaUrl(manga), Fetch.DOCUMENT)).asJsoup();
    this.enqueueViewCount(document);
    const mangaPath = toHttpUrl(document.location()).encodedPath;
    const updated = this.parseDetails(document);
    const updatedChapters = fetchChapters ? await this.fetchChapters(mangaPath, document) : chapters;
    return new SMangaUpdate(updated, updatedChapters);
  }

  protected parseDetails(document: Document): SManga {
    const manga = SManga.create();
    manga.url = urlWithoutDomain(document.location());
    manga.title = document.expectFirst(this.mangaDetailsSelectorTitle).ownText();
    const people = (selector: string) =>
      document
        .select(selector)
        .eachText()
        .filter((name) => !this.isUpdating(name))
        .join(", ") || null;
    manga.author = people(this.mangaDetailsSelectorAuthor);
    manga.artist = people(this.mangaDetailsSelectorArtist);
    const descriptionElement = document.selectFirst(this.mangaDetailsSelectorDescription);
    if (descriptionElement) {
      const paragraphs = descriptionElement.select("p");
      manga.description = paragraphs.isNotEmpty() ? paragraphs.map((p) => p.text()).join("\n\n") : descriptionElement.text();
    }
    const alternative = document.selectFirst(this.altNameSelector)?.ownText();
    if (alternative && !this.isUpdating(alternative)) {
      manga.description = [manga.description, `${this.intl.get("alt_names_heading")} ${alternative}`].filter((part) => part !== null).join("\n\n");
    }
    const thumbnail = document.selectFirst(this.mangaDetailsSelectorThumbnail);
    manga.thumbnail_url = thumbnail ? this.processThumbnail(this.imageFromElement(thumbnail)) : null;
    manga.status = this.toStatus(document.select(this.mangaDetailsSelectorStatus).last()?.text() ?? "");
    const genres = [
      ...document.select(this.mangaDetailsSelectorGenre).map((element) => element.text()),
      ...document.select(this.mangaDetailsSelectorTag).eachText(),
    ];
    const type = document.selectFirst(this.seriesTypeSelector)?.text();
    if (type) genres.push(type);
    const seen = new Set<string>();
    manga.genre = genres.filter((genre) => !seen.has(genre.toLowerCase()) && seen.add(genre.toLowerCase())).join(", ") || null;
    return manga;
  }

  // Chapters

  protected async fetchChapters(mangaPath: string, mangaPage: Document): Promise<SChapter[]> {
    switch (this.chapterMode) {
      case ChapterMode.MangaPage:
        return this.parseChapterList(mangaPage);
      case ChapterMode.AdminAjax: {
        const id = this.mangaId(mangaPage);
        if (!id) throw new Error(`No Madara post ID on ${mangaPage.location()}`);
        const body = new FormBody().add("action", "manga_get_chapters").add("manga", id).build();
        const response = await this.client.post(`${this.baseUrl}/wp-admin/admin-ajax.php`, body, {
          headers: this.xhrHeaders,
          fetch: Fetch.XHR.from(this.baseUrl + mangaPath),
        });
        return this.parseChapterList(response.asJsoup());
      }
      case ChapterMode.MangaAjax: {
        const response = await this.client.post(this.chapterAjaxUrl(mangaPath), new FormBody().build(), {
          headers: this.xhrHeaders,
          fetch: Fetch.XHR.from(this.baseUrl + mangaPath),
        });
        return this.parseChapterList(response.asJsoup());
      }
      case ChapterMode.MangaAjaxPaginated:
        return this.fetchPaginatedChapters(mangaPath);
      case ChapterMode.MangaAjaxQuery: {
        const body = new FormBody().add("manga-core", lastPathSegment(mangaPath)).add("manga_ajax", "1").add("maction", "get_chapters").build();
        const response = await this.client.post(`${this.baseUrl}/index.php`, body, {
          headers: this.xhrHeaders,
          fetch: Fetch.XHR.from(this.baseUrl + mangaPath),
        });
        return this.parseChapterList(response.asJsoup());
      }
    }
  }

  private async fetchPaginatedChapters(mangaPath: string): Promise<SChapter[]> {
    const result: SChapter[] = [];
    let lastUrl: string | null = null;
    for (let page = 1; ; page++) {
      const response: Response = await this.client.post(`${this.chapterAjaxUrl(mangaPath)}?t=${page}`, new FormBody().build(), {
        headers: this.xhrHeaders,
        fetch: Fetch.XHR.from(this.baseUrl + mangaPath),
        ensureSuccess: false,
      });
      if (response.code === 404) return result;
      if (!response.isSuccessful) throw new Error(`HTTP ${response.code} from ${response.url}`);
      const chapters = this.parseChapterList(response.asJsoup());
      if (chapters.length === 0 || chapters[chapters.length - 1].url === lastUrl) break;
      result.push(...chapters);
      lastUrl = chapters[chapters.length - 1].url;
    }
    return result;
  }

  private chapterAjaxUrl(mangaPath: string): string {
    return `${this.baseUrl}${mangaPath.replace(/\/+$/, "")}/ajax/chapters/`;
  }

  protected parseChapterList(document: Document): SChapter[] {
    return document
      .select(this.chapterListSelector())
      .map((element) => this.chapterFromElement(element))
      .filter((chapter): chapter is SChapter => chapter !== null);
  }

  protected chapterFromElement(element: Element): SChapter | null {
    const link = element.selectFirst(this.chapterUrlSelector);
    const href = link?.attr("abs:href");
    if (!link || !href) return null;
    const chapter = SChapter.create();
    chapter.url = toHttpUrl(href).encodedPath;
    const nameSelector = this.chapterNameSelector;
    chapter.name = (nameSelector ? element.selectFirst(nameSelector)?.text() : null) ?? link.text();
    chapter.date_upload = this.parseChapterDate(
      element.selectFirst("img:not(.thumb)")?.attr("alt") ||
        element.selectFirst("span a")?.attr("title") ||
        element.selectFirst(this.chapterDateSelector)?.text() ||
        null,
    );
    return chapter;
  }

  override getChapterUrl(chapter: SChapter): string {
    // Upstream (lib 1.6) stores only the chapter slug plus a memo the host contract does not carry.
    if (!chapter.url.startsWith("/") && !/^https?:/.test(chapter.url)) throw new Error("Refresh the chapter list.");
    return toHttpUrl(this.baseUrl).resolve(chapter.url)?.toString() ?? this.baseUrl + chapter.url;
  }

  // Pages

  async getPageList(chapter: SChapter): Promise<Page[]> {
    const chapterUrl = this.getChapterUrl(chapter);
    const first = await this.fetchChapterDocument(chapterUrl);
    const document =
      first.selectFirst("#single-pager") !== null
        ? (await this.client.get(toHttpUrl(chapterUrl).newBuilder().addQueryParameter("style", "list").build(), Fetch.DOCUMENT)).asJsoup()
        : first;
    this.enqueueViewCount(document);
    return this.parsePages(document);
  }

  protected async fetchChapterDocument(chapterUrl: string): Promise<Document> {
    return (await this.client.get(chapterUrl, Fetch.DOCUMENT)).asJsoup();
  }

  protected parsePages(document: Document): Page[] {
    const protector = document.selectFirst("#chapter-protector-data");
    if (!protector) {
      const pages: Page[] = [];
      document.select(this.pageListParseSelector).forEach((element, index) => {
        const img = element.selectFirst("img");
        const url = img ? this.imageFromElement(img) : null;
        if (url) pages.push(new Page(index, document.location(), url));
      });
      return pages;
    }
    const src = protector.attr("src");
    const script = src.startsWith("data:text/javascript;base64,") ? (base64Decode(substringAfter(src, ",")) ?? "") : protector.html();
    const password = substringBefore(substringAfter(script, "wpmangaprotectornonce='"), "';");
    const encrypted = substringBefore(substringAfter(script, "chapter_data='"), "';").replace(/\\\//g, "/");
    const data = JSON.parse(encrypted) as { ct: string; s: string };
    const raw = cryptoJsDecrypt(data.ct, password, data.s);
    const images = JSON.parse(JSON.parse(raw) as string) as string[];
    return images.map((image, index) => new Page(index, document.location(), image));
  }

  override getImageRequest(page: Page): ImageRequest {
    const request = super.getImageRequest(page) as ImageRequest; // the base is synchronous
    return { ...request, headers: { ...request.headers, Referer: page.url } };
  }

  /** Tells the site about the view, as upstream does; never fails the call. */
  private enqueueViewCount(document: Document): void {
    if (!this.sendViewCount) return;
    let data: Record<string, unknown>;
    try {
      const script = document.selectFirst("script#wp-manga-js-extra")?.data() ?? "";
      const json = substringBeforeLast(substringAfter(script, "var manga = ", ""), ";");
      if (!json.trim()) return;
      data = JSON.parse(json) as Record<string, unknown>;
    } catch {
      return;
    }
    if (String(data.enable_manga_view) !== "1") return;
    const mangaId = data.manga_id ? String(data.manga_id) : "";
    if (!mangaId) return;
    const body = new FormBody().add("action", "manga_views").add("manga", mangaId);
    if (data.chapter_slug) body.add("chapter", String(data.chapter_slug));
    if (data.nonce) body.add("nonce", String(data.nonce));
    this.client
      .post(`${this.baseUrl}/wp-admin/admin-ajax.php`, body.build(), {
        headers: { ...this.headers, Referer: document.location() },
        fetch: Fetch.XHR,
      })
      .catch((error: unknown) => {
        try {
          log.debug(`${this.name}: view count not sent: ${String(error)}`);
        } catch {
          // No host.
        }
      });
  }

  // Archive cards

  protected postId(element: Element): string | null {
    return element.selectFirst("[data-post-id]")?.attr("data-post-id") ?? null;
  }

  protected parseArchive(document: Document): SManga[] {
    return document
      .select(this.archiveSelector())
      .map((element) => this.archiveManga(element))
      .filter((manga): manga is SManga => manga !== null);
  }

  protected archiveManga(element: Element): SManga | null {
    const link = element.selectFirst(this.archiveUrlSelector);
    const href = link?.attr("abs:href");
    if (!link || !href) return null;
    const manga = SManga.create();
    manga.url = toHttpUrl(href).encodedPath;
    const titleSelector = this.archiveTitleSelector;
    manga.title = (titleSelector ? element.selectFirst(titleSelector)?.text() : null) ?? link.text();
    const img = element.selectFirst("img");
    manga.thumbnail_url = img ? this.processThumbnail(this.imageFromElement(img), true) : null;
    return manga;
  }

  protected parseSearchCards(document: Document): SearchCard[] {
    const cards: SearchCard[] = [];
    for (const element of document.select(this.searchCardSelector())) {
      const link = element.selectFirst(this.archiveUrlSelector);
      const href = link?.attr("abs:href");
      if (!link || !href) continue;
      const titleSelector = this.archiveTitleSelector;
      const img = element.selectFirst("img");
      cards.push({
        title: (titleSelector ? element.selectFirst(titleSelector)?.text() : null) ?? link.text(),
        path: toHttpUrl(href).encodedPath,
        thumbnail: img ? this.processThumbnail(this.imageFromElement(img), true) : null,
      });
    }
    return cards;
  }

  protected imageFromElement(element: Element): string | null {
    if (element.hasAttr("data-src")) return element.attr("abs:data-src");
    if (element.hasAttr("data-lazy-src")) return element.attr("abs:data-lazy-src");
    if (element.hasAttr("data-lzl-src")) return element.attr("abs:data-lzl-src");
    if (element.hasAttr("data-cfsrc")) return element.attr("abs:data-cfsrc");
    if (element.hasAttr("data-manga-src")) return element.attr("abs:data-manga-src");
    if (element.hasAttr("srcset")) return this.getSrcSetImage(element.attr("abs:srcset"));
    return element.attr("abs:src");
  }

  protected processThumbnail(url: string | null, _fromSearch = false): string | null {
    return url;
  }

  protected getSrcSetImage(srcset: string): string | null {
    const images = srcset
      .split(",")
      .map((candidate) => candidate.trim().split(/\s+/, 2))
      .filter((candidate) => candidate.length > 0 && GENERIC_URL_REGEX.test(candidate[0]));
    let best: [string, number] | null = null;
    for (const candidate of images) {
      const match = candidate[1] ? IMAGE_DESCRIPTOR_REGEX.exec(candidate[1]) : null;
      const size = match ? Number.parseFloat(match[1]) : Number.NaN;
      if (!Number.isNaN(size) && (best === null || size > best[1])) best = [candidate[0], size];
    }
    if (best) return best[0];
    return images.map((candidate) => candidate[0]).sort().at(-1) ?? null;
  }

  protected mangaId(document: Document): string | null {
    const nonBlank = (value: string | undefined) => (value && value.trim() ? value : null);
    return (
      nonBlank(document.selectFirst("[id^=manga-chapters-holder]")?.attr("data-id")) ??
      nonBlank(document.selectFirst("input.rating-post-id")?.attr("value")) ??
      nonBlank(document.selectFirst("a[data-post]")?.attr("data-post")) ??
      (() => {
        const href = document.selectFirst("link[rel=shortlink]")?.attr("href") ?? "";
        return href.includes("?p=") ? nonBlank(substringBefore(substringAfter(href, "?p="), "&")) : null;
      })()
    );
  }

  // Status and dates

  protected get completedStatus(): string[] {
    return ["completed", "completo", "completado", "concluído", "concluido", "finalizado", "achevé", "terminé", "hoàn thành", "مكتملة", "مكتمل", "已完结", "tamamlandı", "đã hoàn thành", "завершено", "tamamlanan", "complété"];
  }

  protected get ongoingStatus(): string[] {
    return [
      "ongoing", "on going", "updating", "продолжается", "em lançamento", "em andamento", "en cours", "ativo", "lançando", "đang tiến hành", "còn nữa",
      "devam ediyor", "in corso", "in arrivo", "مستمرة", "مستمر", "en curso", "emision", "curso", "en marcha", "publicandose", "publicándose", "en emision",
      "连载中", "đang làm", "em postagem", "devam eden", "em progresso", "atualizações semanais", "виходить", "đang ra",
    ];
  }

  protected get hiatusStatus(): string[] {
    return ["on hold", "hiatus", "pausado", "en espera", "durduruldu", "beklemede", "đang chờ", "متوقف", "en pause", "заморожено", "en attente", "tạm dừng"];
  }

  protected get cancelledStatus(): string[] {
    return ["canceled", "cancelled", "cancelado", "iptal edildi", "đã hủy", "ملغي", "abandonné", "заброшено", "annulé"];
  }

  protected toStatus(text: string): number {
    const lower = text.toLowerCase();
    const has = (words: string[]) => words.some((word) => lower.includes(word.toLowerCase()));
    if (has(this.completedStatus)) return SManga.COMPLETED;
    if (has(this.ongoingStatus)) return SManga.ONGOING;
    if (has(this.hiatusStatus)) return SManga.ON_HIATUS;
    if (has(this.cancelledStatus)) return SManga.CANCELLED;
    return SManga.UNKNOWN;
  }

  protected parseChapterDate(date: string | null): number {
    if (date === null) return 0;
    let value = date;
    for (const [dual, replacement] of ARABIC_DUALS) value = value.replace(dual, replacement);
    const normalized = value.toLowerCase();
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (["today", "hoje", "hoy"].some((word) => normalized.startsWith(word))) return todayUtc;
    if (["yesterday", "ontem", "ayer", "يوم واحد"].some((word) => normalized.startsWith(word))) return todayUtc - 86_400_000;
    const amount = /\d+/.exec(normalized)?.[0];
    if (amount !== undefined) {
      const n = Number(amount);
      const ago = new Date(now.getTime());
      if (YEAR_WORDS.test(normalized)) return ago.setUTCFullYear(ago.getUTCFullYear() - n);
      if (MONTH_WORDS.test(normalized)) return ago.setUTCMonth(ago.getUTCMonth() - n);
      if (WEEK_WORDS.test(normalized)) return now.getTime() - n * 7 * 86_400_000;
      if (DAY_WORDS.test(normalized)) return now.getTime() - n * 86_400_000;
      if (HOUR_WORDS.test(normalized)) return now.getTime() - n * 3_600_000;
      if (MINUTE_WORDS.test(normalized)) return now.getTime() - n * 60_000;
      if (SECOND_WORDS.test(normalized)) return now.getTime() - n * 1000;
    }
    return utcMidnight(parseDate(value, this.chapterDateFormat));
  }

  protected isUpdating(value: string): boolean {
    return this.updatingRegex.test(value);
  }
}
