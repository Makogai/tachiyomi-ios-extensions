// Port of src/en/asurascans/.../AsuraScans.kt @ d9420cd1. Method names follow the original.
//
// The source's flow. URLs are built in api.ts, API JSON and Astro props are read in parse.ts
// (shapes in dto.ts), scrambled pages are drawn by descrambler.ts.
import {
  type ClientBuilder,
  defineExtension,
  Fetch,
  FILTER_FETCH_HINT,
  FilterDataCache,
  type FilterList,
  Header,
  type HttpUrl,
  type ImageTransform,
  KeiSource,
  MangasPage,
  type Page,
  type PreferenceScreen,
  type SChapter,
  Separator,
  SManga,
  SMangaUpdate,
  seconds,
  substringAfter,
  substringBefore,
  toHttpUrl,
} from "@sdk";
import { browseUrl, creatorsUrl, getMangaSlug, searchUrl } from "./api";
import { descrambleTransform } from "./descrambler";
import type { AvailableGenres, ChapterListDto, Creators, DataDto, FiltersDto, MangaDetailsDto, MangaDto, MangaUrlDto, PageData, PageDto, PageListDto } from "./dto";
import { CreatorFilter, GenresFilter, MinChaptersFilter, SortFilter, StatusFilter, TypeFilter } from "./filters";
import { applyMangaUrl, chapterDtoToSChapter, extractAstroProp, isLocked, mangaDtoToSManga, pageListParse, toSMangaDetails } from "./parse";
import * as settings from "./settings";

const URL_RANDOM_PART = /-[a-z0-9]{8}$/;

class AsuraScans extends KeiSource {
  readonly name = "Asura Scans";
  readonly lang = "en";
  readonly baseUrl = "https://asurascans.com";

  /**
   * Stands in for upstream's `SManga.memo["slug"]`: series slug → the site's random slug
   * (`nano-machine` → `nano-machine-f212c582`), learnt from listings and details. The SDK's
   * models have no memo; without an entry the URL without the random part is used, which the
   * site redirects (upstream's own fallback in `fetchMangaUpdate`).
   */
  private readonly slugMemo = new Map<string, string>();

  protected override configureClient(builder: ClientBuilder): void {
    // addInterceptor(::scrambledImageInterceptor) is getImageTransform below.
    builder.rateLimit(2, seconds(2), (url) => !url.encodedPath.includes("/covers/"));
  }

  async getPopularManga(page: number): Promise<MangasPage> {
    return this.getSearchMangaList(page, "", [new SortFilter("popular")]);
  }

  async getLatestUpdates(page: number): Promise<MangasPage> {
    return this.getSearchMangaList(page, "", [new SortFilter("latest")]);
  }

  // ============================== Search ===============================

  async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    const response = await this.client.get(searchUrl(page, query, filters), Fetch.XHR);
    const result = response.parseAs<DataDto<MangaDto[]>>();
    const mangas = (result.data ?? []).map((dto) => {
      const { manga, slug } = mangaDtoToSManga(dto, this.baseUrl);
      this.slugMemo.set(getMangaSlug(manga.url), slug);
      return manga;
    });
    return new MangasPage(mangas, result.meta!.has_more ?? false);
  }

  protected override async getMangaByUrl(url: HttpUrl): Promise<SManga | null> {
    if (url.host === toHttpUrl(this.baseUrl).host && url.pathSegments[0] === "comics") {
      const slug = url.pathSegments[1];

      const tmpManga = SManga.create();
      tmpManga.url = `/series/${slug}`;
      this.slugMemo.set(slug, slug);

      return (await this.fetchMangaUpdate(tmpManga, [], true, false)).manga;
    }

    return null;
  }

  // ============================== Details ==============================

  override getMangaUrl(manga: SManga): string {
    const slug = getMangaSlug(manga.url);
    const randomSlug = this.slugMemo.get(slug) ?? settings.storedRandomSlug(this.preferences, slug) ?? slug;
    return `${this.baseUrl}/comics/${randomSlug}`;
  }

  async fetchMangaUpdate(
    manga: SManga,
    _chapters: SChapter[],
    _fetchDetails: boolean,
    _fetchChapters: boolean,
  ): Promise<SMangaUpdate> {
    const url = this.getMangaUrl(manga);
    let response = await this.client.get(url, { fetch: Fetch.DOCUMENT, ensureSuccess: false });

    // retry without random suffix, it redirects to new random suffix
    if (!response.isSuccessful) {
      response = await this.client.get(url.replace(URL_RANDOM_PART, ""), Fetch.DOCUMENT);
    }

    const document = response.asJsoup();

    const updatedManga = toSMangaDetails(extractAstroProp<MangaDetailsDto>(document, "title", "description"));
    const randomMangaSlug = applyMangaUrl(extractAstroProp<MangaUrlDto>(document, "publicUrl"), updatedManga, this.baseUrl);
    this.slugMemo.set(getMangaSlug(updatedManga.url), randomMangaSlug);

    const hidePremium = settings.hidePremiumChapters(this.preferences);
    const chapters = (extractAstroProp<ChapterListDto>(document, "chapters").chapters ?? [])
      .filter((chapter) => !(hidePremium && isLocked(chapter)))
      .map((chapter) => chapterDtoToSChapter(chapter));

    return new SMangaUpdate(updatedManga, chapters);
  }

  // fetchRelatedMangaList is not ported: the SDK has no related-manga call.

  override getChapterUrl(chapter: SChapter): string {
    // Upstream reads the random slug from `chapter.memo["mangaSlug"]` and throws without it; here
    // it comes from the in-memory memo, else the series slug (the site redirects).
    const seriesSlug = substringBefore(substringAfter(chapter.url, "/series/"), "/");
    const randomSlug = this.slugMemo.get(seriesSlug) ?? seriesSlug;
    const number = substringAfter(chapter.url, "/chapter/");

    return `${this.baseUrl}/comics/${randomSlug}/chapter/${number}`;
  }

  // =============================== Pages ===============================

  async getPageList(chapter: SChapter): Promise<Page[]> {
    const document = (await this.client.get(this.getChapterUrl(chapter), Fetch.DOCUMENT)).asJsoup();
    let pages: PageDto[];
    try {
      pages = extractAstroProp<PageListDto>(document, "pages").pages ?? [];
    } catch {
      pages = [];
    }

    if (pages.length === 0) {
      // Upstream then reads the `access_token` cookie and asks
      // `$apiUrl/series/<slug>/chapters/<number>` with `Authorization: Bearer` and `X-Page-Token`
      // for premium chapters. The SDK cannot read the cookie jar, so this is the "no token" path.
      return [];
    }

    return pageListParse(pages);
  }

  /** Upstream's `scrambledImageInterceptor`: the image URL's fragment carries the tile order. */
  override async getImageTransform(page: Page, width: number, height: number): Promise<ImageTransform | null> {
    const imageUrl = page.imageUrl ?? page.url;
    const fragment = toHttpUrl(imageUrl).fragment;
    if (fragment === null) return null;
    if (!fragment.startsWith("{")) return null;

    return descrambleTransform(JSON.parse(fragment) as PageData, width, height);
  }

  // ============================== Filters ==============================

  private readonly filterCache = new FilterDataCache<FiltersDto>(this, () => this.fetchFilterData());

  /** Upstream's `fetchFilterData`: genres from the browse page and the creators list. */
  private async fetchFilterData(): Promise<FiltersDto> {
    const [genres, creators] = await Promise.all([
      this.client
        .get(browseUrl(this.baseUrl), Fetch.DOCUMENT)
        .then((response) => extractAstroProp<AvailableGenres>(response.asJsoup(), "availableGenres").availableGenres),
      this.client.get(creatorsUrl(), Fetch.XHR).then((response) => response.parseAs<DataDto<Creators>>().data!),
    ]);

    return { genres, authors: creators.authors, artists: creators.artists };
  }

  override getFilterList(): FilterList {
    const filters: FilterList = [new SortFilter(), new StatusFilter(), new TypeFilter()];

    const dto = this.filterCache.read();
    if (dto !== null) {
      filters.push(new GenresFilter(dto.genres));
      filters.push(new CreatorFilter(dto.authors, dto.artists));
    }

    filters.push(new MinChaptersFilter());

    if (dto === null) filters.push(new Separator(), new Header(FILTER_FETCH_HINT));

    return filters;
  }

  // ============================== Settings ==============================

  override setupPreferenceScreen(screen: PreferenceScreen): void {
    settings.setupPreferenceScreen(screen);
  }
}

export default defineExtension([new AsuraScans()]);
