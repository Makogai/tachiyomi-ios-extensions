// Port of src/all/kagane/.../Kagane.kt @ d9420cd1: setupPreferenceScreen and the preference getters.
import {
  ListPreference,
  MultiSelectListPreference,
  type PreferenceScreen,
  type SharedPreferences,
  SwitchPreferenceCompat,
} from "@sdk";
import { CONTENT_RATING_LABELS, CONTENT_RATINGS, FORMAT_OPTIONS } from "./filters";

const CONTENT_RATING = "pref_content_rating";

// Legacy values (safe/suggestive/erotica/pornographic) are mapped on read.
const CONTENT_RATING_DEFAULT = "safe";

const PORN_PREF = "pref_show_pornographic";
const DISTURBING_PREF = "pref_show_disturbing";

const GENRES_ID_PREF = "pref_genre_id_exclude";
const FORMATS_PREF = "pref_format_exclude";

const SOURCE_DISPLAY_MODE = "pref_source_display_mode";
const SOURCE_DISPLAY_MODE_DEFAULT = "all";

const CLEAN_TITLE = "pref_clean_title";
const CLEAN_TITLE_DEFAULT = false;

const SHOW_SOURCE = "pref_show_source";
const SHOW_SOURCE_DEFAULT = false;

const SHOW_EDITION = "pref_show_edition";
const SHOW_EDITION_DEFAULT = false;

const SHOW_DETAILS = "pref_show_details";
const SHOW_DETAILS_DEFAULT = true;

const DATA_SAVER = "data_saver_default";

const CHAPTER_TITLE_MODE = "chapter_title_mode";
const CHAPTER_TITLE_MODE_DEFAULT = "optional";
const CHAPTER_TITLE_MODES = ["optional", "always", "vol_local", "vol_chapter"];
const CHAPTER_TITLE_MODE_NAMES = [
  "Title only (e.g. 'Manga Title' / 'Ch.5')",
  "Ch.X + title (e.g. 'Ch.5 Manga Title')",
  "Vol.X Ch.Y (e.g. 'Vol.1 Ch.5')",
  "Vol.X Ch.Y + title (e.g. 'Vol.1 Ch.5 Manga Title')",
];

// Visibility and enabled states, and the change listeners that update them, have no SDK
// equivalent: every setting is always shown. `genreMap` maps genre IDs to names, from the filters.
export function setupPreferenceScreen(screen: PreferenceScreen, preferences: SharedPreferences, genreMap: Map<string, string>): void {
  screen.addPreference(
    new ListPreference({
      key: CONTENT_RATING,
      title: "Content Rating",
      entries: CONTENT_RATINGS.map((it) => CONTENT_RATING_LABELS[it]),
      entryValues: CONTENT_RATINGS,
      summary: "%s",
      defaultValue: CONTENT_RATING_DEFAULT,
    }),
  );

  screen.addPreference(
    new SwitchPreferenceCompat({
      key: PORN_PREF,
      title: "Show pornographic",
      summary: "Sexually explicit content",
      defaultValue: true,
    }),
  );

  screen.addPreference(
    new SwitchPreferenceCompat({
      key: DISTURBING_PREF,
      title: "Show disturbing",
      summary: "Series marked disturbing, such as graphic violence or abuse",
      defaultValue: true,
    }),
  );

  const excludedGenres = excludedGenreIds(preferences);

  screen.addPreference(
    new MultiSelectListPreference({
      key: GENRES_ID_PREF,
      title: "Exclude Genres",
      entries: [...genreMap.values()],
      entryValues: [...genreMap.keys()],
      summary: [...genreMap.keys()]
        .filter((id) => excludedGenres.has(id))
        .map((id) => genreMap.get(id))
        .join(", "),
      defaultValue: [],
    }),
  );

  const excludedFormatSet = excludedFormats(preferences);
  screen.addPreference(
    new MultiSelectListPreference({
      key: FORMATS_PREF,
      title: "Exclude Formats",
      entries: FORMAT_OPTIONS,
      entryValues: FORMAT_OPTIONS,
      summary: FORMAT_OPTIONS.filter((it) => excludedFormatSet.has(it)).join(", "),
      defaultValue: [],
    }),
  );

  screen.addPreference(
    new ListPreference({
      key: SOURCE_DISPLAY_MODE,
      title: "Source Display Selection",
      summary: "%s",
      entries: ["Show All (Official + Scanlations)", "Official Sources Only"],
      entryValues: ["all", "official"],
      defaultValue: SOURCE_DISPLAY_MODE_DEFAULT,
    }),
  );

  screen.addPreference(
    new SwitchPreferenceCompat({ key: SHOW_EDITION, title: "Show edition name in title", defaultValue: SHOW_EDITION_DEFAULT }),
  );

  screen.addPreference(
    new SwitchPreferenceCompat({ key: SHOW_SOURCE, title: "Show source name in title", defaultValue: SHOW_SOURCE_DEFAULT }),
  );

  screen.addPreference(
    new SwitchPreferenceCompat({
      key: CLEAN_TITLE,
      title: "Clean title",
      summary: "Removes extra brackets or parentheses in title (Disables others)",
      defaultValue: CLEAN_TITLE_DEFAULT,
    }),
  );

  screen.addPreference(
    new SwitchPreferenceCompat({
      key: SHOW_DETAILS,
      title: "Show details in description",
      summary: "Rating, content rating, format, languages, year, volumes, views and links",
      defaultValue: SHOW_DETAILS_DEFAULT,
    }),
  );

  screen.addPreference(new SwitchPreferenceCompat({ key: DATA_SAVER, title: "Data saver", defaultValue: false }));

  screen.addPreference(
    new ListPreference({
      key: CHAPTER_TITLE_MODE,
      title: "Chapter title format",
      entries: CHAPTER_TITLE_MODE_NAMES,
      entryValues: CHAPTER_TITLE_MODES,
      summary: "How the chapter title should be displayed",
      defaultValue: CHAPTER_TITLE_MODE_DEFAULT,
    }),
  );
}

// Getters, read fresh on every call.

export function contentRating(preferences: SharedPreferences): string[] {
  const stored = removeLegacyRating(preferences.getString(CONTENT_RATING, ""));
  const maxRating = stored ?? CONTENT_RATING_DEFAULT;
  const index = CONTENT_RATINGS.indexOf(maxRating);
  return CONTENT_RATINGS.slice(0, Math.max(index, 0) + 1);
}

export function showPornographic(preferences: SharedPreferences): boolean {
  const ratings = contentRating(preferences);
  return ratings[ratings.length - 1] === "eighteenplus" && preferences.getBoolean(PORN_PREF, false);
}

export function showDisturbing(preferences: SharedPreferences): boolean {
  const ratings = contentRating(preferences);
  return ratings[ratings.length - 1] === "eighteenplus" && preferences.getBoolean(DISTURBING_PREF, false);
}

export function excludedGenreIds(preferences: SharedPreferences): Set<string> {
  return preferences.getStringSet(GENRES_ID_PREF, []);
}

export function excludedFormats(preferences: SharedPreferences): Set<string> {
  return preferences.getStringSet(FORMATS_PREF, []);
}

export function sourceDisplayMode(preferences: SharedPreferences): string {
  return preferences.getString(SOURCE_DISPLAY_MODE, SOURCE_DISPLAY_MODE_DEFAULT);
}

export function cleanTitle(preferences: SharedPreferences): boolean {
  return preferences.getBoolean(CLEAN_TITLE, CLEAN_TITLE_DEFAULT);
}

export function showEdition(preferences: SharedPreferences): boolean {
  return !cleanTitle(preferences) && preferences.getBoolean(SHOW_EDITION, SHOW_EDITION_DEFAULT);
}

export function showSource(preferences: SharedPreferences): boolean {
  return !cleanTitle(preferences) && preferences.getBoolean(SHOW_SOURCE, SHOW_SOURCE_DEFAULT);
}

export function showDetails(preferences: SharedPreferences): boolean {
  return preferences.getBoolean(SHOW_DETAILS, SHOW_DETAILS_DEFAULT);
}

export function dataSaver(preferences: SharedPreferences): boolean {
  return preferences.getBoolean(DATA_SAVER, false);
}

export function chapterTitleMode(preferences: SharedPreferences): string {
  return preferences.getString(CHAPTER_TITLE_MODE, CHAPTER_TITLE_MODE_DEFAULT);
}

// Legacy value mapping from before the site-model settings change; kept so existing
// installs keep their content rating.
function removeLegacyRating(value: string | null): string | null {
  switch (value) {
    case "safe":
    case "fifteenplus":
    case "eighteenplus":
      return value;
    case "suggestive":
      return "fifteenplus";
    case "erotica":
    case "pornographic":
      return "eighteenplus";
    default:
      return null;
  }
}
