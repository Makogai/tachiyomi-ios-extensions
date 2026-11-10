// Port of src/en/asurascans/.../Filters.kt @ d9420cd1.
import { CheckBox, Group, type HttpUrlBuilder, Select, Sort, Text } from "@sdk";
import type { GenreDto } from "./dto";

export interface UriFilter {
  addToUri(builder: HttpUrlBuilder): void;
}

export function isUriFilter(filter: unknown): filter is UriFilter {
  return typeof (filter as Partial<UriFilter>)?.addToUri === "function";
}

export class UriPartFilter extends Select<string> implements UriFilter {
  constructor(
    name: string,
    private readonly param: string,
    private readonly vals: [string, string][],
    defaultValue: string | null = null,
  ) {
    const index = vals.findIndex(([, value]) => value === defaultValue);
    super(
      name,
      vals.map(([label]) => label),
      index !== -1 ? index : 0,
    );
  }

  addToUri(builder: HttpUrlBuilder): void {
    const value = this.vals[this.state][1];
    if (value.trim() !== "") {
      builder.addQueryParameter(this.param, value);
    }
  }
}

export class UriSortFilter extends Sort implements UriFilter {
  constructor(
    name: string,
    private readonly sortParam: string,
    private readonly orderParam: string,
    private readonly vals: [string, string][],
    defaultValue: string | null,
    private readonly ascendingValue: string,
    private readonly descendingValue: string,
  ) {
    const index = vals.findIndex(([, value]) => value === defaultValue);
    super(
      name,
      vals.map(([label]) => label),
      { index: index !== -1 ? index : 0, ascending: false },
    );
  }

  addToUri(builder: HttpUrlBuilder): void {
    const state = this.state;
    if (state === null) return;

    const selected = this.vals[state.index][1];
    const order = state.ascending ? this.ascendingValue : this.descendingValue;

    builder.addQueryParameter(this.sortParam, selected);
    builder.addQueryParameter(this.orderParam, order);
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
    vals: [string, string][],
  ) {
    super(
      name,
      vals.map(([label, value]) => new UriMultiSelectOption(label, value)),
    );
  }

  addToUri(builder: HttpUrlBuilder): void {
    const checked = this.state.filter((option) => option.state).map((option) => option.value);
    if (checked.length > 0) {
      builder.addQueryParameter(this.param, checked.join(","));
    }
  }
}

export class SortFilter extends UriSortFilter {
  constructor(defaultSort: string | null = null) {
    super(
      "Sort By",
      "sort",
      "order",
      [
        ["Latest Update", "latest"],
        ["Popular", "popular"],
        ["Rating", "rating"],
        ["A-Z", "title"],
        ["Newest", "update"],
      ],
      defaultSort,
      "asc",
      "desc",
    );
  }
}

export class StatusFilter extends UriPartFilter {
  constructor() {
    super("Status", "status", [
      ["All", ""],
      ["Ongoing", "ongoing"],
      ["Completed", "completed"],
      ["Hiatus", "hiatus"],
      ["Dropped", "dropped"],
      ["Axed", "axed"],
    ]);
  }
}

export class TypeFilter extends UriPartFilter {
  constructor() {
    super("Type", "type", [
      ["All", ""],
      ["Manhwa", "manhwa"],
      ["Manhua", "manhua"],
      ["Mangatoon", "manga"],
    ]);
  }
}

export class GenresFilter extends UriMultiSelectFilter {
  constructor(genres: GenreDto[]) {
    super(
      "Genres",
      "genres",
      genres.map((genre): [string, string] => [genre.name, genre.slug]),
    );
  }
}

export class CreatorFilter extends Select<string> implements UriFilter {
  constructor(
    private readonly authors: string[],
    private readonly artists: string[],
  ) {
    // Upstream lists the artists twice (`listOf("") + artists + artists`); kept as is.
    super("Creators", ["", ...artists, ...artists]);
  }

  addToUri(builder: HttpUrlBuilder): void {
    const state = this.state;
    let parm: string | null = null;
    let selected: string | null = null;
    if (state === 0) {
      parm = null;
    } else if (state >= 1 && state <= this.artists.length) {
      parm = "artist";
      selected = this.artists[state - 1];
    } else {
      parm = "author";
      selected = this.authors[state - 1 - this.artists.length];
    }

    if (parm !== null) {
      builder.addQueryParameter(parm, selected ?? null);
    }
  }
}

export class MinChaptersFilter extends Text implements UriFilter {
  constructor() {
    super("Min Chapters");
  }

  addToUri(builder: HttpUrlBuilder): void {
    if (this.state.trim() !== "") {
      builder.addQueryParameter("min_chapters", this.state);
    }
  }
}
