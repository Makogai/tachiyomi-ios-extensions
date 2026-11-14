// Creates a new extension: src/<lang>/<pkg>/ with extension.json, index.ts (standalone or on a
// theme), fixtures/, tests.json and, when upstream has one, icon.png.
//
//   npm run new                                     asks for everything
//   npm run new -- --upstream src/en/mangasushi     reads name, lang, baseUrl, theme, id and icon
//                                                   from keiyoushi (local checkout or GitHub)
//   npm run new -- --name "Site" --lang en --base-url https://site.com --theme madara
//
// Options: --name, --lang, --base-url, --theme <name|none>, --pkg <folder>, --upstream <path>,
// --commit <sha>, --id <fixed source id>, --version-id <n>, --nsfw, --yes (no questions).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { findExtensions, srcDir, themesDir } from "./lib/extensions.mjs";
import { latestCommit, localCheckout, parseGradle, readUpstreamFile } from "./lib/upstream.mjs";
import { generateId } from "./source-id.mjs";

const { values: flags } = parseArgs({
  options: {
    name: { type: "string" },
    lang: { type: "string" },
    "base-url": { type: "string" },
    theme: { type: "string" },
    pkg: { type: "string" },
    upstream: { type: "string" },
    commit: { type: "string" },
    id: { type: "string" },
    "version-id": { type: "string" },
    nsfw: { type: "boolean" },
    yes: { type: "boolean", short: "y", default: false },
  },
});

const themes = readdirSync(themesDir).filter((dir) => existsSync(path.join(themesDir, dir, "theme.json")));
const themeInfo = (theme) => JSON.parse(readFileSync(path.join(themesDir, theme, "theme.json"), "utf8"));

// Answers come from the terminal, or, when stdin is piped, one per line in order.
const piped = !flags.yes && !process.stdin.isTTY ? (await new Response(process.stdin).text()).split("\n") : null;
const rl = flags.yes || piped ? null : createInterface({ input: process.stdin, output: process.stdout });
async function ask(question, fallback) {
  if (piped) return piped.shift()?.trim() || fallback || "";
  if (!rl) return fallback ?? "";
  const answer = (await rl.question(`${question}${fallback ? ` [${fallback}]` : ""}: `)).trim();
  return answer || fallback || "";
}

function fail(message) {
  console.error(message);
  rl?.close();
  process.exit(1);
}

// 1. What upstream says, when there is an upstream path.
let upstream = null;
let upstreamPath = flags.upstream?.replace(/^\/+|\/+$/g, "") ?? null;
if (!upstreamPath && (rl || piped)) upstreamPath = (await ask("keiyoushi path (e.g. src/en/mangasushi), empty for none", "")) || null;
if (upstreamPath && !upstreamPath.startsWith("src/")) upstreamPath = `src/${upstreamPath}`;
if (upstreamPath) {
  const gradle = (await readUpstreamFile(`${upstreamPath}/build.gradle.kts`)) ?? (await readUpstreamFile(`${upstreamPath}/build.gradle`));
  if (!gradle) fail(`No build.gradle(.kts) at ${upstreamPath} (looked in ${localCheckout() ?? "GitHub"}).`);
  upstream = parseGradle(gradle);
  if (upstream.sources.length > 1) console.log(`Upstream declares ${upstream.sources.length} sources; the template has the first. Add the rest to defineExtension([...]).`);
}
const firstSource = upstream?.sources[0] ?? {};

// 2. The answers.
const name = flags.name ?? (await ask("Source name", firstSource.name ?? upstream?.name ?? undefined));
if (!name) fail("A name is required (--name).");
const lang = flags.lang ?? (await ask("Language (en, all, pt-BR, …)", firstSource.lang ?? upstreamPath?.split("/")[1] ?? "en"));
const baseUrl = (flags["base-url"] ?? (await ask("Base URL", firstSource.baseUrl ?? undefined))).replace(/\/+$/, "");
if (!/^https?:\/\/[^/]+$/.test(baseUrl)) fail(`Base URL must look like https://example.com, not '${baseUrl}'.`);
let theme = flags.theme ?? upstream?.theme ?? (await ask(`Theme (${themes.join(", ")}, or none)`, "none"));
if (theme === "none" || theme === "") theme = null;
if (theme && !themes.includes(theme)) fail(`No theme '${theme}' in sdk/themes (have ${themes.join(", ")}). Use --theme none and port it standalone, or port the theme first.`);
const pkgName = (flags.pkg ?? upstreamPath?.split("/")[2] ?? name.toLowerCase().replace(/[^a-z0-9]/g, "")).toLowerCase();
if (!/^[a-z0-9]+$/.test(pkgName)) fail(`Package folder must be lowercase letters and digits, not '${pkgName}'.`);
const langDir = lang === "all" ? "all" : lang.split("-")[0].toLowerCase();
const pkg = `${langDir}.${pkgName}`;
const nsfw = flags.nsfw ?? upstream?.nsfw ?? false;
const versionId = Number(flags["version-id"] ?? 1);
const fixedId = flags.id ?? firstSource.id ?? null;
let commit = flags.commit ?? null;
if (upstreamPath && !commit) {
  try {
    const checkout = localCheckout();
    // The checkout's own commit when the files came from it, else upstream's newest.
    commit = checkout
      ? execFileSync("git", ["-C", checkout, "rev-parse", "--short=8", "HEAD"], { encoding: "utf8" }).trim()
      : ((await latestCommit([upstreamPath]))?.sha.slice(0, 8) ?? null);
  } catch (error) {
    console.log(`Could not look up the upstream commit (${error.message}); fill it in extension.json.`);
  }
}
rl?.close();

const dir = path.join(srcDir, langDir, pkgName);
if (existsSync(dir)) fail(`${path.relative(process.cwd(), dir)} already exists.`);
if (findExtensions().some((extension) => extension.pkg === pkg)) fail(`${pkg} already exists.`);
const id = fixedId ?? generateId(name, lang, versionId);

// 3. Files.
const className = name.replace(/[^A-Za-z0-9]+(.)?/g, (_, next) => (next ?? "").toUpperCase()).replace(/^[a-z]/, (c) => c.toUpperCase()).replace(/^(\d)/, "S$1");
const header = upstreamPath
  ? `// Port of ${upstreamPath} @ ${commit ?? "<commit>"}${theme ? ` (theme: sdk/themes/${theme})` : ""}. Method names follow the original.`
  : `// ${name}${theme ? ` on sdk/themes/${theme}` : ""}.`;
const idLines = [fixedId ? `  override readonly id = "${fixedId}";` : null, versionId !== 1 ? `  override readonly versionId = ${versionId};` : null].filter(Boolean);
const sourceFields = [`  readonly name = ${JSON.stringify(name)};`, `  readonly lang = ${JSON.stringify(lang)};`, `  readonly baseUrl = ${JSON.stringify(baseUrl)};`, ...idLines].join("\n");

let indexTs;
if (theme) {
  const info = themeInfo(theme);
  indexTs = `${header}
import { defineExtension } from "@sdk";
import { ${info.baseClass} } from "@sdk/themes/${theme}";

// ${info.hint}
class ${className} extends ${info.baseClass} {
${sourceFields}
}

export default defineExtension([new ${className}()]);
`;
} else {
  indexTs = `${header}
import {
  defineExtension,
  type Element,
  Fetch,
  type FilterList,
  KeiSource,
  MangasPage,
  type Page,
  type SChapter,
  SManga,
  SMangaUpdate,
} from "@sdk";

class ${className} extends KeiSource {
${sourceFields}

  // Popular

  async getPopularManga(page: number): Promise<MangasPage> {
    const document = (await this.client.get(\`\${this.baseUrl}/popular?page=\${page}\`, Fetch.DOCUMENT)).asJsoup();
    const mangas = document.select("div.manga-card").map((element) => this.mangaFromElement(element));
    return new MangasPage([...mangas], document.selectFirst("a.next") !== null);
  }

  private mangaFromElement(element: Element): SManga {
    const manga = SManga.create();
    const link = element.expectFirst("a");
    manga.setUrlWithoutDomain(link.absUrl("href"));
    manga.title = link.text();
    manga.thumbnail_url = element.selectFirst("img")?.absUrl("src") ?? null;
    return manga;
  }

  // Latest

  async getLatestUpdates(_page: number): Promise<MangasPage> {
    throw new Error("TODO: port getLatestUpdates");
  }

  // Search

  async getSearchMangaList(_page: number, _query: string, _filters: FilterList): Promise<MangasPage> {
    throw new Error("TODO: port getSearchMangaList");
  }

  // Details and chapters

  async fetchMangaUpdate(_manga: SManga, _chapters: SChapter[], _fetchDetails: boolean, _fetchChapters: boolean): Promise<SMangaUpdate> {
    throw new Error("TODO: port fetchMangaUpdate");
  }

  // Pages

  async getPageList(_chapter: SChapter): Promise<Page[]> {
    throw new Error("TODO: port getPageList");
  }
}

export default defineExtension([new ${className}()]);
`;
}

const extensionJson = {
  name,
  lang,
  versionCode: 1,
  nsfw,
  ...(upstreamPath ? { upstream: { path: upstreamPath, commit: commit ?? "" } } : {}),
};
const testsJson = {
  routes: [],
  cases: [],
  live: [{ name: "popular", call: "popular", args: [1], expect: { "mangas.length": { gt: 0 } } }],
};

mkdirSync(path.join(dir, "fixtures"), { recursive: true });
writeFileSync(path.join(dir, "extension.json"), JSON.stringify(extensionJson, null, 2) + "\n");
writeFileSync(path.join(dir, "index.ts"), indexTs);
writeFileSync(path.join(dir, "tests.json"), JSON.stringify(testsJson, null, 2) + "\n");
writeFileSync(path.join(dir, "fixtures/.gitkeep"), "");

// Icon: the source's own, else its theme's (keiyoushi ships multisrc icons with the theme).
let icon = null;
if (upstreamPath) icon = await readUpstreamFile(`${upstreamPath}/res/mipmap-xxxhdpi/ic_launcher.png`, { binary: true });
if (!icon && theme) icon = await readUpstreamFile(`${themeInfo(theme).upstream}/res/mipmap-xxxhdpi/ic_launcher.png`, { binary: true });
if (icon) writeFileSync(path.join(dir, "icon.png"), icon);

const relative = path.relative(process.cwd(), dir);
console.log(`
Created ${relative}/  (${pkg})
  source ID   ${id}${fixedId ? " (fixed, from upstream)" : ` (generated from "${name.toLowerCase()}/${lang}/${versionId}")`}
  theme       ${theme ?? "none (standalone)"}
  icon        ${icon ? "icon.png from upstream" : "MISSING: add a 192×192 icon.png"}

Next:
  1. Port the overrides in ${relative}/index.ts${theme ? "" : " (the template has placeholder selectors)"}.
  2. Try it live:      npm run debug -- ${pkg} popular 1
  3. Save fixtures:    npm run debug -- ${pkg} popular 1 --save     (or npm run fixture -- ${pkg} <url>)
  4. Write cases in tests.json, then: npm run test:ext ${pkg}
  5. Add a row to SOURCES.md. See docs/ADDING-A-SOURCE.md.`);
