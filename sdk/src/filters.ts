/**
 * Filters, mirroring the Kotlin `Filter` sealed class. Sources subclass these exactly as
 * upstream does (`class TypeList(...) : Filter.Select<String>(...)`) and find them again with
 * `instanceof`.
 *
 * The app only sees JSON. When it calls `getSearchManga`, the SDK rebuilds the source's own
 * filter objects with `getFilterList()` and copies the user's states onto them by position, so
 * subclasses keep their extra fields and methods.
 */

export type FilterJSON =
  | { type: "header" | "separator"; name: string }
  | { type: "select"; name: string; values: string[]; state: number }
  | { type: "text"; name: string; state: string }
  | { type: "checkbox"; name: string; state: boolean }
  | { type: "tristate"; name: string; state: number }
  | { type: "group"; name: string; state: FilterJSON[] }
  | { type: "sort"; name: string; values: string[]; state: { index: number; ascending: boolean } | null };

export abstract class Filter<T> {
  constructor(
    readonly name: string,
    public state: T,
  ) {}

  abstract toJSON(): FilterJSON;

  /** Copies the state from the app's JSON for this filter. */
  applyJSON(json: FilterJSON): void {
    if ("state" in json && json.state !== undefined) {
      (this as { state: unknown }).state = json.state;
    }
  }
}

export class Header extends Filter<number> {
  constructor(name: string) {
    super(name, 0);
  }

  toJSON(): FilterJSON {
    return { type: "header", name: this.name };
  }

  override applyJSON(): void {}
}

export class Separator extends Filter<number> {
  constructor(name = "") {
    super(name, 0);
  }

  toJSON(): FilterJSON {
    return { type: "separator", name: this.name };
  }

  override applyJSON(): void {}
}

/** Pick one of `values`; `state` is the index. `toString()` of each value is what is shown. */
export class Select<V> extends Filter<number> {
  constructor(
    name: string,
    readonly values: V[],
    state = 0,
  ) {
    super(name, state);
  }

  toJSON(): FilterJSON {
    return { type: "select", name: this.name, values: this.values.map(String), state: this.state };
  }
}

export class Text extends Filter<string> {
  constructor(name: string, state = "") {
    super(name, state);
  }

  toJSON(): FilterJSON {
    return { type: "text", name: this.name, state: this.state };
  }
}

export class CheckBox extends Filter<boolean> {
  constructor(name: string, state = false) {
    super(name, state);
  }

  toJSON(): FilterJSON {
    return { type: "checkbox", name: this.name, state: this.state };
  }
}

export class TriState extends Filter<number> {
  static readonly STATE_IGNORE = 0;
  static readonly STATE_INCLUDE = 1;
  static readonly STATE_EXCLUDE = 2;

  constructor(name: string, state = TriState.STATE_IGNORE) {
    super(name, state);
  }

  isIgnored(): boolean {
    return this.state === TriState.STATE_IGNORE;
  }

  isIncluded(): boolean {
    return this.state === TriState.STATE_INCLUDE;
  }

  isExcluded(): boolean {
    return this.state === TriState.STATE_EXCLUDE;
  }

  toJSON(): FilterJSON {
    return { type: "tristate", name: this.name, state: this.state };
  }
}

/** A named group of child filters. `state` is the children. */
export class Group<V extends Filter<unknown>> extends Filter<V[]> {
  toJSON(): FilterJSON {
    return { type: "group", name: this.name, state: this.state.map((child) => child.toJSON()) };
  }

  override applyJSON(json: FilterJSON): void {
    if (json.type !== "group") return;
    this.state.forEach((child, index) => {
      const childJSON = json.state[index];
      if (childJSON) child.applyJSON(childJSON);
    });
  }
}

export interface SortSelection {
  index: number;
  ascending: boolean;
}

export class Sort extends Filter<SortSelection | null> {
  constructor(
    name: string,
    readonly values: string[],
    state: SortSelection | null = null,
  ) {
    super(name, state);
  }

  toJSON(): FilterJSON {
    return { type: "sort", name: this.name, values: this.values, state: this.state };
  }
}

export type FilterList = Filter<unknown>[];

/**
 * The source's own filters with the states from `json` applied by position. Filters the app
 * did not send keep their defaults.
 */
export function applyFilterStates(filters: FilterList, json: FilterJSON[]): FilterList {
  filters.forEach((filter, index) => {
    const state = json[index];
    if (state && state.type === filter.toJSON().type) filter.applyJSON(state);
  });
  return filters;
}
