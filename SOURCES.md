# Ported sources

Every extension here was ported by hand from
[keiyoushi/extensions-source](https://github.com/keiyoushi/extensions-source). The commit column is
the upstream commit the port was taken from; find upstream fixes since then with:

```sh
git -C ~/code/extensions-source log <commit>..origin/main --oneline -- <upstream path> lib-multisrc/<theme>
```

Port the changes, bump `versionCode` in the extension's `extension.json`, and update the commit here.

| Extension | Package | Upstream path | Theme / libs | Commit | Status |
|---|---|---|---|---|---|
| Mangahere | `en.mangahere` | `src/en/mangahere` | — | `d9420cd1` | ported, fixture + live tests |
| Weeb Central | `en.weebcentral` | `src/en/weebcentral` | — | `d9420cd1` | ported, fixture + live tests |
| MangaDex | `all.mangadex` | `src/all/mangadex` | `lib:i18n` | `d9420cd1` | fixtures collected, not ported yet |
| Read Comics Online | `en.readcomicsonline` | `src/en/readcomicsonline` | `lib-multisrc/mmrcms` | `d9420cd1` | ported, no fixtures yet (site behind a Cloudflare check) |
| Comick (Unoriginal) | `all.comicklive` | `src/all/comicklive` | — | `d9420cd1` | ported, fixture + live tests |
| Atsumaru | `en.atsumaru` | `src/en/atsumaru` | — | `d9420cd1` | ported, fixture + live tests |
| Asura Scans | `en.asurascans` | `src/en/asurascans` | — | `d9420cd1` | ported, fixture + live tests; tile unscrambling via `getImageTransform` |
| Kagane | `all.kagane` | `src/all/kagane` | — | `d9420cd1` | ported (18 languages), fixtures built from upstream's DTOs (API behind a Cloudflare check); live tests need the check solved |
| MangaFire | `all.mangafire` | `src/all/mangafire` | — | `d9420cd1` | ported (7 languages), fixture + live tests; VRF signing verified against a JVM run of upstream's code; automatic shape-captcha solving runs upstream's OpenCV.js solver in the host WebView but has never run against a live captcha (otherwise "Open in WebView") |
| Comix | `en.comix` | `src/en/comix` | — | `d9420cd1` | ported; details have fixture + live tests; browse, chapter list and reader run upstream's page scripts in the host WebView (checked in desktop Chrome, not in the app; no tests); no native taps or request blocking; grid descrambling via `getImageTransform` (unit cases only); XOR-encoded images not supported |
