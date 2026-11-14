// Port of src/all/mangadex/.../MangaDexFilters.kt @ d9420cd1.
import { CheckBox, type FilterList, Group, type HttpUrlBuilder, type Intl, Select, type SharedPreferences, Sort, TriState } from "@sdk";
import {
  ALL_LANGUAGES,
  CHINESE,
  contentRatingPrefDefaults,
  CONTENT_RATING_PREF_VAL_EROTICA,
  CONTENT_RATING_PREF_VAL_PORNOGRAPHIC,
  CONTENT_RATING_PREF_VAL_SAFE,
  CONTENT_RATING_PREF_VAL_SUGGESTIVE,
  ENGLISH,
  getContentRatingPrefKey,
  getOriginalLanguagePrefKey,
  JAPANESE,
  KOREAN,
  languageDisplayName,
  ORIGINAL_LANGUAGE_PREF_VAL_CHINESE,
  ORIGINAL_LANGUAGE_PREF_VAL_CHINESE_HK,
  ORIGINAL_LANGUAGE_PREF_VAL_JAPANESE,
  ORIGINAL_LANGUAGE_PREF_VAL_KOREAN,
} from "./constants";

interface UrlQueryFilter {
  addQueryParameter(url: HttpUrlBuilder, dexLang: string): void;
}

const isUrlQueryFilter = (filter: unknown): filter is UrlQueryFilter =>
  typeof (filter as Partial<UrlQueryFilter>).addQueryParameter === "function";

class HasAvailableChaptersFilter extends CheckBox implements UrlQueryFilter {
  constructor(intl: Intl) {
    super(intl.get("has_available_chapters"));
  }

  addQueryParameter(url: HttpUrlBuilder, dexLang: string): void {
    if (this.state) {
      url.addQueryParameter("hasAvailableChapters", "true");
      if (dexLang !== ALL_LANGUAGES) url.addQueryParameter("availableTranslatedLanguage[]", dexLang);
    }
  }
}

class OriginalLanguage extends CheckBox {
  constructor(
    name: string,
    readonly isoCode: string,
    state = false,
  ) {
    super(name, state);
  }
}

class OriginalLanguageList extends Group<OriginalLanguage> implements UrlQueryFilter {
  constructor(intl: Intl, originalLanguage: OriginalLanguage[]) {
    super(intl.get("original_language"), originalLanguage);
  }

  addQueryParameter(url: HttpUrlBuilder): void {
    for (const lang of this.state.filter((language) => language.state)) {
      // dex has zh and zh-hk for chinese manhua
      if (lang.isoCode === ORIGINAL_LANGUAGE_PREF_VAL_CHINESE) url.addQueryParameter("originalLanguage[]", ORIGINAL_LANGUAGE_PREF_VAL_CHINESE_HK);
      url.addQueryParameter("originalLanguage[]", lang.isoCode);
    }
  }
}

function getOriginalLanguage(preferences: SharedPreferences, dexLang: string, intl: Intl): OriginalLanguage[] {
  const originalLanguages = preferences.getStringSet(getOriginalLanguagePrefKey(dexLang), []);
  return [
    new OriginalLanguage(intl.format("original_language_filter_japanese", languageDisplayName(intl, JAPANESE)), ORIGINAL_LANGUAGE_PREF_VAL_JAPANESE, originalLanguages.has(ORIGINAL_LANGUAGE_PREF_VAL_JAPANESE)),
    new OriginalLanguage(intl.format("original_language_filter_chinese", languageDisplayName(intl, CHINESE)), ORIGINAL_LANGUAGE_PREF_VAL_CHINESE, originalLanguages.has(ORIGINAL_LANGUAGE_PREF_VAL_CHINESE)),
    new OriginalLanguage(intl.format("original_language_filter_korean", languageDisplayName(intl, KOREAN)), ORIGINAL_LANGUAGE_PREF_VAL_KOREAN, originalLanguages.has(ORIGINAL_LANGUAGE_PREF_VAL_KOREAN)),
  ];
}

class ValueCheck extends CheckBox {
  constructor(
    name: string,
    readonly value: string,
    state = false,
  ) {
    super(name, state);
  }
}

class ContentRatingList extends Group<ValueCheck> implements UrlQueryFilter {
  constructor(intl: Intl, contentRating: ValueCheck[]) {
    super(intl.get("content_rating"), contentRating);
  }

  addQueryParameter(url: HttpUrlBuilder): void {
    for (const rating of this.state.filter((box) => box.state)) url.addQueryParameter("contentRating[]", rating.value);
  }
}

function getContentRating(preferences: SharedPreferences, dexLang: string, intl: Intl): ValueCheck[] {
  const contentRatings = preferences.getStringSet(getContentRatingPrefKey(dexLang), contentRatingPrefDefaults);
  return [
    new ValueCheck(intl.get("content_rating_safe"), "safe", contentRatings.has(CONTENT_RATING_PREF_VAL_SAFE)),
    new ValueCheck(intl.get("content_rating_suggestive"), "suggestive", contentRatings.has(CONTENT_RATING_PREF_VAL_SUGGESTIVE)),
    new ValueCheck(intl.get("content_rating_erotica"), "erotica", contentRatings.has(CONTENT_RATING_PREF_VAL_EROTICA)),
    new ValueCheck(intl.get("content_rating_pornographic"), "pornographic", contentRatings.has(CONTENT_RATING_PREF_VAL_PORNOGRAPHIC)),
  ];
}

class DemographicList extends Group<ValueCheck> implements UrlQueryFilter {
  constructor(intl: Intl, demographics: ValueCheck[]) {
    super(intl.get("publication_demographic"), demographics);
  }

  addQueryParameter(url: HttpUrlBuilder): void {
    for (const demographic of this.state.filter((box) => box.state)) url.addQueryParameter("publicationDemographic[]", demographic.value);
  }
}

const getDemographics = (intl: Intl) => [
  new ValueCheck(intl.get("publication_demographic_none"), "none"),
  new ValueCheck(intl.get("publication_demographic_shounen"), "shounen"),
  new ValueCheck(intl.get("publication_demographic_shoujo"), "shoujo"),
  new ValueCheck(intl.get("publication_demographic_seinen"), "seinen"),
  new ValueCheck(intl.get("publication_demographic_josei"), "josei"),
];

class StatusList extends Group<ValueCheck> implements UrlQueryFilter {
  constructor(intl: Intl, status: ValueCheck[]) {
    super(intl.get("status"), status);
  }

  addQueryParameter(url: HttpUrlBuilder): void {
    for (const status of this.state.filter((box) => box.state)) url.addQueryParameter("status[]", status.value);
  }
}

const getStatus = (intl: Intl) => [
  new ValueCheck(intl.get("status_ongoing"), "ongoing"),
  new ValueCheck(intl.get("status_completed"), "completed"),
  new ValueCheck(intl.get("status_hiatus"), "hiatus"),
  new ValueCheck(intl.get("status_cancelled"), "cancelled"),
];

interface Sortable {
  title: string;
  value: string;
}

const getSortables = (intl: Intl): Sortable[] => [
  { title: intl.get("sort_alphabetic"), value: "title" },
  { title: intl.get("sort_chapter_uploaded_at"), value: "latestUploadedChapter" },
  { title: intl.get("sort_number_of_follows"), value: "followedCount" },
  { title: intl.get("sort_content_created_at"), value: "createdAt" },
  { title: intl.get("sort_content_info_updated_at"), value: "updatedAt" },
  { title: intl.get("sort_relevance"), value: "relevance" },
  { title: intl.get("sort_year"), value: "year" },
  { title: intl.get("sort_rating"), value: "rating" },
];

export class SortFilter extends Sort implements UrlQueryFilter {
  constructor(
    intl: Intl,
    private readonly sortables: Sortable[],
  ) {
    super(
      intl.get("sort"),
      sortables.map((sortable) => sortable.title),
      { index: 5, ascending: false },
    );
  }

  addQueryParameter(url: HttpUrlBuilder): void {
    if (this.state != null) {
      const query = this.sortables[this.state.index]?.value;
      if (!query) return;
      url.addQueryParameter(`order[${query}]`, this.state.ascending ? "asc" : "desc");
    }
  }
}

/** `yyyy-MM-dd'T'HH:mm:ss` of a UTC instant (`MDConstants.dateFormatterNoOffset`). */
export function formatNoOffset(date: Date): string {
  return date.toISOString().slice(0, 19);
}

class DaysSinceFilter extends Select<string> implements UrlQueryFilter {
  constructor(
    name: string,
    private readonly queryParam: string,
    private readonly options: [string, number][],
  ) {
    super(
      name,
      options.map(([label]) => label),
    );
  }

  addQueryParameter(url: HttpUrlBuilder): void {
    const days = this.options[this.state]?.[1] ?? 0;
    if (days <= 0) return;
    // LocalDateTime.now(UTC).minusDays(days).truncatedTo(HOURS)
    const since = new Date(Date.now() - days * 86_400_000);
    since.setUTCMinutes(0, 0, 0);
    url.addQueryParameter(this.queryParam, formatNoOffset(since));
  }
}

export class Tag extends TriState {
  constructor(
    readonly id: string,
    name: string,
  ) {
    super(name);
  }
}

class TagList extends Group<Tag> implements UrlQueryFilter {
  addQueryParameter(url: HttpUrlBuilder): void {
    for (const tag of this.state) {
      if (tag.isIncluded()) url.addQueryParameter("includedTags[]", tag.id);
      else if (tag.isExcluded()) url.addQueryParameter("excludedTags[]", tag.id);
    }
  }
}

/** `intl.collator`: tags are plain words, so a case-insensitive comparison gives the same order in every host. */
export function compareNames(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortIfTranslated(tags: Tag[], intl: Intl): Tag[] {
  if (intl.language === ENGLISH) return tags;
  return [...tags].sort((a, b) => compareNames(a.name, b.name));
}

const getContents = (intl: Intl) =>
  sortIfTranslated(
    [new Tag("b29d6a3d-1569-4e7a-8caf-7557bc92cd5d", intl.get("content_gore")), new Tag("97893a4c-12af-4dac-b6be-0dffb353568e", intl.get("content_sexual_violence"))],
    intl,
  );

const getFormats = (intl: Intl) =>
  sortIfTranslated(
    [
      new Tag("b11fda93-8f1d-4bef-b2ed-8803d3733170", intl.get("format_yonkoma")),
      new Tag("f4122d1c-3b44-44d0-9936-ff7502c39ad3", intl.get("format_adaptation")),
      new Tag("51d83883-4103-437c-b4b1-731cb73d786c", intl.get("format_anthology")),
      new Tag("0a39b5a1-b235-4886-a747-1d05d216532d", intl.get("format_award_winning")),
      new Tag("b13b2a48-c720-44a9-9c77-39c9979373fb", intl.get("format_doujinshi")),
      new Tag("7b2ce280-79ef-4c09-9b58-12b7c23a9b78", intl.get("format_fan_colored")),
      new Tag("f5ba408b-0e7a-484d-8d49-4e9125ac96de", intl.get("format_full_color")),
      new Tag("3e2b8dae-350e-4ab8-a8ce-016e844b9f0d", intl.get("format_long_strip")),
      new Tag("320831a8-4026-470b-94f6-8353740e6f04", intl.get("format_official_colored")),
      new Tag("0234a31e-a729-4e28-9d6a-3f87c4966b9e", intl.get("format_oneshot")),
      new Tag("891cf039-b895-47f0-9229-bef4c96eccd4", intl.get("format_user_created")),
      new Tag("e197df38-d0e7-43b5-9b09-2842d0c326dd", intl.get("format_web_comic")),
    ],
    intl,
  );

const getGenres = (intl: Intl) =>
  sortIfTranslated(
    [
      new Tag("391b0423-d847-456f-aff0-8b0cfc03066b", intl.get("genre_action")),
      new Tag("87cc87cd-a395-47af-b27a-93258283bbc6", intl.get("genre_adventure")),
      new Tag("5920b825-4181-4a17-beeb-9918b0ff7a30", intl.get("genre_boys_love")),
      new Tag("4d32cc48-9f00-4cca-9b5a-a839f0764984", intl.get("genre_comedy")),
      new Tag("5ca48985-9a9d-4bd8-be29-80dc0303db72", intl.get("genre_crime")),
      new Tag("b9af3a63-f058-46de-a9a0-e0c13906197a", intl.get("genre_drama")),
      new Tag("cdc58593-87dd-415e-bbc0-2ec27bf404cc", intl.get("genre_fantasy")),
      new Tag("a3c67850-4684-404e-9b7f-c69850ee5da6", intl.get("genre_girls_love")),
      new Tag("33771934-028e-4cb3-8744-691e866a923e", intl.get("genre_historical")),
      new Tag("cdad7e68-1419-41dd-bdce-27753074a640", intl.get("genre_horror")),
      new Tag("ace04997-f6bd-436e-b261-779182193d3d", intl.get("genre_isekai")),
      new Tag("81c836c9-914a-4eca-981a-560dad663e73", intl.get("genre_magical_girls")),
      new Tag("50880a9d-5440-4732-9afb-8f457127e836", intl.get("genre_mecha")),
      new Tag("c8cbe35b-1b2b-4a3f-9c37-db84c4514856", intl.get("genre_medical")),
      new Tag("ee968100-4191-4968-93d3-f82d72be7e46", intl.get("genre_mystery")),
      new Tag("b1e97889-25b4-4258-b28b-cd7f4d28ea9b", intl.get("genre_philosophical")),
      new Tag("423e2eae-a7a2-4a8b-ac03-a8351462d71d", intl.get("genre_romance")),
      new Tag("256c8bd9-4904-4360-bf4f-508a76d67183", intl.get("genre_sci_fi")),
      new Tag("e5301a23-ebd9-49dd-a0cb-2add944c7fe9", intl.get("genre_slice_of_life")),
      new Tag("69964a64-2f90-4d33-beeb-f3ed2875eb4c", intl.get("genre_sports")),
      new Tag("7064a261-a137-4d3a-8848-2d385de3a99c", intl.get("genre_superhero")),
      new Tag("07251805-a27e-4d59-b488-f0bfbec15168", intl.get("genre_thriller")),
      new Tag("f8f62932-27da-4fe4-8ee1-6779a8c5edba", intl.get("genre_tragedy")),
      new Tag("acc803a4-c95a-4c22-86fc-eb6b582d82a2", intl.get("genre_wuxia")),
    ],
    intl,
  );

const getThemes = (intl: Intl) =>
  sortIfTranslated(
    [
      new Tag("e64f6742-c834-471d-8d72-dd51fc02b835", intl.get("theme_aliens")),
      new Tag("3de8c75d-8ee3-48ff-98ee-e20a65c86451", intl.get("theme_animals")),
      new Tag("ea2bc92d-1c26-4930-9b7c-d5c0dc1b6869", intl.get("theme_cooking")),
      new Tag("9ab53f92-3eed-4e9b-903a-917c86035ee3", intl.get("theme_crossdressing")),
      new Tag("da2d50ca-3018-4cc0-ac7a-6b7d472a29ea", intl.get("theme_delinquents")),
      new Tag("39730448-9a5f-48a2-85b0-a70db87b1233", intl.get("theme_demons")),
      new Tag("2bd2e8d0-f146-434a-9b51-fc9ff2c5fe6a", intl.get("theme_gender_swap")),
      new Tag("3bb26d85-09d5-4d2e-880c-c34b974339e9", intl.get("theme_ghosts")),
      new Tag("fad12b5e-68ba-460e-b933-9ae8318f5b65", intl.get("theme_gyaru")),
      new Tag("aafb99c1-7f60-43fa-b75f-fc9502ce29c7", intl.get("theme_harem")),
      new Tag("5bd0e105-4481-44ca-b6e7-7544da56b1a3", intl.get("theme_incest")),
      new Tag("2d1f5d56-a1e5-4d0d-a961-2193588b08ec", intl.get("theme_loli")),
      new Tag("85daba54-a71c-4554-8a28-9901a8b0afad", intl.get("theme_mafia")),
      new Tag("a1f53773-c69a-4ce5-8cab-fffcd90b1565", intl.get("theme_magic")),
      new Tag("799c202e-7daa-44eb-9cf7-8a3c0441531e", intl.get("theme_martial_arts")),
      new Tag("ac72833b-c4e9-4878-b9db-6c8a4a99444a", intl.get("theme_military")),
      new Tag("dd1f77c5-dea9-4e2b-97ae-224af09caf99", intl.get("theme_monster_girls")),
      new Tag("36fd93ea-e8b8-445e-b836-358f02b3d33d", intl.get("theme_monsters")),
      new Tag("f42fbf9e-188a-447b-9fdc-f19dc1e4d685", intl.get("theme_music")),
      new Tag("489dd859-9b61-4c37-af75-5b18e88daafc", intl.get("theme_ninja")),
      new Tag("92d6d951-ca5e-429c-ac78-451071cbf064", intl.get("theme_office_workers")),
      new Tag("df33b754-73a3-4c54-80e6-1a74a8058539", intl.get("theme_police")),
      new Tag("9467335a-1b83-4497-9231-765337a00b96", intl.get("theme_post_apocalyptic")),
      new Tag("3b60b75c-a2d7-4860-ab56-05f391bb889c", intl.get("theme_psychological")),
      new Tag("0bc90acb-ccc1-44ca-a34a-b9f3a73259d0", intl.get("theme_reincarnation")),
      new Tag("65761a2a-415e-47f3-bef2-a9dababba7a6", intl.get("theme_reverse_harem")),
      new Tag("81183756-1453-4c81-aa9e-f6e1b63be016", intl.get("theme_samurai")),
      new Tag("caaa44eb-cd40-4177-b930-79d3ef2afe87", intl.get("theme_school_life")),
      new Tag("ddefd648-5140-4e5f-ba18-4eca4071d19b", intl.get("theme_shota")),
      new Tag("eabc5b4c-6aff-42f3-b657-3e90cbd00b75", intl.get("theme_supernatural")),
      new Tag("5fff9cde-849c-4d78-aab0-0d52b2ee1d25", intl.get("theme_survival")),
      new Tag("292e862b-2d17-4062-90a2-0356caa4ae27", intl.get("theme_time_travel")),
      new Tag("31932a7e-5b8e-49a6-9f12-2afa39dc544c", intl.get("theme_traditional_games")),
      new Tag("d7d1730f-6eb0-4ba6-9437-602cac38664c", intl.get("theme_vampires")),
      new Tag("9438db5a-7e2a-4ac0-b39e-e0d95a34b8a8", intl.get("theme_video_games")),
      new Tag("d14322ac-4d6f-4e9b-afd9-629d5f4d8a41", intl.get("theme_villainess")),
      new Tag("8c86611e-fab7-4986-9dec-d1a2f44acdd5", intl.get("theme_virtual_reality")),
      new Tag("631ef465-9aba-4afb-b0fc-ea10efe274a8", intl.get("theme_zombies")),
    ],
    intl,
  );

/** to get all tags from dex https://api.mangadex.org/manga/tag */
export const getTags = (intl: Intl): Tag[] => [...getContents(intl), ...getFormats(intl), ...getGenres(intl), ...getThemes(intl)];

interface TagMode {
  title: string;
  value: string;
}

const getTagModes = (intl: Intl): TagMode[] => [
  { title: intl.get("mode_and"), value: "AND" },
  { title: intl.get("mode_or"), value: "OR" },
];

class TagModeSelect extends Select<string> implements UrlQueryFilter {
  constructor(
    name: string,
    private readonly param: string,
    private readonly modes: TagMode[],
    state: number,
  ) {
    super(
      name,
      modes.map((mode) => mode.title),
      state,
    );
  }

  addQueryParameter(url: HttpUrlBuilder): void {
    url.addQueryParameter(this.param, this.modes[this.state]?.value ?? this.modes[0].value);
  }
}

class TagsFilter extends Group<TagModeSelect> implements UrlQueryFilter {
  constructor(intl: Intl) {
    super(intl.get("tags_mode"), [
      new TagModeSelect(intl.get("included_tags_mode"), "includedTagsMode", getTagModes(intl), 0),
      new TagModeSelect(intl.get("excluded_tags_mode"), "excludedTagsMode", getTagModes(intl), 1),
    ]);
  }

  addQueryParameter(url: HttpUrlBuilder, dexLang: string): void {
    for (const filter of this.state) filter.addQueryParameter(url);
    void dexLang;
  }
}

/** `getMDFilterList`. The order is fixed: the app sends states back by position. */
export function getMDFilterList(preferences: SharedPreferences, dexLang: string, intl: Intl): FilterList {
  return [
    new HasAvailableChaptersFilter(intl),
    new OriginalLanguageList(intl, getOriginalLanguage(preferences, dexLang, intl)),
    new ContentRatingList(intl, getContentRating(preferences, dexLang, intl)),
    new DemographicList(intl, getDemographics(intl)),
    new StatusList(intl, getStatus(intl)),
    new SortFilter(intl, getSortables(intl)),
    new DaysSinceFilter(intl.get("created_at"), "createdAtSince", [
      [intl.get("created_at_any"), 0],
      [intl.get("created_at_day"), 1],
      [intl.get("created_at_week"), 7],
      [intl.get("created_at_month"), 30],
      [intl.get("created_at_year"), 365],
    ]),
    new TagsFilter(intl),
    new TagList(intl.get("content"), getContents(intl)),
    new TagList(intl.get("format"), getFormats(intl)),
    new TagList(intl.get("genre"), getGenres(intl)),
    new TagList(intl.get("theme"), getThemes(intl)),
  ];
}

export function addFiltersToUrl(url: HttpUrlBuilder, filters: FilterList, dexLang: string): HttpUrlBuilder {
  for (const filter of filters) if (isUrlQueryFilter(filter)) filter.addQueryParameter(url, dexLang);
  return url;
}
