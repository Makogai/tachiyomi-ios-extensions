// Port of lib-multisrc/madara/.../MadaraNoAjax.kt @ d9420cd1: browse the archive pages instead of
// admin-ajax.php. Upstream resolves post IDs for search results through the RSS feed; manga URLs
// here are paths (see madara-base.ts), so search cards are used as they are.
import { Fetch, type FilterList, firstInstanceOrNull, type HttpUrlBuilder, MangasPage, SManga, toHttpUrl } from "@sdk";
import { type GenreRoute, SingleGenreFilter, SortFilter } from "./filters";
import { MadaraBase } from "./madara-base";

export abstract class MadaraNoAjax extends MadaraBase {
  getPopularManga(page: number): Promise<MangasPage> {
    return this.archivePage(page, "views");
  }

  getLatestUpdates(page: number): Promise<MangasPage> {
    return this.archivePage(page, "latest");
  }

  protected getFilterListFromData(genres: GenreRoute[]): FilterList {
    const filters: FilterList = [new SortFilter(this.intl.get("order_by_filter_title"), this.orderByFilterOptions)];
    if (genres.length > 0) {
      filters.push(new SingleGenreFilter(this.intl.get("genre_filter_title"), this.intl.get("adult_content_filter_all"), genres));
    }
    return filters;
  }

  async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    const genre = firstInstanceOrNull(filters, SingleGenreFilter)?.route() ?? null;
    const sort = firstInstanceOrNull(filters, SortFilter)?.key() ?? "";
    if (genre !== null) return this.archivePage(page, sort, genre.path, query);
    return query.trim() ? this.htmlSearch(page, query) : this.archivePage(page, sort);
  }

  protected nextPageSelector(): string {
    return "div.nav-previous, a.nextpostslink, #navigation-ajax";
  }

  protected get orderQueryParameter(): string {
    return "m_orderby";
  }

  protected get searchQueryParameter(): string {
    return "s";
  }

  protected archiveUrlBuilder(page: number, order: string, path: string, query: string): HttpUrlBuilder {
    const builder = toHttpUrl(this.baseUrl).resolve(path)!.newBuilder();
    if (page > 1) builder.addPathSegments(`page/${page}/`);
    if (order.trim()) builder.addQueryParameter(this.orderQueryParameter, order);
    if (query.trim()) builder.addQueryParameter(this.searchQueryParameter, query);
    return builder;
  }

  protected async archivePage(page: number, order: string, path = `/${this.mangaSubString}/`, query = ""): Promise<MangasPage> {
    const document = (await this.client.get(this.archiveUrlBuilder(page, order, path, query).build(), Fetch.DOCUMENT)).asJsoup();
    return new MangasPage(this.parseArchive(document), document.selectFirst(this.nextPageSelector()) !== null);
  }

  protected searchUrlBuilder(page: number, query: string): HttpUrlBuilder {
    const builder = toHttpUrl(this.baseUrl).newBuilder();
    if (page > 1) builder.addPathSegments(`page/${page}/`);
    return builder.addQueryParameter(this.searchQueryParameter, query).addQueryParameter("post_type", "wp-manga");
  }

  private async htmlSearch(page: number, query: string): Promise<MangasPage> {
    const document = (await this.client.get(this.searchUrlBuilder(page, query).build(), Fetch.DOCUMENT)).asJsoup();
    const hasNextPage = document.selectFirst(this.nextPageSelector()) !== null;
    const archive = this.parseArchive(document);
    if (archive.length > 0) return new MangasPage(archive, hasNextPage);
    const mangas = this.parseSearchCards(document).map((card) => {
      const manga = SManga.create();
      manga.url = card.path;
      manga.title = card.title;
      manga.thumbnail_url = card.thumbnail;
      return manga;
    });
    return new MangasPage(mangas, hasNextPage);
  }
}
