# Adding, updating and debugging a source

Everything here runs in Node: no Xcode is needed to port, test or debug a source. The app's
conformance tests are the final check (step 9).

- [1. Pick the upstream source](#1-pick-the-upstream-source)
- [2. Theme or standalone](#2-theme-or-standalone)
- [3. Create it: `npm run new`](#3-create-it-npm-run-new)
- [4. Port it: Kotlin → SDK cheatsheet](#4-port-it-kotlin--sdk-cheatsheet)
- [5. Options keiyoushi sources use](#5-options-keiyoushi-sources-use) (settings, filters, several languages, rate limits, headers, cookies, images, URLs)
- [6. Try it live: `npm run debug`](#6-try-it-live-npm-run-debug)
- [7. Capture fixtures](#7-capture-fixtures)
- [8. Write tests.json](#8-write-testsjson)
- [9. Run the tests](#9-run-the-tests)
- [10. Version, SOURCES.md, publishing](#10-version-sourcesmd-publishing)
- [Updating an existing source](#updating-an-existing-source)
- [Debugging a broken source](#debugging-a-broken-source)
- [Troubleshooting](#troubleshooting)
- [Command reference](#command-reference)

## 1. Pick the upstream source

Ports come from [keiyoushi/extensions-source](https://github.com/keiyoushi/extensions-source).
A local checkout makes everything faster (`npm run new` and `npm run upstream` use it when it is at
`../extensions-source`, `~/code/extensions-source` or `$KEIYOUSHI_DIR`; otherwise they read GitHub):

```sh
git clone --depth 50 https://github.com/keiyoushi/extensions-source ../extensions-source
```

Look at `src/<lang>/<name>/build.gradle.kts`:

```kotlin
keiyoushi {
    name = "Mangasushi"            // source name: part of the source ID
    contentWarning = ContentWarning.SAFE
    theme = "madara"               // lib-multisrc theme, if any
    source {
        lang = "en"                // part of the source ID
        baseUrl = "https://mangasushi.org"
        // id = 1234L              // a fixed ID, if upstream hard-codes one
    }
}
```

and the Kotlin under `src/…`. Before porting, check the site opens without a Cloudflare
challenge (`npm run debug` tells you, step 6). Sites that need one can still be ported, but
they can only be tested in the app.

## 2. Theme or standalone

If `build.gradle.kts` has `theme = "…"` and `sdk/themes/<theme>/` exists, the port is a subclass
with a handful of overrides (often none):

```ts
// src/en/mangasushi/index.ts
import { defineExtension } from "@sdk";
import { ChapterMode, Madara } from "@sdk/themes/madara";

class Mangasushi extends Madara {
  readonly name = "Mangasushi";
  readonly lang = "en";
  readonly baseUrl = "https://mangasushi.org";

  protected override get chapterMode() {
    return ChapterMode.MangaAjax;
  }
}

export default defineExtension([new Mangasushi()]);
```

Available themes: `madara`, `mangathemesia`, `mmrcms` (see each `theme.json`). Upstream
`override val x = …` becomes `protected override get x() { return …; }`; `override fun` becomes a
method override with the same name.

If the theme is not ported yet, either port it into `sdk/themes/<theme>/` (copy the layout of
`sdk/themes/madara`: `index.ts`, `theme.json`, `intl.ts` from `assets/i18n`) or port the site
standalone, folding in the theme code it uses.

## 3. Create it: `npm run new`

```sh
npm run new -- --upstream src/en/mangasushi     # reads name, lang, baseUrl, theme, id, NSFW and the icon
npm run new                                     # asks for everything
npm run new -- --name "My Site" --lang en --base-url https://mysite.com --theme none --yes
```

It creates `src/<lang>/<name>/` with `extension.json`, an `index.ts` template (theme subclass or
a standalone skeleton), `fixtures/`, a `tests.json` skeleton and upstream's `icon.png`, and prints
the source ID it will get. The ID is Kotlin's `generateId("<name>/<lang>/<versionId>")`, so it
matches the Android extension and library entries carry over; if upstream sets `id = …L`, pass
`--id` (the template then has `override readonly id = "…"`).

`extension.json`:

```json
{
  "name": "Mangasushi",
  "lang": "en",
  "versionCode": 1,
  "nsfw": false,
  "upstream": { "path": "src/en/mangasushi", "commit": "d9420cd1" }
}
```

## 4. Port it: Kotlin → SDK cheatsheet

Keep upstream's method names, selectors and filter names so later diffs are easy to follow.

| Kotlin (keiyoushi) | SDK |
|---|---|
| `class X : KeiSource()` / `HttpSource()` | `class X extends KeiSource` |
| `override val name = "X"` | `readonly name = "X"` |
| `override val id = 2L` (or `id = 2L` in gradle) | `override readonly id = "2"` (IDs are decimal strings) |
| `override val versionId = 2` | `override readonly versionId = 2` |
| `override val supportsLatest = false` | `override readonly supportsLatest = false` |
| `open val x = …` in a theme | `protected get x() { return …; }` |
| `client.get(url, Fetch.DOCUMENT).asJsoup()` | `(await this.client.get(url, Fetch.DOCUMENT)).asJsoup()` |
| `client.post(url, headers, Fetch.XHR, body)` | `await this.client.post(url, body, { headers, fetch: Fetch.XHR })` |
| `ensureSuccess = false` | `{ ensureSuccess: false }`, then `response.code` / `response.isSuccessful` |
| `FormBody.Builder().add(k, v).build()` | `new FormBody().add(k, v).build()` |
| `json.toRequestBody(JSON_MEDIA_TYPE)` | `jsonBody(value)` |
| `response.parseAs<T>()` | `response.parseAs<T>()` (error names the URL and shows the body start) |
| `@Serializable class Dto(…)` | `interface Dto { … }` in `dto.ts` |
| `"…".toHttpUrl().newBuilder().addQueryParameter(…)` | `toHttpUrl("…").newBuilder().addQueryParameter(…)` (OkHttp's encoding) |
| `document.select(css)`, `selectFirst(css)` | same; selectors are Jsoup's (`:contains`, `:containsOwn`, `:has`, `:matches`, `:eq`, `[attr~=regex]` …) |
| `selectFirst(css)!!` | `expectFirst(css)`: fails with "Selector 'css' matched 0 nodes on <url>" |
| `element.attr("abs:href")`, `absUrl("src")` | same |
| `text()`, `ownText()`, `wholeText()`, `data()`, `html()` | same |
| `elements.eachText()`, `.first()`, `.isNotEmpty()` | same |
| `SManga.create().apply { … }` | `const manga = SManga.create(); manga.title = …;` |
| `setUrlWithoutDomain(url)` | same |
| `SManga.ONGOING` … | same constants |
| `MangasPage(list, hasNext)` | `new MangasPage(list, hasNext)` |
| `SMangaUpdate(manga, chapters)` | `new SMangaUpdate(manga, chapters)` |
| `Page(i, url, imageUrl)` | `new Page(i, url, imageUrl)` |
| `substringAfter`, `substringBefore`, `…Last`, `removePrefix`, `removeSuffix` | same names, as functions (`substringAfter(text, "x")`) |
| `SimpleDateFormat("MMM dd, yyyy", Locale.ENGLISH).tryParse(s)` | `parseDate(s, "MMM dd, yyyy")` (English, device time zone, 0 on failure) |
| `Instant.parse(s)` | `parseIsoDate(s)` |
| `QuickJs.create().use { it.evaluate(script) }` | `evaluateIsolated(script)` |
| `Base64.decode(s)` → bytes | `base64ToBytes(s)`; text: `base64Decode(s)` |
| `MessageDigest("MD5")` over bytes | `md5Bytes(bytes)`; hex of text: `md5(text)` |
| `Cipher("AES/CBC/PKCS7Padding")` | `aesCbcDecrypt(bytes, key, iv)`; CryptoJS `{ct, s}`: `cryptoJsDecrypt(ct, pass, saltHex)` |
| `intl["key"]` (`lib:i18n`) | `new Intl(lang, messages).get("key")` |
| `filters.firstInstanceOrNull<T>()` | `firstInstanceOrNull(filters, T)` |
| `Log.d(…)` | `log.debug(…)` (reaches the app's log) |

The SDK lacks a few Android things on purpose; see "What the contract does not carry" in
[ARCHITECTURE.md](ARCHITECTURE.md#the-host-contract-do-not-change-it).

## 5. Options keiyoushi sources use

Everything below works the same in standalone sources and theme subclasses.

### Settings (preferences)

```ts
import { ListPreference, MultiSelectListPreference, EditTextPreference, SwitchPreferenceCompat, type PreferenceScreen } from "@sdk";

override setupPreferenceScreen(screen: PreferenceScreen): void {
  screen.addPreference(new SwitchPreferenceCompat({ key: "showPaid", title: "Show paid chapters", summary: "", defaultValue: false }));
  screen.addPreference(new ListPreference({
    key: "imageQuality", title: "Image quality", summary: "%s",
    entries: ["Original", "Compressed"], entryValues: ["original", "compressed"], defaultValue: "original",
  }));
  screen.addPreference(new MultiSelectListPreference({
    key: "languages", title: "Languages", entries: ["English", "Spanish"], entryValues: ["en", "es"], defaultValue: ["en"],
  }));
  screen.addPreference(new EditTextPreference({ key: "token", title: "Access token", summary: "", defaultValue: "" }));
}

// Reading them (fresh every call):
const quality = this.preferences.getString("imageQuality", "original");
const showPaid = this.preferences.getBoolean("showPaid", false);
const languages = this.preferences.getStringSet("languages", ["en"]);
this.preferences.edit().putString("cache", json).apply();
```

**Base URL override** (for sites that move domains), and **deduplicate chapters**:

```ts
import { baseUrlPreference, deduplicateChapters, deduplicateChaptersPreference, DEDUPLICATE_CHAPTERS_PREF, preferredBaseUrl } from "@sdk";

class Site extends Madara {
  readonly name = "Site";
  readonly lang = "en";
  override get baseUrl() {
    return preferredBaseUrl(this.preferences, "https://site.com"); // the index keeps the default
  }

  override setupPreferenceScreen(screen: PreferenceScreen): void {
    screen.addPreference(baseUrlPreference("https://site.com"));
    screen.addPreference(deduplicateChaptersPreference());
  }

  protected override parseChapterList(document: Document): SChapter[] {
    const chapters = super.parseChapterList(document);
    return this.preferences.getBoolean(DEDUPLICATE_CHAPTERS_PREF, false) ? deduplicateChapters(chapters) : chapters;
  }
}
```

The source ID does not depend on the base URL, so overriding it keeps the library.

### Filters

All of upstream's kinds exist: `Header`, `Separator`, `Select`, `Text`, `CheckBox`, `TriState`,
`Group`, `Sort`. Subclass them as upstream does and find them with `instanceof`. For the common
"label → value" pattern use the value filters instead of re-declaring `UriPartFilter`:

```ts
import { Group, ValueCheckBox, ValueSelect, ValueTriState, Sort, Text, type FilterList } from "@sdk";

class TypeFilter extends ValueSelect {}
class GenreFilter extends Group<ValueTriState> {}

override getFilterList(): FilterList {
  return [
    new TypeFilter("Type", [["All", ""], ["Manga", "manga"], ["Manhwa", "manhwa"]], /* default value */ ""),
    new GenreFilter("Genres", [new ValueTriState("Action", "1"), new ValueTriState("Comedy", "2")]),
    new Sort("Sort", ["Latest", "Popular"], { index: 0, ascending: false }),
    new Text("Author"),
  ];
}

// In getSearchMangaList:
for (const filter of filters) {
  if (filter instanceof TypeFilter) url.addQueryParameter("type", filter.selectedValue());
  else if (filter instanceof GenreFilter) {
    for (const genre of filter.state) {
      if (genre.isIncluded()) url.addQueryParameter("genre[]", genre.value);
      if (genre.isExcluded()) url.addQueryParameter("genre[]", `-${genre.value}`);
    }
  }
}
```

The app sends filter states back by position, and the SDK copies them onto a fresh
`getFilterList()`, so keep the list's order stable for a given state of cached data.

**Theme default filters.** Madara and MangaThemesia build upstream's filter set (author, year,
status, type, order, genres). Override `getFilterListFromData` (Madara) or `getFilterList`
(MangaThemesia) to change it, or the option getters (`orderByFilterOptions`, `statusOptions` …).

**Filters loaded from the site** (upstream `supportsFilterFetching`): use `FilterDataCache`.
It returns stored data at once and refreshes it in the background (kept three days in settings):

```ts
private readonly filterCache = new FilterDataCache<Genre[]>(this, () => this.fetchGenres());

override getFilterList(): FilterList {
  const genres = this.filterCache.read();
  return genres ? [new GenreFilter("Genres", genres.map((g) => new ValueCheckBox(g.name, g.id)))] : [new Header(FILTER_FETCH_HINT)];
}
```

### Several languages or sources in one extension (`all/`)

One extension can hold many sources; each gets its own ID from its name and `lang`:

```ts
// src/all/mysite/index.ts, extension.json "lang": "all"
class MySite extends KeiSource {
  readonly name = "MySite";
  readonly baseUrl = "https://mysite.com";
  constructor(readonly lang: string, private readonly siteLang = lang) {
    super();
  }
  // use this.siteLang in requests
}

export default defineExtension([
  new MySite("en"),
  new MySite("es-419", "es-la"),
  new MySite("pt-BR", "pt"),
]);
```

`all.mangafire` and `all.kagane` are full examples. The same works with a theme class.

### Rate limits, headers, cookies

```ts
protected override configureClient(builder: ClientBuilder): void {
  builder.rateLimit(2, seconds(1));                                          // 2 requests a second
  builder.rateLimit(1, seconds(2), (url) => url.host === "api.site.com");   // only for the API
  builder.addCookie("site.com", [["isAdult", "1"]]);
}

protected override configureHeaders(headers: Headers): Headers {
  return { ...headers, Origin: this.baseUrl, "X-Requested-With": "XMLHttpRequest" };
}
```

The app adds a real browser's headers (Safari's) for the `Fetch` kind of each request, and keeps
cookies per site. The first matching rate-limit rule applies, so put specific rules first.

### Image requests

```ts
override getImageRequest(page: Page): ImageRequest {
  const request = super.getImageRequest(page);
  return { ...request, headers: { ...request.headers, Referer: page.url } };
}
```

If pages only know their image after another request, return pages with `url` and implement
`getImageUrl(page)`.

### Scrambled images (image interceptors)

Upstream's Bitmap/Canvas interceptors become `getImageTransform` (host API level 2): given the
downloaded image's size, return the tile moves and the app draws them.

```ts
override async getImageTransform(page: Page, width: number, height: number): Promise<ImageTransform | null> {
  const order = orderFromFragment(page.imageUrl); // whatever the site's scheme needs
  if (!order) return null;                         // not scrambled
  const tileW = Math.trunc(width / 4), tileH = Math.trunc(height / 4);
  return {
    width, height,
    tiles: order.map((from, to) => ({
      sx: (from % 4) * tileW, sy: Math.trunc(from / 4) * tileH, sw: tileW, sh: tileH,
      dx: (to % 4) * tileW, dy: Math.trunc(to / 4) * tileH,
    })),
  };
}
```

`en.asurascans` and `en.comix` are full examples; `tests.json` can check them with the
`imageTransform` call. Response rewriting other than tile moves (for example XOR-decoding bytes)
is not possible with the current host.

### Opening a manga from a URL (deep links)

When the search query is a URL, the SDK calls `getMangaByUrl(url)` instead of searching (as
keiyoushi's `KeiSource` does). Implement it to support pasted links:

```ts
protected override async getMangaByUrl(url: HttpUrl): Promise<SManga | null> {
  if (url.host !== toHttpUrl(this.baseUrl).host) return null;
  const document = (await this.client.get(url, Fetch.DOCUMENT)).asJsoup();
  return this.mangaDetailsParse(document);
}
```

Routing an opened link to the right source by its host is an app feature that is not in the host
contract yet.

## 6. Try it live: `npm run debug`

```sh
npm run debug -- mangasushi popular 1
npm run debug -- mangasushi search "one piece"
npm run debug -- mangasushi details /manga/lonely-attack-on-the-different-world/
npm run debug -- mangasushi chapters https://mangasushi.org/manga/lonely-attack-on-the-different-world/
npm run debug -- mangasushi pages /manga/lonely-attack-on-the-different-world/chapter-338/
npm run debug -- mangasushi filters
```

It builds the extension, runs one call through the same host contract as the app, and prints
every request (method, URL, status, size, time; `--verbose` adds headers and bodies), every
selector that matched nothing (`--verbose`: all of them, with node counts), log messages and the
result as JSON (`--full` for all items). `--fixtures` answers from `tests.json` instead of the
site; `--source 2` picks a source of a multi-source extension.

## 7. Capture fixtures

Fixtures are saved responses, so tests run offline and stay stable.

```sh
npm run debug -- mangasushi popular 1 --save          # saves every response of the call, routes them,
                                                     # and adds the call as a case with first expectations
npm run fixture -- mangasushi https://mangasushi.org/manga/x/ manga        # one URL, as fixtures/manga.html
npm run fixture -- mangasushi https://site.com/api/pages?id=1 --prefix     # route every URL with that prefix
npm run fixture -- mangasushi https://site.com/wp-admin/admin-ajax.php --post "action=x&page=1"
```

- Routes match on the URL only (not the method or POST body). Sites that answer several calls on
  one URL (Madara's `admin-ajax.php`) get one fixture; test one of those calls.
- `--save` keeps an existing fixture for a URL; `--refresh` overwrites it.
- Rename fixtures to something readable (`popular.html`, `series.html`) and update `tests.json`.
- The repository is public: no account pages, tokens, cookies or personal data in fixtures.
  `npm run validate` rejects local paths and tokens it can recognise.
- Behind Cloudflare? Save the page from a desktop browser ("Save Page As…, HTML only") into
  `fixtures/` and add the route by hand. Never work around the challenge.

## 8. Write tests.json

```json
{
  "routes": [
    { "url": "https://mangasushi.org/wp-admin/admin-ajax.php", "file": "fixtures/archive.html" },
    { "url": "https://site.com/chapterfun.ashx?", "match": "prefix", "file": "fixtures/chapterfun.js" }
  ],
  "cases": [
    {
      "name": "popular parses the archive",
      "call": "popular",
      "args": [1],
      "expect": {
        "mangas.length": 25,
        "mangas.0.title": "Lonely Attack on the Different World",
        "mangas.0.thumbnail_url": { "contains": "LONELY" },
        "hasNextPage": true
      }
    }
  ],
  "live": [
    { "name": "popular", "call": "popular", "args": [1], "expect": { "mangas.length": { "gt": 0 } } }
  ]
}
```

| `call` | `args` | Result |
|---|---|---|
| `popular`, `latest` | `[page]` | `{mangas: [...], hasNextPage}` |
| `search` | `[page, query]` (default filters) | same |
| `details` | `[{url, title}]` | the manga, merged as the app merges |
| `chapters` | `[{url, title}]` | `[chapter, …]` |
| `mangaUpdate` | `[{url, title}]` | `{manga, chapters}` |
| `pages` | `[{url, name}]` | `[{index, url, imageUrl}, …]` |
| `imageURL` | `[{index, url}]` | a string (use `""` as the path) |
| `imageTransform` | `[{index, url, imageUrl}, width, height]` | `{width, height, tiles}` or null |

`expect` maps a dotted path (`chapters.0.name`; `length` for arrays; `""` for the whole result) to
a value, or to `{"contains": text}`, `{"gt": number}` or `{"localDate": "yyyy-MM-dd"}` (a date in
the machine's time zone). Field names are upstream's (`thumbnail_url`, `date_upload`,
`chapter_number`). A field that is null never equals anything; leave it out. For dates parsed at
UTC midnight (Madara), compare the number itself. Add `"source": 1` to a case to call another
source of a multi-source extension. `live` cases run only in the app with `LIVE_TESTS=1`.

## 9. Run the tests

```sh
npm run test:ext mangasushi                       # one extension (builds it first)
npm run test:ext mangasushi -- --case popular -v  # one case, with requests and selectors
npm test                                          # SDK unit tests + every extension's cases
npm run live -- mangasushi                        # popular → details → chapters → pages on the real site
npm run check                                     # typecheck, all tests, validation (what CI runs)
```

Then, once per port, run the app's conformance tests, which use the real host (JavaScriptCore +
SwiftSoup) and are the authority:

```sh
cd ../tachiyomi-ios
swift test --package-path Packages/MangaKit --filter ExtensionConformanceTests
```

## 10. Version, SOURCES.md, publishing

- New extension: `versionCode` 1. Every change that alters the built script, including SDK or
  theme changes it picks up, needs a higher `versionCode`, or the apps never see it.
  `npm run validate` compares the build with the published index and names what needs a bump;
  `npm run bump -- --changed` (or `npm run bump -- <ext>`) does it.
- Add a row to `SOURCES.md` (validate checks it).
- Publish: commit, push to `main`. CI runs the checks and, on `main`, publishes `dist/` to the
  `repo` branch. The apps read `repo/index.json` and offer the update.

## Updating an existing source

1. See what changed upstream:

   ```sh
   npm run upstream                 # every port: up to date or BEHIND, with commits and a compare link
   npm run upstream -- mangahere    # one port
   ```

2. Read the diff (`git -C ../extensions-source diff <commit>..origin/main -- src/en/mangahere`
   or the printed GitHub link). For theme ports, the theme's diff applies to `sdk/themes/<theme>`.
3. Port the changes, keeping upstream's names.
4. Refresh the fixtures the change touches and check the expectations:

   ```sh
   npm run debug -- mangahere popular 1 --save --refresh
   npm run test:ext mangahere
   ```

5. `npm run bump -- mangahere`, set `upstream.commit` in `extension.json` (and in `theme.json` for
   a theme), update the commit in `SOURCES.md`.
6. `npm run check`, then the app's conformance tests, then push.

`npm run status` lists every extension with its version, upstream commit, theme, test counts and
when its fixtures last changed.

## Debugging a broken source

Start with the call that fails, live: `npm run debug -- <ext> <call> <args>`. Errors name the
source and the call, for example
`Mangasushi (EN) getPageList failed: Selector 'div.reading-content' matched 0 nodes on https://…`.
The same messages go to the app's log (category `extension.<pkg>`).

| Symptom | Command | Likely cause and fix |
|---|---|---|
| Browse or search is empty | `npm run debug -- <ext> popular 1` | Selectors with **0 nodes** are listed: the site's markup changed. Open the page in a browser, find the new structure, update the selector (check upstream first: `npm run upstream -- <ext>`). |
| "Selector '…' matched 0 nodes on …" | `npm run debug -- <ext> details <url> --verbose` | Same, for a page: compare the selector with the saved HTML (`--save` writes it to `fixtures/`). |
| HTTP 404 on every manga | `npm run debug -- <ext> details <url>` | URL scheme changed or the domain moved. Update `baseUrl` (and keep the source ID: never rename the source); for moved domains add a `baseUrlPreference` so users can switch. |
| Redirects to another domain | `--verbose` shows the final URL | Domain moved: as above. |
| "… is showing a Cloudflare check" | `npm run live -- <ext>` | The tools do not bypass Cloudflare. Check in the app (it solves the check in its WebView, then retries). Capture fixtures from a browser. |
| HTTP 429 / 503 after a few requests | `npm run live -- <ext>` | Rate limiting: add or tighten `builder.rateLimit(...)` in `configureClient`. |
| "JSON parse failed at <url> … body starts: <!DOCTYPE" | `npm run debug -- <ext> <call>` | The API returned HTML (an error page, a login wall or a challenge). Look at the body start; check headers the API needs (`configureHeaders`). |
| Chapter dates are 0 or wrong | `npm run debug -- <ext> chapters <url>` | The date format changed or is relative ("2 days ago"). Fix the `parseDate` pattern (`MMMM d, yyyy` …) or the theme's `chapterDateFormat`/`parseChapterDate`. `parseDate` is English-only; translate month names first. |
| Pages list is empty | `npm run debug -- <ext> pages <chapter url>` | Images moved into a script or a lazy-load attribute (`data-src`, `data-lazy-src`), or are encrypted. Look at `--verbose` selectors and the saved HTML. |
| Images fail to load in the app but URLs look right | `npm run debug -- <ext> pages <url>` | The image host needs a `Referer` or other header: override `getImageRequest`. |
| Works in Node, fails in the app (or the reverse) | app conformance tests | See "Known differences" in [ARCHITECTURE.md](ARCHITECTURE.md#known-differences-from-the-app-swiftsoup): class-name case, `html()` pretty-printing, regex dialects. |

To keep a fix fixed, turn the failing call into a test: `npm run debug -- <ext> <call> <args> --save`,
review the generated case in `tests.json`, and run `npm run test:ext <ext>`.

## Troubleshooting

- **Selectors.** Jsoup's extensions work (`:contains` is case-insensitive, `:containsOwn`,
  `:containsData`, `:matches(regex)`, `:eq/:lt/:gt(n)` count siblings, `[attr~=regex]`,
  `[attr!=value]`, `[^prefix]`, leading `> child`). `element.select(css)` includes the element
  itself, as Jsoup does. Prefer selectors that do not depend on class-name case or raw `html()`.
- **Dates.** `parseDate(text, pattern)` supports `yyyy yy MMMM MMM MM M dd d HH H hh h mm ss SSS a`
  and literals, in English and the device time zone; it returns 0 when the text does not match.
  ISO strings: `parseIsoDate`. Relative dates: see Madara's `parseChapterDate`.
- **Filters.** States come back by position; a list that changes length between calls (for example
  before and after `FilterDataCache` has data) maps states onto the wrong filters until the user
  resets. `npm run debug -- <ext> filters` shows the list.
- **Settings.** Read preferences when you need them, not in constructors or field initialisers:
  the host is not ready while the script loads (`npm run build` runs `describe()` with no stored
  values).
- **Sites that run JavaScript.** `evaluateIsolated(script)` runs a packed or obfuscated script in an
  empty context (no DOM). Pages that need a browser use `runWebView`, which the Node tools do not
  have: those calls can only be checked in the app.
- **IDs.** Never change `name`, `lang` or `versionId` of a published source; the ID would change and
  users would lose their library entries. `npm run validate` refuses it.

## Command reference

| Command | What it does |
|---|---|
| `npm run new` | Scaffold an extension (interactive or with flags; `--upstream src/<lang>/<name>`) |
| `npm run debug -- <ext> <call> [args]` | Run one call live (or `--fixtures`), show requests, selectors, result; `--save` makes it a test |
| `npm run fixture -- <ext> <url> [name]` | Save one response into fixtures/ and route it |
| `npm run test:ext <ext>` | Run one extension's fixture cases |
| `npm test` | SDK unit tests and every extension's fixture cases |
| `npm run live -- <ext>` | Smoke test against the real site |
| `npm run validate` | Schema, files, tests.json, IDs, SOURCES.md, versionCode bumps |
| `npm run check` | typecheck + test + validate (CI) |
| `npm run status` | Table of extensions, versions, upstream commits, tests, fixture dates |
| `npm run upstream [-- <ext>]` | Which ports are behind keiyoushi |
| `npm run bump -- <ext> \| --changed` | Raise versionCode |
| `npm run build [-- <pkg>]` | Build dist/ |
