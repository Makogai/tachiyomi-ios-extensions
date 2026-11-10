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
import {
  type ClientBuilder,
  defineExtension,
  EditTextPreference,
  Fetch,
  type FilterList,
  type HttpUrl,
  HttpUrl as Url,
  type ImageRequest,
  type ImageTransform,
  KeiSource,
  ListPreference,
  MangasPage,
  MultiSelectListPreference,
  Page,
  type PreferenceScreen,
  removePrefix,
  runWebView,
  type SChapter,
  type SManga,
  SMangaUpdate,
  substringBefore,
  SwitchPreferenceCompat,
  toHttpUrl,
  type WebViewResult,
} from "@sdk";
import { CHAPTER_PAGES, HARVEST_BROWSE, HARVEST_CHAPTERS, SOLVE_CAPTCHA } from "./assets";
import { descrambleTransform, type ScrambleInfo, scrambleSeed } from "./descrambler";
import {
  type CaptureMessage,
  type ChapterList,
  type ChapterMeta,
  chapterToSChapter,
  hasNextPage,
  type Manga,
  parseRelativeDate,
  type SearchItems,
  type TagSearchResponse,
  toBasicSManga,
  toSManga,
} from "./dto";
import {
  ArtistFilter,
  AuthorFilter,
  Filters,
  getDemographics,
  getGenres,
  getTypes,
  isTermFilter,
  isUriFilter,
  TagsFilter,
} from "./filters";

const PREF_POSTER_QUALITY = "pref_poster_quality";
const PREF_CONTENT_RATING = "pref_content_rating";
const PREF_DEFAULT_TYPES = "pref_default_types";
const PREF_DEFAULT_DEMOGRAPHICS = "pref_default_demographics";
const PREF_BLOCKED_GENRES = "pref_blocked_genres";
const LEGACY_HIDE_NSFW_PREF = "nsfw_pref";
const DEDUPLICATE_CHAPTERS = "pref_deduplicate_chapters";
const PREF_FETCH_CHAPTERS_UNTIL_KNOWN = "pref_fetch_chapters_until_known";
const PREF_SCANLATOR_BLACKLIST = "pref_scanlator_blacklist";
const ALTERNATIVE_NAMES_IN_DESCRIPTION = "pref_alt_names_in_description";
const PREF_SHOW_EXTRA_INFO = "pref_show_extra_info";
const PREF_SHOW_TAGS_IN_GENRES = "pref_show_tags_in_genres";
const PREF_SCORE_POSITION = "pref_score_position";
const PREF_SOLVE_CAPTCHA = "pref_solve_captcha";
/** Per manga: what upstream keeps in the newest chapter's memo. */
const CHAPTER_LIST_STATE_PREFIX = "chapter_list_state_";

const DEFAULT_CONTENT_RATING = "suggestive";
const WEBVIEW_TIMEOUT_MS = 120_000;
const CHAPTER_LIST_TIMEOUT_MS = 20 * 60_000;
const READER_TIMEOUT_MS = 240_000;
const READER_PAGE_TIMEOUT_MS = 120_000;
const OFFICIAL_GROUP_ID = 10702;
const CHAPTER_DATA_VERSION = 1;
const TAG_ID_CACHE_SIZE = 50;
const RECENT_QUERIES_TTL_MS = 120_000;
const SCRAMBLE_PATH_FALLBACK_REGEX = /\/(?:i5|s?i+)\//;

const CAPTCHA_DISABLED = 'Open in WebView to solve the captcha, or turn on "Solve captchas" in extension settings';

type Queries = Record<string, unknown>;

interface ChapterListState {
  deduplicated: boolean;
  blacklist: string;
  version: number;
  complete: boolean;
  fetchedAt?: number;
}

/** A message the page scripts post: data, a capture message, or an error. */
interface PageMessage {
  type: string;
  message?: string;
  result?: unknown;
}

// =========================== Page scripts ============================

/**
 * Upstream's bootstrap (ad-overlay flag, reject bridge) plus the captcha handling it did with
 * request interception: the solver runs inside the site's /@waf/challenge frame, or the run
 * fails with the "Open in WebView" message when solving is off.
 */
export function bootstrapScript(solveCaptchas: boolean, flow: string): string {
  return `(function () {
  if (window.top !== window || window.__cxStarted) return;
  window.__cxStarted = true;
  try { localStorage.setItem("__pu1", "[" + Date.now() + "]"); } catch (e) {}
  var finished = false;
  var send = function (value) { if (!finished) __tachiyomi.post(typeof value === "string" ? value : JSON.stringify(value)); };
  var finish = function (value) { if (finished) return; send(value); finished = true; __tachiyomi.done(); };
  var fail = function (message) { finish({ type: "error", message: String(message && message.message || message) }); };
  window.__cxReject = fail;
  var solving = false;
  var runSolver = function (frameWindow) {
    if (solving) return;
    solving = true;
    try {
      frameWindow.eval("(" + ${JSON.stringify(SOLVE_CAPTCHA)} + "\\n)(function (message) { top.__cxReject(message); })");
    } catch (e) {
      fail("Couldn't solve the site's captcha (" + e.message + "), open in WebView to solve it");
    }
  };
  var checkCaptcha = function () {
    if (finished) return;
    if (location.pathname === "/@waf/challenge") {
      if (!${solveCaptchas}) return fail(${JSON.stringify(CAPTCHA_DISABLED)});
      if (document.readyState === "complete") runSolver(window);
      return;
    }
    var frames = document.querySelectorAll("iframe");
    for (var i = 0; i < frames.length; i++) {
      if ((frames[i].getAttribute("src") || "").indexOf("/@waf/challenge") < 0) continue;
      if (!${solveCaptchas}) return fail(${JSON.stringify(CAPTCHA_DISABLED)});
      try {
        var frameWindow = frames[i].contentWindow;
        if (frameWindow && frameWindow.location.pathname === "/@waf/challenge" && frameWindow.document.readyState === "complete") runSolver(frameWindow);
      } catch (e) {}
    }
  };
  setInterval(checkCaptcha, 500);
  var whenReady = function (start) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
  };
  ${flow}
})();`;
}

export function browseFlow(): string {
  return `whenReady(function () {
    window.__comixHarvestOptions = { timeoutMs: 60000, settleMs: 4000 };
    ${HARVEST_BROWSE}
    window.__comixHarvestPromise.then(function (result) {
      var items = (result.items || []).map(function (item) {
        return { hid: item.hid, title: item.title || "", url: item.url, poster: item.cover ? { small: item.cover, medium: item.cover, large: item.cover } : null };
      });
      var page = (result.listParams && result.listParams.page) || 1;
      var perPage = result.perPage || (result.listParams && result.listParams.limit) || 28;
      var hasNext = items.length > 0 && items.length >= perPage;
      if (result.error && !items.length) return fail(result.error);
      finish({ type: "result", result: { items: items, meta: { page: page, lastPage: hasNext ? page + 1 : page, hasNext: hasNext } } });
    }).catch(fail);
  });`;
}

export function chaptersFlow(mangaId: string, knownIds: number[]): string {
  return `var titlePath = ${JSON.stringify(`/title/${mangaId}`)};
  // Comix blocks chapter-list paging that is too fast or evenly spaced (upstream's RequestPacer)
  var nextAt = 0;
  var paceDelay = function () {
    var now = Date.now();
    var start = Math.max(now, nextAt);
    nextAt = start + 2500 + Math.floor(Math.random() * 2500);
    return start - now;
  };
  var isChapterList = function (url) {
    try {
      var segments = new URL(String(url), location.href).pathname.split("/").slice(1);
      return segments.length === 5 && segments[0] === "api" && segments[1] === "v1" && segments[2] === "manga" && segments[4] === "chapters";
    } catch (e) { return false; }
  };
  var xhrOpen = XMLHttpRequest.prototype.open;
  var xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) { this.__cxUrl = url; return xhrOpen.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    var xhr = this, args = arguments;
    if (isChapterList(xhr.__cxUrl)) {
      var delay = paceDelay();
      if (delay > 0) { setTimeout(function () { xhrSend.apply(xhr, args); }, delay); return; }
    }
    return xhrSend.apply(this, arguments);
  };
  var pageFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || String(input);
    if (isChapterList(url)) {
      var delay = paceDelay();
      if (delay > 0) return new Promise(function (resolve) { setTimeout(resolve, delay); }).then(function () { return pageFetch.call(window, input, init); });
    }
    return pageFetch.apply(window, arguments);
  };
  whenReady(function () {
    // Only on the requested title's page
    if (location.pathname !== titlePath && location.pathname.indexOf(titlePath + "-") !== 0) return;
    window.__comixHarvestOptions = { timeoutMs: 60000, settleMs: 6000, maxRounds: 1000, stopAtIds: ${JSON.stringify(knownIds)} };
    ${HARVEST_CHAPTERS}
    var dateOf = function (text) {
      var m = /(\\d+)\\s*(s|m|h|d|w|mo|mos|y|yr|yrs|min|mins|sec|secs|hr|hrs|day|days|week|weeks|month|months|year|years)\\s+ago/i.exec(text || "");
      return m ? m[1] + " " + m[2] + " ago" : "";
    };
    window.__comixHarvestPromise.then(function (result) {
      var queries = null;
      try {
        var raw = document.querySelector("script#initial-data");
        if (raw && raw.textContent) queries = JSON.parse(raw.textContent).queries || null;
      } catch (e) {}
      finish({ type: "result", result: {
        chapters: (result.chapters || []).map(function (ch) {
          return { id: ch.id, url: ch.url, number: ch.number, name: ch.name, votes: ch.votes, createdAtFormatted: dateOf(ch.text), group: ch.group, isOfficial: false };
        }),
        complete: !!result.complete,
        error: result.error || null,
        queries: queries
      } });
    }).catch(function (e) {
      finish({ type: "result", result: { chapters: [], complete: false, error: String(e), queries: null } });
    });
  });`;
}

/** Upstream's chapter_pages.js walk; with `onlyIndex`, ends as soon as that page's URL is in. */
export function readerFlow(seek: number, onlyIndex: number): string {
  return `window.__cxSeek = [${seek}, 0];
  var onlyIndex = ${onlyIndex};
  (${CHAPTER_PAGES}
  )(function (payload) {
    var message = JSON.parse(payload);
    if (message.type === "done") return finish(payload);
    send(payload);
    if (onlyIndex >= 0 && message.type === "page" && message.index === onlyIndex) finish({ type: "done" });
  }, fail, "__cxSeek", []);`;
}

const INITIAL_DATA_POLL = `(function () {
  // script#initial-data is partial while the document is still parsing
  if (document.readyState === "loading") return "";
  var raw = document.querySelector("script#initial-data");
  return raw && raw.textContent ? raw.textContent : "";
})()`;

function messagesOf(result: WebViewResult): PageMessage[] {
  return result.payloads.flatMap((payload) => {
    try {
      return [JSON.parse(payload) as PageMessage];
    } catch {
      return [];
    }
  });
}

/** The run's data, or its error, as upstream's runInWebView resolves or rejects. */
function resultOf<T>(result: WebViewResult, timeoutMessage = "Timed out waiting for WebView"): T {
  const messages = messagesOf(result);
  const error = messages.find((it) => it.type === "error");
  if (error) throw new Error(error.message ?? "WebView failed");
  const data = messages.find((it) => it.type === "result");
  if (!data) throw new Error(timeoutMessage);
  return data.result as T;
}

// ============================== Source ===============================

class Comix extends KeiSource {
  readonly name = "Comix";
  readonly lang = "en";
  readonly baseUrl = "https://comix.to";

  /** Page image URLs from reader walks, for the image rate limit (upstream's isPageImage). */
  private readonly pageImages = new Set<string>();

  private readonly tagIdCache = new Map<string, string[]>();

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
    const builder = toHttpUrl(this.baseUrl).newBuilder();
    builder.addPathSegment("browse");
    builder.addQueryParameter("order[score]", "desc");
    builder.addQueryParameter("page", String(page));
    this.applyPreferenceFilters(builder);
    return this.getMangaListFromBrowse(builder.build());
  }

  async getLatestUpdates(page: number): Promise<MangasPage> {
    const builder = toHttpUrl(this.baseUrl).newBuilder();
    builder.addPathSegment("browse");
    builder.addQueryParameter("order[chapter_updated_at]", "desc");
    builder.addQueryParameter("page", String(page));
    this.applyPreferenceFilters(builder);
    return this.getMangaListFromBrowse(builder.build());
  }

  private async getMangaListFromBrowse(url: HttpUrl): Promise<MangasPage> {
    const result = await runWebView({
      url: url.toString(),
      script: bootstrapScript(this.solveCaptchas, browseFlow()),
      timeoutMs: WEBVIEW_TIMEOUT_MS,
      loadImages: false,
    });
    const searchResponse = resultOf<SearchItems>(result);
    const base = toHttpUrl(this.baseUrl);
    const mangas = (searchResponse.items ?? []).map((it) => toBasicSManga(it, base, this.posterQuality));
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
    const hasTermSelection = filters.some((it) => isTermFilter(it) && it.hasSelection) || tagIds.length > 0;

    const builder = toHttpUrl(this.baseUrl).newBuilder().addPathSegment("browse");
    for (const filter of filters) {
      if (!isUriFilter(filter)) continue;
      if (filter.requiresTermSelection && !hasTermSelection) continue;
      filter.addToUri(builder, query);
    }
    authorIds.forEach((it) => builder.addQueryParameter("authors[]", it));
    artistIds.forEach((it) => builder.addQueryParameter("artists[]", it));
    tagIds.forEach((it) => builder.addQueryParameter("genres_in[]", it));
    if (query.trim() !== "") builder.addQueryParameter("keyword", query);
    builder.addQueryParameter("page", String(page));

    return this.getMangaListFromBrowse(builder.build());
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
    return new Filters(this.contentRating(), this.defaultTypes(), this.defaultDemographics(), this.blockedGenres());
  }

  private applyPreferenceFilters(builder: ReturnType<HttpUrl["newBuilder"]>): void {
    for (const filter of this.sourceFilters().getFilterList()) {
      if (isUriFilter(filter) && filter.isPreferenceFilter) filter.addToUri(builder);
    }
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
    const url = toHttpUrl(this.baseUrl)
      .newBuilder()
      .addPathSegments("api/v1/tags/search")
      .addQueryParameter("type", type)
      .addQueryParameter("q", name)
      .addQueryParameter("limit", "20")
      .build();
    const hits = (await this.client.get(url, Fetch.XHR)).parseAs<TagSearchResponse>().result ?? [];
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

    const deduplicate = this.preferences.getBoolean(DEDUPLICATE_CHAPTERS, false);
    const scanlatorBlacklist = this.scanlatorBlacklist();
    const blacklistSignature = [...scanlatorBlacklist].sort().join(",");
    const mangaId = substringBefore(removePrefix(manga.url, "/"), "-");
    const listMemo = this.readChapterListState(mangaId);
    const fetchUntilKnown =
      fetchChapters &&
      this.preferences.getBoolean(PREF_FETCH_CHAPTERS_UNTIL_KNOWN, true) &&
      listMemo !== null &&
      listMemo.deduplicated === deduplicate &&
      listMemo.blacklist === blacklistSignature &&
      listMemo.version === CHAPTER_DATA_VERSION &&
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
      updatedChapters = this.selectChapters(candidates, deduplicate, scanlatorBlacklist, metas);
      this.writeChapterListState(mangaId, {
        deduplicated: deduplicate,
        blacklist: blacklistSignature,
        version: CHAPTER_DATA_VERSION,
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

  // The detail page's data, reused briefly so a details and chapters refresh is one navigation
  private lastQueries: { url: string; at: number; queries: Queries } | null = null;

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
      const result = await runWebView({
        url,
        script: bootstrapScript(this.solveCaptchas, ""),
        pollScript: INITIAL_DATA_POLL,
        timeoutMs: WEBVIEW_TIMEOUT_MS,
      });
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
    return toSManga(
      detail,
      toHttpUrl(this.baseUrl),
      this.posterQuality,
      this.preferences.getBoolean(ALTERNATIVE_NAMES_IN_DESCRIPTION, false),
      this.preferences.getString(PREF_SCORE_POSITION, "top"),
      this.preferences.getBoolean(PREF_SHOW_EXTRA_INFO, true),
      this.preferences.getBoolean(PREF_SHOW_TAGS_IN_GENRES, false),
    );
  }

  override getMangaUrl(manga: SManga): string {
    return `${this.baseUrl}/title${manga.url}`;
  }

  override getChapterUrl(chapter: SChapter): string {
    return `${this.baseUrl}/${chapter.url}`;
  }

  private chapterId(chapter: SChapter, metas?: Map<string, ChapterMeta>): number | null {
    const meta = metas?.get(chapter.url);
    if (meta) return meta.id;
    const segments = Url.parse(this.getChapterUrl(chapter))?.pathSegments;
    const last = segments?.[segments.length - 1];
    if (last === undefined) return null;
    const id = substringBefore(last, "-chapter-");
    return /^-?\d+$/.test(id) ? Number(id) : null;
  }

  private async getWebViewChapterList(manga: SManga, knownIds: number[]): Promise<ChapterList> {
    const mangaId = substringBefore(removePrefix(manga.url, "/"), "-");
    const result = await runWebView({
      url: this.getMangaUrl(manga),
      script: bootstrapScript(this.solveCaptchas, chaptersFlow(mangaId, knownIds)),
      timeoutMs: CHAPTER_LIST_TIMEOUT_MS,
      loadImages: false,
    });
    return resultOf<ChapterList>(result, "Timed out reading the chapter list");
  }

  private selectChapters(
    allChapters: SChapter[],
    shouldDeduplicate: boolean,
    scanlatorBlacklist: Set<string>,
    metas: Map<string, ChapterMeta>,
  ): SChapter[] {
    const seenUrls = new Set<string>();
    const uniqueChapters = allChapters.filter((it) => (seenUrls.has(it.url) ? false : (seenUrls.add(it.url), true)));
    const groupId = (chapter: SChapter) => metas.get(chapter.url)?.groupId ?? null;
    const filteredChapters =
      scanlatorBlacklist.size === 0
        ? uniqueChapters
        : uniqueChapters.filter(
            (chapter) =>
              !scanlatorBlacklist.has((chapter.scanlator ?? "").trim().toLowerCase()) &&
              !(groupId(chapter) !== null && scanlatorBlacklist.has(String(groupId(chapter)))),
          );

    let finalChapters = filteredChapters;
    if (shouldDeduplicate) {
      const chapterMap = new Map<number, SChapter>();
      const votes = (chapter: SChapter) => metas.get(chapter.url)?.votes ?? 0;
      const isOfficial = (chapter: SChapter) => metas.get(chapter.url)?.official === true;
      for (const ch of filteredChapters) {
        const key = ch.chapter_number;
        const current = chapterMap.get(key);
        if (current === undefined) {
          chapterMap.set(key, ch);
          continue;
        }
        const newIsOfficial = isOfficial(ch);
        const currentIsOfficial = isOfficial(current);
        const newIsOfficialGroup = groupId(ch) === OFFICIAL_GROUP_ID;
        const currentIsOfficialGroup = groupId(current) === OFFICIAL_GROUP_ID;
        let better: boolean;
        if (newIsOfficial && !currentIsOfficial) better = true;
        else if (!newIsOfficial && currentIsOfficial) better = false;
        else if (newIsOfficialGroup && !currentIsOfficialGroup) better = true;
        else if (!newIsOfficialGroup && currentIsOfficialGroup) better = false;
        else if (votes(ch) !== votes(current)) better = votes(ch) > votes(current);
        else better = (this.chapterId(ch, metas) ?? 0) > (this.chapterId(current, metas) ?? 0);
        if (better) chapterMap.set(key, ch);
      }
      finalChapters = [...chapterMap.values()];
    }
    return [...finalChapters].sort((a, b) => b.chapter_number - a.chapter_number);
  }

  private readChapterListState(mangaId: string): ChapterListState | null {
    const raw = this.preferences.getString(CHAPTER_LIST_STATE_PREFIX + mangaId, "");
    if (raw === "") return null;
    try {
      return JSON.parse(raw) as ChapterListState;
    } catch {
      return null;
    }
  }

  private writeChapterListState(mangaId: string, state: ChapterListState): void {
    this.preferences.edit().putString(CHAPTER_LIST_STATE_PREFIX + mangaId, JSON.stringify(state)).apply();
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
  ): Promise<{ total: number | null; pages: Map<number, string>; error: string | null }> {
    const result = await runWebView({
      url: chapterUrl,
      script: bootstrapScript(this.solveCaptchas, readerFlow(seek, onlyIndex)),
      timeoutMs,
      loadImages: true,
    });
    let total: number | null = null;
    let error: string | null = result.timedOut ? "Timed out loading the reader" : null;
    const pages = new Map<number, string>();
    for (const message of messagesOf(result) as (PageMessage & CaptureMessage)[]) {
      if (message.type === "total" && message.total != null) total = message.total;
      else if (message.type === "page" && message.index != null && message.url) {
        pages.set(message.index, message.url);
        this.pageImages.add(message.url);
      } else if (message.type === "error") error = message.message ?? "WebView failed";
    }
    return { total, pages, error };
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
      info = {
        seed: response.header("x-scramble-seed"),
        grid: response.header("x-scramble-grid"),
        algo: response.header("x-scramble-algo"),
        hash: response.header("x-scramble-hash"),
      };
    }
    const seed = scrambleSeed(info);
    return seed === null ? null : descrambleTransform(width, height, seed, info.algo);
  }

  // ============================== Filters ==============================

  override getFilterList(): FilterList {
    return this.sourceFilters().getFilterList();
  }

  // ============================ Preferences ============================

  private get solveCaptchas(): boolean {
    return this.preferences.getBoolean(PREF_SOLVE_CAPTCHA, false);
  }

  private get posterQuality(): string {
    return this.preferences.getString(PREF_POSTER_QUALITY, "large");
  }

  private scanlatorBlacklist(): Set<string> {
    return new Set(
      this.preferences
        .getString(PREF_SCANLATOR_BLACKLIST, "")
        .split(",")
        .map((it) => it.trim().toLowerCase())
        .filter((it) => it !== ""),
    );
  }

  private defaultTypes(): Set<string> {
    return this.preferences.getStringSet(PREF_DEFAULT_TYPES, getTypes().map(([, value]) => value));
  }

  private defaultDemographics(): Set<string> {
    const all = getDemographics().map(([, value]) => value);
    const selected = this.preferences.getStringSet(PREF_DEFAULT_DEMOGRAPHICS, all);
    return selected.size === 0 ? new Set(all) : selected;
  }

  private blockedGenres(): Set<string> {
    return this.preferences.getStringSet(PREF_BLOCKED_GENRES, []);
  }

  // The legacy "Hide NSFW" boolean still exists in some users' preferences;
  // map it to a sensible default until they pick a value explicitly.
  private contentRating(): string {
    const unset = "\u0000";
    const stored = this.preferences.getString(PREF_CONTENT_RATING, unset);
    if (stored !== unset) return stored;
    if (!this.preferences.getBoolean(LEGACY_HIDE_NSFW_PREF, true)) return "";
    return DEFAULT_CONTENT_RATING;
  }

  override setupPreferenceScreen(screen: PreferenceScreen): void {
    screen.addPreference(
      new SwitchPreferenceCompat({
        key: PREF_SOLVE_CAPTCHA,
        title: "Solve captchas",
        summary: "Solve the site's \"Verify you're human\" captcha automatically",
        defaultValue: false,
      }),
    );
    screen.addPreference(
      new SwitchPreferenceCompat({
        key: PREF_FETCH_CHAPTERS_UNTIL_KNOWN,
        title: "Faster chapter list fetching",
        summary:
          "Enabled: Uses fewer requests, but may miss newly added older chapters " +
          "(e.g. chapter 5.5 when the latest known chapter is 150).\n\n" +
          "Disabled: Finds older chapter additions, but fetching large chapter lists is slower.",
        defaultValue: true,
      }),
    );
    screen.addPreference(
      new ListPreference({
        key: PREF_POSTER_QUALITY,
        title: "Thumbnail Quality",
        summary: "Change the quality of the thumbnail. Current: %s.",
        entries: ["Small", "Medium", "Large"],
        entryValues: ["small", "medium", "large"],
        defaultValue: "large",
      }),
    );
    screen.addPreference(
      new ListPreference({
        key: PREF_CONTENT_RATING,
        title: "Content rating",
        summary:
          "Maximum content rating shown in popular, latest, and search results. " +
          "The Content rating filter in search overrides this. Current: %s.",
        entries: ["Show all", "Safe only", "Up to Suggestive", "Up to Erotica", "Up to Pornographic"],
        entryValues: ["", "safe", "suggestive", "erotica", "pornographic"],
        defaultValue: DEFAULT_CONTENT_RATING,
      }),
    );
    screen.addPreference(
      new MultiSelectListPreference({
        key: PREF_DEFAULT_TYPES,
        title: "Default types",
        summary: "Types to include in popular, latest, and search results. The Type filter in search overrides this.",
        entries: getTypes().map(([title]) => title),
        entryValues: getTypes().map(([, value]) => value),
        defaultValue: getTypes().map(([, value]) => value),
      }),
    );
    screen.addPreference(
      new MultiSelectListPreference({
        key: PREF_DEFAULT_DEMOGRAPHICS,
        title: "Default demographics",
        summary:
          "Unticked demographics are hidden from popular, latest, and search results. " +
          "The Demographic filter in search overrides this.",
        entries: getDemographics().map(([title]) => title),
        entryValues: getDemographics().map(([, value]) => value),
        defaultValue: getDemographics().map(([, value]) => value),
      }),
    );
    screen.addPreference(
      new MultiSelectListPreference({
        key: PREF_BLOCKED_GENRES,
        title: "Blocked genres",
        summary: "Genres always excluded from results. The search filter can still include a blocked genre as a one-off override.",
        entries: getGenres().map(([title]) => title),
        entryValues: getGenres().map(([, value]) => value),
        defaultValue: [],
      }),
    );
    screen.addPreference(
      new SwitchPreferenceCompat({
        key: DEDUPLICATE_CHAPTERS,
        title: "Deduplicate Chapters",
        summary:
          "Remove duplicate chapters from the chapter list.\n" +
          "Official chapters (Comix-marked) are preferred, followed by the highest-voted or most recent.\n" +
          "Warning: It can be slow on large lists.",
        defaultValue: false,
      }),
    );
    screen.addPreference(
      new EditTextPreference({
        key: PREF_SCANLATOR_BLACKLIST,
        title: "Scanlator Blacklist",
        summary:
          "Filter out chapters from specific groups. Comma-separated list of group names or group IDs (e.g., 'Violet Scans, 307').",
        defaultValue: "",
      }),
    );
    screen.addPreference(
      new SwitchPreferenceCompat({ key: ALTERNATIVE_NAMES_IN_DESCRIPTION, title: "Show Alternative Names in Description", defaultValue: false }),
    );
    screen.addPreference(
      new SwitchPreferenceCompat({
        key: PREF_SHOW_EXTRA_INFO,
        title: "Show extra info in description",
        summary:
          "Append publication year, language, content rating, rank, ratings count, follower count, and tracker links to the manga description.",
        defaultValue: true,
      }),
    );
    screen.addPreference(
      new SwitchPreferenceCompat({
        key: PREF_SHOW_TAGS_IN_GENRES,
        title: "Show tags in genre chips",
        summary:
          "Include the site's narrative tag list (e.g. Demons, Vampires, Time Travel) alongside the curated genres in the " +
          "manga details. Off by default — the curated set matches what the site itself shows on the page.",
        defaultValue: false,
      }),
    );
    screen.addPreference(
      new ListPreference({
        key: PREF_SCORE_POSITION,
        title: "Score display position",
        summary: "%s",
        entries: ["Top of description", "Bottom of description", "Don't show"],
        entryValues: ["top", "bottom", "none"],
        defaultValue: "top",
      }),
    );
  }
}

function mangaDetail(queries: Queries): Manga {
  const entry = Object.entries(queries).find(([key]) => key.includes('"detail"'));
  if (!entry || !entry[1] || typeof entry[1] !== "object") throw new Error("Could not find manga detail in queries");
  return entry[1] as Manga;
}

function scrambleInfoFromFragment(fragment: string | null): ScrambleInfo | null {
  if (!fragment?.startsWith("scramble=")) return null;
  const [seed, grid, algo, hash] = fragment.slice("scramble=".length).split(",");
  const orNull = (value: string | undefined) => (value === undefined || value === "" ? null : value);
  return { seed: orNull(seed), grid: orNull(grid), algo: orNull(algo), hash: orNull(hash) };
}

export default defineExtension([new Comix()]);
