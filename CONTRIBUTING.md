# Contributing

Thanks for helping. This repository holds the sources that the tachiyomi-ios app (and its
Android counterpart) download and run. Every merged change reaches users' devices, so the rules
below are about keeping that safe, legal and maintainable.

- [What we accept](#what-we-accept)
- [Licensing and attribution](#licensing-and-attribution)
- [Content rules](#content-rules)
- [How to write a source](#how-to-write-a-source)
- [Pull request checklist](#pull-request-checklist)
- [Review flow](#review-flow)
- [Reporting a broken source or asking for one](#reporting-a-broken-source-or-asking-for-one)

## What we accept

**Ports of keiyoushi sources** (preferred). A TypeScript port of a source from
[keiyoushi/extensions-source](https://github.com/keiyoushi/extensions-source), keeping upstream's
name, language and ID so library entries carry over between the apps. Fixes and updates to
existing ports are welcome too: `npm run upstream` lists the ports that are behind.

**Original sources**, for sites keiyoushi does not have, when:

- the site is publicly reachable without an account, and the source does not log in or ask for
  credentials;
- the source does not bypass protection (see [Content rules](#content-rules));
- it follows the same layout, tests and checks as a port;
- you are willing to be its first point of contact when it breaks.

We may decline a source for a site that is unstable, hostile to automated readers, or mostly
re-hosts other sites' uploads. Open a [source request](../../issues/new?template=source-request.yml)
first if you are unsure.

**Not accepted:** changes to the host contract (`__host`, the API level, the bundle or index
format) without a matching change in both apps; renaming a published source or changing its
`lang` or `versionId` (that changes its ID and orphans every library entry); bulk
reformatting of ports.

## Licensing and attribution

- The repository is licensed under the [Apache License 2.0](LICENSE), as keiyoushi's sources are.
  By opening a pull request you agree that your contribution is licensed under the same terms.
- Keep upstream's attribution. A port names its upstream path and commit in `extension.json`
  (`"upstream": { "path", "commit" }`), in the first line of every `.ts` file, and in
  `SOURCES.md`. Do not remove upstream copyright notices or the [NOTICE](NOTICE) file.
- Upstream assets (icons, bundled scripts) are used as upstream ships them, under the same
  license. Do not add code, images or text from sources with an incompatible license.

## Content rules

- **NSFW flagged correctly.** Set `"nsfw": true` in `extension.json` when the site hosts adult
  content, as upstream's `contentWarning`/`isNsfw` does. When in doubt, flag it.
- **No credentials.** No accounts, passwords, API keys, session cookies or tokens for any site in
  code, fixtures or tests, and no source that logs in to a piracy host on the user's behalf.
- **No protection bypassing.** Do not add code that defeats Cloudflare or other bot or captcha
  protection. A source behind a challenge lets the app show it in its WebView, where the user
  solves it. Rate limits the site asks for are respected (`builder.rateLimit`).
- **No personal data in fixtures.** Fixtures are saved site responses in a public repository:
  no account pages, usernames, emails, IP addresses or comments from logged-in sessions.
  `npm run validate` rejects local paths and tokens it can recognise; the rest is on you.
- **No tracking or ads.** A source fetches what the reader needs, nothing else.

## How to write a source

Everything runs in Node; no Xcode or Android Studio is needed.

```sh
npm ci
npm run new -- --upstream src/<lang>/<name>     # scaffold a port (or --name/--lang/--base-url for an original)
npm run debug -- <ext> popular 1               # run one call live
npm run debug -- <ext> popular 1 --save        # save fixtures and a test case
npm run check                                  # what CI runs
```

- [docs/ADDING-A-SOURCE.md](docs/ADDING-A-SOURCE.md) is the guide: porting a theme site,
  [writing a custom source](docs/ADDING-A-SOURCE.md#writing-a-custom-source) in the standard
  layout, fixtures, tests and debugging.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains the SDK, the host contract and the build.

## Pull request checklist

The [pull request template](.github/pull_request_template.md) repeats this list.

- [ ] One source (or one fix) per pull request.
- [ ] `npm run check` passes locally (typecheck, tests, validate).
- [ ] Port: `extension.json` `upstream.path` and `upstream.commit` are set, and every `.ts` file's
      first line names the upstream file and the same commit.
- [ ] Upstream's source name, `lang` and `versionId` are kept, so the source ID matches
      keiyoushi's (`npm run build` prints it). No published source was renamed.
- [ ] Standalone sources use the [standard layout](docs/ADDING-A-SOURCE.md#the-layout) and keep
      upstream's method names; no `TODO(new)` placeholders are left.
- [ ] `tests.json` has fixture cases for popular, search, details, chapters and pages (and latest
      if the site has it), with meaningful `expect` values, plus a `live` popular case.
- [ ] Fixtures hold no personal data, cookies or tokens.
- [ ] `nsfw` is set correctly; no credentials; no protection bypassing.
- [ ] `versionCode` is bumped for every changed extension (`npm run bump -- <ext>`; validate
      names the ones that need it). New extensions start at 1.
- [ ] `SOURCES.md` has a row for a new extension, or the updated commit.
- [ ] `icon.png` is upstream's (or, for an original source, one you may license under Apache-2.0).

## Review flow

1. **CI** runs `npm run check` on the pull request. Pull requests from forks run with a
   read-only token and no secrets; nothing is published from a pull request.
2. **Review.** A maintainer reads `index.ts` first (the flow), then `api.ts` and `parse.ts`
   against the upstream Kotlin (`npm run upstream -- <ext>` and the headers point to it), and
   checks the content rules above.
3. **App check.** A maintainer runs the iOS app's conformance tests (JavaScriptCore + SwiftSoup,
   the authority over the Node harness) against the branch, and tries the source in the app when
   it needs a WebView or a host feature Node does not have.
4. **Merge.** A maintainer merges into `main`. Only a push to `main` publishes: CI rebuilds
   `dist/` and pushes it to the `repo` branch, and the apps offer the update because
   `versionCode` grew.

Expect requests for changes on naming (upstream's), file layout and tests more often than on
logic: they are what keeps a port maintainable when the site changes.

## Reporting a broken source or asking for one

- **Broken source:** use the [Broken source](../../issues/new?template=broken-source.yml) form.
  It asks for the output of `npm run debug -- <ext> <call> <args>`, which shows every request, every
  selector that matched nothing, and the error. Remove cookies or tokens from it before posting
  (plain `npm run debug` prints none; `--verbose` prints headers).
- **New source:** use the [Source request](../../issues/new?template=source-request.yml) form.
