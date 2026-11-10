// Port of src/all/mangafire/.../MangaFire.kt @ d9420cd1. Method names follow the original.
//
// The SDK has no interceptors, so every /api/ request goes through `apiGet`, which does what
// upstream's two interceptors do: VrfSigner (sort the query, add `vrf`) and
// ChallengeSolverInterceptor (on 403 `captcha_required`, solve the shape captcha in a WebView with
// upstream's own solver page, then retry once).
import {
  type ClientBuilder,
  defineExtension,
  Fetch,
  type FilterList,
  type Headers,
  type HttpUrl,
  KeiSource,
  MangasPage,
  MultiSelectListPreference,
  Page,
  type PreferenceScreen,
  type Response,
  runWebView,
  type SChapter,
  type SManga,
  Separator,
  SMangaUpdate,
  substringAfterLast,
  substringBefore,
  removeSuffix,
  SwitchPreferenceCompat,
  toHttpUrl,
} from "@sdk";
import {
  type ApiResponse,
  type ChapterDto,
  chapterToSChapter,
  detailsToSManga,
  type MangaDetailsResponse,
  type MangaDto,
  mangaToSManga,
  type PagesResponse,
  type TagResponse,
  type VolumeDto,
  volumeToSChapter,
} from "./dto";
import {
  AuthorFilter,
  CONTENT_RATINGS,
  ContentRatingFilter,
  GenreFilter,
  GenreModeFilter,
  isUriFilter,
  MinChapterFilter,
  SortFilter,
  StatusFilter,
  ThemeFilter,
  TypeFilter,
  YearFromFilter,
  YearToFilter,
} from "./filters";
import { OPENCV_URL, SOLVER_SCRIPT } from "./solver";
import { signUrl } from "./vrf";

const CONTENT_RATING_PREF = "pref_content_rating";
const PREF_SHOW_AS_VOLUMES = "show_as_volumes";
const PREF_MERGE_CHAPTERS = "merge_chapters";
const PREF_PREFER_OFFICIAL = "prefer_official";
const PREF_SOLVE_CAPTCHA = "solve_captcha";
const SUMMARY_MSG = "Requires Chapter List Refresh to Apply";

const CAPTCHA_DETECTED =
  "Shape-selecting captcha detected. Open in WebView to solve manually or turn on the setting to solve automatically.";
const CAPTCHA_FAILED = "Failed to solve shape-selecting captcha. Open in WebView to solve manually.";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Captcha solves are shared by every language source (one cookie jar), as upstream's lock. */
let solving: Promise<boolean> | null = null;

/**
 * Runs upstream's solver.html on https://mangafire.to/@waf/solver (a same-origin 404 page) in a
 * hidden WebView: the injected script loads OpenCV.js and evaluates the solver, whose
 * `bridge.postMessage` ends the run. The `waf_pass` cookie lands in the shared cookie store.
 */
export function solverPageScript(): string {
  return `(function () {
  if (window.top !== window || window.__mfSolverStarted) return;
  window.__mfSolverStarted = true;
  window.bridge = { postMessage: function (message) { __tachiyomi.post(String(message)); __tachiyomi.done(); } };
  var ready = function () {
    return new Promise(function (resolve, reject) {
      var deadline = Date.now() + 60000;
      (function check() {
        try {
          if (typeof cv !== "undefined") {
            if (cv.Mat) return resolve();
            if (typeof cv.then === "function") {
              cv.then(function (module) { window.cv = module; delete module.then; resolve(); });
              return;
            }
          }
        } catch (e) {}
        if (Date.now() > deadline) return reject(new Error("OpenCV.js did not load"));
        setTimeout(check, 200);
      })();
    });
  };
  var start = function () {
    var script = document.createElement("script");
    script.src = ${JSON.stringify(OPENCV_URL)};
    script.onload = function () {
      ready().then(function () { (0, eval)(${JSON.stringify(SOLVER_SCRIPT)}); }, function () { bridge.postMessage("false"); });
    };
    script.onerror = function () { bridge.postMessage("false"); };
    (document.head || document.documentElement).appendChild(script);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();`;
}

class MangaFire extends KeiSource {
  readonly name = "MangaFire";
  readonly baseUrl = "https://mangafire.to";

  constructor(readonly lang: string) {
    super();
  }

  private get langCode(): string {
    switch (this.lang) {
      case "es-419":
        return "es-la";
      case "pt-BR":
        return "pt-br";
      default:
        return this.lang;
    }
  }

  protected override configureClient(builder: ClientBuilder): void {
    builder.rateLimit(2);
  }

  protected override configureHeaders(headers: Headers): Headers {
    headers["Accept"] = "application/json";
    return headers;
  }

  // ============================== Requests =============================

  /** `client.get(url, Fetch.XHR)` through upstream's VrfSigner and ChallengeSolverInterceptor. */
  private async apiGet(url: HttpUrl | string): Promise<Response> {
    const signed = signUrl(typeof url === "string" ? toHttpUrl(url) : url);
    const response = await this.client.get(signed, { fetch: Fetch.XHR, ensureSuccess: false });
    if (!MangaFire.isCaptcha(response)) return MangaFire.ensureSuccess(response);

    if (!this.solveCaptcha) throw new Error(CAPTCHA_DETECTED);
    const solved = await this.solveChallenge();
    if (!solved) throw new Error(CAPTCHA_FAILED);

    return MangaFire.ensureSuccess(await this.client.get(signed, { fetch: Fetch.XHR, ensureSuccess: false }));
  }

  private static isCaptcha(response: Response): boolean {
    if (response.code !== 403) return false;
    try {
      return (response.parseAs<{ error?: string | null }>()?.error ?? null) === "captcha_required";
    } catch {
      return false;
    }
  }

  private static ensureSuccess(response: Response): Response {
    if (!response.isSuccessful) throw new Error(`HTTP error ${response.code}`);
    return response;
  }

  private solveChallenge(): Promise<boolean> {
    // A solve already running for another call counts for this one too
    if (solving) return solving;
    const run = (async () => {
      try {
        const result = await runWebView({
          url: `https://${toHttpUrl(this.baseUrl).host}/@waf/solver`,
          script: solverPageScript(),
          timeoutMs: 120_000,
        });
        return result.payloads.includes("true");
      } catch {
        return false;
      }
    })();
    solving = run;
    void run.finally(() => {
      if (solving === run) solving = null;
    });
    return run;
  }

  // ============================== Popular ==============================

  async getPopularManga(page: number): Promise<MangasPage> {
    const builder = toHttpUrl(`${this.baseUrl}/api/titles`).newBuilder();
    builder.addQueryParameter("order[views_30d]", "desc");
    builder.addQueryParameter("languages[]", this.langCode);
    builder.addQueryParameter("page", String(page));
    builder.addQueryParameter("limit", "50");
    new ContentRatingFilter(this.contentRating).addToUri(builder);
    return this.parseMangaList(await this.apiGet(builder.build()));
  }

  // ============================== Latest ===============================

  async getLatestUpdates(page: number): Promise<MangasPage> {
    const builder = toHttpUrl(`${this.baseUrl}/api/titles`).newBuilder();
    builder.addQueryParameter("order[chapter_updated_at]", "desc");
    builder.addQueryParameter("languages[]", this.langCode);
    builder.addQueryParameter("page", String(page));
    builder.addQueryParameter("limit", "50");
    new ContentRatingFilter(this.contentRating).addToUri(builder);
    return this.parseMangaList(await this.apiGet(builder.build()));
  }

  private parseMangaList(response: Response): MangasPage {
    const data = response.parseAs<ApiResponse<MangaDto>>();
    const mangas = (data.items ?? []).map(mangaToSManga);
    return new MangasPage(mangas, data.meta?.hasNext ?? false);
  }

  // ============================== Search ===============================

  private readonly authorIdCache = new Map<string, string>();

  async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    const authorQuery = ((filters.find((it) => it instanceof AuthorFilter) as AuthorFilter | undefined)?.state ?? "").trim();
    let authorId: string | null = null;

    if (authorQuery !== "") {
      authorId = this.authorIdCache.get(authorQuery) ?? null;
      if (authorId === null) {
        const tagUrl = toHttpUrl(`${this.baseUrl}/api/tags`).newBuilder().addQueryParameter("keyword", authorQuery).build();
        const tags = (await this.apiGet(tagUrl)).parseAs<TagResponse>();
        const id = (tags.data ?? []).find((it) => it.type === "author" || it.type === "artist")?.id;
        authorId = id != null ? String(id) : null;
        if (authorId !== null) {
          this.authorIdCache.set(authorQuery, authorId);
          if (this.authorIdCache.size > 20) this.authorIdCache.delete(this.authorIdCache.keys().next().value!);
        }
      }
      if (authorId === null) return new MangasPage([], false);
    }

    const builder = toHttpUrl(`${this.baseUrl}/api/titles`).newBuilder();
    if (query.trim() !== "") builder.addQueryParameter("keyword", query.trim());
    builder.addQueryParameter("languages[]", this.langCode);
    builder.addQueryParameter("page", String(page));
    builder.addQueryParameter("limit", "50");
    if (authorId !== null) builder.addQueryParameter("authors[]", authorId);
    for (const filter of filters) if (isUriFilter(filter)) filter.addToUri(builder);

    return this.parseMangaList(await this.apiGet(builder.build()));
  }

  // ============================== Details ==============================

  protected override async getMangaByUrl(url: HttpUrl): Promise<SManga | null> {
    if (url.host !== toHttpUrl(this.baseUrl).host || url.pathSegments.length < 2) return null;
    return this.fetchMangaDetails(this.getHid(url.pathSegments[1]));
  }

  async fetchMangaUpdate(
    manga: SManga,
    chapters: SChapter[],
    fetchDetails: boolean,
    fetchChapters: boolean,
  ): Promise<SMangaUpdate> {
    const hid = this.getHid(manga.url);
    const [details, chapterList] = await Promise.all([
      fetchDetails ? this.fetchMangaDetails(hid) : Promise.resolve(manga),
      fetchChapters ? this.fetchChapters(manga) : Promise.resolve(chapters),
    ]);
    return new SMangaUpdate(details, chapterList);
  }

  private async fetchMangaDetails(hid: string): Promise<SManga> {
    return detailsToSManga((await this.apiGet(`${this.baseUrl}/api/titles/${hid}`)).parseAs<MangaDetailsResponse>().data);
  }

  private async fetchChapters(manga: SManga): Promise<SChapter[]> {
    let displayVolumes = this.showAsVolumes;
    let chapters: SChapter[] = [];
    const hid = this.getHid(manga.url);

    if (displayVolumes) {
      const volumes = (await this.apiGet(`${this.baseUrl}/api/titles/${hid}/volumes`)).parseAs<ApiResponse<VolumeDto>>().items ?? [];
      if (volumes.length > 0) {
        volumes.filter((it) => it.language === this.langCode).forEach((it) => chapters.push(volumeToSChapter(it, manga.url)));
      } else {
        displayVolumes = false; // Fallback to chapter display
      }
    }

    if (!displayVolumes) {
      chapters.push(...(await this.fetchAllChapters(hid)).map((it) => chapterToSChapter(it, manga.url, this.langCode)));
    }

    if (!displayVolumes && this.mergeChapters) {
      const preferOfficial = this.preferOfficial;
      // Kotlin's sortedBy on a Boolean: false first, stable
      const key = (chapter: SChapter) => {
        const isOfficial = (chapter.scanlator ?? "").toLowerCase() === "official";
        return (preferOfficial ? !isOfficial : isOfficial) ? 1 : 0;
      };
      const seen = new Set<number>();
      chapters = [...chapters]
        .sort((a, b) => key(a) - key(b))
        .filter((it) => (seen.has(it.chapter_number) ? false : (seen.add(it.chapter_number), true)))
        .sort((a, b) => b.chapter_number - a.chapter_number);
    }
    return chapters;
  }

  private chaptersUrl(hid: string, page: number): HttpUrl {
    return toHttpUrl(`${this.baseUrl}/api/titles/${hid}/chapters`)
      .newBuilder()
      .addQueryParameter("language", this.langCode)
      .addQueryParameter("sort", "number")
      .addQueryParameter("order", "desc")
      .addQueryParameter("page", String(page))
      .addQueryParameter("limit", "200")
      .build();
  }

  private async fetchAllChapters(hid: string): Promise<ChapterDto[]> {
    const firstData = (await this.apiGet(this.chaptersUrl(hid, 1))).parseAs<ApiResponse<ChapterDto>>();
    const lastPage = firstData.meta?.lastPage ?? 1;
    const allItems = [...(firstData.items ?? [])];
    if (lastPage > 1) {
      const pages = Array.from({ length: lastPage - 1 }, (_, index) => index + 2);
      const rest = await Promise.all(
        pages.map(async (page) => (await this.apiGet(this.chaptersUrl(hid, page))).parseAs<ApiResponse<ChapterDto>>().items ?? []),
      );
      rest.forEach((items) => allItems.push(...items));
    }
    return allItems;
  }

  // =============================== Pages ===============================

  async getPageList(chapter: SChapter): Promise<Page[]> {
    const segments = toHttpUrl(this.baseUrl + chapter.url).pathSegments;
    const last = segments[segments.length - 1];

    let url: string;
    if (segments.includes("volume")) {
      url = `${this.baseUrl}/api/volumes/${last}`;
    } else {
      const chapterId = substringBefore(last, "-");
      if (!/^-?\d+$/.test(chapterId)) throw new Error("Refresh manga");
      url = `${this.baseUrl}/api/chapters/${chapterId}`;
    }

    const data = (await this.apiGet(url)).parseAs<PagesResponse>();
    return data.data.pages.map((page, index) => new Page(index, "", page.url));
  }

  // ============================== Filters ==============================

  override getFilterList(): FilterList {
    return [
      new ContentRatingFilter(this.contentRating),
      new Separator(),
      new TypeFilter(),
      new Separator(),
      new GenreModeFilter(),
      new GenreFilter(),
      new Separator(),
      new ThemeFilter(),
      new Separator(),
      new StatusFilter(),
      new Separator(),
      new AuthorFilter(),
      new YearFromFilter(),
      new YearToFilter(),
      new MinChapterFilter(),
      new Separator(),
      new SortFilter(),
    ];
  }

  // ============================= Utilities =============================

  private getHid(url: string): string {
    const lastPart = substringAfterLast(removeSuffix(url, "/"), "/");
    if (lastPart.includes(".")) return substringAfterLast(lastPart, ".");
    if (lastPart.includes("-")) return substringBefore(lastPart, "-");
    return lastPart;
  }

  // ========================= Preferences =========================

  private get contentRating(): Set<string> {
    return this.preferences.getStringSet(CONTENT_RATING_PREF, []);
  }

  private get showAsVolumes(): boolean {
    return this.preferences.getBoolean(PREF_SHOW_AS_VOLUMES, false);
  }

  private get mergeChapters(): boolean {
    return this.preferences.getBoolean(PREF_MERGE_CHAPTERS, false);
  }

  private get preferOfficial(): boolean {
    return this.preferences.getBoolean(PREF_PREFER_OFFICIAL, true);
  }

  private get solveCaptcha(): boolean {
    return this.preferences.getBoolean(PREF_SOLVE_CAPTCHA, false);
  }

  override setupPreferenceScreen(screen: PreferenceScreen): void {
    screen.addPreference(
      new MultiSelectListPreference({
        key: CONTENT_RATING_PREF,
        title: "Content Rating (All by default)",
        entries: CONTENT_RATINGS.map(capitalize),
        entryValues: CONTENT_RATINGS,
        summary: [...this.contentRating].map(capitalize).join(", "),
        defaultValue: [],
      }),
    );
    screen.addPreference(
      new SwitchPreferenceCompat({ key: PREF_SHOW_AS_VOLUMES, title: "Prefer Volume Release", summary: SUMMARY_MSG, defaultValue: false }),
    );
    screen.addPreference(
      new SwitchPreferenceCompat({ key: PREF_MERGE_CHAPTERS, title: "Merge duplicate chapters", summary: SUMMARY_MSG, defaultValue: false }),
    );
    // Upstream enables this only while "Merge duplicate chapters" is on; the SDK has no dependencies
    screen.addPreference(
      new SwitchPreferenceCompat({
        key: PREF_PREFER_OFFICIAL,
        title: "Prefer official chapters",
        summary: "Used when \"Merge duplicate chapters\" is on",
        defaultValue: true,
      }),
    );
    screen.addPreference(
      new SwitchPreferenceCompat({
        key: PREF_SOLVE_CAPTCHA,
        title: "Automatically solve shape-selecting captcha",
        defaultValue: false,
      }),
    );
  }
}

export default defineExtension(["en", "es", "es-419", "fr", "ja", "pt", "pt-BR"].map((lang) => new MangaFire(lang)));
