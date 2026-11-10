// Port of src/en/readcomicsonline/.../ReadComicsOnline.kt @ d9420cd1 (theme: mmrcms, see mmrcms.ts).
import {
  defineExtension,
  type Document,
  type Element,
  Fetch,
  type FilterList,
  MangasPage,
  Page,
  SChapter,
  SManga,
  toHttpUrl,
} from "@sdk";
import { isUriFilter } from "./filters";
import { MMRCMS } from "./mmrcms";

class ReadComicsOnline extends MMRCMS {
  readonly name = "Read Comics Online";
  readonly lang = "en";
  readonly baseUrl = "https://readcomicsonline.ru";

  protected override get itemPath(): string {
    return "comic";
  }

  protected override get chapterString(): string {
    return "";
  }

  protected override get fetchFilterOptions(): boolean {
    return false;
  }

  protected override get detailsTitleSelector(): string {
    return "h1.text-2xl";
  }

  /** Upstream: `DateTimeFormatter.ofPattern("d MMM yyyy", Locale.US)`. */
  protected override get dateFormat(): string {
    return "d MMM yyyy";
  }

  protected override popularMangaUrl(page: number): string {
    return `${this.baseUrl}/comic-list?sort=views&page=${page}`;
  }

  protected override popularMangaSelector(): string {
    return "div.comic-list-layout .grid > .group";
  }

  protected override popularMangaFromElement(element: Element): SManga {
    const manga = SManga.create();
    const anchor = element.selectFirst("a.block.text-sm.font-semibold")!;

    manga.setUrlWithoutDomain(anchor.absUrl("href"));
    manga.title = anchor.text();
    manga.thumbnail_url = this.guessCover(manga.url, element.selectFirst("img")?.attr("src"));
    return manga;
  }

  protected override popularMangaNextPageSelector(): string | null {
    return "nav a[rel=next]";
  }

  protected override latestUpdatesUrl(page: number): string {
    return `${this.baseUrl}/comic-list?sort=latest&page=${page}`;
  }

  protected override latestUpdatesSelector(): string {
    return this.popularMangaSelector();
  }

  protected override searchMangaSelector(): string {
    return "div a:has(img)";
  }

  override async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    const resDoc = (await this.client.get(this.searchMangaUrl(page, query, filters), Fetch.DOCUMENT)).asJsoup();
    const mangas = resDoc.select(this.searchMangaSelector()).map((element) => {
      const manga = SManga.create();
      manga.setUrlWithoutDomain(element.absUrl("href"));
      manga.title = element.selectFirst("p")!.text();
      manga.thumbnail_url = element.selectFirst("img")!.absUrl("src");
      return manga;
    });
    const hasNextPage = resDoc.selectFirst("span a[rel=next]") !== null;
    return new MangasPage([...mangas], hasNextPage);
  }

  protected override searchMangaUrl(page: number, query: string, filters: FilterList): string {
    const builder = toHttpUrl(this.baseUrl).newBuilder();
    builder.addPathSegment("advanced-search");
    builder.addQueryParameter("name", query);
    builder.addQueryParameter("page", String(page));
    for (const filter of filters) {
      if (isUriFilter(filter)) filter.addToUri(builder);
    }
    return builder.build().toString();
  }

  protected override mangaDetailsParse(document: Document): SManga {
    const manga = SManga.create();
    manga.title = document.selectFirst("h1.text-2xl")?.text() ?? "";
    manga.thumbnail_url = this.guessCover(
      document.location(),
      this.imgAttrOrNull(document.selectFirst("img.w-full.rounded-xl")),
    );
    manga.description = document.selectFirst("div:has(> div > h3:contains(Synopsis)) > div > p")?.text() ?? null;

    const status = document.selectFirst("div.flex.flex-wrap.gap-2 span.rounded-full");
    if (status) manga.status = this.parseDetailStatus(status.text());

    manga.genre = document
      .select("dl div:contains(Genres:) a")
      .map((it) => it.text())
      .join(", ");
    manga.author = document
      .select("div:has(span:contains(Author:)) > a")
      .map((it) => it.text())
      .join(", ");
    return manga;
  }

  protected override chapterListSelector(): string {
    return ".overflow-hidden.border-ink-600 > a";
  }

  protected override chapterFromElement(element: Element, mangaTitle: string): SChapter {
    const chapter = SChapter.create();
    chapter.setUrlWithoutDomain(element.absUrl("href"));

    const chapterName = element.selectFirst(".text-brand-400")?.text() ?? element.text();
    chapter.name = this.cleanChapterName(mangaTitle, chapterName);

    chapter.date_upload = this.tryParseDate(element.selectFirst(".text-slate-500")?.text());
    return chapter;
  }

  protected override pageListParse(document: Document): Page[] {
    return document.select("#reader-all img").map((img, i) => new Page(i, "", this.imgAttr(img)));
  }
}

export default defineExtension([new ReadComicsOnline()]);
