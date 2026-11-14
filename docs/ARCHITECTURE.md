# Architecture

How a TypeScript port becomes a script the apps run, what the apps provide, and where the Node
tooling fits in. For the step-by-step guide, see [ADDING-A-SOURCE.md](ADDING-A-SOURCE.md).

```
src/<lang>/<name>/index.ts ──► esbuild ──► dist/<pkg>.js ──► CI ──► repo branch ──► apps
        │                                     │                      (index.json,
        ├─ @sdk               (sdk/src)       │                       scripts, icons)
        └─ @sdk/themes/<x>    (sdk/themes)    └─► Node harness (scripts/) for tests and debugging
```

## Layers

| Layer | Where | What it is |
|---|---|---|
| Host contract | `sdk/src/host.ts` | The functions the app defines as `__host` before a script runs. Implemented by the iOS app (`ExtensionContext.installHostAPI()`, JavaScriptCore + SwiftSoup), the Android app (QuickJS) and, for tests, `scripts/lib/host/fake-host.mjs`. **Frozen**: see below. |
| Runtime | `sdk/src/runtime.ts` | `defineExtension([...])`: the `__extension.default` object the app calls (`describe`, `invoke`, `rateLimitFor`, `cookiesFor`). Turns errors into "Source (EN) method failed: …" and logs them through the host. |
| SDK | `sdk/src/*.ts` | The Kotlin API in TypeScript: `KeiSource`, models (`SManga`, `SChapter`, `Page`), filters, preferences, `HttpClient`/`Fetch`/`FormBody`, OkHttp's `HttpUrl`, Jsoup-style `Element`, Kotlin string helpers, dates, `Intl`, crypto, the filter-data cache, common settings. Import everything from `"@sdk"`. |
| Themes | `sdk/themes/<theme>/` | Ports of keiyoushi's `lib-multisrc` (Madara, MangaThemesia, MMRCMS). A site on a theme is a subclass with a few overrides. Import from `"@sdk/themes/<theme>"`. Each theme has a `theme.json` (base class, upstream path and the commit it was ported from). |
| Extensions | `src/<lang>/<name>/` | One port each: `extension.json`, `index.ts` (plus any `filters.ts`, `dto.ts` …), `icon.png`, `fixtures/`, `tests.json`, and optionally a Node unit test `<name>.test.mjs`. |
| Tooling | `scripts/` | Build, Node harness, validation, scaffolding, debugging, maintenance. Plain Node ESM, no build step. |

### SDK files

| File | Mirrors |
|---|---|
| `source.ts` | `KeiSource` / `HttpSource`: `configureClient`, `configureHeaders`, `getPopularManga`, `getLatestUpdates`, `getSearchMangaList` (+ URL lookup through `getMangaByUrl`), `getFilterList`, `fetchMangaUpdate`, `getPageList`, `getImageUrl`, `getImageRequest`, `getImageTransform`, `setupPreferenceScreen` |
| `http.ts` | OkHttp client + keiyoushi's `Fetch`, `rateLimit`, `addCookie`; `Response.asJsoup()`, `parseAs<T>()` |
| `html.ts` | Jsoup `Element`, `Elements`, `Document`, plus `expectFirst` |
| `url.ts` | OkHttp `HttpUrl` with the same percent-encoding |
| `models.ts`, `filters.ts`, `preferences.ts` | `eu.kanade.tachiyomi.source.model`, `Filter`, androidx.preference |
| `settings.ts` | Shared settings: base-URL override, chapter deduplication |
| `filterCache.ts` | keiyoushi's filter fetching (`supportsFilterFetching`/`fetchFilterData`) |
| `i18n.ts` | `lib:i18n` `Intl` |
| `crypto.ts` | Byte-level MD5, AES-CBC, CryptoJS-style decrypt (javax.crypto / CryptoJS) |
| `utils.ts` | Kotlin string helpers, `parseDate`, `evaluateIsolated` (QuickJS), hashing, Base64, `log`, `runWebView` |

## The host contract (do not change it)

The apps implement exactly what `sdk/src/host.ts` declares, at host API level 2
(`API_LEVEL` in `runtime.ts`, `extensionHostAPILevel` in the iOS app). Changing a signature, the
JSON shapes that cross it, the script format or the index fields breaks installed apps. Anything
new must be built in the SDK on top of the existing functions, or be proposed as a new API level
implemented by both apps first.

| `__host` | Purpose |
|---|---|
| `apiLevel` | Level the app implements |
| `http(payloadJSON, callback)` | Every request: `{source, url, method, headers, body, bodyBase64, fetch, initiator, cookies, rateLimit, ensureSuccess, responseType}` → `{status, url, headers, body}` |
| `parseHtml(html, baseUri)` | A Jsoup-style element tree (`HostElement`) |
| `prefGet` / `prefSet` | Per-source settings, as JSON |
| `evaluate(script)` | Runs a site's script in a separate empty context (QuickJS upstream) |
| `md5`, `sha256`, `base64Encode`, `base64Decode` | Text helpers |
| `log(level, message)` | The app's log (iOS: `Logger`, category `extension.<pkg>`) |
| `webview(payloadJSON, callback)` | Level 2: runs a page in a real browser |

**Script format.** esbuild bundles `index.ts` into one IIFE that defines `__extension`;
`__extension.default` is what `defineExtension` returns. Scripts get no `URL`, `fetch`, timers,
DOM or `TextEncoder`: only ECMAScript built-ins and `__host`.

**index.json.** One entry per extension, mirroring Tachiyomi's `index.min.json`: `name`, `pkg`,
`versionCode`, `versionName` (`<api>.<versionCode>`), `lang`, `nsfw`, `api`, `file`, `sha256`,
`icon`, `sources[] {name, lang, id, baseUrl}`. The iOS decoder (`ExtensionInfo`) ignores unknown
keys; nothing has been added for that reason, since the Android decoder may not.

**Source IDs** are Kotlin's `generateId`: the first 8 bytes of MD5(`"<name lowercased>/<lang>/<versionId>"`),
sign bit cleared, as a decimal string (`scripts/source-id.mjs`, tested against IDs from upstream).
A port that hard-codes `id` upstream sets `override readonly id = "…"`. Renaming a source or
changing its `lang` or `versionId` changes the ID and orphans every library entry, so
`npm run validate` refuses an ID change for a published extension.

**What the contract does not carry**, and how the SDK copes:

| Upstream feature | Here |
|---|---|
| `SManga.memo` / `SChapter.memo` (lib 1.6) | Not in the JSON the app stores. Themes keep everything they need in the URL (Madara uses paths instead of post IDs + memo). |
| Related manga (`fetchRelatedMangaList`) | No app call; not ported. |
| OkHttp interceptors | Request-side: `configureClient` rate limits and cookies, per-request headers. Image side: `getImageRequest` (headers) and `getImageTransform` (tile moves for descrambling, level 2). Arbitrary response rewriting is not possible. |
| Deep links (`deeplink { path(...) }`) | Searching for a URL calls `getMangaByUrl`, so a pasted link works inside a source. The apps do not route an opened URL to a source by `baseUrl` yet: a host follow-up. |
| Android `WebView` interception, simulated taps | `runWebView` collects data from a page (WKWebView); no request interception. |

## Build pipeline

`scripts/lib/build.mjs` (used by `npm run build`, the test runner, `debug`, `validate`):

1. Finds every `src/<lang>/<name>/extension.json`.
2. Bundles `index.ts` with esbuild (`iife`, `es2020`, `@sdk` paths from `tsconfig.json`, working
   directory fixed so the output is byte-for-byte reproducible).
3. Loads the bundle with a stub host to read each source's `describe()` (name, lang, baseUrl, id).
4. Copies `icon.png` to `dist/icon/<pkg>.png`, hashes the script and writes `dist/index.json`.

CI (`.github/workflows/publish.yml`) runs `typecheck`, `npm test` and `npm run validate` on every
push and pull request. On `main` it force-pushes `dist/` to the `repo` branch. The apps fetch
`repo/index.json`, offer an update when `versionCode` grows, and refuse a script whose SHA-256
does not match. Because the build is reproducible, `validate` can tell exactly which extensions'
scripts changed (including through SDK or theme changes) and requires their `versionCode` bump.

## Themes

`sdk/themes/<theme>/` follows the upstream `lib-multisrc/<theme>` file layout. Kotlin `open val`s
become getters (`protected get chapterMode()`) so subclasses can override them without
field-initialisation order problems; `open fun`s stay methods. Theme strings come from upstream's
`assets/i18n/*.properties`, inlined as `intl.ts`. When upstream changes a theme, port the diff in
`sdk/themes/<theme>`, update `commit` in `theme.json`, and bump every extension on the theme (the
validator lists them).

| Theme | Base classes | Example site |
|---|---|---|
| `madara` | `Madara` (admin-ajax browse), `MadaraNoAjax` (archive pages), `MadaraBase` | `en.mangasushi` |
| `mangathemesia` | `MangaThemesia` | `en.asterscans` |
| `mmrcms` | `MMRCMS` | `en.readcomicsonline` |

## Node harness

`scripts/lib/host/fake-host.mjs` implements `__host` in Node so the real bundle runs unchanged:

- **HTTP** goes to a transport: `fixtureTransport` (tests.json routes, the same matching as the
  app's `ExtensionConformanceTests`: exact URL or `"match": "prefix"`, fragment ignored, 404 for the
  rest) or `liveTransport` (Node `fetch` with Safari-like headers, a cookie jar, the source's
  cookie rules and rate limits; a Cloudflare challenge becomes an error, never a bypass).
- **HTML** is parse5 (an HTML5-spec tree builder, like Jsoup's) with css-select, plus Jsoup's
  selector extensions (`scripts/lib/host/html.mjs`).
- **evaluate** runs in a fresh `node:vm` context; **webview** reports that Node has none.
- `scripts/lib/runner.mjs` calls the bundle through `invoke` exactly as the app does and shapes
  results like the app's JSON (`details` merges as `SManga.merging`, chapter numbers are Swift
  `Float`s, nulls are dropped), so a `tests.json` means the same in both places.

The app's conformance tests remain the authority. Run them before relying on a port:

```sh
cd ../tachiyomi-ios
swift test --package-path Packages/MangaKit --filter ExtensionConformanceTests
```

### Known differences from the app (SwiftSoup)

| Area | Node harness | App (SwiftSoup 2.x, Jsoup port) |
|---|---|---|
| Class selectors | `.Foo` is case-sensitive | Jsoup matches classes case-insensitively |
| `html()`, `outerHtml()` | Not pretty-printed | Pretty-printed (indentation and newlines) by default; avoid asserting on raw markup |
| `abs:` URLs | WHATWG URL resolution; a value with surrounding whitespace gives "" as in the app | Foundation `URL(string:relativeTo:)` gives "" for surrounding whitespace (Jsoup trims it); the SDK's `absUrl`/`attr("abs:…")` retry with the trimmed value, so ports behave like upstream in both. Other edge cases (odd schemes, `\`) can differ |
| `:matches()`, `[attr~=regex]` | JavaScript regex; a leading `(?i)` becomes the `i` flag | Java-style regex (NSRegularExpression); possessive quantifiers and some `\p{…}` classes differ |
| `:matchText`, `[abs:attr]` in selectors | Not supported | Supported |
| Malformed HTML | parse5's spec recovery | Jsoup's tree builder; usually identical, can differ on badly broken markup |
| Text normalisation | SwiftSoup's rules (space before blocks and `<br>`, `&nbsp;` collapsed, script/style excluded) | Same rules |
| Body charset | Fixtures are read as UTF-8 | Decoded with the response's charset |
| `runWebView` | Fails with "no WebView" | Runs WKWebView |
| Dates | Machine time zone, like the app's tests | Device time zone |

If a case passes in Node and fails in the app (or the reverse), the difference is usually in this
table; prefer selectors and assertions that hold in both.
