// Port of src/en/weebcentral/.../WeebCentral.kt @ d9420cd1: setupPreferenceScreen and the preference it reads.
import { type PreferenceScreen, type SharedPreferences, SwitchPreferenceCompat } from "@sdk";

const PREF_CLEAN_TITLE = "pref_clean_title";
const PREF_CLEAN_TITLE_DEFAULT = false;

export function setupPreferenceScreen(screen: PreferenceScreen): void {
  screen.addPreference(
    new SwitchPreferenceCompat({
      key: PREF_CLEAN_TITLE,
      title: "Clean title",
      summary: "Removes extra brackets or parentheses in title",
      defaultValue: PREF_CLEAN_TITLE_DEFAULT,
    }),
  );
}

export function cleanTitle(preferences: SharedPreferences): boolean {
  // The host returns `undefined` (not null) for an unset key, which SharedPreferences.read
  // then fails to JSON-parse; fall back to the default until the SDK handles it.
  try {
    return preferences.getBoolean(PREF_CLEAN_TITLE, PREF_CLEAN_TITLE_DEFAULT);
  } catch {
    return PREF_CLEAN_TITLE_DEFAULT;
  }
}
