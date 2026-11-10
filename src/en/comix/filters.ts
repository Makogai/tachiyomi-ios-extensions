// Port of Filters.kt @ d9420cd1. Upstream's marker interfaces become `kind` flags.
import { CheckBox, type FilterList, Group, Header, type HttpUrlBuilder, Select, Separator, Sort, Text, TriState } from "@sdk";

export interface UriFilter {
  addToUri(builder: HttpUrlBuilder, query?: string): void;
  /** PreferenceFilter: applied to popular and latest from the settings. */
  readonly isPreferenceFilter?: boolean;
  /** RequiresTermSelection: only sent when a genre, format or tag is chosen. */
  readonly requiresTermSelection?: boolean;
}

export interface TermFilter {
  readonly hasSelection: boolean;
}

export function isUriFilter(filter: unknown): filter is UriFilter {
  return typeof (filter as Partial<UriFilter>).addToUri === "function";
}

export function isTermFilter(filter: unknown): filter is TermFilter {
  return typeof (filter as Partial<TermFilter>).hasSelection === "boolean";
}

const OLDEST_YEAR = 1928;

const CONTENT_RATING_OPTIONS: [string, string][] = [
  ["Show all", ""],
  ["Safe only", "safe"],
  ["Up to Suggestive", "suggestive"],
  ["Up to Erotica", "erotica"],
  ["Up to Pornographic", "pornographic"],
];

function getYearsArray(forFromFilter: boolean): [string, string][] {
  const newest = new Date().getFullYear() + 1;
  const years: [string, string][] = [];
  for (let year = newest; year >= OLDEST_YEAR; year--) years.push([String(year), String(year)]);
  const any: [string, string] = ["Any", ""];
  return forFromFilter ? [...years, any] : [any, ...years];
}

export const getGenres = (): [string, string][] => [
  ["Action", "6"],
  ["Adult", "87264"],
  ["Adventure", "7"],
  ["Boys Love", "8"],
  ["Comedy", "9"],
  ["Crime", "10"],
  ["Drama", "11"],
  ["Ecchi", "87265"],
  ["Fantasy", "12"],
  ["Girls Love", "13"],
  ["Harem", "40"],
  ["Hentai", "87266"],
  ["Historical", "14"],
  ["Horror", "15"],
  ["Isekai", "16"],
  ["Magical Girls", "17"],
  ["Mature", "87267"],
  ["Mecha", "18"],
  ["Medical", "19"],
  ["Mystery", "20"],
  ["Philosophical", "21"],
  ["Psychological", "22"],
  ["Romance", "23"],
  ["Sci-Fi", "24"],
  ["Slice of Life", "25"],
  ["Smut", "87268"],
  ["Sports", "26"],
  ["Superhero", "27"],
  ["Thriller", "28"],
  ["Tragedy", "29"],
  ["Wuxia", "30"],
];

export const getFormats = (): [string, string][] => [
  ["4-Koma", "93164"],
  ["Adaptation", "93167"],
  ["Anthology", "93165"],
  ["Award Winning", "93166"],
  ["Doujinshi", "93168"],
  ["Full Color", "93172"],
  ["Long Strip", "93170"],
  ["Oneshot", "93169"],
  ["Web Comic", "93171"],
];

export const getDemographics = (): [string, string][] => [
  ["Josei", "3"],
  ["Seinen", "4"],
  ["Shoujo", "1"],
  ["Shounen", "2"],
];

export const getTypes = (): [string, string][] => [
  ["Manga", "manga"],
  ["Manhwa", "manhwa"],
  ["Manhua", "manhua"],
  ["Other", "other"],
];

export function getContentRatingsUpTo(maxRating: string): string[] {
  if (maxRating === "") return [];
  const ratings = ["safe", "suggestive", "erotica", "pornographic"];
  const index = ratings.indexOf(maxRating);
  return index === -1 ? [] : ratings.slice(0, index + 1);
}

class UriPartFilter extends Select<string> implements UriFilter {
  constructor(
    name: string,
    private readonly param: string,
    protected readonly vals: [string, string][],
    defaultValue: string | null = null,
  ) {
    const index = vals.findIndex(([, value]) => value === defaultValue);
    super(
      name,
      vals.map(([title]) => title),
      index !== -1 ? index : 0,
    );
  }

  addToUri(builder: HttpUrlBuilder): void {
    const value = this.vals[this.state]?.[1] ?? "";
    if (value !== "") builder.addQueryParameter(this.param, value);
  }
}

class UriMultiSelectOption extends CheckBox {
  constructor(
    name: string,
    readonly value: string,
  ) {
    super(name);
  }
}

class UriMultiSelectFilter extends Group<UriMultiSelectOption> implements UriFilter {
  constructor(
    name: string,
    private readonly param: string,
    private readonly vals: [string, string][],
    selectedValues: Set<string> = new Set(),
    private readonly onlyIfSome = false,
  ) {
    super(
      name,
      vals.map(([title, value]) => {
        const option = new UriMultiSelectOption(title, value);
        option.state = selectedValues.has(value);
        return option;
      }),
    );
  }

  addToUri(builder: HttpUrlBuilder): void {
    const checked = this.state.filter((it) => it.state);
    // Ignore when no explicit inclusion (default)
    if (this.onlyIfSome && checked.length === this.vals.length) return;
    checked.forEach((it) => builder.addQueryParameter(this.param, it.value));
  }
}

class UriTriSelectOption extends TriState {
  constructor(
    name: string,
    readonly value: string,
  ) {
    super(name);
  }
}

// Demographics are genre terms on the site
class DemographicFilter extends Group<UriTriSelectOption> implements UriFilter {
  readonly isPreferenceFilter = true;

  constructor(demographics: [string, string][], selectedValues: Set<string>) {
    super(
      "Demographic",
      demographics.map(([title, value]) => {
        const option = new UriTriSelectOption(title, value);
        if (!selectedValues.has(value)) option.state = TriState.STATE_EXCLUDE;
        return option;
      }),
    );
  }

  addToUri(builder: HttpUrlBuilder): void {
    this.state.filter((it) => it.state === TriState.STATE_INCLUDE).forEach((it) => builder.addQueryParameter("demographics[]", it.value));
    this.state.filter((it) => it.state === TriState.STATE_EXCLUDE).forEach((it) => builder.addQueryParameter("genres_ex[]", it.value));
  }
}

class TypeFilter extends UriMultiSelectFilter {
  readonly isPreferenceFilter = true;

  constructor(selectedValues: Set<string>) {
    super("Type", "types[]", getTypes(), selectedValues, true);
  }
}

abstract class TermGroupFilter extends Group<UriTriSelectOption> implements UriFilter, TermFilter {
  constructor(title: string, options: [string, string][], excludedValues: Set<string> = new Set()) {
    super(
      title,
      options.map(([name, value]) => {
        const option = new UriTriSelectOption(name, value);
        if (excludedValues.has(value)) option.state = TriState.STATE_EXCLUDE;
        return option;
      }),
    );
  }

  get hasSelection(): boolean {
    return this.state.some((it) => it.state !== TriState.STATE_IGNORE);
  }

  addToUri(builder: HttpUrlBuilder): void {
    this.state.filter((it) => it.state === TriState.STATE_INCLUDE).forEach((it) => builder.addQueryParameter("genres_in[]", it.value));
    this.state.filter((it) => it.state === TriState.STATE_EXCLUDE).forEach((it) => builder.addQueryParameter("genres_ex[]", it.value));
  }
}

class GenreFilter extends TermGroupFilter {
  readonly isPreferenceFilter = true;

  constructor(genres: [string, string][], blockedGenres: Set<string>) {
    super("Genres", genres, blockedGenres);
  }
}

class FormatFilter extends TermGroupFilter {
  constructor(formats: [string, string][]) {
    super("Formats", formats);
  }
}

export class TagsFilter extends Text {
  constructor() {
    super("Tags");
  }
}

class StatusFilter extends UriMultiSelectFilter {
  constructor() {
    super("Status", "statuses[]", [
      ["Releasing", "releasing"],
      ["Finished", "finished"],
      ["On Hiatus", "on_hiatus"],
      ["Discontinued", "discontinued"],
      ["Not Yet Released", "not_yet_released"],
    ]);
  }
}

class YearFromFilter extends UriPartFilter {
  constructor() {
    super("From", "year_from", getYearsArray(true), "");
  }
}

class YearToFilter extends UriPartFilter {
  constructor() {
    super("To", "year_to", getYearsArray(false), "");
  }

  override addToUri(builder: HttpUrlBuilder): void {
    if (this.state > 0) super.addToUri(builder);
  }
}

export class AuthorFilter extends Text {
  constructor() {
    super("Author");
  }
}

export class ArtistFilter extends Text {
  constructor() {
    super("Artist");
  }
}

class MatchModeFilter extends UriPartFilter {
  readonly requiresTermSelection = true;

  constructor() {
    super("Match", "genres_mode", [
      ["All (AND)", "and"],
      ["Any (OR)", "or"],
    ]);
  }
}

class ContentRatingFilter extends UriPartFilter {
  readonly isPreferenceFilter = true;

  constructor(defaultValue: string) {
    super("Content rating", "content_rating", CONTENT_RATING_OPTIONS, defaultValue);
  }

  // The site reads one comma-separated content_rating
  override addToUri(builder: HttpUrlBuilder): void {
    let ratings = getContentRatingsUpTo(CONTENT_RATING_OPTIONS[this.state]?.[1] ?? "");
    if (ratings.length === 0) ratings = getContentRatingsUpTo("pornographic");
    builder.addQueryParameter("content_rating", ratings.join(","));
  }
}

class ChapterLengthFilter extends Text implements UriFilter {
  constructor(
    name: string,
    private readonly param: string,
  ) {
    super(name);
  }

  addToUri(builder: HttpUrlBuilder): void {
    if (this.state !== "") {
      const value = /^[+-]?\d+$/.test(this.state) ? Number(this.state) : null;
      if (value === null || value <= 0) throw new Error(`${this.name} must be a positive integer greater than 0`);
      builder.addQueryParameter(this.param, String(value));
    }
  }
}

const SORTABLES: [title: string, value: string][] = [
  ["Relevance", "relevance"],
  ["Latest update", "chapter_updated_at"],
  ["Recently added", "created_at"],
  ["Title", "title"],
  ["Year", "year"],
  ["Highest rated", "score"],
  ["Most viewed · 7 days", "views_7d"],
  ["Most viewed · 30 days", "views_30d"],
  ["Most viewed · 90 days", "views_90d"],
  ["Most viewed · all time", "views_total"],
  ["Most followed", "follows_total"],
];

class SortFilter extends Sort implements UriFilter {
  constructor() {
    super(
      "Sort By",
      SORTABLES.map(([title]) => title),
      { index: 0, ascending: false },
    );
  }

  addToUri(builder: HttpUrlBuilder, query = ""): void {
    if (this.state !== null) {
      const selected = SORTABLES[this.state.index]?.[1] ?? "relevance";
      const order = selected === "relevance" && query.trim() === "" ? "chapter_updated_at" : selected;
      builder.addQueryParameter(`order[${order}]`, this.state.ascending ? "asc" : "desc");
    }
  }
}

export class Filters {
  constructor(
    private readonly contentRating: string,
    private readonly selectedTypes: Set<string>,
    private readonly selectedDemographics: Set<string>,
    private readonly blockedGenres: Set<string>,
  ) {}

  getFilterList(): FilterList {
    return [
      new SortFilter(),
      new ContentRatingFilter(this.contentRating),
      new TypeFilter(this.selectedTypes),
      new Separator(),
      new Header("Tags — comma separated"),
      new TagsFilter(),
      new Header("Match: AND requires every selection, OR matches any"),
      new MatchModeFilter(),
      new GenreFilter(getGenres(), this.blockedGenres),
      new FormatFilter(getFormats()),
      new Separator(),
      new DemographicFilter(getDemographics(), this.selectedDemographics),
      new StatusFilter(),
      new ChapterLengthFilter("Minimum Chapter Length", "min_chap"),
      new ChapterLengthFilter("Maximum Chapter Length", "max_chap"),
      new Separator(),
      new Header("Release Year"),
      new YearFromFilter(),
      new YearToFilter(),
      new Separator(),
      new Header("Author / Artist — comma separated"),
      new AuthorFilter(),
      new ArtistFilter(),
    ];
  }
}
