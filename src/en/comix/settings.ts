// Port of src/en/comix/.../Comix.kt @ d9420cd1: setupPreferenceScreen and the SharedPreferences getters.
// The chapter-list state upstream keeps in the newest chapter's memo is stored here too, per manga.
import {
  EditTextPreference,
  ListPreference,
  MultiSelectListPreference,
  type PreferenceScreen,
  type SharedPreferences,
  SwitchPreferenceCompat,
} from "@sdk";
import { getDemographics, getGenres, getTypes } from "./filters";

export const PREF_POSTER_QUALITY = "pref_poster_quality";
export const PREF_CONTENT_RATING = "pref_content_rating";
export const PREF_DEFAULT_TYPES = "pref_default_types";
export const PREF_DEFAULT_DEMOGRAPHICS = "pref_default_demographics";
export const PREF_BLOCKED_GENRES = "pref_blocked_genres";
export const LEGACY_HIDE_NSFW_PREF = "nsfw_pref";
export const DEDUPLICATE_CHAPTERS = "pref_deduplicate_chapters";
export const PREF_FETCH_CHAPTERS_UNTIL_KNOWN = "pref_fetch_chapters_until_known";
export const PREF_SCANLATOR_BLACKLIST = "pref_scanlator_blacklist";
export const ALTERNATIVE_NAMES_IN_DESCRIPTION = "pref_alt_names_in_description";
export const PREF_SHOW_EXTRA_INFO = "pref_show_extra_info";
export const PREF_SHOW_TAGS_IN_GENRES = "pref_show_tags_in_genres";
export const PREF_SCORE_POSITION = "pref_score_position";
export const PREF_SOLVE_CAPTCHA = "pref_solve_captcha";
/** Per manga: what upstream keeps in the newest chapter's memo. */
export const CHAPTER_LIST_STATE_PREFIX = "chapter_list_state_";

export const DEFAULT_CONTENT_RATING = "suggestive";
/** Bump to make every stored chapter list be fetched in full again. */
export const CHAPTER_DATA_VERSION = 1;

export interface ChapterListState {
  deduplicated: boolean;
  blacklist: string;
  version: number;
  complete: boolean;
  fetchedAt?: number;
}

export function setupPreferenceScreen(screen: PreferenceScreen): void {
  screen.addPreference(
    new SwitchPreferenceCompat({
      key: PREF_SOLVE_CAPTCHA,
      title: "Solve captchas",
      summary: "Solve the site's \"Verify you're human\" captcha automatically",
      defaultValue: false,
    }),
  );
  screen.addPreference(
    new SwitchPreferenceCompat({
      key: PREF_FETCH_CHAPTERS_UNTIL_KNOWN,
      title: "Faster chapter list fetching",
      summary:
        "Enabled: Uses fewer requests, but may miss newly added older chapters " +
        "(e.g. chapter 5.5 when the latest known chapter is 150).\n\n" +
        "Disabled: Finds older chapter additions, but fetching large chapter lists is slower.",
      defaultValue: true,
    }),
  );
  screen.addPreference(
    new ListPreference({
      key: PREF_POSTER_QUALITY,
      title: "Thumbnail Quality",
      summary: "Change the quality of the thumbnail. Current: %s.",
      entries: ["Small", "Medium", "Large"],
      entryValues: ["small", "medium", "large"],
      defaultValue: "large",
    }),
  );
  screen.addPreference(
    new ListPreference({
      key: PREF_CONTENT_RATING,
      title: "Content rating",
      summary:
        "Maximum content rating shown in popular, latest, and search results. " +
        "The Content rating filter in search overrides this. Current: %s.",
      entries: ["Show all", "Safe only", "Up to Suggestive", "Up to Erotica", "Up to Pornographic"],
      entryValues: ["", "safe", "suggestive", "erotica", "pornographic"],
      defaultValue: DEFAULT_CONTENT_RATING,
    }),
  );
  screen.addPreference(
    new MultiSelectListPreference({
      key: PREF_DEFAULT_TYPES,
      title: "Default types",
      summary: "Types to include in popular, latest, and search results. The Type filter in search overrides this.",
      entries: getTypes().map(([title]) => title),
      entryValues: getTypes().map(([, value]) => value),
      defaultValue: getTypes().map(([, value]) => value),
    }),
  );
  screen.addPreference(
    new MultiSelectListPreference({
      key: PREF_DEFAULT_DEMOGRAPHICS,
      title: "Default demographics",
      summary:
        "Unticked demographics are hidden from popular, latest, and search results. " +
        "The Demographic filter in search overrides this.",
      entries: getDemographics().map(([title]) => title),
      entryValues: getDemographics().map(([, value]) => value),
      defaultValue: getDemographics().map(([, value]) => value),
    }),
  );
  screen.addPreference(
    new MultiSelectListPreference({
      key: PREF_BLOCKED_GENRES,
      title: "Blocked genres",
      summary: "Genres always excluded from results. The search filter can still include a blocked genre as a one-off override.",
      entries: getGenres().map(([title]) => title),
      entryValues: getGenres().map(([, value]) => value),
      defaultValue: [],
    }),
  );
  screen.addPreference(
    new SwitchPreferenceCompat({
      key: DEDUPLICATE_CHAPTERS,
      title: "Deduplicate Chapters",
      summary:
        "Remove duplicate chapters from the chapter list.\n" +
        "Official chapters (Comix-marked) are preferred, followed by the highest-voted or most recent.\n" +
        "Warning: It can be slow on large lists.",
      defaultValue: false,
    }),
  );
  screen.addPreference(
    new EditTextPreference({
      key: PREF_SCANLATOR_BLACKLIST,
      title: "Scanlator Blacklist",
      summary:
        "Filter out chapters from specific groups. Comma-separated list of group names or group IDs (e.g., 'Violet Scans, 307').",
      defaultValue: "",
    }),
  );
  screen.addPreference(
    new SwitchPreferenceCompat({ key: ALTERNATIVE_NAMES_IN_DESCRIPTION, title: "Show Alternative Names in Description", defaultValue: false }),
  );
  screen.addPreference(
    new SwitchPreferenceCompat({
      key: PREF_SHOW_EXTRA_INFO,
      title: "Show extra info in description",
      summary:
        "Append publication year, language, content rating, rank, ratings count, follower count, and tracker links to the manga description.",
      defaultValue: true,
    }),
  );
  screen.addPreference(
    new SwitchPreferenceCompat({
      key: PREF_SHOW_TAGS_IN_GENRES,
      title: "Show tags in genre chips",
      summary:
        "Include the site's narrative tag list (e.g. Demons, Vampires, Time Travel) alongside the curated genres in the " +
        "manga details. Off by default — the curated set matches what the site itself shows on the page.",
      defaultValue: false,
    }),
  );
  screen.addPreference(
    new ListPreference({
      key: PREF_SCORE_POSITION,
      title: "Score display position",
      summary: "%s",
      entries: ["Top of description", "Bottom of description", "Don't show"],
      entryValues: ["top", "bottom", "none"],
      defaultValue: "top",
    }),
  );
}

// Getters, upstream's SharedPreferences.x() extensions. Read fresh on every call.

export function solveCaptchas(preferences: SharedPreferences): boolean {
  return preferences.getBoolean(PREF_SOLVE_CAPTCHA, false);
}

export function posterQuality(preferences: SharedPreferences): string {
  return preferences.getString(PREF_POSTER_QUALITY, "large");
}

export function deduplicateChapters(preferences: SharedPreferences): boolean {
  return preferences.getBoolean(DEDUPLICATE_CHAPTERS, false);
}

export function fetchChaptersUntilKnown(preferences: SharedPreferences): boolean {
  return preferences.getBoolean(PREF_FETCH_CHAPTERS_UNTIL_KNOWN, true);
}

export function alternativeNamesInDescription(preferences: SharedPreferences): boolean {
  return preferences.getBoolean(ALTERNATIVE_NAMES_IN_DESCRIPTION, false);
}

export function scorePosition(preferences: SharedPreferences): string {
  return preferences.getString(PREF_SCORE_POSITION, "top");
}

export function showExtraInfo(preferences: SharedPreferences): boolean {
  return preferences.getBoolean(PREF_SHOW_EXTRA_INFO, true);
}

export function showTagsInGenres(preferences: SharedPreferences): boolean {
  return preferences.getBoolean(PREF_SHOW_TAGS_IN_GENRES, false);
}

export function scanlatorBlacklist(preferences: SharedPreferences): Set<string> {
  return new Set(
    preferences
      .getString(PREF_SCANLATOR_BLACKLIST, "")
      .split(",")
      .map((it) => it.trim().toLowerCase())
      .filter((it) => it !== ""),
  );
}

export function defaultTypes(preferences: SharedPreferences): Set<string> {
  return preferences.getStringSet(PREF_DEFAULT_TYPES, getTypes().map(([, value]) => value));
}

export function defaultDemographics(preferences: SharedPreferences): Set<string> {
  const all = getDemographics().map(([, value]) => value);
  const selected = preferences.getStringSet(PREF_DEFAULT_DEMOGRAPHICS, all);
  return selected.size === 0 ? new Set(all) : selected;
}

export function blockedGenres(preferences: SharedPreferences): Set<string> {
  return preferences.getStringSet(PREF_BLOCKED_GENRES, []);
}

// The legacy "Hide NSFW" boolean still exists in some users' preferences;
// map it to a sensible default until they pick a value explicitly.
export function contentRating(preferences: SharedPreferences): string {
  const unset = "\u0000";
  const stored = preferences.getString(PREF_CONTENT_RATING, unset);
  if (stored !== unset) return stored;
  if (!preferences.getBoolean(LEGACY_HIDE_NSFW_PREF, true)) return "";
  return DEFAULT_CONTENT_RATING;
}

export function readChapterListState(preferences: SharedPreferences, mangaId: string): ChapterListState | null {
  const raw = preferences.getString(CHAPTER_LIST_STATE_PREFIX + mangaId, "");
  if (raw === "") return null;
  try {
    return JSON.parse(raw) as ChapterListState;
  } catch {
    return null;
  }
}

export function writeChapterListState(preferences: SharedPreferences, mangaId: string, state: ChapterListState): void {
  preferences.edit().putString(CHAPTER_LIST_STATE_PREFIX + mangaId, JSON.stringify(state)).apply();
}
