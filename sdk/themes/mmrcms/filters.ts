// Port of lib-multisrc/mmrcms/.../Filters.kt @ d9420cd1.
import { CheckBox, type Filter, Group, type HttpUrlBuilder, Select, Sort, type SortSelection, Text } from "@sdk";
import type { Intl } from "./intl";

export interface UriFilter {
  addToUri(builder: HttpUrlBuilder): void;
}

export function isUriFilter(filter: Filter<unknown>): filter is Filter<unknown> & UriFilter {
  return typeof (filter as Partial<UriFilter>).addToUri === "function";
}

export class TextFilter extends Text implements UriFilter {
  constructor(
    name: string,
    private readonly param: string,
  ) {
    super(name);
  }

  addToUri(builder: HttpUrlBuilder): void {
    builder.addQueryParameter(this.param, this.state);
  }
}

export class UriPartFilter extends Select<string> implements UriFilter {
  constructor(
    name: string,
    private readonly param: string,
    private readonly vals: [string, string][],
    private readonly firstIsUnspecified = true,
    defaultValue = 0,
  ) {
    super(
      name,
      vals.map(([title]) => title),
      defaultValue,
    );
  }

  addToUri(builder: HttpUrlBuilder): void {
    if (this.state === 0 && this.firstIsUnspecified) {
      return;
    }

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
    vals: [string, string][],
  ) {
    super(
      name,
      vals.map(([title, value]) => new UriMultiSelectOption(title, value)),
    );
  }

  addToUri(builder: HttpUrlBuilder): void {
    const checked = this.state.filter((option) => option.state);

    if (checked.length === 0) {
      return;
    }

    for (const option of checked) builder.addQueryParameter(this.param, option.value);
  }
}

export class SortFilter extends Sort implements UriFilter {
  constructor(
    intl: Intl,
    private readonly sortables: [string, string][],
    selection: SortSelection = { index: 0, ascending: true },
  ) {
    super(
      intl.get("sort_by_filter_title"),
      sortables.map(([title]) => title),
      selection,
    );
  }

  addToUri(builder: HttpUrlBuilder): void {
    const state = this.state;
    if (!state) return;

    builder.addQueryParameter("sortBy", this.sortables[state.index][1]);
    builder.addQueryParameter("asc", String(state.ascending));
  }
}
