# Ported sources

Every extension here was ported by hand from
[keiyoushi/extensions-source](https://github.com/keiyoushi/extensions-source). The commit column is
the upstream commit the port was taken from (also in each `extension.json`, and in
`sdk/themes/<theme>/theme.json` for themes). See which ports are behind upstream with:

```sh
npm run upstream            # all ports, with the commits since and a compare link
npm run status              # versions, commits, themes and test counts
```

Port the changes, bump `versionCode` (`npm run bump -- <ext>`), and update the commit here and in
`extension.json`. The steps are in [docs/ADDING-A-SOURCE.md](docs/ADDING-A-SOURCE.md#updating-an-existing-source).
"Fixture tests" run in Node (`npm test`) and in the app's conformance tests.

## Themes

| Theme | Upstream | Commit | Example |
|---|---|---|---|
| `sdk/themes/madara` | `lib-multisrc/madara` | `d9420cd1` | `en.mangasushi` |
| `sdk/themes/mangathemesia` | `lib-multisrc/mangathemesia` | `d9420cd1` | `en.asterscans` |
| `sdk/themes/mmrcms` | `lib-multisrc/mmrcms` | `d9420cd1` | `en.readcomicsonline` |

## Extensions

| Extension | Package | Upstream path | Theme / libs | Commit | Status |
|---|---|---|---|---|---|
| Mangahere | `en.mangahere` | `src/en/mangahere` | — | `d9420cd1` | ported, fixture + live tests |
| Weeb Central | `en.weebcentral` | `src/en/weebcentral` | — | `d9420cd1` | ported, fixture + live tests |
| MangaDex | `all.mangadex` | `src/all/mangadex` | `lib:i18n` | `d9420cd1` | ported (62 languages, source IDs equal upstream's), fixture + live tests, unit tests for filters, settings and the MD@Home refresh; no login, no MD@Home reports (upstream has none) |
| Read Comics Online | `en.readcomicsonline` | `src/en/readcomicsonline` | `lib-multisrc/mmrcms` (`sdk/themes/mmrcms`) | `d9420cd1` | ported, no fixtures (site behind a Cloudflare check; a 2026 web archive copy has an older layout); live test in the app only |
| Comick (Unoriginal) | `all.comicklive` | `src/all/comicklive` | — | `d9420cd1` | ported, fixture + live tests |
| Atsumaru | `en.atsumaru` | `src/en/atsumaru` | — | `d9420cd1` | ported, fixture + live tests |
| Asura Scans | `en.asurascans` | `src/en/asurascans` | — | `d9420cd1` | ported, fixture + live tests; tile unscrambling via `getImageTransform` |
| Kagane | `all.kagane` | `src/all/kagane` | — | `d9420cd1` | ported (18 languages), fixtures built from upstream's DTOs (API behind a Cloudflare check); live tests need the check solved |
| MangaFire | `all.mangafire` | `src/all/mangafire` | — | `d9420cd1` | ported (7 languages), fixture + live tests; VRF signing verified against a JVM run of upstream's code; automatic shape-captcha solving runs upstream's OpenCV.js solver in the host WebView but has never run against a live captcha (otherwise "Open in WebView") |
| Comix | `en.comix` | `src/en/comix` | — | `d9420cd1` | ported; details have fixture + live tests; browse, chapter list and reader run upstream's page scripts in the host WebView (checked in desktop Chrome, not in the app; no tests); no native taps or request blocking; grid descrambling via `getImageTransform` (unit cases only); XOR-encoded images not supported |
| Mangasushi | `en.mangasushi` | `src/en/mangasushi` | `lib-multisrc/madara` (`sdk/themes/madara`) | `d9420cd1` | ported, fixture + live tests; theme example (MangaAjax chapters) |
| Aster Scans | `en.asterscans` | `src/en/asterscans` | `lib-multisrc/mangathemesia` (`sdk/themes/mangathemesia`) | `d9420cd1` | ported, fixture + live tests; theme example |
