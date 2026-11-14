// Port of src/en/comix/.../Comix.kt @ d9420cd1. Method names follow the original.
//
// What differs from upstream, because the host WebView (WKWebView via `runWebView`) has no
// request interception and no native touch input:
// - Browse, chapter list and reader still run upstream's page scripts (assets/*.js) in a hidden
//   WebView. Chapter pagination uses the scripts' own `el.click()` fallback instead of native
//   taps, and the chapter-list pacing (2.5–5 s between list requests) is done by wrapping the
//   page's XMLHttpRequest/fetch instead of blocking requests natively.
// - Upstream swaps the site's captcha iframe (/@waf/challenge) for its solver page. Here the
//   solver (assets/solve_captcha.js, unchanged) is evaluated inside the site's own captcha
//   iframe once it has loaded, which is same-origin.
// - Ads, error reports and other unused requests are not blocked.
// - Manga details are read from the title page's `script#initial-data` over HTTP first (the
//   app's client is accepted by the site), with a WebView navigation as fallback.
// - The reader walk runs in getPageList until every page URL is captured (or 240 s), instead
//   of a background walk that getImageUrl waits on; a missed page is walked again on its own.
// - The SDK has no `memo`: chapter votes, group IDs and "official" flags only exist while a
//   list is being fetched, and the list state upstream keeps in the newest chapter's memo is
//   kept in this source's preferences, per manga.
// - Image descrambling is returned as tile moves (getImageTransform). The scramble headers are
//   read with an extra request, only for the scrambled path family (/i/, /si/, /i5/, …). The
//   XOR-encoded variant (x-enc-seed) and the host-fallback retry interceptor are not ported.
//
// Files: api.ts (URLs and WebView runs), webview.ts + assets.ts (page scripts), parse.ts (site
// data → models), dto.ts (shapes), filters.ts, settings.ts, descrambler.ts, markdown.ts.
import {
  type ClientBuilder,
  defineExtension,
  Fetch,
  type FilterList,
  type HttpUrl,
  HttpUrl as Url,
  type ImageRequest,
  type ImageTransform,
  KeiSource,
  MangasPage,
  Page,
  type PreferenceScreen,
  removePrefix,
  runWebView,
  type SChapter,
  type SManga,
  SMangaUpdate,
  substringBefore,
  toHttpUrl,
} from "@sdk";
import {
  browseUrl,
  browseWebView,
  chaptersWebView,
  detailsWebView,
  READER_PAGE_TIMEOUT_MS,
  READER_TIMEOUT_MS,
  readerWebView,
  searchUrl,
  tagSearchUrl,
} from "./api";
import { descrambleTransform, scrambleSeed } from "./descrambler";
import type { ChapterList, ChapterMeta, Manga, Queries, SearchItems, TagSearchResponse } from "./dto";
import { ArtistFilter, AuthorFilter, Filters, TagsFilter } from "./filters";
import {
  chapterId,
  chapterToSChapter,
  hasNextPage,
  mangaDetail,
  mangaIdOf,
  parseRelativeDate,
  type ReaderWalk,
  readerWalkOf,
  scrambleInfoFromFragment,
  scrambleInfoFromHeaders,
  selectChapters,
  toBasicSManga,
  toSManga,
} from "./parse";
import * as settings from "./settings";
import { messagesOf, resultOf } from "./webview";

const TAG_ID_CACHE_SIZE = 50;
const RECENT_QUERIES_TTL_MS = 120_000;
const SCRAMBLE_PATH_FALLBACK_REGEX = /\/(?:i5|s?i+)\//;

class Comix extends KeiSource {
  readonly name = "Comix";
  readonly lang = "en";
  readonly baseUrl = "https://comix.to";

  /** Page image URLs from reader walks, for the image rate limit (upstream's isPageImage). */
  private readonly pageImages = new Set<string>();

  private readonly tagIdCache = new Map<string, string[]>();

  // The detail page's data, reused briefly so a details and chapters refresh is one navigation
  private lastQueries: { url: string; at: number; queries: Queries } | null = null;

  private get baseUrlHost(): string {
    return toHttpUrl(this.baseUrl).host;
  }

  protected override configureClient(builder: ClientBuilder): void {
    // Covers are cached static files
    builder.rateLimit(2, 1000, (url) => url.host === this.baseUrlHost && !url.encodedPath.startsWith("/images/covers/"));
    builder.rateLimit(2, 1000, (url) => this.pageImages.has(url.toString()));
    builder.rateLimit(5);
  }

  // ============================== Browse ==============================

  async getPopularManga(page: number): Promise<MangasPage> {
    return this.getMangaListFromBrowse(browseUrl(this.baseUrl, "order[score]", page, this.sourceFilters().getFilterList()));
  }

  async getLatestUpdates(page: number): Promise<MangasPage> {
    return this.getMangaListFromBrowse(browseUrl(this.baseUrl, "order[chapter_updated_at]", page, this.sourceFilters().getFilterList()));
  }

  private async getMangaListFromBrowse(url: HttpUrl): Promise<MangasPage> {
    const searchResponse = resultOf<SearchItems>(await runWebView(browseWebView(url, settings.solveCaptchas(this.preferences))));
    const base = toHttpUrl(this.baseUrl);
    const posterQuality = settings.posterQuality(this.preferences);
    const mangas = (searchResponse.items ?? []).map((it) => toBasicSManga(it, base, posterQuality));
    return new MangasPage(mangas, hasNextPage(searchResponse));
  }

  async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    const textOf = (type: new () => { state: string }) => (filters.find((it) => it instanceof type) as { state: string } | undefined)?.state;
    const authorState = textOf(AuthorFilter);
    const artistState = textOf(ArtistFilter);
    const tagsState = textOf(TagsFilter);
    const authorIds = authorState != null ? await this.resolveTagIdsForNames("author", authorState) : [];
    const artistIds = artistState != null ? await this.resolveTagIdsForNames("artist", artistState) : [];
    const tagIds = tagsState != null ? await this.resolveTagIdsForNames("tag", tagsState) : [];
    return this.getMangaListFromBrowse(searchUrl(this.baseUrl, page, query, filters, { authorIds, artistIds, tagIds }));
  }

  protected override async getMangaByUrl(url: HttpUrl): Promise<SManga | null> {
    if (removePrefix(url.host, "www.") !== removePrefix(this.baseUrlHost, "www.")) return null;
    if (url.pathSegments.length < 2 || url.pathSegments[0] !== "title") return null;
    const mangaSlug = url.pathSegments[1];
    if (substringBefore(mangaSlug, "-") === "") return null;
    const manga = { url: `/${mangaSlug}`, title: "" } as SManga;
    const updated = (await this.fetchMangaUpdate(manga, [], true, false)).manga;
    updated.url = manga.url;
    return updated;
  }

  private sourceFilters(): Filters {
    const prefs = this.preferences;
    return new Filters(settings.contentRating(prefs), settings.defaultTypes(prefs), settings.defaultDemographics(prefs), settings.blockedGenres(prefs));
  }

  private async resolveTagIdsForNames(type: string, raw: string): Promise<string[]> {
    const names = raw.split(",").map((it) => it.trim()).filter((it) => it !== "");
    const ids: string[] = [];
    for (const name of names) ids.push(...(await this.resolveTagIds(type, name)));
    return ids;
  }

  private async resolveTagIds(type: string, name: string): Promise<string[]> {
    const cacheKey = `${type}\u0000${name.toLowerCase()}`;
    const cached = this.tagIdCache.get(cacheKey);
    if (cached) {
      this.tagIdCache.delete(cacheKey);
      this.tagIdCache.set(cacheKey, cached);
      return cached;
    }
    const hits = (await this.client.get(tagSearchUrl(this.baseUrl, type, name), Fetch.XHR)).parseAs<TagSearchResponse>().result ?? [];
    if (hits.length === 0) throw new Error(`No ${type} named "${name}"`);
    // Exact names when the site's fuzzy search has them
    const exact = hits.filter((it) => it.label.toLowerCase() === name.toLowerCase());
    const ids = (exact.length > 0 ? exact : hits).map((it) => String(it.id));
    this.tagIdCache.set(cacheKey, ids);
    if (this.tagIdCache.size > TAG_ID_CACHE_SIZE) this.tagIdCache.delete(this.tagIdCache.keys().next().value!);
    return ids;
  }

  // ======================== Details and chapters ========================

  async fetchMangaUpdate(manga: SManga, chapters: SChapter[], fetchDetails: boolean, fetchChapters: boolean): Promise<SMangaUpdate> {
    let cachedQueries: Queries | null = null;
    const getQueries = async (): Promise<Queries> => {
      cachedQueries ??= await this.navigateForQueries(this.getMangaUrl(manga));
      return cachedQueries;
    };

    const deduplicate = settings.deduplicateChapters(this.preferences);
    const scanlatorBlacklist = settings.scanlatorBlacklist(this.preferences);
    const blacklistSignature = [...scanlatorBlacklist].sort().join(",");
    const mangaId = mangaIdOf(manga.url);
    const listMemo = settings.readChapterListState(this.preferences, mangaId);
    const fetchUntilKnown =
      fetchChapters &&
      settings.fetchChaptersUntilKnown(this.preferences) &&
      listMemo !== null &&
      listMemo.deduplicated === deduplicate &&
      listMemo.blacklist === blacklistSignature &&
      listMemo.version === settings.CHAPTER_DATA_VERSION &&
      listMemo.complete !== false;
    const knownIds = fetchUntilKnown ? chapters.map((it) => this.chapterId(it)).filter((it): it is number => it !== null) : [];

    // Only the unchanged-list skip needs the detail before the walk; otherwise the walk's own page carries it
    const detailBeforeChapters = fetchUntilKnown ? mangaDetail(await getQueries()) : null;
    // Skip the chapter list when the site's last chapter upload is older than the last full read of it
    let unchanged = false;
    if (fetchUntilKnown && listMemo?.fetchedAt != null) {
      const formatted = detailBeforeChapters?.chapterUpdatedAtFormatted;
      const uploadedBy = formatted ? parseRelativeDate(formatted, true) : 0;
      unchanged = uploadedBy >= 1 && uploadedBy <= listMemo.fetchedAt;
    }

    let walkedQueries: Queries | null = null;
    let updatedChapters = chapters;
    if (fetchChapters && !unchanged) {
      // Site dates are relative ("2w ago"), so keep the date a chapter was first stored with
      const knownDates = new Map<number, number>();
      chapters.forEach((chapter) => {
        const id = this.chapterId(chapter);
        if (id !== null && chapter.date_upload > 0) knownDates.set(id, chapter.date_upload);
      });
      const mangaSlug = removePrefix(manga.url, "/");
      const fetchStartedAt = Date.now();
      const chapterList = await this.getWebViewChapterList(manga, knownIds);
      // The chapter page carried the detail too, so the manga comes from this same navigation
      if (chapterList.queries) {
        walkedQueries = chapterList.queries;
        cachedQueries = walkedQueries;
        this.rememberQueries(this.getMangaUrl(manga), walkedQueries);
      }
      if (!chapterList.complete && chapters.length === 0) {
        throw new Error(chapterList.error ?? "Chapter list is incomplete");
      }
      const metas = new Map<string, ChapterMeta>();
      const fetched = chapterList.chapters.map((it) => {
        const { chapter, meta } = chapterToSChapter(it, mangaSlug);
        metas.set(chapter.url, meta);
        const date = knownDates.get(meta.id);
        if (date !== undefined) chapter.date_upload = date;
        return chapter;
      });
      // An incomplete list keeps the stored chapters, and the next refresh walks the whole list again
      const candidates = fetchUntilKnown || !chapterList.complete ? [...fetched, ...chapters] : fetched;
      updatedChapters = selectChapters(candidates, deduplicate, scanlatorBlacklist, metas, (chapter) => this.getChapterUrl(chapter));
      settings.writeChapterListState(this.preferences, mangaId, {
        deduplicated: deduplicate,
        blacklist: blacklistSignature,
        version: settings.CHAPTER_DATA_VERSION,
        complete: chapterList.complete,
        ...(chapterList.complete ? { fetchedAt: fetchStartedAt } : {}),
      });
    }

    let detail: Manga | null;
    if (detailBeforeChapters !== null) detail = detailBeforeChapters;
    else if (!fetchDetails) detail = null;
    else if (walkedQueries !== null) detail = mangaDetail(walkedQueries);
    else detail = mangaDetail(await getQueries());

    const updatedManga = detail !== null && fetchDetails ? this.parseMangaDetails(detail) : manga;
    return new SMangaUpdate(updatedManga, updatedChapters);
  }

  private rememberQueries(url: string, queries: Queries): void {
    this.lastQueries = { url, at: Date.now(), queries };
  }

  /**
   * The title page's initial data. Upstream always navigates a WebView because the site refuses
   * OkHttp; the app's client is accepted, so HTTP comes first and the WebView is the fallback.
   */
  private async navigateForQueries(url: string): Promise<Queries> {
    const recent = this.lastQueries;
    if (recent && recent.url === url && Date.now() - recent.at < RECENT_QUERIES_TTL_MS) return recent.queries;

    let raw: string | null = null;
    try {
      const response = await this.client.get(url, { fetch: Fetch.DOCUMENT, ensureSuccess: false });
      if (response.isSuccessful) raw = response.asJsoup().selectFirst("script#initial-data")?.data() ?? null;
    } catch {
      raw = null;
    }
    if (!raw) {
      const result = await runWebView(detailsWebView(url, settings.solveCaptchas(this.preferences)));
      const error = messagesOf(result).find((it) => it.type === "error");
      if (error) throw new Error(error.message ?? "WebView failed");
      raw = result.result;
      if (!raw) throw new Error("Timed out waiting for WebView");
    }
    const queries = (JSON.parse(raw) as { queries?: unknown }).queries;
    if (!queries || typeof queries !== "object" || Array.isArray(queries)) throw new Error("Could not find queries in initial data");
    this.rememberQueries(url, queries as Queries);
    return queries as Queries;
  }

  private parseMangaDetails(detail: Manga): SManga {
    const prefs = this.preferences;
    return toSManga(
      detail,
      toHttpUrl(this.baseUrl),
      settings.posterQuality(prefs),
      settings.alternativeNamesInDescription(prefs),
      settings.scorePosition(prefs),
      settings.showExtraInfo(prefs),
      settings.showTagsInGenres(prefs),
    );
  }

  override getMangaUrl(manga: SManga): string {
    return `${this.baseUrl}/title${manga.url}`;
  }

  override getChapterUrl(chapter: SChapter): string {
    return `${this.baseUrl}/${chapter.url}`;
  }

  private chapterId(chapter: SChapter): number | null {
    return chapterId(chapter, this.getChapterUrl(chapter));
  }

  private async getWebViewChapterList(manga: SManga, knownIds: number[]): Promise<ChapterList> {
    const options = chaptersWebView(this.getMangaUrl(manga), mangaIdOf(manga.url), knownIds, settings.solveCaptchas(this.preferences));
    return resultOf<ChapterList>(await runWebView(options), "Timed out reading the chapter list");
  }

  // =============================== Pages ===============================

  // Comix image domains block any image requests with Referer/Origin
  override getImageRequest(page: Page): ImageRequest {
    if (!page.imageUrl) throw new Error(`Page ${page.index + 1} has no image URL`);
    const headers = { ...this.headers };
    delete headers["Referer"];
    return { url: page.imageUrl, headers };
  }

  /** Walks the reader until every page URL is captured; pages it missed are walked again in getImageUrl. */
  async getPageList(chapter: SChapter): Promise<Page[]> {
    const chapterUrl = this.getChapterUrl(chapter);
    const { total, pages, error } = await this.runReaderWalk(chapterUrl, -1, -1, READER_TIMEOUT_MS);
    if (total === null) throw new Error(error ?? "The reader didn't load any pages");
    return Array.from({ length: total }, (_, index) => new Page(index, chapterUrl, pages.get(index) ?? null));
  }

  override async getImageUrl(page: Page): Promise<string> {
    const { pages, error } = await this.runReaderWalk(page.url, page.index, page.index, READER_PAGE_TIMEOUT_MS);
    const url = pages.get(page.index);
    if (!url) throw new Error(error ?? `Page ${page.index + 1} didn't load in the reader`);
    return url;
  }

  private async runReaderWalk(
    chapterUrl: string,
    seek: number,
    onlyIndex: number,
    timeoutMs: number,
  ): Promise<ReaderWalk> {
    const walk = readerWalkOf(await runWebView(readerWebView(chapterUrl, seek, onlyIndex, timeoutMs, settings.solveCaptchas(this.preferences))));
    walk.pages.forEach((url) => this.pageImages.add(url));
    return walk;
  }

  /**
   * Upstream's Descrambler as tile moves. The scramble parameters come from the image response
   * headers; a `#scramble=<seed>,<grid>,<algo>,<hash>` fragment on the image URL carries them
   * when already known. Only the scrambled path family is checked.
   */
  override async getImageTransform(page: Page, width: number, height: number): Promise<ImageTransform | null> {
    if (!page.imageUrl) return null;
    const url = Url.parse(page.imageUrl);
    if (!url) return null;
    let info = scrambleInfoFromFragment(url.fragment);
    if (info === null) {
      if (!SCRAMBLE_PATH_FALLBACK_REGEX.test(url.encodedPath)) return null;
      const request = this.getImageRequest(new Page(page.index, page.url, url.newBuilder().fragment(null).build().toString()));
      const response = await this.client.get(request.url, {
        headers: request.headers,
        fetch: Fetch.IMAGE,
        ensureSuccess: false,
        responseType: "base64",
      });
      if (!response.isSuccessful) return null;
      info = scrambleInfoFromHeaders(response);
    }
    const seed = scrambleSeed(info);
    return seed === null ? null : descrambleTransform(width, height, seed, info.algo);
  }

  // ========================= Filters and settings =========================

  override getFilterList(): FilterList {
    return this.sourceFilters().getFilterList();
  }

  override setupPreferenceScreen(screen: PreferenceScreen): void {
    settings.setupPreferenceScreen(screen);
  }
}

export default defineExtension([new Comix()]);
