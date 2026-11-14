// lib-multisrc/mangathemesia MangaThemesiaPaidChapterHelper @ d9420cd1.
import { SwitchPreferenceCompat, type Intl, type PreferenceScreen, type SharedPreferences } from "@sdk";

export class MangaThemesiaPaidChapterHelper {
  constructor(
    private readonly hidePaidChaptersPrefKey = "pref_hide_paid_chapters",
    private readonly lockedChapterSelector = "a[data-bs-target='#lockedChapterModal']",
  ) {}

  addHidePaidChaptersPreferenceToScreen(screen: PreferenceScreen, intl: Intl): void {
    screen.addPreference(
      new SwitchPreferenceCompat({
        key: this.hidePaidChaptersPrefKey,
        title: intl.get("pref_hide_paid_chapters_title"),
        summary: intl.get("pref_hide_paid_chapters_summary"),
        defaultValue: true,
      }),
    );
  }

  getHidePaidChaptersPref(preferences: SharedPreferences): boolean {
    return preferences.getBoolean(this.hidePaidChaptersPrefKey, true);
  }

  getChapterListSelectorBasedOnHidePaidChaptersPref(baseChapterListSelector: string, preferences: SharedPreferences): string {
    if (!this.getHidePaidChaptersPref(preferences)) return baseChapterListSelector;
    return baseChapterListSelector
      .split(", ")
      .map((selector) => `${selector}:not(${this.lockedChapterSelector}):not(:has(${this.lockedChapterSelector}))`)
      .join(", ");
  }
}
