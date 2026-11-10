// Port of src/en/atsumaru/.../Filters.kt @ d9420cd1.
import { CheckBox, Group, Sort, Text, TriState } from "@sdk";

export interface Genre {
  name: string;
  id: string;
}

export type Tag = Genre;
export type Type = Genre;
export type Status = Genre;

export class GenreFilter extends Group<TriState> {
  readonly genreIds: string[];

  constructor(genres: Genre[], excludedIds: Set<string> = new Set()) {
    super(
      "Genres",
      genres.map(
        (genre) => new TriState(genre.name, excludedIds.has(genre.id) ? TriState.STATE_EXCLUDE : TriState.STATE_IGNORE),
      ),
    );
    this.genreIds = genres.map((it) => it.id);
  }
}

export class TagFilter extends Group<TriState> {
  readonly tagIds: string[];

  constructor(letters: string, tags: Tag[]) {
    super(
      letters,
      tags.map((tag) => new TriState(tag.name)),
    );
    this.tagIds = tags.map((it) => it.id);
  }
}

// Split large list separate Groups.
export class TagFilters extends Group<TagFilter> {
  constructor(tags: Tag[]) {
    const groups = new Map<string, Tag[]>();
    const sorted = [...tags].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const tag of sorted) {
      const c = tag.name.charAt(0).toUpperCase();
      const key = c === "" || c < "A" || c > "Z" ? "0-9" : c;
      const list = groups.get(key) ?? [];
      list.push(tag);
      groups.set(key, list);
    }
    super(
      "Tags",
      [...groups].map(([letters, tagsChunk]) => new TagFilter(letters, tagsChunk)),
    );
  }
}

export class TypeFilter extends Group<CheckBox> {
  readonly ids: string[];

  constructor(types: Type[]) {
    super(
      "Manga Type",
      types.map((type) => new CheckBox(type.name, false)),
    );
    this.ids = types.map((it) => it.id);
  }
}

export class StatusFilter extends Group<CheckBox> {
  readonly ids: string[];

  constructor(statuses: Status[]) {
    super(
      "Publishing Status",
      statuses.map((status) => new CheckBox(status.name, false)),
    );
    this.ids = statuses.map((it) => it.id);
  }
}

export class YearFilter extends Text {
  constructor() {
    super("Year (e.g., 2024)");
  }
}

export class MinChaptersFilter extends Text {
  constructor() {
    super("Minimum Chapters");
  }
}

export class SortFilter extends Sort {
  static readonly VALUES = ["views", "trending", "dateAdded", "released", "mbRating", "title"];

  constructor() {
    super("Sort By", ["Popularity", "Trending", "Date Added", "Release Date", "Top Rated", "Title"], {
      index: 0,
      ascending: false,
    });
  }
}

export class AdultFilter extends CheckBox {
  constructor(state: boolean) {
    super("Show Adult Content", state);
  }
}

export class OfficialFilter extends CheckBox {
  constructor() {
    super("Only Official Translations", false);
  }
}
