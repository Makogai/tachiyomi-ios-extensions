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
sdk/src/               the SDK: source base class, models, filters, settings, HTTP, Jsoup-style HTML,
                       OkHttp-style URLs, dates, i18n, crypto (import from "@sdk")
sdk/themes/<theme>/    ports of keiyoushi's lib-multisrc themes: madara, mangathemesia, mmrcms
                       (import from "@sdk/themes/<theme>")
sdk/test/              unit tests for the SDK and the Node harness
src/<lang>/<name>/     one extension
  extension.json       name, lang, versionCode, nsfw, upstream path and commit
  index.ts             the port; `export default defineExtension([...])`
  icon.png             upstream's res/mipmap-xxxhdpi/ic_launcher.png (the theme's for multisrc ports)
  fixtures/            saved responses from the site
  tests.json           what the port should return for those fixtures
scripts/               build, Node test harness, validation, scaffolding and debugging tools
docs/                  ADDING-A-SOURCE.md (the guide) and ARCHITECTURE.md
```

## Developing

Requires Node 24 or later. No Xcode is needed to port, test or debug a source.

```sh
npm install
npm run new                               # scaffold a source (from keiyoushi with --upstream src/<lang>/<name>)
npm run debug -- <ext> popular 1          # run one call live: requests, selectors, result
npm run debug -- <ext> popular 1 --save   # ...and keep the responses as fixtures and a test case
npm run test:ext <ext>                    # one extension's fixture tests, in Node
npm test                                  # SDK tests and every extension's fixture tests
npm run live -- <ext>                     # popular → details → chapters → pages on the real site
npm run check                             # typecheck, tests, validation: what CI runs
npm run status                            # versions, upstream commits, tests per extension
npm run upstream                          # which ports are behind keiyoushi
```

**[docs/ADDING-A-SOURCE.md](docs/ADDING-A-SOURCE.md)** walks through porting a source (theme or
standalone), the Kotlin → SDK cheatsheet, settings, filters, multi-language extensions, fixtures,
tests, updating a port from upstream and debugging a broken one.
**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** describes the SDK layers, the host contract, the
build and publish pipeline, themes and the Node harness (with its known differences from the app).

The Node harness runs each `tests.json` against its fixtures with a Node implementation of the
host. The app's conformance tests, which use the real host (JavaScriptCore + SwiftSoup), remain the
authority; run them with this repo checked out next to the app:

```sh
cd ../tachiyomi-ios
swift test --package-path Packages/MangaKit --filter ExtensionConformanceTests
LIVE_TESTS=1 swift test --package-path Packages/MangaKit --filter ExtensionConformanceTests
```

When updating a port, bump `versionCode` (`npm run bump -- <ext>`); the app offers the update when
the index has a higher one, and `npm run validate` fails when a changed script was not bumped.

## Host API

Scripts run with no network, DOM or timers of their own. Everything goes through `__host`
(host API level 2, `sdk/src/host.ts`), which the SDK wraps: HTTP through the app's client
(cookies, rate limits, Safari browser headers), HTML parsing, per-source settings, MD5/SHA-256,
Base64, logging, evaluation of a site's script in a separate, empty context, and (level 2) a
WebView and image tile transforms. The contract is shared with the Android app; see
[ARCHITECTURE.md](docs/ARCHITECTURE.md#the-host-contract-do-not-change-it) before touching it.

## License

Apache License 2.0, as upstream. See `LICENSE` and `NOTICE`.
