// Port of lib-multisrc/madara/.../Madara.kt @ d9420cd1: browse and search through admin-ajax.php
// (`madara_load_more`).
import { Fetch, type FilterList, FormBody, Header, MangasPage, Separator } from "@sdk";
import {
  AdultFilter,
  GenreConditionFilter,
  GenreList,
  type GenreRoute,
  SortFilter,
  StatusFilter,
  TextFilter,
} from "./filters";
import { MadaraBase } from "./madara-base";

type BrowseMode = "popular" | "latest" | "search";

export abstract class Madara extends MadaraBase {
  protected get pageSize(): number {
    return 25;
  }

  protected get ajaxTemplate(): string {
    return "madara-core/content/content-archive";
  }

  getPopularManga(page: number): Promise<MangasPage> {
    return this.ajaxList(page, "popular");
  }

  getLatestUpdates(page: number): Promise<MangasPage> {
    return this.ajaxList(page, "latest");
  }

  getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    return this.ajaxList(page, "search", query, filters);
  }

  protected getFilterListFromData(genres: GenreRoute[]): FilterList {
    const filters: FilterList = [
      new TextFilter(this.intl.get("author_filter_title"), "wp-manga-author"),
      new TextFilter(this.intl.get("artist_filter_title"), "wp-manga-artist"),
      new TextFilter(this.intl.get("year_filter_title"), "wp-manga-release"),
      new StatusFilter(this.intl.get("status_filter_title"), this.statusFilterOptions),
      new SortFilter(this.intl.get("order_by_filter_title"), this.orderByFilterOptions),
      new AdultFilter(this.intl.get("adult_content_filter_title"), this.adultFilterOptions),
    ];
    if (genres.length > 0) {
      filters.push(
        new Separator(),
        new Header(this.intl.get("genre_filter_header")),
        new GenreConditionFilter(this.intl.get("genre_condition_filter_title"), this.genreConditionFilterOptions),
        new GenreList(this.intl.get("genre_filter_title"), genres),
      );
    }
    return filters;
  }

  private async ajaxList(page: number, mode: BrowseMode, query = "", filters: FilterList = []): Promise<MangasPage> {
    const body = new FormBody()
      .add("action", "madara_load_more")
      .add("page", String(page - 1))
      .add("template", this.ajaxTemplate)
      .add("vars[paged]", "1")
      .add("vars[template]", "archive")
      .add("vars[posts_per_page]", String(this.pageSize))
      .add("vars[post_type]", "wp-manga")
      .add("vars[post_status]", "publish")
      .add("vars[manga_archives_item_layout]", "big_thumbnail");
    if (this.filterNonMangaItems) {
      body.add("vars[meta_query][0][key]", "_wp_manga_chapter_type");
      body.add("vars[meta_query][0][value]", "manga");
    }
    if (mode === "popular") sort(body, "_wp_manga_views");
    else if (mode === "latest") sort(body, "_latest_update");
    else this.addFilters(body, query, filters, this.filterNonMangaItems ? 1 : 0);
    const response = await this.client.post(`${this.baseUrl}/wp-admin/admin-ajax.php`, body.build(), {
      headers: this.xhrHeaders,
      fetch: Fetch.XHR,
    });
    const mangas = this.parseArchive(response.asJsoup());
    return new MangasPage(mangas, mangas.length === this.pageSize);
  }

  private addFilters(body: FormBody, query: string, filters: FilterList, initialMetaQueryIndex: number): void {
    if (query.trim()) body.add("vars[s]", query);
    let metaQueryIndex = initialMetaQueryIndex;
    let taxonomyQueryIndex = 0;
    const genreList = filters.find((filter): filter is GenreList => filter instanceof GenreList);
    const genres = genreList ? genreList.state.filter((box) => box.state).map((box) => box.value) : [];
    for (const filter of filters) {
      if (filter instanceof TextFilter) {
        if (filter.state.trim()) {
          body.add(`vars[tax_query][${taxonomyQueryIndex}][taxonomy]`, filter.taxonomy);
          body.add(`vars[tax_query][${taxonomyQueryIndex}][field]`, "name");
          body.add(`vars[tax_query][${taxonomyQueryIndex}][terms]`, filter.state);
          taxonomyQueryIndex++;
        }
      } else if (filter instanceof StatusFilter) {
        const states = filter.state.filter((tag) => tag.state).map((tag) => tag.value);
        if (states.length > 0) {
          body.add(`vars[meta_query][${metaQueryIndex}][key]`, "_wp_manga_status");
          body.add(`vars[meta_query][${metaQueryIndex}][compare]`, "IN");
          states.forEach((state, i) => body.add(`vars[meta_query][${metaQueryIndex}][value][${i}]`, state));
          metaQueryIndex++;
        }
      } else if (filter instanceof SortFilter) {
        switch (filter.key()) {
          case "latest":
            sort(body, "_latest_update");
            break;
          case "alphabet":
            body.add("vars[orderby]", "post_title").add("vars[order]", "ASC");
            break;
          case "rating":
            body
              .add("vars[meta_query][query_average_reviews][key]", "_manga_avarage_reviews")
              .add("vars[meta_query][query_average_reviews][compare]", "EXISTS")
              .add("vars[meta_query][query_total_reviews][key]", "_manga_total_votes")
              .add("vars[meta_query][query_total_reviews][compare]", "EXISTS")
              .add("vars[orderby][query_average_reviews]", "DESC")
              .add("vars[orderby][query_total_reviews]", "DESC");
            break;
          case "trending":
            sort(body, "_wp_manga_week_views_value");
            break;
          case "views":
            sort(body, "_wp_manga_views");
            break;
          case "new-manga":
            body.add("vars[orderby]", "date").add("vars[order]", "DESC");
            break;
        }
      } else if (filter instanceof AdultFilter) {
        if (filter.state !== 0) {
          body.add(`vars[meta_query][${metaQueryIndex}][key]`, "manga_adult_content");
          body.add(`vars[meta_query][${metaQueryIndex}][compare]`, filter.state === 1 ? "not exists" : "exists");
          metaQueryIndex++;
        }
      } else if (filter instanceof GenreConditionFilter) {
        if (filter.state === 1 && genres.length > 0) body.add(`vars[tax_query][${taxonomyQueryIndex}][operation]`, "AND");
      } else if (filter instanceof GenreList) {
        if (genres.length > 0) {
          body.add(`vars[tax_query][${taxonomyQueryIndex}][taxonomy]`, "wp-manga-genre");
          body.add(`vars[tax_query][${taxonomyQueryIndex}][field]`, "slug");
          genres.forEach((slug, i) => body.add(`vars[tax_query][${taxonomyQueryIndex}][terms][${i}]`, slug));
        }
      }
    }
  }
}

function sort(body: FormBody, key: string): void {
  body.add("vars[orderby]", "meta_value_num").add("vars[meta_key]", key).add("vars[order]", "DESC");
}
