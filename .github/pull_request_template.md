<!-- One source or one fix per pull request. See CONTRIBUTING.md. -->

## What

<!-- New port / original source / fix / upstream update, and the extension(s): e.g. "Port en.mysite from keiyoushi src/en/mysite @ abc12345". -->

## Checklist

- [ ] `npm run check` passes locally (typecheck, tests, validate).
- [ ] Port: `extension.json` `upstream.path` and `upstream.commit` are set, and every `.ts` file's first line names the upstream file and the same commit.
- [ ] Upstream's source name, `lang` and `versionId` are kept (the source ID matches keiyoushi's); no published source was renamed.
- [ ] Standalone sources use the standard layout (`docs/ADDING-A-SOURCE.md#the-layout`) and keep upstream's method names; no `TODO(new)` placeholders are left.
- [ ] `tests.json` has fixture cases for popular, search, details, chapters and pages (and latest if the site has it) with meaningful `expect` values, plus a `live` popular case.
- [ ] Fixtures hold no personal data, cookies or tokens.
- [ ] `nsfw` is set correctly; no credentials in code or fixtures; no Cloudflare/captcha bypassing.
- [ ] `versionCode` is bumped for every changed extension (new extensions start at 1).
- [ ] `SOURCES.md` has the new row or the updated commit.
- [ ] `icon.png` is upstream's, or one that can be licensed under Apache-2.0.

## Testing

<!-- What you ran: npm run test:ext <ext>, npm run live -- <ext>, the app if you have it. Paste anything unusual. -->

By submitting this pull request I agree that my contribution is licensed under the Apache License 2.0.
