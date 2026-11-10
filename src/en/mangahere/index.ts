// Port of src/en/mangahere/.../Mangahere.kt @ d9420cd1. Method names follow the original.
import {
  type ClientBuilder,
  defineExtension,
  type Document,
  type Element,
  evaluateIsolated,
  Fetch,
  type FilterList,
  KeiSource,
  MangasPage,
  Page,
  parseDate,
  removePrefix,
  SChapter,
  SManga,
  SMangaUpdate,
  seconds,
  startOfDay,
  substringAfter,
  substringBefore,
  toHttpUrl,
} from "@sdk";
import {
  ArtistFilter,
  AuthorFilter,
  CompletionList,
  completions,
  GenreList,
  genres,
  RatingList,
  ratings,
  TypeList,
  types,
  YearFilter,
} from "./filters";

class Mangahere extends KeiSource {
  readonly name = "Mangahere";
  readonly lang = "en";
  readonly baseUrl = "https://www.mangahere.cc";
  override readonly id = "2";

  protected override configureClient(builder: ClientBuilder): void {
    builder.addCookie(toHttpUrl(this.baseUrl).host, [["isAdult", "1"]]);
    builder.rateLimit(
      1,
      seconds(2),
      (url) => url.host === toHttpUrl(this.baseUrl).host && !url.encodedPath.endsWith("/chapterfun.ashx"),
    );
  }

  // Popular Manga

  async getPopularManga(page: number): Promise<MangasPage> {
    const document = (await this.client.get(`${this.baseUrl}/directory/${page}.htm`, Fetch.DOCUMENT)).asJsoup();
    const mangas = document.select(this.popularMangaSelector()).map((element) => this.popularMangaFromElement(element));
    const hasNextPage = document.selectFirst(this.popularMangaNextPageSelector()) !== null;
    return new MangasPage([...mangas], hasNextPage);
  }

  private popularMangaSelector = () => ".manga-list-1-list li";

  private popularMangaNextPageSelector = () => "div.pager-list-left a:last-child";

  private popularMangaFromElement(element: Element): SManga {
    const manga = SManga.create();
    const titleElement = element.selectFirst("a")!;
    manga.title = titleElement.attr("title");
    manga.setUrlWithoutDomain(titleElement.absUrl("href"));
    manga.thumbnail_url = element.selectFirst("img.manga-list-1-cover")?.absUrl("src") ?? null;
    return manga;
  }

  // Latest Updates

  async getLatestUpdates(page: number): Promise<MangasPage> {
    const document = (await this.client.get(`${this.baseUrl}/directory/${page}.htm?latest`, Fetch.DOCUMENT)).asJsoup();
    const mangas = document.select(this.latestUpdatesSelector()).map((element) => this.popularMangaFromElement(element));
    const hasNextPage = document.selectFirst(this.latestUpdatesNextPageSelector()) !== null;
    return new MangasPage([...mangas], hasNextPage);
  }

  private latestUpdatesSelector = () => ".manga-list-1-list li";

  private latestUpdatesNextPageSelector = () => "div.pager-list-left a:last-child";

  // Search

  async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    const url = toHttpUrl(`${this.baseUrl}/search`).newBuilder();

    for (const filter of filters) {
      if (filter instanceof TypeList) {
        url.addEncodedQueryParameter("type", String(types[filter.values[filter.state]]));
      } else if (filter instanceof CompletionList) {
        url.addEncodedQueryParameter("st", String(filter.state));
      } else if (filter instanceof RatingList) {
        url.addEncodedQueryParameter("rating_method", "gt");
        url.addEncodedQueryParameter("rating", String(filter.state));
      } else if (filter instanceof GenreList) {
        const includeGenres = new Set<number>();
        const excludeGenres = new Set<number>();
        for (const genre of filter.state) {
          if (genre.isIncluded()) includeGenres.add(genre.id);
          if (genre.isExcluded()) excludeGenres.add(genre.id);
        }
        url.addEncodedQueryParameter("genres", [...includeGenres].join(","));
        url.addEncodedQueryParameter("nogenres", [...excludeGenres].join(","));
      } else if (filter instanceof ArtistFilter) {
        url.addEncodedQueryParameter("artist_method", "cw");
        url.addEncodedQueryParameter("artist", filter.state);
      } else if (filter instanceof AuthorFilter) {
        url.addEncodedQueryParameter("author_method", "cw");
        url.addEncodedQueryParameter("author", filter.state);
      } else if (filter instanceof YearFilter) {
        url.addEncodedQueryParameter("released_method", "eq");
        url.addEncodedQueryParameter("released", filter.state);
      }
    }

    url.addEncodedQueryParameter("page", String(page));
    url.addEncodedQueryParameter("title", query);
    url.addEncodedQueryParameter("sort", null);
    url.addEncodedQueryParameter("stype", "1");
    url.addEncodedQueryParameter("name", null);

    const document = (await this.client.get(url.build(), Fetch.DOCUMENT)).asJsoup();
    const mangas = document.select(this.searchMangaSelector()).map((element) => this.searchMangaFromElement(element));
    const hasNextPage = document.selectFirst(this.searchMangaNextPageSelector()) !== null;
    return new MangasPage([...mangas], hasNextPage);
  }

  private searchMangaSelector = () => ".manga-list-4-list > li";

  private searchMangaNextPageSelector = () => "div.pager-list-left a:last-child";

  private searchMangaFromElement(element: Element): SManga {
    const manga = SManga.create();
    const titleEl = element.selectFirst(".manga-list-4-item-title > a");
    manga.setUrlWithoutDomain(titleEl?.absUrl("href") ?? "");
    manga.title = titleEl?.attr("title") ?? "";
    manga.thumbnail_url = element.selectFirst("img.manga-list-4-cover")?.absUrl("src") ?? null;
    return manga;
  }

  // Manga Details

  async fetchMangaUpdate(manga: SManga): Promise<SMangaUpdate> {
    const document = (await this.client.get(this.getMangaUrl(manga), Fetch.DOCUMENT)).asJsoup();
    const updatedManga = this.mangaDetailsFromDocument(document);
    const updatedChapters = this.chapterListFromDocument(document);

    // Explicitly ignoring `fetchChapters` as we would otherwise provide incomplete data
    // Get a chapter, check if the manga is licensed.
    if (updatedChapters.length > 0) {
      const aChapterUrl = this.getChapterUrl(updatedChapters[0]);
      const aChapterDocument = (await this.client.get(aChapterUrl, Fetch.DOCUMENT)).asJsoup();
      if (aChapterDocument.select("p.detail-block-content").hasText()) updatedManga.status = SManga.LICENSED;
    }

    return new SMangaUpdate(updatedManga, updatedChapters);
  }

  private mangaDetailsFromDocument(document: Document): SManga {
    const manga = SManga.create();
    manga.author = document.selectFirst(".detail-info-right-say > a")?.text() ?? null;
    manga.genre = document.select(".detail-info-right-tag-list > a").map((element) => element.text()).join(", ");
    manga.description = document.selectFirst(".fullcontent")?.text() ?? null;
    manga.thumbnail_url = document.selectFirst("img.detail-info-cover-img")?.absUrl("src") ?? null;

    const statusText = document.selectFirst("span.detail-info-right-title-tip")?.text();
    if (statusText !== undefined) {
      const lower = statusText.toLowerCase();
      if (lower.includes("ongoing")) manga.status = SManga.ONGOING;
      else if (lower.includes("completed")) manga.status = SManga.COMPLETED;
      else manga.status = SManga.UNKNOWN;
    }

    return manga;
  }

  // Chapters

  private chapterListSelector = () => "ul.detail-main-list > li";

  private chapterFromElement(element: Element): SChapter {
    const chapter = SChapter.create();
    chapter.setUrlWithoutDomain(element.selectFirst("a")!.absUrl("href"));
    chapter.name = element.selectFirst("a p.title3")!.text();
    const date = element.selectFirst("a p.title2")?.text();
    chapter.date_upload = date !== undefined ? this.parseChapterDate(date) : 0;
    return chapter;
  }

  private chapterListFromDocument(document: Document): SChapter[] {
    return [...document.select(this.chapterListSelector()).map((element) => this.chapterFromElement(element))];
  }

  parseChapterDate(date: string): number {
    if (date.includes("Today") || date.includes(" ago")) return startOfDay(0);
    if (date.includes("Yesterday")) return startOfDay(1);
    return parseDate(date, "MMM dd,yyyy");
  }

  // Pages

  async getPageList(chapter: SChapter): Promise<Page[]> {
    const document = (await this.client.get(this.getChapterUrl(chapter), Fetch.DOCUMENT)).asJsoup();
    const bar = document.select("script[src*=chapter_bar]");

    // if-branch is for webtoon reader, else is for page-by-page
    let pages: Page[];
    if (bar.isNotEmpty()) {
      const script = removePrefix(document.select("script:containsData(function(p,a,c,k,e,d))").html(), "eval");
      const deobfuscatedScript = evaluateIsolated(script) ?? "";
      const urls = substringBefore(substringAfter(deobfuscatedScript, "newImgs=['"), "'];").split("','");

      pages = urls.map((s, index) => new Page(index, "", `https:${s}`));
    } else {
      const html = document.html();
      const link = document.location();

      const secretKey = this.extractSecretKey(html);

      const chapterIdStartLoc = html.indexOf("chapterid");
      const chapterId = html.substring(chapterIdStartLoc + 11, html.indexOf(";", chapterIdStartLoc)).trim();

      const chapterPagesElement = document.selectFirst(".pager-list-left > span")!;
      const pagesLinksElements = chapterPagesElement.select("a");
      const pagesNumber = Number(pagesLinksElements[pagesLinksElements.length - 2].attr("data-page"));

      const pageBase = link.substring(0, link.lastIndexOf("/"));
      pages = [];
      for (let page = 1; page <= pagesNumber; page++) {
        const pageUrl = toHttpUrl(`${pageBase}/chapterfun.ashx`)
          .newBuilder()
          .addQueryParameter("cid", chapterId)
          .addQueryParameter("page", String(page))
          .addQueryParameter("key", secretKey)
          .fragment(link)
          .build();
        pages.push(new Page(page - 1, pageUrl.toString()));
      }
    }
    return this.dropLastIfBroken(pages);
  }

  /*
      function to drop last imageUrl if it's broken/unneccesary, working imageUrls are incremental (e.g. t001, t002, etc); if the difference between
      the last two isn't 1 or doesn't have an Int at the end of the last imageUrl's filename, drop last Page
   */
  private async dropLastIfBroken(pages: Page[]): Promise<Page[]> {
    if (pages.length < 2) return pages;
    const lastIndex = pages.length - 1;

    const resolvedPages: Page[] = [];
    for (const [index, page] of pages.entries()) {
      if (index < lastIndex - 1 || page.imageUrl !== null) {
        resolvedPages.push(page);
      } else {
        page.imageUrl = await this.getImageUrl(page);
        resolvedPages.push(page);
      }
    }

    const pageNumbers: number[] = [];
    for (const page of resolvedPages.slice(-2)) {
      const name = page.imageUrl?.substring(0, page.imageUrl.lastIndexOf(".")) ?? null;
      const number = name === null ? NaN : Number.parseInt(name.substring(name.lastIndexOf("/") + 1).slice(-2), 10);
      if (Number.isNaN(number)) return resolvedPages.slice(0, -1);
      pageNumbers.push(number);
    }

    return pageNumbers[1] - pageNumbers[0] === 1 || (pageNumbers[0] === 0 && pageNumbers[1] === 99)
      ? resolvedPages
      : resolvedPages.slice(0, -1);
  }

  override async getImageUrl(page: Page): Promise<string> {
    const pageUrl = toHttpUrl(page.url);
    const referer = pageUrl.fragment;
    if (referer === null) throw new Error("Missing chapter referer");
    const requestUrl = pageUrl.newBuilder().fragment(null).build();
    const pageHeaders = {
      ...this.headers,
      Referer: referer,
      "Accept-Language": "en-US,en;q=0.9",
      "X-Requested-With": "XMLHttpRequest",
    };

    for (let attempt = 0; attempt <= 2; attempt++) {
      const url = attempt === 0 ? requestUrl : requestUrl.newBuilder().setQueryParameter("key", "").build();
      const responseText = (await this.client.get(url, { headers: pageHeaders, fetch: Fetch.XHR })).body;
      if (responseText.length > 0) {
        return this.parseImageUrl(responseText);
      }
    }

    throw new Error("Empty image response");
  }

  private parseImageUrl(responseText: string): string {
    const deobfuscatedScript = evaluateIsolated(removePrefix(responseText, "eval")) ?? "";

    const pixIndex = deobfuscatedScript.indexOf("pix=");
    if (pixIndex < 0) throw new Error("Missing image host");
    const baseLinkStart = pixIndex + 5;
    const semicolon = deobfuscatedScript.indexOf(";", baseLinkStart);
    if (semicolon <= baseLinkStart) throw new Error("Invalid image host");
    const baseLink = deobfuscatedScript.substring(baseLinkStart, semicolon - 1);

    const pvalueIndex = deobfuscatedScript.indexOf("pvalue=");
    if (pvalueIndex < 0) throw new Error("Missing image path");
    const imageLinkStart = pvalueIndex + 9;
    const imageLinkEnd = deobfuscatedScript.indexOf('"', imageLinkStart);
    if (imageLinkEnd <= imageLinkStart) throw new Error("Invalid image path");
    const imageLink = deobfuscatedScript.substring(imageLinkStart, imageLinkEnd);

    return `https:${baseLink}${imageLink}`;
  }

  private extractSecretKey(html: string): string {
    const secretKeyScriptLocation = html.indexOf("eval(function(p,a,c,k,e,d)");
    const secretKeyScriptEndLocation = html.indexOf("</script>", secretKeyScriptLocation);
    const secretKeyScript = removePrefix(html.substring(secretKeyScriptLocation, secretKeyScriptEndLocation), "eval");

    const secretKeyDeobfuscatedScript = evaluateIsolated(secretKeyScript) ?? "";

    const secretKeyStartLoc = secretKeyDeobfuscatedScript.indexOf("'");
    const secretKeyEndLoc = secretKeyDeobfuscatedScript.indexOf(";");

    const secretKeyResultScript = secretKeyDeobfuscatedScript.substring(secretKeyStartLoc, secretKeyEndLoc);

    return evaluateIsolated(secretKeyResultScript) ?? "";
  }

  override getFilterList(): FilterList {
    return [
      new TypeList(Object.keys(types).sort()),
      new ArtistFilter("Artist"),
      new AuthorFilter("Author"),
      new GenreList(genres()),
      new RatingList(ratings),
      new YearFilter("Year released"),
      new CompletionList(completions),
    ];
  }
}

export default defineExtension([new Mangahere()]);
