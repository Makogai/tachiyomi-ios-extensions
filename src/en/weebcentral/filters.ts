// Port of src/en/weebcentral/.../Filters.kt @ d9420cd1.
import { CheckBox, type Filter, Group, type HttpUrlBuilder, Select, Text, TriState } from "@sdk";

export interface UriFilter {
  addToUri(builder: HttpUrlBuilder): void;
}

export function isUriFilter(filter: Filter<unknown>): filter is Filter<unknown> & UriFilter {
  return typeof (filter as Partial<UriFilter>).addToUri === "function";
}

export class UriPartFilter extends Select<string> implements UriFilter {
  constructor(
    name: string,
    private readonly param: string,
    private readonly vals: [string, string][],
    defaultValue = "",
  ) {
    const index = vals.findIndex(([, value]) => value === defaultValue);
    super(
      name,
      vals.map(([title]) => title),
      index !== -1 ? index : 0,
    );
  }

  addToUri(builder: HttpUrlBuilder): void {
    builder.addQueryParameter(this.param, this.vals[this.state][1]);
  }
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
    options: [string, string][],
  ) {
    super(
      name,
      options.map(([title, value]) => new UriMultiSelectOption(title, value)),
    );
  }

  addToUri(builder: HttpUrlBuilder): void {
    for (const option of this.state) {
      if (option.state) builder.addQueryParameter(this.param, option.value);
    }
  }
}

export class UriMultiTriSelectOption extends TriState {
  constructor(
    name: string,
    readonly value: string,
  ) {
    super(name);
  }
}

export class UriMultiTriSelectFilter extends Group<UriMultiTriSelectOption> implements UriFilter {
  constructor(
    name: string,
    private readonly includeUrlParameter: string,
    private readonly excludeUrlParameter: string,
    options: [string, string][],
  ) {
    super(
      name,
      options.map(([title, value]) => new UriMultiTriSelectOption(title, value)),
    );
  }

  addToUri(builder: HttpUrlBuilder): void {
    for (const option of this.state) {
      if (option.isIncluded()) builder.addQueryParameter(this.includeUrlParameter, option.value);
      if (option.isExcluded()) builder.addQueryParameter(this.excludeUrlParameter, option.value);
    }
  }
}

const same = (values: string[]): [string, string][] => values.map((value) => [value, value]);

export class SortFilter extends UriPartFilter {
  constructor(defaultValue = "") {
    super(
      "Sort",
      "sort",
      same(["Best Match", "Alphabet", "Popularity", "Subscribers", "Recently Added", "Latest Updates"]),
      defaultValue,
    );
  }
}

export class SortOrderFilter extends UriPartFilter {
  constructor() {
    super("Sort Order", "order", same(["Descending", "Ascending"]));
  }
}

export class OfficialTranslationFilter extends UriPartFilter {
  constructor() {
    super("Official Translation", "official", same(["Any", "True", "False"]));
  }
}

export class AnimeAdaptationFilter extends UriPartFilter {
  constructor() {
    super("Anime Adaptation", "anime", same(["Any", "True", "False"]));
  }
}

export class AdultContentFilter extends UriPartFilter {
  constructor() {
    super("Adult Content", "adult", same(["Any", "True", "False"]));
  }
}

export class AuthorFilter extends Text implements UriFilter {
  constructor() {
    super("Author (Case-sensitive)");
  }

  addToUri(builder: HttpUrlBuilder): void {
    if (this.state.length > 0) builder.addQueryParameter("author", this.state);
  }
}

export class StatusFilter extends UriMultiSelectFilter {
  constructor() {
    super("Series Status", "included_status", same(["Ongoing", "Complete", "Hiatus", "Canceled"]));
  }
}

export class TypeFilter extends UriMultiSelectFilter {
  constructor() {
    super("Series Type", "included_type", same(["Manga", "Manhwa", "Manhua", "OEL"]));
  }
}

export class TagFilter extends UriMultiTriSelectFilter {
  constructor() {
    super(
      "Tags",
      "included_tag",
      "excluded_tag",
      same([
        "Action",
        "Adult",
        "Adventure",
        "Comedy",
        "Doujinshi",
        "Drama",
        "Ecchi",
        "Fantasy",
        "Gender Bender",
        "Harem",
        "Hentai",
        "Historical",
        "Horror",
        "Isekai",
        "Josei",
        "Lolicon",
        "Martial Arts",
        "Mature",
        "Mecha",
        "Mystery",
        "Psychological",
        "Romance",
        "School Life",
        "Sci-fi",
        "Seinen",
        "Shotacon",
        "Shoujo",
        "Shoujo Ai",
        "Shounen",
        "Shounen Ai",
        "Slice of Life",
        "Smut",
        "Sports",
        "Supernatural",
        "Tragedy",
        "Yaoi",
        "Yuri",
        "Other",
      ]),
    );
  }
}
