import type { SChapter } from "./models.js";
import { EditTextPreference, SwitchPreferenceCompat, type SharedPreferences } from "./preferences.js";

/**
 * Settings that many keiyoushi sources share, ready to add in `setupPreferenceScreen`. Each
 * comes with the function that reads it, so the key is written once.
 */

export const BASE_URL_PREF = "overrideBaseUrl";

/**
 * Lets the user point the source at a mirror or a moved domain. Read it with `preferredBaseUrl`
 * from a `baseUrl` getter. The index keeps listing the built-in URL; the source ID does not change.
 */
export function baseUrlPreference(defaultBaseUrl: string): EditTextPreference {
  return new EditTextPreference({
    key: BASE_URL_PREF,
    title: "Override base URL",
    summary: `For temporary use: restore the default (${defaultBaseUrl}) once the site is back. Empty uses the default.`,
    defaultValue: "",
  });
}

/** The user's base URL override, or `defaultBaseUrl`. Trailing slashes are dropped. */
export function preferredBaseUrl(preferences: SharedPreferences, defaultBaseUrl: string): string {
  let value = "";
  try {
    value = preferences.getString(BASE_URL_PREF, "").trim();
  } catch {
    // No host (build-time describe): use the default.
  }
  return (/^https?:\/\/[^/]+/.test(value) ? value : defaultBaseUrl).replace(/\/+$/, "");
}

export const DEDUPLICATE_CHAPTERS_PREF = "deduplicateChapters";

export function deduplicateChaptersPreference(defaultValue = false): SwitchPreferenceCompat {
  return new SwitchPreferenceCompat({
    key: DEDUPLICATE_CHAPTERS_PREF,
    title: "Deduplicate chapters",
    summary: "Keep one chapter per number when several groups upload the same chapter.",
    defaultValue,
  });
}

/**
 * Keeps the first chapter for each key (by default the chapter number; unknown numbers are all
 * kept). Order is preserved, so put preferred uploads first.
 */
export function deduplicateChapters(
  chapters: SChapter[],
  key: (chapter: SChapter) => string | number | null = (chapter) => (chapter.chapter_number >= 0 ? chapter.chapter_number : null),
): SChapter[] {
  const seen = new Set<string | number>();
  return chapters.filter((chapter) => {
    const value = key(chapter);
    if (value === null) return true;
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}
