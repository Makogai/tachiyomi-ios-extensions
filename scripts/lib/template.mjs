// The files `npm run new` writes for a standalone (non-theme) source: the standard layout
// (docs/ADDING-A-SOURCE.md#the-layout) with working placeholder code for an HTML site. Every
// line a contributor must change is marked `TODO(new)`; `npm run validate` fails while one is left.

export const TODO_MARKER = "TODO(new)";
const DOCS = "docs/ADDING-A-SOURCE.md";

/**
 * @param {object} options
 * @param {string} options.header        first-line text after "// " naming upstream (or the site), without the role
 * @param {string} options.className
 * @param {string} options.sourceFields  the class's name/lang/baseUrl/id lines
 * @param {string} options.langsConst    the LANGS constant for one-source-per-language extensions, or ""
 * @param {string} options.sourcesList   what defineExtension receives
 * @returns {Record<string, string>} file name → content
 */
export function standaloneFiles({ header, className, sourceFields, langsConst, sourcesList }) {
  const head = (role) => `// ${header}: ${role}`;

  const indexTs = `${head("the source class.")}${header.startsWith("Port of") ? " Method names follow the original." : ""}
//
// The flow only: each call builds its URL in api.ts, fetches it with this.client and hands the
// response to parse.ts. Filters are in filters.ts, settings in settings.ts. Each method links to
// the section of ${DOCS} that explains it; src/en/weebcentral is a finished example.
import {
  defineExtension,
  Fetch,
  type FilterList,
  KeiSource,
  type MangasPage,
  type Page,
  type PreferenceScreen,
  type SChapter,
  type SManga,
  SMangaUpdate,
} from "@sdk";
import { chapterListUrl, latestUpdatesUrl, mangaDetailsUrl, pageListUrl, popularMangaUrl, searchMangaUrl } from "./api";
import { getFilterList } from "./filters";
import { chapterListParse, mangaDetailsParse, pageListParse, searchMangaParse } from "./parse";
import * as settings from "./settings";
${langsConst}
class ${className} extends KeiSource {
${sourceFields}

  // Rate limits, cookies and headers for every request: ${DOCS}#rate-limits-headers-cookies
  // protected override configureClient(builder: ClientBuilder): void {
  //   builder.rateLimit(2, seconds(1));
  // }

  // ============================== Popular ===============================
  // ${DOCS}#popular-and-latest

  async getPopularManga(page: number): Promise<MangasPage> {
    const document = (await this.client.get(popularMangaUrl(this.baseUrl, page), Fetch.DOCUMENT)).asJsoup();
    return searchMangaParse(document);
  }

  // =============================== Latest ===============================
  // ${DOCS}#popular-and-latest (a site without a latest list: \`override readonly supportsLatest = false\`)

  async getLatestUpdates(page: number): Promise<MangasPage> {
    const document = (await this.client.get(latestUpdatesUrl(this.baseUrl, page), Fetch.DOCUMENT)).asJsoup();
    return searchMangaParse(document);
  }

  // =============================== Search ===============================
  // ${DOCS}#search

  async getSearchMangaList(page: number, query: string, filters: FilterList): Promise<MangasPage> {
    const document = (await this.client.get(searchMangaUrl(this.baseUrl, page, query, filters), Fetch.DOCUMENT)).asJsoup();
    return searchMangaParse(document);
  }

  // A pasted link opens the manga: ${DOCS}#opening-a-manga-from-a-url-deep-links
  // protected override async getMangaByUrl(url: HttpUrl): Promise<SManga | null> { … }

  // ======================== Details and chapters ========================
  // ${DOCS}#details-and-chapters

  async fetchMangaUpdate(manga: SManga, chapters: SChapter[], fetchDetails: boolean, fetchChapters: boolean): Promise<SMangaUpdate> {
    const [updatedManga, updatedChapters] = await Promise.all([
      fetchDetails ? this.getMangaDetails(manga) : Promise.resolve(manga),
      fetchChapters ? this.getChapterList(manga) : Promise.resolve(chapters),
    ]);
    return new SMangaUpdate(updatedManga, updatedChapters);
  }

  private async getMangaDetails(manga: SManga): Promise<SManga> {
    const document = (await this.client.get(mangaDetailsUrl(this.baseUrl, manga.url), Fetch.DOCUMENT)).asJsoup();
    return mangaDetailsParse(document);
  }

  private async getChapterList(manga: SManga): Promise<SChapter[]> {
    const document = (await this.client.get(chapterListUrl(this.baseUrl, manga.url), Fetch.DOCUMENT)).asJsoup();
    return chapterListParse(document);
  }

  // =============================== Pages ================================
  // ${DOCS}#pages (headers for images: #image-requests, scrambled images: #scrambled-images-image-interceptors)

  async getPageList(chapter: SChapter): Promise<Page[]> {
    const document = (await this.client.get(pageListUrl(this.baseUrl, chapter.url), Fetch.DOCUMENT)).asJsoup();
    return pageListParse(document);
  }

  // ========================= Filters and settings =========================
  // ${DOCS}#filters and ${DOCS}#settings-preferences

  override getFilterList(): FilterList {
    return getFilterList();
  }

  override setupPreferenceScreen(screen: PreferenceScreen): void {
    settings.setupPreferenceScreen(screen);
  }
}

export default defineExtension(${sourcesList});
`;

  const apiTs = `${head("request URLs.")}
//
// One function per request the source makes, pure (no fetching): they take what the URL needs
// and return it. Keep upstream's names where it has them (popularMangaRequest → popularMangaUrl).
import { type FilterList, type HttpUrl, toHttpUrl } from "@sdk";
import { isUriFilter } from "./filters";

// ${DOCS}#popular-and-latest
export function popularMangaUrl(baseUrl: string, page: number): HttpUrl {
  return toHttpUrl(\`\${baseUrl}/popular\`).newBuilder().addQueryParameter("page", String(page)).build(); // ${TODO_MARKER}: the site's popular list
}

export function latestUpdatesUrl(baseUrl: string, page: number): HttpUrl {
  return toHttpUrl(\`\${baseUrl}/latest\`).newBuilder().addQueryParameter("page", String(page)).build(); // ${TODO_MARKER}: the site's latest updates
}

// ${DOCS}#search
export function searchMangaUrl(baseUrl: string, page: number, query: string, filters: FilterList): HttpUrl {
  const url = toHttpUrl(\`\${baseUrl}/search\`).newBuilder(); // ${TODO_MARKER}: the site's search
  url.addQueryParameter("q", query);
  url.addQueryParameter("page", String(page));
  for (const filter of filters) {
    if (isUriFilter(filter)) filter.addToUri(url);
  }
  return url.build();
}

// ${DOCS}#details-and-chapters
export function mangaDetailsUrl(baseUrl: string, mangaUrl: string): string {
  return baseUrl + mangaUrl;
}

export function chapterListUrl(baseUrl: string, mangaUrl: string): string {
  return baseUrl + mangaUrl; // ${TODO_MARKER}: often the details page; some sites have a separate list
}

// ${DOCS}#pages
export function pageListUrl(baseUrl: string, chapterUrl: string): string {
  return baseUrl + chapterUrl;
}
`;

  const parseTs = `${head("the site's responses → SManga, SChapter and Page.")}
//
// Pure functions from a parsed page (or a DTO from dto.ts) to the models: no requests, no
// settings lookups (pass what they need as arguments). Every selector below is a placeholder.
import { type Document, type Element, MangasPage, Page, parseDate, SChapter, SManga } from "@sdk";

// ${DOCS}#popular-and-latest

/** Popular, latest and search share one list layout on most sites; split it when they differ. */
export function searchMangaParse(document: Document): MangasPage {
  const mangas = document.select("div.manga-card").map(searchMangaFromElement); // ${TODO_MARKER}: one entry of the list
  const hasNextPage = document.selectFirst("a.next") !== null; // ${TODO_MARKER}: the next-page link
  return new MangasPage([...mangas], hasNextPage);
}

function searchMangaFromElement(element: Element): SManga {
  const manga = SManga.create();
  const link = element.expectFirst("a");
  manga.setUrlWithoutDomain(link.absUrl("href")); // store paths, not full URLs
  manga.title = link.text();
  manga.thumbnail_url = element.selectFirst("img")?.absUrl("src") ?? null;
  return manga;
}

// ${DOCS}#details-and-chapters

export function mangaDetailsParse(document: Document): SManga {
  const manga = SManga.create();
  manga.title = document.expectFirst("h1").text(); // ${TODO_MARKER}: the details selectors
  manga.author = document.selectFirst(".author")?.text() ?? null;
  manga.description = document.selectFirst(".description")?.text() ?? null;
  manga.genre = document.select(".genres a").eachText().join(", ");
  manga.status = parseStatus(document.selectFirst(".status")?.text() ?? "");
  manga.thumbnail_url = document.selectFirst(".cover img")?.absUrl("src") ?? null;
  return manga;
}

function parseStatus(status: string): number {
  switch (status.trim().toLowerCase()) {
    case "ongoing":
      return SManga.ONGOING;
    case "completed":
      return SManga.COMPLETED;
    default:
      return SManga.UNKNOWN;
  }
}

/** Newest first, as the app expects. */
export function chapterListParse(document: Document): SChapter[] {
  return document.select("ul.chapters > li").map((element) => { // ${TODO_MARKER}: one chapter row
    const chapter = SChapter.create();
    const link = element.expectFirst("a");
    chapter.setUrlWithoutDomain(link.absUrl("href"));
    chapter.name = link.text();
    chapter.date_upload = parseDate(element.selectFirst(".date")?.text() ?? "", "MMM d, yyyy");
    return chapter;
  });
}

// ${DOCS}#pages

export function pageListParse(document: Document): Page[] {
  return document.select("div.reader img").map((element, index) => new Page(index, "", element.absUrl("src"))); // ${TODO_MARKER}: the page images
}
`;

  const dtoTs = `${head("response types.")}
//
// For sites with a JSON API: one interface per response, named after upstream's @Serializable
// classes, fields as the API sends them. Read a response with \`response.parseAs<SearchDto>()\`
// and map it in parse.ts. ${DOCS}#json-apis-dtots. Delete this file if the site only serves HTML.

export interface SearchDto {
  data: MangaDto[];
  hasNextPage: boolean;
}

export interface MangaDto {
  slug: string;
  title: string;
  cover?: string | null;
}
`;

  const filtersTs = `${head("the search filters.")}
//
// ${DOCS}#filters. Each filter that changes the search URL implements UriFilter; searchMangaUrl
// (api.ts) calls addToUri on all of them. Keep the list's order stable: the app sends states back
// by position. Return [] if the site has no filters.
import { type Filter, type FilterList, type HttpUrlBuilder, ValueSelect } from "@sdk";

export interface UriFilter {
  addToUri(builder: HttpUrlBuilder): void;
}

export function isUriFilter(filter: Filter<unknown>): filter is Filter<unknown> & UriFilter {
  return typeof (filter as Partial<UriFilter>).addToUri === "function";
}

class SortFilter extends ValueSelect implements UriFilter {
  constructor() {
    super("Sort by", [["Popular", "popular"], ["Latest", "latest"]]); // ${TODO_MARKER}: the site's options, or remove
  }

  addToUri(builder: HttpUrlBuilder): void {
    builder.addQueryParameter("sort", this.selectedValue());
  }
}

export function getFilterList(): FilterList {
  return [new SortFilter()];
}
`;

  const settingsTs = `${head("the source's settings.")}
//
// ${DOCS}#settings-preferences. Keys and defaults live here; the source reads them through the
// getters below, on every call (never in a constructor). Leave setupPreferenceScreen empty if the
// source has no settings.
import type { PreferenceScreen } from "@sdk";

export function setupPreferenceScreen(_screen: PreferenceScreen): void {
  // const PREF_CLEAN_TITLE = "pref_clean_title";
  // screen.addPreference(new SwitchPreferenceCompat({ key: PREF_CLEAN_TITLE, title: "Clean title", summary: "", defaultValue: false }));
}

// export function cleanTitle(preferences: SharedPreferences): boolean {
//   return preferences.getBoolean(PREF_CLEAN_TITLE, false);
// }
`;

  return { "index.ts": indexTs, "api.ts": apiTs, "parse.ts": parseTs, "dto.ts": dtoTs, "filters.ts": filtersTs, "settings.ts": settingsTs };
}
