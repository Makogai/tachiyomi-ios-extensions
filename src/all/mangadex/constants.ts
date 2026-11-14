// Port of src/all/mangadex/.../MDConstants.kt and MangaDexIntl.kt @ d9420cd1: URLs, limits and preference keys.
import type { Intl } from "@sdk";

export const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/;
const uuidOnlyRegex = new RegExp(`^${uuidRegex.source}$`);

/** `MDConstants.uuidRegex matches text` */
export const isUuid = (text: string) => uuidOnlyRegex.test(text);
/** `url.contains(MDConstants.uuidRegex)` */
export const containsUuid = (text: string) => uuidRegex.test(text);

export const MANGA_LIMIT = 20;
export const LATEST_CHAPTER_LIMIT = 100;

export const ALL_LANGUAGES = "all";

export const LEGACY_NO_GROUP_ID = "00e03853-1b96-4f41-9542-c71b8692033b";

export const CDN_URL = "https://uploads.mangadex.org";
export const API_URL = "https://api.mangadex.org";
export const API_MANGA_URL = `${API_URL}/manga`;
export const API_CHAPTER_URL = `${API_URL}/chapter`;
export const API_LIST_URL = `${API_URL}/list`;

export const MD_AT_HOME_TOKEN_LIFESPAN = 5 * 60_000;

export const PREFIX_ID_SEARCH = "id:";
export const PREFIX_CH_SEARCH = "ch:";
export const PREFIX_GRP_SEARCH = "grp:";
export const PREFIX_AUTHOR_SEARCH = "author:";
export const PREFIX_USER_SEARCH = "usr:";
export const PREFIX_LIST_SEARCH = "list:";

export const pathToSearchPrefix: Record<string, string> = {
  manga: PREFIX_ID_SEARCH,
  title: PREFIX_ID_SEARCH,
  chapter: PREFIX_CH_SEARCH,
  group: PREFIX_GRP_SEARCH,
  author: PREFIX_AUTHOR_SEARCH,
  user: PREFIX_USER_SEARCH,
  list: PREFIX_LIST_SEARCH,
};

// Preference keys carry the MangaDex language, as upstream's do.

export const getCoverQualityPreferenceKey = (dexLang: string) => `thumbnailQuality_${dexLang}`;
export const getCoverQualityPreferenceEntries = (intl: Intl) => [intl.get("cover_quality_original"), intl.get("cover_quality_medium"), intl.get("cover_quality_low")];
export const getCoverQualityPreferenceEntryValues = () => ["", ".512.jpg", ".256.jpg"];
export const getCoverQualityPreferenceDefaultValue = () => getCoverQualityPreferenceEntryValues()[0];

export const getDataSaverPreferenceKey = (dexLang: string) => `dataSaverV5_${dexLang}`;
export const getStandardHttpsPreferenceKey = (dexLang: string) => `usePort443_${dexLang}`;

export const CONTENT_RATING_PREF_VAL_SAFE = "safe";
export const CONTENT_RATING_PREF_VAL_SUGGESTIVE = "suggestive";
export const CONTENT_RATING_PREF_VAL_EROTICA = "erotica";
export const CONTENT_RATING_PREF_VAL_PORNOGRAPHIC = "pornographic";
export const contentRatingPrefDefaults = [CONTENT_RATING_PREF_VAL_SAFE, CONTENT_RATING_PREF_VAL_SUGGESTIVE];
export const allContentRatings = [CONTENT_RATING_PREF_VAL_SAFE, CONTENT_RATING_PREF_VAL_SUGGESTIVE, CONTENT_RATING_PREF_VAL_EROTICA, CONTENT_RATING_PREF_VAL_PORNOGRAPHIC];
export const getContentRatingPrefKey = (dexLang: string) => `contentRating_${dexLang}`;

export const JAPANESE = "ja";
export const CHINESE = "zh";
export const KOREAN = "ko";
export const ENGLISH = "en";
export const ORIGINAL_LANGUAGE_PREF_VAL_JAPANESE = JAPANESE;
export const ORIGINAL_LANGUAGE_PREF_VAL_CHINESE = CHINESE;
export const ORIGINAL_LANGUAGE_PREF_VAL_CHINESE_HK = "zh-hk";
export const ORIGINAL_LANGUAGE_PREF_VAL_KOREAN = KOREAN;
export const originalLanguagePrefDefaults: string[] = [];
export const getOriginalLanguagePrefKey = (dexLang: string) => `originalLanguage_${dexLang}`;

const GROUP_AZUKI = "5fed0576-8b94-4f9a-b6a7-08eecd69800d";
const GROUP_BILIBILI = "06a9fecb-b608-4f19-b93c-7caab06b7f44";
const GROUP_COMIKEY = "8d8ecf83-8d42-4f8c-add8-60963f9f28d9";
const GROUP_INKR = "caa63201-4a17-4b7f-95ff-ed884a2b7e60";
const GROUP_MANGA_HOT = "319c1b10-cbd0-4f55-a46e-c4ee17e65139";
const GROUP_MANGA_PLUS = "4f1de6a2-f0c5-4ac5-bce5-02c7dbb67deb";
/** Official publishers whose chapters are links to their own sites; left out of Latest. */
export const defaultBlockedGroups = [GROUP_AZUKI, GROUP_BILIBILI, GROUP_COMIKEY, GROUP_INKR, GROUP_MANGA_HOT, GROUP_MANGA_PLUS];
export const getBlockedGroupsPrefKey = (dexLang: string) => `blockedGroups_${dexLang}`;
export const getBlockedUploaderPrefKey = (dexLang: string) => `blockedUploader_${dexLang}`;

export const TRY_USING_FIRST_VOLUME_COVER_DEFAULT = false;
export const getTryUsingFirstVolumeCoverPrefKey = (dexLang: string) => `tryUsingFirstVolumeCover_${dexLang}`;
export const getAltTitlesInDescPrefKey = (dexLang: string) => `altTitlesInDesc_${dexLang}`;
export const getPreferExtensionLangTitlePrefKey = (dexLang: string) => `preferExtensionLangTitle_${dexLang}`;
export const getFinalChapterInDescPrefKey = (dexLang: string) => `finalChapterInDesc_${dexLang}`;
export const getIncludeUnavailablePrefKey = (dexLang: string) => `includeUnavailable_${dexLang}`;

export const TAG_GROUPS_ORDER = ["content", "format", "genre", "theme"];

export const TAG_ANTHOLOGY_UUID = "51d83883-4103-437c-b4b1-731cb73d786c";
export const TAG_ONE_SHOT_UUID = "0234a31e-a729-4e28-9d6a-3f87c4966b9e";

export const romanizedLangCodes: Record<string, string> = {
  [JAPANESE]: "ja-ro",
  [KOREAN]: "ko-ro",
  [CHINESE]: "zh-ro",
  "zh-hk": "zh-ro",
};

/**
 * Upstream's `intl.languageDisplayName(code)` (Java `Locale` display names) for the three
 * original languages its settings and filters offer, in the four languages it has strings for.
 * Scripts have no `Locale`/`Intl.DisplayNames` in every host, so the names are listed.
 */
const LANGUAGE_NAMES: Record<string, Record<string, string>> = {
  en: { ja: "Japanese", zh: "Chinese", ko: "Korean" },
  es: { ja: "Japonés", zh: "Chino", ko: "Coreano" },
  "pt-BR": { ja: "Japonês", zh: "Chinês", ko: "Coreano" },
  ru: { ja: "Японский", zh: "Китайский", ko: "Корейский" },
};

export function languageDisplayName(intl: Intl, code: string): string {
  const language = intl.language === "pt-BR" || intl.language === "pt" ? "pt-BR" : intl.language.split("-")[0];
  return (LANGUAGE_NAMES[language] ?? LANGUAGE_NAMES.en)[code] ?? LANGUAGE_NAMES.en[code] ?? code;
}

/**
 * English names for MangaDex's original-language codes, standing in for
 * `Locale.forLanguageTag(code).getDisplayName(dexLocale)` in the genre list.
 */
export const ORIGINAL_LANGUAGE_NAMES: Record<string, string> = {
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  "zh-hk": "Chinese (Hong Kong)",
  en: "English",
  ar: "Arabic",
  bg: "Bulgarian",
  bn: "Bangla",
  ca: "Catalan",
  cs: "Czech",
  da: "Danish",
  de: "German",
  el: "Greek",
  eo: "Esperanto",
  es: "Spanish",
  "es-la": "Spanish (Latin America)",
  et: "Estonian",
  fa: "Persian",
  fi: "Finnish",
  fr: "French",
  he: "Hebrew",
  hi: "Hindi",
  hr: "Croatian",
  hu: "Hungarian",
  id: "Indonesian",
  it: "Italian",
  ka: "Georgian",
  kk: "Kazakh",
  la: "Latin",
  lt: "Lithuanian",
  mn: "Mongolian",
  ms: "Malay",
  my: "Burmese",
  ne: "Nepali",
  nl: "Dutch",
  no: "Norwegian",
  pl: "Polish",
  pt: "Portuguese",
  "pt-br": "Portuguese (Brazil)",
  ro: "Romanian",
  ru: "Russian",
  sk: "Slovak",
  sr: "Serbian",
  sv: "Swedish",
  ta: "Tamil",
  th: "Thai",
  tl: "Tagalog",
  tr: "Turkish",
  uk: "Ukrainian",
  ur: "Urdu",
  uz: "Uzbek",
  vi: "Vietnamese",
};
