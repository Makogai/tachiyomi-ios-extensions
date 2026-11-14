// Port of src/all/mangadex/.../MangaDex.kt @ d9420cd1: setupPreferenceScreen and the SharedPreferences getters.
// The keys and defaults are in constants.ts, as upstream keeps them in MDConstants.kt. Every key
// ends in the source's MangaDex language (`dexLang`), so each language has its own settings.
import { EditTextPreference, type Intl, ListPreference, MultiSelectListPreference, type PreferenceScreen, type SharedPreferences, SwitchPreferenceCompat } from "@sdk";
import * as MD from "./constants";

export function setupPreferenceScreen(screen: PreferenceScreen, intl: Intl, dexLang: string): void {
  const toggle = (key: string, title: string, summary: string, defaultValue: boolean) =>
    new SwitchPreferenceCompat({ key, title: intl.get(title), summary: intl.get(summary), defaultValue });

  screen.addPreference(
    new ListPreference({
      key: MD.getCoverQualityPreferenceKey(dexLang),
      title: intl.get("cover_quality"),
      summary: "%s",
      entries: MD.getCoverQualityPreferenceEntries(intl),
      entryValues: MD.getCoverQualityPreferenceEntryValues(),
      defaultValue: MD.getCoverQualityPreferenceDefaultValue(),
    }),
  );
  screen.addPreference(toggle(MD.getTryUsingFirstVolumeCoverPrefKey(dexLang), "try_using_first_volume_cover", "try_using_first_volume_cover_summary", MD.TRY_USING_FIRST_VOLUME_COVER_DEFAULT));
  screen.addPreference(toggle(MD.getDataSaverPreferenceKey(dexLang), "data_saver", "data_saver_summary", false));
  screen.addPreference(toggle(MD.getStandardHttpsPreferenceKey(dexLang), "standard_https_port", "standard_https_port_summary", false));
  screen.addPreference(toggle(MD.getAltTitlesInDescPrefKey(dexLang), "alternative_titles_in_description", "alternative_titles_in_description_summary", false));
  screen.addPreference(toggle(MD.getPreferExtensionLangTitlePrefKey(dexLang), "prefer_title_in_extension_language", "prefer_title_in_extension_language_summary", true));
  screen.addPreference(toggle(MD.getFinalChapterInDescPrefKey(dexLang), "final_chapter_in_description", "final_chapter_in_description_summary", true));
  screen.addPreference(toggle(MD.getIncludeUnavailablePrefKey(dexLang), "include_unavailable", "include_unavailable_summary", false));
  screen.addPreference(
    new MultiSelectListPreference({
      key: MD.getContentRatingPrefKey(dexLang),
      title: intl.get("standard_content_rating"),
      summary: intl.get("standard_content_rating_summary"),
      entries: [intl.get("content_rating_safe"), intl.get("content_rating_suggestive"), intl.get("content_rating_erotica"), intl.get("content_rating_pornographic")],
      entryValues: MD.allContentRatings,
      defaultValue: MD.contentRatingPrefDefaults,
    }),
  );
  screen.addPreference(
    new MultiSelectListPreference({
      key: MD.getOriginalLanguagePrefKey(dexLang),
      title: intl.get("filter_original_languages"),
      summary: intl.get("filter_original_languages_summary"),
      entries: [MD.languageDisplayName(intl, MD.JAPANESE), MD.languageDisplayName(intl, MD.CHINESE), MD.languageDisplayName(intl, MD.KOREAN)],
      entryValues: [MD.ORIGINAL_LANGUAGE_PREF_VAL_JAPANESE, MD.ORIGINAL_LANGUAGE_PREF_VAL_CHINESE, MD.ORIGINAL_LANGUAGE_PREF_VAL_KOREAN],
      defaultValue: MD.originalLanguagePrefDefaults,
    }),
  );
  // Upstream checks the UUIDs as they are typed; the apps have no such hook, so invalid ones
  // are ignored when read (uuidList).
  screen.addPreference(new EditTextPreference({ key: MD.getBlockedGroupsPrefKey(dexLang), title: intl.get("block_group_by_uuid"), summary: intl.get("block_group_by_uuid_summary"), defaultValue: "" }));
  screen.addPreference(new EditTextPreference({ key: MD.getBlockedUploaderPrefKey(dexLang), title: intl.get("block_uploader_by_uuid"), summary: intl.get("block_uploader_by_uuid_summary"), defaultValue: "" }));
}

// Getters, upstream's `SharedPreferences.x` extension properties. Read fresh on every call.

export function contentRating(preferences: SharedPreferences, dexLang: string): string[] {
  return [...preferences.getStringSet(MD.getContentRatingPrefKey(dexLang), MD.contentRatingPrefDefaults)];
}

export function originalLanguages(preferences: SharedPreferences, dexLang: string): string[] {
  const originalLanguages = preferences.getStringSet(MD.getOriginalLanguagePrefKey(dexLang), MD.originalLanguagePrefDefaults);
  if (originalLanguages.has(MD.ORIGINAL_LANGUAGE_PREF_VAL_CHINESE)) originalLanguages.add(MD.ORIGINAL_LANGUAGE_PREF_VAL_CHINESE_HK);
  return [...originalLanguages];
}

export function coverQuality(preferences: SharedPreferences, dexLang: string): string {
  return preferences.getString(MD.getCoverQualityPreferenceKey(dexLang), "");
}

export function tryUsingFirstVolumeCover(preferences: SharedPreferences, dexLang: string): boolean {
  return preferences.getBoolean(MD.getTryUsingFirstVolumeCoverPrefKey(dexLang), MD.TRY_USING_FIRST_VOLUME_COVER_DEFAULT);
}

/** A comma-separated list of UUIDs, trimmed, deduplicated and sorted; invalid entries are dropped. */
function uuidList(preferences: SharedPreferences, key: string): string[] {
  const values = preferences
    .getString(key, "")
    .split(",")
    .map((value) => value.trim())
    .filter(MD.isUuid);
  return [...new Set(values)].sort();
}

export function blockedGroups(preferences: SharedPreferences, dexLang: string): string[] {
  return uuidList(preferences, MD.getBlockedGroupsPrefKey(dexLang));
}

export function blockedUploaders(preferences: SharedPreferences, dexLang: string): string[] {
  return uuidList(preferences, MD.getBlockedUploaderPrefKey(dexLang));
}

export function forceStandardHttps(preferences: SharedPreferences, dexLang: string): boolean {
  return preferences.getBoolean(MD.getStandardHttpsPreferenceKey(dexLang), false);
}

export function useDataSaver(preferences: SharedPreferences, dexLang: string): boolean {
  return preferences.getBoolean(MD.getDataSaverPreferenceKey(dexLang), false);
}

export function altTitlesInDesc(preferences: SharedPreferences, dexLang: string): boolean {
  return preferences.getBoolean(MD.getAltTitlesInDescPrefKey(dexLang), false);
}

export function preferExtensionLangTitle(preferences: SharedPreferences, dexLang: string): boolean {
  return preferences.getBoolean(MD.getPreferExtensionLangTitlePrefKey(dexLang), true);
}

export function finalChapterInDesc(preferences: SharedPreferences, dexLang: string): boolean {
  return preferences.getBoolean(MD.getFinalChapterInDescPrefKey(dexLang), true);
}

export function includeUnavailable(preferences: SharedPreferences, dexLang: string): boolean {
  return preferences.getBoolean(MD.getIncludeUnavailablePrefKey(dexLang), false);
}
