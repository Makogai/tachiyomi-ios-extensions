// Port of src/all/comicklive/.../Filters.kt @ d9420cd1.
import { CheckBox, Group, Select, Sort, Text, TriState } from "@sdk";
import type { MetadataName } from "./dto";

type Option = [string, string];

export abstract class SelectFilter extends Select<string> {
  constructor(
    name: string,
    private readonly options: Option[],
  ) {
    super(
      name,
      options.map((option) => option[0]),
    );
  }

  get selected(): string | null {
    const value = this.options[this.state]?.[1] ?? "";
    return value !== "" ? value : null;
  }
}

export class CheckBoxFilter extends CheckBox {
  constructor(
    name: string,
    readonly value: string,
  ) {
    super(name);
  }
}

export abstract class CheckBoxGroup extends Group<CheckBoxFilter> {
  constructor(name: string, options: Option[]) {
    super(
      name,
      options.map(([title, value]) => new CheckBoxFilter(title, value)),
    );
  }

  get checked(): string[] {
    return this.state.filter((it) => it.state).map((it) => it.value);
  }
}

export class TriStateFilter extends TriState {
  constructor(
    name: string,
    readonly slug: string,
  ) {
    super(name);
  }
}

export abstract class TriStateGroupFilter extends Group<TriStateFilter> {
  constructor(name: string, options: Option[]) {
    super(
      name,
      options.map(([title, slug]) => new TriStateFilter(title, slug)),
    );
  }

  get included(): string[] {
    return this.state.filter((it) => it.isIncluded()).map((it) => it.slug);
  }

  get excluded(): string[] {
    return this.state.filter((it) => it.isExcluded()).map((it) => it.slug);
  }
}

const getSortsList: Option[] = [
  ["Latest", "created_at"],
  ["Popular", "user_follow_count"],
  ["Highest Rating", "rating"],
  ["Last Uploaded", "uploaded"],
];

export class SortFilter extends Sort {
  constructor() {
    super(
      "Sort",
      getSortsList.map((it) => it[0]),
      { index: 0, ascending: false },
    );
  }

  get selected(): string | null {
    const value = this.state !== null ? getSortsList[this.state.index]?.[1] : undefined;
    return value !== undefined && value !== "" ? value : null;
  }
}

const byName = (a: MetadataName, b: MetadataName) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

export class GenreFilter extends TriStateGroupFilter {
  constructor(genres: MetadataName[]) {
    super(
      "Genre",
      [...genres].sort(byName).map((it) => [it.name, it.slug]),
    );
  }
}

export class TagFilter extends TriStateGroupFilter {
  constructor(letter: string, tags: MetadataName[]) {
    super(
      letter,
      [...tags].sort(byName).map((it) => [it.name, it.slug]),
    );
  }
}

export class TagFilters extends Group<TagFilter> {
  constructor(tags: MetadataName[]) {
    const groups = new Map<string, MetadataName[]>();
    for (const tag of [...tags].sort(byName)) {
      const c = tag.name.charAt(0).toUpperCase();
      const key = c === "" || c < "A" || c > "Z" ? "#" : c;
      const list = groups.get(key) ?? [];
      list.push(tag);
      groups.set(key, list);
    }
    super(
      "Tags",
      [...groups].map(([letter, tagsChunk]) => new TagFilter(letter, tagsChunk)),
    );
  }
}

export class TagFilterText extends Text {
  constructor() {
    super("Tags");
  }
}

export class DemographicFilter extends CheckBoxGroup {
  constructor() {
    super("Demographic", [
      ["Shounen", "1"],
      ["Josei", "2"],
      ["Seinen", "3"],
      ["Shoujo", "4"],
      ["None", "0"],
    ]);
  }
}

export class CreatedAtFilter extends SelectFilter {
  constructor() {
    super("Created At", [
      ["", ""],
      ["3 days ago", "3"],
      ["7 days ago", "7"],
      ["30 days ago", "30"],
      ["3 months ago", "90"],
      ["6 months ago", "180"],
      ["1 year ago", "365"],
      ["2 years ago", "730"],
    ]);
  }
}

export class TypeFilter extends CheckBoxGroup {
  constructor() {
    super("Type", [
      ["Manga", "jp"],
      ["Manhwa", "kr"],
      ["Manhua", "cn"],
      ["Others", "others"],
    ]);
  }
}

export class MinimumChaptersFilter extends Text {
  constructor() {
    super("Minimum Chapters");
  }
}

export class StatusFilter extends SelectFilter {
  constructor() {
    super("Status", [
      ["", ""],
      ["Ongoing", "1"],
      ["Completed", "2"],
      ["Cancelled", "3"],
      ["Hiatus", "4"],
    ]);
  }
}

export class ContentRatingFilter extends SelectFilter {
  constructor() {
    super("Content Rating", [
      ["", ""],
      ["Safe", "safe"],
      ["Suggestive", "suggestive"],
      ["Erotica", "erotica"],
    ]);
  }
}

function releaseYears(): Option[] {
  const options: Option[] = [["", ""]];
  for (let year = new Date().getFullYear(); year >= 1990; year--) options.push([`${year}`, `${year}`]);
  options.push(["Before 1990", "0"]);
  return options;
}

export class ReleaseFrom extends SelectFilter {
  constructor() {
    super("Release From", releaseYears());
  }
}

export class ReleaseTo extends SelectFilter {
  constructor() {
    super("Release To", releaseYears());
  }
}
