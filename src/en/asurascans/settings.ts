// Port of src/en/asurascans/.../AsuraScans.kt @ d9420cd1: setupPreferenceScreen and the stored values it reads.
import { type PreferenceScreen, type SharedPreferences, SwitchPreferenceCompat } from "@sdk";

const PREF_HIDE_PREMIUM_CHAPTERS = "pref_hide_premium_chapters";
/** Series slug → random slug, written by older versions of upstream; read as a fallback. */
const SLUG_MAP = "slug_map_v2";

export function setupPreferenceScreen(screen: PreferenceScreen): void {
  screen.addPreference(
    new SwitchPreferenceCompat({
      key: PREF_HIDE_PREMIUM_CHAPTERS,
      title: "Hide premium chapters",
      summary: "Hides the chapters that require a subscription to view",
      defaultValue: true,
    }),
  );
}

export function hidePremiumChapters(preferences: SharedPreferences): boolean {
  return preferences.getBoolean(PREF_HIDE_PREMIUM_CHAPTERS, true);
}

/** The random slug an older version stored for `slug`, if any. */
export function storedRandomSlug(preferences: SharedPreferences, slug: string): string | undefined {
  let oldSlugMap: Record<string, unknown> = {};
  try {
    oldSlugMap = JSON.parse(preferences.getString(SLUG_MAP, "{}")) as Record<string, unknown>;
  } catch {
    // Not a map.
  }
  const old = oldSlugMap[slug];
  return typeof old === "string" ? old : undefined;
}
