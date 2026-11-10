# tachiyomi-ios-extensions

Sources for [tachiyomi-ios](https://github.com/Makogai/tachiyomi-ios), a personal iOS manga
reader modelled on TachiyomiJ2K. Each extension is a TypeScript port of a source from
[keiyoushi/extensions-source](https://github.com/keiyoushi/extensions-source), built into a single
JavaScript file that the app downloads and runs in JavaScriptCore.

Not affiliated with Tachiyomi, Mihon, TachiyomiJ2K or Keiyoushi.

## Using the repository

The app reads the index from the `repo` branch, which the Publish workflow rebuilds on every
push to `main`:

```
https://raw.githubusercontent.com/Makogai/tachiyomi-ios-extensions/repo/index.json
```

Each index entry lists the script file, its SHA-256 (the app refuses a file that does not match),
the host API level it needs, and the sources it contains with their IDs.

## Layout

```
sdk/src/            the SDK: models, filters, settings, HTTP, Jsoup-style HTML, helpers
sdk/test/           Node tests for the SDK and the build scripts
src/<lang>/<name>/  one extension
  extension.json    name, lang, versionCode, nsfw, upstream path and commit
  index.ts          the port; `export default defineExtension([...])`
  fixtures/         saved responses from the site
  tests.json        what the port should return for those fixtures (run by the app repo)
scripts/build.mjs   bundles each extension with esbuild and writes dist/index.json
```

## Developing

Requires Node 24 or later.

```sh
npm install
npm run check          # type-check, SDK tests, build
npm run build          # dist/<pkg>.js and dist/index.json
node scripts/build.mjs en.mangahere   # build one extension
```

Parser tests run in the app repo, against the real host (JavaScriptCore + SwiftSoup), with this
repo checked out next to it:

```sh
cd ../tachiyomi-ios
swift test --package-path Packages/MangaKit --filter ExtensionConformanceTests
LIVE_TESTS=1 swift test --package-path Packages/MangaKit --filter ExtensionConformanceTests
```

`tests.json` maps request URLs to fixture files and lists calls with expected results. A request
with no matching route fails the case and prints the URL, which is also how URL building is
checked.

## Porting a source

The SDK mirrors the Kotlin API, so a port is close to a line-by-line translation:

| Kotlin (keiyoushi) | SDK |
|---|---|
| `class X : KeiSource()` | `class X extends KeiSource` |
| `OkHttpClient.Builder.configureClient()` with `rateLimit`, `addCookie` | `configureClient(builder)` with `builder.rateLimit`, `builder.addCookie` |
| `Headers.Builder.configureHeaders()` | `configureHeaders(headers)` |
| `client.get(url, Fetch.DOCUMENT).asJsoup()` | `(await this.client.get(url, Fetch.DOCUMENT)).asJsoup()` |
| `response.parseAs<T>()` | `response.parseAs<T>()` |
| Jsoup `select`, `selectFirst`, `attr("abs:href")`, `:containsData` | same names and selectors (SwiftSoup in the app) |
| `SManga.create().apply { … }`, `setUrlWithoutDomain` | `SManga.create()`, `manga.setUrlWithoutDomain(…)` |
| `Filter.Select`, `Filter.TriState`, `Filter.Group`, … | `Select`, `TriState`, `Group`, … — subclass and use `instanceof` |
| `"…".toHttpUrl().newBuilder().addQueryParameter(…)` | `toHttpUrl("…").newBuilder().addQueryParameter(…)` (OkHttp's encoding) |
| `QuickJs.create().use { it.evaluate(script) }` | `evaluateIsolated(script)` |
| `setupPreferenceScreen` with `SwitchPreferenceCompat`, `ListPreference`, … | same class names, constructed with options |
| `preferences.getBoolean(key, default)` | `this.preferences.getBoolean(key, default)` |
| `substringAfter`, `substringBefore`, `removePrefix`, … | same names, as functions |
| `SimpleDateFormat("MMM dd,yyyy", Locale.ENGLISH).tryParse(s)` | `parseDate(s, "MMM dd,yyyy")` |
| `id = 2L` in `build.gradle.kts` | `override readonly id = "2"` (IDs are strings) |

Steps:

1. Read the upstream `build.gradle.kts` (name, lang, baseUrl, `id`, theme, libs) and any
   `lib-multisrc/<theme>` code.
2. Create `src/<lang>/<name>/` with `extension.json` and `index.ts`. Keep upstream's method names,
   selectors and filter names so later diffs are easy to follow.
3. Save responses from the site in `fixtures/` (strip anything personal) and describe the expected
   results in `tests.json`; run the conformance tests from the app repo, then a live run.
4. Add the port to `SOURCES.md` with the upstream commit.

When updating a port, bump `versionCode`; the app offers the update when the index has a higher one.

## Host API

Scripts run with no network, DOM or timers of their own. Everything goes through `__host`
(host API level 1, `sdk/src/host.ts`), which the SDK wraps: HTTP through the app's client
(cookies, rate limits, Safari browser headers), HTML parsing, per-source settings, MD5/SHA-256,
Base64, and evaluation of a site's script in a separate, empty context.

## License

Apache License 2.0, as upstream. See `LICENSE` and `NOTICE`.
