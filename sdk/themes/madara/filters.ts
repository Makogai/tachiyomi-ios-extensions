// Port of lib-multisrc/madara/.../Filters.kt and Models.kt @ d9420cd1.
import { Group, Text, ValueCheckBox, ValueSelect } from "@sdk";

export interface GenreRoute {
  name: string;
  slug: string;
  path: string;
}

export class TextFilter extends Text {
  constructor(
    name: string,
    readonly taxonomy: string,
  ) {
    super(name);
  }
}

export class StatusTag extends ValueCheckBox {}

export class StatusFilter extends Group<StatusTag> {
  constructor(name: string, options: [string, string][]) {
    super(
      name,
      options.map(([label, slug]) => new StatusTag(label, slug)),
    );
  }
}

export class SortFilter extends ValueSelect {
  key(): string {
    return this.selectedValue();
  }
}

export class AdultFilter extends ValueSelect {}

export class GenreConditionFilter extends ValueSelect {}

export class GenreCheckBox extends ValueCheckBox {}

export class GenreList extends Group<GenreCheckBox> {
  constructor(name: string, genres: GenreRoute[]) {
    super(
      name,
      genres.map((genre) => new GenreCheckBox(genre.name, genre.slug)),
    );
  }
}

/** One genre or "All" (MadaraNoAjax, which browses genre archive pages). */
export class SingleGenreFilter extends ValueSelect {
  constructor(
    name: string,
    allLabel: string,
    readonly genres: GenreRoute[],
  ) {
    super(name, [[allLabel, ""], ...genres.map((genre): [string, string] => [genre.name, genre.path])]);
  }

  route(): GenreRoute | null {
    return this.genres[this.state - 1] ?? null;
  }
}
