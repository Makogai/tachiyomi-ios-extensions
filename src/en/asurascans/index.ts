// Port of src/en/asurascans/.../AsuraScans.kt @ d9420cd1. Method names follow the original.
import {
  type ClientBuilder,
  defineExtension,
  type Document,
  Fetch,
  type FilterList,
  Header,
  type HttpUrl,
  type ImageTile,
  type ImageTransform,
  KeiSource,
  MangasPage,
  Page,
  type PreferenceScreen,
  type Response,
  type SChapter,
  Separator,
  SManga,
  SMangaUpdate,
  seconds,
  substringAfter,
  substringBefore,
  SwitchPreferenceCompat,
  toHttpUrl,
} from "@sdk";
import {
  applyMangaUrl,
  type AvailableGenres,
  type ChapterListDto,
  chapterDtoToSChapter,
  type Creators,
  type DataDto,
  type FiltersDto,
  isLocked,
  type MangaDetailsDto,
  type MangaDto,
  type MangaUrlDto,
  mangaDtoToSManga,
  type PageData,
  type PageDto,
  type PageListDto,
  toSMangaDetails,
} from "./dto";
import {
  CreatorFilter,
  GenresFilter,
  isUriFilter,
  MinChaptersFilter,
  SortFilter,
  StatusFilter,
  TypeFilter,
} from "./filters";
import { FILTER_FETCH_HINT, FilterDataCache } from "./filterCache";

const PER_PAGE_LIMIT = 20;
const OLD_FORMAT_MANGA_REGEX = /^\/manga\/(\d+-)?([^/]+)\/?$/;
const PREF_HIDE_PREMIUM_CHAPTERS = "pref_hide_premium_chapters";
const SLUG_MAP = "slug_map_v2";
const URL_RANDOM_PART = /-[a-z0-9]{8}$/;

class AsuraScans extends KeiSource {
  readonly name = "Asura Scans";
  readonly lang = "en";
  readonly baseUrl = "https://asurascans.com";

  private readonly apiUrl = "https://api.asurascans.com/api";

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
    const url = toHttpUrl(`${this.apiUrl}/series`).newBuilder();
    url.addQueryParameter("offset", String((page - 1) * PER_PAGE_LIMIT));
    url.addQueryParameter("limit", String(PER_PAGE_LIMIT));
    if (query.trim() !== "") {
      url.addQueryParameter("search", query);
    }

    for (const filter of filters) {
      if (isUriFilter(filter)) filter.addToUri(url);
    }

    const response = await this.client.get(url.build(), Fetch.XHR);
    const result = response.parseAs<DataDto<MangaDto[]>>();
    const mangas = (result.data ?? []).map((dto) => {
      const { manga, slug } = mangaDtoToSManga(dto, this.baseUrl);
      this.slugMemo.set(this.getMangaSlug(manga.url), slug);
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
    const slug = this.getMangaSlug(manga.url);
    let randomSlug = this.slugMemo.get(slug);
    if (randomSlug === undefined) {
      let oldSlugMap: Record<string, unknown> = {};
      try {
        oldSlugMap = JSON.parse(this.preferences.getString(SLUG_MAP, "{}")) as Record<string, unknown>;
      } catch {
        // Not a map.
      }
      const old = oldSlugMap[slug];
      randomSlug = typeof old === "string" ? old : slug;
    }

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

    const updatedManga = toSMangaDetails(this.extractAstroProp<MangaDetailsDto>(document, "title", "description"));
    const randomMangaSlug = applyMangaUrl(
      this.extractAstroProp<MangaUrlDto>(document, "publicUrl"),
      updatedManga,
      this.baseUrl,
    );
    this.slugMemo.set(this.getMangaSlug(updatedManga.url), randomMangaSlug);

    const hidePremium = this.hidePremiumChapters();
    const chapters = (this.extractAstroProp<ChapterListDto>(document, "chapters").chapters ?? [])
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
    const url = this.getChapterUrl(chapter);

    const response = await this.client.get(url, Fetch.DOCUMENT);
    const document = response.asJsoup();
    let pages: PageDto[];
    try {
      pages = this.extractAstroProp<PageListDto>(document, "pages").pages ?? [];
    } catch {
      pages = [];
    }

    if (pages.length === 0) {
      // Upstream then reads the `access_token` cookie and asks
      // `$apiUrl/series/<slug>/chapters/<number>` with `Authorization: Bearer` and `X-Page-Token`
      // for premium chapters. The SDK cannot read the cookie jar, so this is the "no token" path.
      return [];
    }

    return pages.map((pageDto, index) => {
      let pageUrl: string;
      if (pageDto.tiles != null && pageDto.tiles.length > 0) {
        const data: PageData = {
          tiles: pageDto.tiles,
          tileCols: pageDto.tile_cols ?? 4,
          tileRows: pageDto.tile_rows ?? 5,
        };
        pageUrl = toHttpUrl(pageDto.url).newBuilder().fragment(JSON.stringify(data)).build().toString();
      } else {
        pageUrl = pageDto.url;
      }

      return new Page(index, "", pageUrl);
    });
  }

  /**
   * Upstream's `scrambledImageInterceptor`: the image URL's fragment carries the tile order;
   * tile `w` of the download (row-major, `tileCols` × `tileRows` tiles of `width / tileCols` ×
   * `height / tileRows`) is drawn at position `tiles[w]` of an output trimmed to whole tiles.
   */
  override async getImageTransform(page: Page, width: number, height: number): Promise<ImageTransform | null> {
    const imageUrl = page.imageUrl ?? page.url;
    const fragment = toHttpUrl(imageUrl).fragment;
    if (fragment === null) return null;
    if (!fragment.startsWith("{")) return null;

    const pageData = JSON.parse(fragment) as PageData;

    const tileW = Math.trunc(width / pageData.tileCols);
    const tileH = Math.trunc(height / pageData.tileRows);

    const tiles: ImageTile[] = pageData.tiles.map((j, w) => {
      const srcCol = w % pageData.tileCols;
      const srcRow = Math.trunc(w / pageData.tileCols);
      const dstCol = j % pageData.tileCols;
      const dstRow = Math.trunc(j / pageData.tileCols);

      return {
        sx: srcCol * tileW,
        sy: srcRow * tileH,
        sw: tileW,
        sh: tileH,
        dx: dstCol * tileW,
        dy: dstRow * tileH,
      };
    });

    return { width: tileW * pageData.tileCols, height: tileH * pageData.tileRows, tiles };
  }

  // ============================== Filters ==============================

  private readonly filterCache = new FilterDataCache<FiltersDto>(this, () => this.fetchFilterData());

  /** Upstream's `fetchFilterData`: genres from the browse page and the creators list. */
  private async fetchFilterData(): Promise<FiltersDto> {
    const [genres, creators] = await Promise.all([
      this.client
        .get(`${this.baseUrl}/browse`, Fetch.DOCUMENT)
        .then((response) => this.extractAstroPropFromResponse<AvailableGenres>(response, "availableGenres").availableGenres),
      this.client.get(`${this.apiUrl}/creators`, Fetch.XHR).then((response) => response.parseAs<DataDto<Creators>>().data!),
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

  // ============================= Utilities =============================

  private getMangaSlug(url: string): string {
    if (url.includes("/series/")) return substringBefore(substringAfter(url, "/series/"), "/");
    if (url.includes("/comics/")) return substringBefore(substringAfter(url, "/comics/"), "/");
    if (url.includes("/manga/")) {
      return OLD_FORMAT_MANGA_REGEX.exec(url)?.[2] ?? substringBefore(substringAfter(url, "/manga/"), "/");
    }
    return url.replace(/^\/+|\/+$/g, "");
  }

  override setupPreferenceScreen(screen: PreferenceScreen): void {
    screen.addPreference(
      new SwitchPreferenceCompat({
        key: PREF_HIDE_PREMIUM_CHAPTERS,
        title: "Hide premium chapters",
        summary: "Hides the chapters that require a subscription to view",
        defaultValue: true,
      }),
    );
  }

  private hidePremiumChapters(): boolean {
    return this.preferences.getBoolean(PREF_HIDE_PREMIUM_CHAPTERS, true);
  }

  private extractAstroProp<T>(document: Document, ...key: string[]): T {
    const selector = key.map((it) => `[props*=${it}]`).join("");
    const prop = document.selectFirst(selector)?.attr("props");
    if (prop === undefined) throw new Error(`Unable to find prop with [${key.join(", ")}]`);
    const json = JSON.parse(prop) as unknown;
    return unwrapAstro(json) as T;
  }

  private extractAstroPropFromResponse<T>(response: Response, key: string): T {
    return this.extractAstroProp<T>(response.asJsoup(), key);
  }
}

/** kotlinx's `JsonPrimitive.intOrNull`: a whole number, or a string holding one. */
function isIntPrimitive(value: unknown): boolean {
  if (typeof value === "number") return Number.isInteger(value);
  if (typeof value === "string") return /^[+-]?\d+$/.test(value);
  return false;
}

/** Astro serialises props as `[type, value]` pairs; this strips them as upstream's `unwrapAstro`. */
function unwrapAstro(json: unknown): unknown {
  if (Array.isArray(json)) {
    if (json.length === 0) return null;
    if (json.length === 1 && isIntPrimitive(json[0])) return null;
    if (json.length === 2 && isIntPrimitive(json[0])) return unwrapAstro(json[1]);
    return json.map(unwrapAstro);
  }
  if (json !== null && typeof json === "object") {
    return Object.fromEntries(Object.entries(json).map(([key, value]) => [key, unwrapAstro(value)]));
  }
  return json;
}

export default defineExtension([new AsuraScans()]);
