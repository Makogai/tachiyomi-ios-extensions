// Port of src/all/kagane/.../Filters.kt @ d9420cd1.
import { CheckBox, Group, Sort, type SortSelection, Text, TriState } from "@sdk";
import type { SourceDto } from "./dto";

export type JsonObject = Record<string, unknown>;

export interface MetadataDto {
  genres: Record<string, string>;
  tags: Record<string, string>;
  sources: SourceDto[];
}

export function getGenresList(meta: MetadataDto): FilterData[] {
  return Object.entries(meta.genres)
    .map(([id, name]) => new FilterData(id, name))
    .sort((a, b) => compare(a.name, b.name));
}

/** Kotlin's `sortedBy { it.name }` compares strings by UTF-16 code units. */
export function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export const CONTENT_RATINGS = ["safe", "fifteenplus", "eighteenplus"];
export const CONTENT_RATING_LABELS: Record<string, string> = {
  safe: "Safe",
  fifteenplus: "Fifteen Plus",
  eighteenplus: "Eighteen Plus",
};

export interface JsonFilter {
  addToJsonObject(builder: JsonObject, key?: string, matchAll?: boolean | null): void;
}

export function isJsonFilter(filter: unknown): filter is JsonFilter {
  return typeof (filter as Partial<JsonFilter>)?.addToJsonObject === "function";
}

export class SelectFilterOption {
  constructor(
    readonly name: string,
    readonly value: string,
  ) {}
}

const getSortFilter = () => [
  new SelectFilterOption("Relevance", ""),
  new SelectFilterOption("Popular (Total Views)", "total_views"),
  new SelectFilterOption("Popular (Average Views)", "avg_views"),
  new SelectFilterOption("Popular (Today)", "avg_views_today"),
  new SelectFilterOption("Popular (Week)", "avg_views_week"),
  new SelectFilterOption("Popular (Month)", "avg_views_month"),
  new SelectFilterOption("Latest", "updated_at"),
  new SelectFilterOption("Books count", "current_books"),
  new SelectFilterOption("Created at", "created_at"),
];

export class SortFilter extends Sort {
  constructor(
    selection: SortSelection = { index: 0, ascending: false },
    private readonly options: SelectFilterOption[] = getSortFilter(),
  ) {
    super(
      "Sort By",
      options.map((option) => option.name),
      selection,
    );
  }

  get selected(): SelectFilterOption {
    const index = this.state?.index;
    return (index != null ? this.options[index] : undefined) ?? this.options[0];
  }

  toUriPart(): string {
    const base = this.selected.value;
    const order = this.state?.ascending === true ? ",asc" : ",desc";
    return base !== "" ? base + order : "";
  }
}

export class FilterData {
  constructor(
    readonly id: string,
    readonly name: string,
  ) {}
}

export class MultiSelectOption extends CheckBox {
  constructor(
    name: string,
    readonly id: string = name,
  ) {
    super(name, false);
  }
}

export class JsonMultiSelectFilter extends Group<MultiSelectOption> implements JsonFilter {
  constructor(
    name: string,
    private readonly param: string,
    genres: MultiSelectOption[],
  ) {
    super(name, genres);
  }

  addToJsonObject(builder: JsonObject, key = ""): void {
    const whatToInclude = this.state.filter((option) => option.state).map((option) => option.id);
    if (whatToInclude.length > 0) {
      if (key === "") {
        builder[this.param] = whatToInclude;
      } else {
        builder[key] = { [this.param]: whatToInclude };
      }
    }
  }
}

const AGE_RATINGS: Record<string, string> = {
  safe: "Safe",
  fifteenplus: "FifteenPlus",
  eighteenplus: "EighteenPlus",
};

export class ContentRatingFilter extends Group<MultiSelectOption> implements JsonFilter {
  constructor(
    defaultRatings: Set<string>,
    private readonly pornographic: boolean,
    private readonly disturbing: boolean,
    ratings: FilterData[] = CONTENT_RATINGS.map((it) => new FilterData(it, CONTENT_RATING_LABELS[it])),
  ) {
    super(
      "Content Rating",
      ratings.map((rating) => {
        const option = new MultiSelectOption(rating.name, rating.id);
        option.state = defaultRatings.has(rating.id);
        return option;
      }),
    );
  }

  addToJsonObject(builder: JsonObject): void {
    const selected = this.state.filter((option) => option.state).map((option) => option.id);
    if (selected.length === 0) return;
    builder["age_rating"] = [...new Set(selected.map((id) => AGE_RATINGS[id]))];
    if (!this.pornographic) {
      builder["is_pornographic"] = false;
    }
    if (!this.disturbing) {
      builder["is_disturbing"] = false;
    }
  }
}

export class MultiSelectTriOption extends TriState {
  constructor(
    name: string,
    readonly id: string = name,
  ) {
    super(name);
  }
}

export class JsonMultiSelectTriFilter extends Group<MultiSelectTriOption> implements JsonFilter {
  constructor(
    name: string,
    readonly param: string,
    genres: MultiSelectTriOption[],
    private readonly extraExcluded: Set<string> = new Set(),
  ) {
    super(name, genres);
  }

  addToJsonObject(builder: JsonObject, key = "", matchAll: boolean | null = null): void {
    const whatToInclude = this.state.filter((option) => option.state === TriState.STATE_INCLUDE).map((option) => option.id);
    const whatToExclude = [
      ...this.state.filter((option) => option.state === TriState.STATE_EXCLUDE).map((option) => option.id),
      ...this.extraExcluded,
    ];

    if (whatToInclude.length > 0 || whatToExclude.length > 0) {
      const object: JsonObject = {};
      if (matchAll === true) {
        object["match_all"] = true;
      }
      object["values"] = whatToInclude;
      if (whatToExclude.length > 0) {
        object["exclude"] = whatToExclude;
      }
      builder[key] = object;
    }
  }
}

export class GenresFilter extends JsonMultiSelectTriFilter {
  constructor(genres: FilterData[], excludedIds: Set<string> = new Set()) {
    super(
      "Genres",
      "genres",
      genres.map((genre) => new MultiSelectTriOption(genre.name, genre.id)),
      excludedIds,
    );
  }
}

export class TagsSearchFilter extends Text {
  constructor(readonly tagData: Record<string, string>) {
    super("Tags (e.g. Medieval, -Politics)");
  }
}

export class StaffSearchFilter extends Text {
  constructor() {
    super("Person (e.g. ONE, -Kokou no Hashiguchi)");
  }
}

export class GroupsSearchFilter extends Text {
  constructor() {
    super("Group (e.g. Asura Scans, -The Hours Between)");
  }
}

function toIntOrNull(text: string): number | null {
  return /^[+-]?\d+$/.test(text) ? Number(text) : null;
}

export class RangeTextFilter extends Text {
  // Accepts "a", "a-b", or "a+" (open-ended).
  parseRange(): [number | null, number | null] | null {
    const input = this.state.trim();
    let minText: string;
    let maxText: string | null;
    if (input.endsWith("+")) {
      minText = input.slice(0, -1);
      maxText = null;
    } else {
      const index = input.indexOf("-");
      minText = index < 0 ? input : input.slice(0, index);
      maxText = index < 0 ? null : input.slice(index + 1);
    }
    const min = toIntOrNull(minText.trim());
    const max = maxText !== null ? toIntOrNull(maxText.trim()) : null;
    return min === null && max === null ? null : [min, max];
  }
}

export class YearFilter extends RangeTextFilter {
  constructor() {
    super("Year (e.g. 2024, 2024-2026, or 2024+)");
  }
}

export class ChapterCountFilter extends RangeTextFilter {
  constructor() {
    super("Chapters (e.g. 1-20, 21-100, 101+)");
  }
}

export class SourcesFilter extends JsonMultiSelectFilter {
  constructor(sources: FilterData[]) {
    super(
      "Sources",
      "source_id",
      sources.map((source) => new MultiSelectOption(source.name, source.id)),
    );
  }
}

export const FORMAT_OPTIONS = ["Manga", "Manhwa", "Manhua", "Comic", "Other"];

export class FormatFilter extends JsonMultiSelectFilter {
  constructor(excluded: Set<string> = new Set()) {
    super(
      "Format",
      "format",
      FORMAT_OPTIONS.map((it) => {
        const option = new MultiSelectOption(it);
        option.state = excluded.size > 0 && !excluded.has(it);
        return option;
      }),
    );
  }
}

const PUBLICATION_STATUS_OPTIONS: [string, string][] = [
  ["Ongoing", "Ongoing"],
  ["Completed", "Completed"],
  ["Hiatus", "Hiatus"],
  ["Cancelled", "Abandoned"],
];

export class PublicationStatusFilter extends JsonMultiSelectFilter {
  constructor() {
    super(
      "Status",
      "upload_status",
      PUBLICATION_STATUS_OPTIONS.map(([name, value]) => new MultiSelectOption(name, value)),
    );
  }
}

export class MatchAllGenresFilter extends CheckBox {
  constructor() {
    super("Match all selected genres", true);
  }
}

export class MatchAllTagsFilter extends CheckBox {
  constructor() {
    super("Match all selected tags", true);
  }
}
