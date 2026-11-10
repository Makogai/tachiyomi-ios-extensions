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
| Weeb Central | `en.weebcentral` | `src/en/weebcentral` | — | `d9420cd1` | fixtures collected, not ported yet |
| MangaDex | `all.mangadex` | `src/all/mangadex` | `lib:i18n` | `d9420cd1` | fixtures collected, not ported yet |
