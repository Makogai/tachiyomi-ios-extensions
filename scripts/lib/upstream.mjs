// Reading keiyoushi/extensions-source: from a local checkout ($KEIYOUSHI_DIR, or ../extensions-source
// and ~/code/extensions-source if present) or, read-only and unauthenticated, from GitHub.
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { root } from "./extensions.mjs";

export const UPSTREAM_REPO = "keiyoushi/extensions-source";

/** A local checkout of extensions-source, or null. */
export function localCheckout(explicit) {
  const candidates = [explicit, process.env.KEIYOUSHI_DIR, path.join(root, "../extensions-source"), path.join(os.homedir(), "code/extensions-source")];
  return candidates.find((dir) => dir && existsSync(path.join(dir, "lib-multisrc"))) ?? null;
}

async function github(url) {
  const response = await fetch(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "tachiyomi-ios-extensions-tools" } });
  if (response.status === 403 || response.status === 429) {
    throw new Error(`GitHub refused the request (rate limit for unauthenticated calls: 60/hour). Try again later or set KEIYOUSHI_DIR to a local checkout.`);
  }
  if (!response.ok) throw new Error(`GitHub: HTTP ${response.status} for ${url}`);
  return response;
}

/** A file at `ref` (default main), from the local checkout when there is one. */
export async function readUpstreamFile(file, { checkout = localCheckout(), ref = "main", binary = false } = {}) {
  if (checkout && ref === "main" && existsSync(path.join(checkout, file))) {
    return binary ? readFileSync(path.join(checkout, file)) : readFileSync(path.join(checkout, file), "utf8");
  }
  const response = await fetch(`https://raw.githubusercontent.com/${UPSTREAM_REPO}/${ref}/${file}`);
  if (!response.ok) return null;
  return binary ? Buffer.from(await response.arrayBuffer()) : response.text();
}

/** The newest upstream commit touching any of `paths` on main: `{sha, date, message}` or null. */
export async function latestCommit(paths) {
  let newest = null;
  for (const upstreamPath of paths) {
    const response = await github(`https://api.github.com/repos/${UPSTREAM_REPO}/commits?path=${encodeURIComponent(upstreamPath)}&per_page=1`);
    const [commit] = await response.json();
    if (commit && (!newest || commit.commit.committer.date > newest.date)) {
      newest = { sha: commit.sha, date: commit.commit.committer.date, message: commit.commit.message.split("\n")[0] };
    }
  }
  return newest;
}

/** Commits between `base` and main touching `paths` (GitHub compare API; at most 250 checked). */
export async function commitsSince(base, paths) {
  const response = await github(`https://api.github.com/repos/${UPSTREAM_REPO}/compare/${base}...main`);
  const comparison = await response.json();
  const touched = (comparison.files ?? []).some((file) => paths.some((upstreamPath) => file.filename.startsWith(upstreamPath)));
  return { aheadBy: comparison.ahead_by, touchedFilesListed: touched, truncated: (comparison.files ?? []).length >= 300 };
}

export const compareUrl = (from, to = "main") => `https://github.com/${UPSTREAM_REPO}/compare/${from}...${to}`;

/**
 * What a `build.gradle.kts` (or old `build.gradle`) declares: name, sources (lang, baseUrl, id),
 * theme, content warning, versionCode. Values set in Kotlin code are not seen.
 */
export function parseGradle(text) {
  const string = (key) => new RegExp(`\\b${key}\\s*=\\s*"([^"]*)"`).exec(text)?.[1] ?? null;
  const number = (key) => {
    const value = new RegExp(`\\b${key}\\s*=\\s*(\\d+)`).exec(text)?.[1];
    return value === undefined ? null : Number(value);
  };
  const sources = [];
  const sourceFrom = (body, lang) => ({
    lang: lang ?? /lang\s*=\s*"([^"]*)"/.exec(body)?.[1] ?? null,
    baseUrl: /baseUrl\s*=\s*"([^"]*)"/.exec(body)?.[1] ?? null,
    name: /name\s*=\s*"([^"]*)"/.exec(body)?.[1] ?? null,
    id: /\bid\s*=\s*(\d+)L?/.exec(body)?.[1] ?? null,
    versionId: Number(/\bversionId\s*=\s*(\d+)/.exec(body)?.[1] ?? 1),
  });
  // `listOf("en", "es", …).forEach { source { lang = it … } }`: one source per listed language.
  let rest = text;
  for (const loop of text.matchAll(/listOf\(([^)]*)\)\s*\.forEach\s*\{\s*(?:(\w+)\s*->\s*)?source\s*\{([^}]*)\}/g)) {
    const variable = loop[2] ?? "it";
    if (!new RegExp(`lang\\s*=\\s*${variable}\\b`).test(loop[3])) continue;
    for (const [, lang] of loop[1].matchAll(/"([^"]*)"/g)) sources.push(sourceFrom(loop[3], lang));
    rest = rest.replace(loop[0], "");
  }
  for (const block of rest.matchAll(/source\s*\{([^}]*)\}/g)) sources.push(sourceFrom(block[1]));
  const warning = /contentWarning\s*=\s*ContentWarning\.(\w+)/.exec(text)?.[1] ?? null;
  return {
    name: string("name") ?? string("extName"),
    versionCode: number("versionCode") ?? number("extVersionCode"),
    theme: string("theme") ?? string("themePkg"),
    nsfw: warning ? warning !== "SAFE" : /isNsfw\s*=\s*true/.test(text),
    sources: sources.length ? sources : [{ lang: null, baseUrl: string("baseUrl"), name: null, id: /\bid\s*=\s*(\d+)L?/.exec(text)?.[1] ?? null }],
  };
}
