// Port of Filters.kt @ d9420cd1.
import { CheckBox, Group, type HttpUrlBuilder, Select, Text, TriState } from "@sdk";

export interface UriFilter {
  addToUri(builder: HttpUrlBuilder): void;
}

export function isUriFilter(filter: unknown): filter is UriFilter {
  return typeof (filter as Partial<UriFilter>).addToUri === "function";
}

export class UriMultiSelectOption extends CheckBox {
  constructor(
    name: string,
    readonly value: string,
  ) {
    super(name);
  }
}

export class UriMultiSelectFilter extends Group<UriMultiSelectOption> implements UriFilter {
  constructor(
    name: string,
    private readonly param: string,
    vals: [string, string][],
  ) {
    super(
      name,
      vals.map(([title, value]) => new UriMultiSelectOption(title, value)),
    );
  }

  addToUri(builder: HttpUrlBuilder): void {
    this.state.filter((it) => it.state).forEach((it) => builder.addQueryParameter(this.param, it.value));
  }
}

export class UriTriSelectOption extends TriState {
  constructor(
    name: string,
    readonly value: string,
  ) {
    super(name);
  }
}

export class UriTriSelectFilter extends Group<UriTriSelectOption> implements UriFilter {
  constructor(
    name: string,
    private readonly paramIn: string,
    private readonly paramEx: string,
    vals: [string, string][],
  ) {
    super(
      name,
      vals.map(([title, value]) => new UriTriSelectOption(title, value)),
    );
  }

  addToUri(builder: HttpUrlBuilder): void {
    this.state.forEach((it) => {
      if (it.state === TriState.STATE_INCLUDE) builder.addQueryParameter(this.paramIn, it.value);
      else if (it.state === TriState.STATE_EXCLUDE) builder.addQueryParameter(this.paramEx, it.value);
    });
  }
}

export const CONTENT_RATINGS = ["safe", "suggestive", "erotica", "pornographic"];

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export class ContentRatingFilter extends UriMultiSelectFilter {
  constructor(defaultRatings: Set<string>) {
    super(
      "Content Rating",
      "content_rating[]",
      CONTENT_RATINGS.map((it) => [capitalize(it), it]),
    );
    this.state.forEach((option) => {
      if (defaultRatings.has(option.value)) option.state = true;
    });
  }
}

export class TypeFilter extends UriMultiSelectFilter {
  constructor() {
    super("Type", "types[]", TYPES);
  }
}

export class GenreFilter extends UriTriSelectFilter {
  constructor() {
    super("Genres", "genres_in[]", "genres_ex[]", GENRES);
  }
}

export class ThemeFilter extends UriMultiSelectFilter {
  constructor() {
    super("Themes", "theme_ids[]", THEMES);
  }
}

export class GenreModeFilter extends Select<string> implements UriFilter {
  constructor() {
    super("Genre and theme match mode", ["AND", "OR"]);
  }

  addToUri(builder: HttpUrlBuilder): void {
    const mode = this.state === 0 ? "and" : "or";
    builder.addQueryParameter("genres_mode", mode);
    builder.addQueryParameter("theme_mode", mode);
  }
}

export class StatusFilter extends UriMultiSelectFilter {
  constructor() {
    super("Status", "statuses[]", STATUSES);
  }
}

/** Kotlin's `String.toIntOrNull()`. */
function toIntOrNull(text: string): number | null {
  return /^[+-]?\d+$/.test(text) && Math.abs(Number(text)) <= 2147483647 ? Number(text) : null;
}

export class MinChapterFilter extends Text implements UriFilter {
  constructor() {
    super("Minimum chapters");
  }

  addToUri(builder: HttpUrlBuilder): void {
    const value = toIntOrNull(this.state);
    if (value !== null && value > 0) builder.addQueryParameter("min_chap", String(value));
  }
}

export class YearFromFilter extends Text implements UriFilter {
  constructor() {
    super("Release year (From)");
  }

  addToUri(builder: HttpUrlBuilder): void {
    const value = toIntOrNull(this.state);
    if (value !== null) builder.addQueryParameter("year_from", String(value));
  }
}

export class YearToFilter extends Text implements UriFilter {
  constructor() {
    super("Release year (To)");
  }

  addToUri(builder: HttpUrlBuilder): void {
    const value = toIntOrNull(this.state);
    if (value !== null) builder.addQueryParameter("year_to", String(value));
  }
}

export class AuthorFilter extends Text {
  constructor() {
    super("Author / Artist");
  }
}

const SORT_KEYS = [
  "chapter_updated_at:desc",
  "relevance:desc",
  "created_at:desc",
  "title:asc",
  "title:desc",
  "year:desc",
  "year:asc",
  "score:desc",
  "views_7d:desc",
  "views_30d:desc",
  "views_total:desc",
  "follows_total:desc",
];

export class SortFilter extends Select<string> implements UriFilter {
  constructor() {
    super(
      "Sort by",
      [
        "Latest update",
        "Best match",
        "Recently added",
        "Title (A–Z)",
        "Title (Z–A)",
        "Year (newest)",
        "Year (oldest)",
        "Highest rated",
        "Most viewed · 7 days",
        "Most viewed · 30 days",
        "Most viewed · all time",
        "Most followed",
      ],
      1,
    );
  }

  addToUri(builder: HttpUrlBuilder): void {
    const sortKey = SORT_KEYS[this.state] ?? "chapter_updated_at:desc";
    const parts = sortKey.split(":");
    builder.addQueryParameter(`order[${parts[0]}]`, parts[1]);
  }
}

const TYPES: [string, string][] = [
  ["Manga", "manga"],
  ["Manhwa", "manhwa"],
  ["Manhua", "manhua"],
  ["Other", "other"],
];

const GENRES: [string, string][] = [
  ["Action", "1"],
  ["Adult", "268929"],
  ["Adventure", "78"],
  ["Avant Garde", "3"],
  ["Boys Love", "4"],
  ["Comedy", "5"],
  ["Crime", "268921"],
  ["Demons", "77"],
  ["Drama", "6"],
  ["Ecchi", "7"],
  ["Fantasy", "79"],
  ["Girls Love", "9"],
  ["Gourmet", "10"],
  ["Harem", "11"],
  ["Hentai", "268930"],
  ["Historical", "268922"],
  ["Horror", "530"],
  ["Isekai", "13"],
  ["Iyashikei", "531"],
  ["Josei", "15"],
  ["Kids", "532"],
  ["Magic", "539"],
  ["Magical Girls", "268923"],
  ["Mahou Shoujo", "533"],
  ["Martial Arts", "534"],
  ["Mature", "268931"],
  ["Mecha", "19"],
  ["Medical", "268924"],
  ["Military", "535"],
  ["Music", "21"],
  ["Mystery", "22"],
  ["Parody", "23"],
  ["Philosophical", "268925"],
  ["Psychological", "536"],
  ["Reverse Harem", "25"],
  ["Romance", "26"],
  ["School", "73"],
  ["Sci-Fi", "28"],
  ["Seinen", "537"],
  ["Shoujo", "30"],
  ["Shounen", "31"],
  ["Slice of Life", "538"],
  ["Smut", "268932"],
  ["Space", "33"],
  ["Sports", "34"],
  ["Super Power", "75"],
  ["Superhero", "268926"],
  ["Supernatural", "76"],
  ["Suspense", "37"],
  ["Thriller", "38"],
  ["Tragedy", "268927"],
  ["Vampire", "39"],
  ["Wuxia", "268928"],
];

const THEMES: [string, string][] = [
  ["Aliens", "268933"],
  ["Animals", "268934"],
  ["Cooking", "268935"],
  ["Crossdressing", "268936"],
  ["Delinquents", "268937"],
  ["Demons", "268938"],
  ["Genderswap", "268939"],
  ["Ghosts", "268940"],
  ["Gyaru", "268941"],
  ["Harem", "268942"],
  ["Incest", "268943"],
  ["Loli", "268944"],
  ["Mafia", "268945"],
  ["Magic", "268946"],
  ["Martial Arts", "268947"],
  ["Military", "268948"],
  ["Monster Girls", "268949"],
  ["Monsters", "268950"],
  ["Music", "268951"],
  ["Ninja", "268952"],
  ["Office Workers", "268953"],
  ["Police", "268954"],
  ["Post-Apocalyptic", "268955"],
  ["Reincarnation", "268956"],
  ["Reverse Harem", "268957"],
  ["Samurai", "268958"],
  ["School Life", "268959"],
  ["Shota", "268960"],
  ["Supernatural", "268961"],
  ["Survival", "268962"],
  ["Time Travel", "268963"],
  ["Traditional Games", "268964"],
  ["Vampires", "268965"],
  ["Video Games", "268966"],
  ["Villainess", "268967"],
  ["Virtual Reality", "268968"],
  ["Zombies", "268969"],
];

const STATUSES: [string, string][] = [
  ["Releasing", "releasing"],
  ["Finished", "finished"],
  ["On Hiatus", "on_hiatus"],
  ["Discontinued", "discontinued"],
  ["Not Yet Released", "not_yet_released"],
];

