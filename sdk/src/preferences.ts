import { host } from "./host.js";

/**
 * Settings, mirroring androidx.preference as used in `setupPreferenceScreen`. The app shows
 * them in the source's settings screen; values are stored per source.
 */
interface PreferenceOptions<T> {
  key: string;
  title: string;
  summary?: string;
  defaultValue: T;
}

export abstract class Preference<T> {
  readonly key: string;
  readonly title: string;
  readonly summary: string;
  readonly defaultValue: T;

  constructor(options: PreferenceOptions<T>) {
    this.key = options.key;
    this.title = options.title;
    this.summary = options.summary ?? "";
    this.defaultValue = options.defaultValue;
  }

  abstract toJSON(): object;
}

export class SwitchPreferenceCompat extends Preference<boolean> {
  toJSON() {
    return { type: "toggle", key: this.key, title: this.title, summary: this.summary, default: this.defaultValue };
  }
}

interface ListOptions<T> extends PreferenceOptions<T> {
  entries: string[];
  entryValues: string[];
}

export class ListPreference extends Preference<string> {
  readonly entries: string[];
  readonly entryValues: string[];

  constructor(options: ListOptions<string>) {
    super(options);
    this.entries = options.entries;
    this.entryValues = options.entryValues;
  }

  toJSON() {
    return {
      type: "list",
      key: this.key,
      title: this.title,
      summary: this.summary,
      entries: this.entries.map((title, index) => ({ title, value: this.entryValues[index] })),
      default: this.defaultValue,
    };
  }
}

export class MultiSelectListPreference extends Preference<string[]> {
  readonly entries: string[];
  readonly entryValues: string[];

  constructor(options: ListOptions<string[]>) {
    super(options);
    this.entries = options.entries;
    this.entryValues = options.entryValues;
  }

  toJSON() {
    return {
      type: "multiselect",
      key: this.key,
      title: this.title,
      summary: this.summary,
      entries: this.entries.map((title, index) => ({ title, value: this.entryValues[index] })),
      default: this.defaultValue,
    };
  }
}

export class EditTextPreference extends Preference<string> {
  toJSON() {
    return { type: "text", key: this.key, title: this.title, summary: this.summary, default: this.defaultValue };
  }
}

/** Collects the settings a source declares in `setupPreferenceScreen`. */
export class PreferenceScreen {
  readonly preferences: Preference<unknown>[] = [];

  addPreference(preference: Preference<unknown>): void {
    this.preferences.push(preference);
  }
}

/** A source's stored settings. Mirrors `SharedPreferences`. */
export class SharedPreferences {
  constructor(private readonly sourceIndex: () => number) {}

  private read(key: string): unknown {
    const json = host().prefGet(this.sourceIndex(), key);
    return json === null ? undefined : JSON.parse(json);
  }

  getBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.read(key);
    return typeof value === "boolean" ? value : defaultValue;
  }

  getString(key: string, defaultValue: string): string {
    const value = this.read(key);
    return typeof value === "string" ? value : defaultValue;
  }

  getStringSet(key: string, defaultValue: Iterable<string>): Set<string> {
    const value = this.read(key);
    return new Set(Array.isArray(value) ? (value as string[]) : defaultValue);
  }

  edit(): PreferencesEditor {
    return new PreferencesEditor((key, value) => host().prefSet(this.sourceIndex(), key, JSON.stringify(value)));
  }
}

export class PreferencesEditor {
  private readonly changes: [string, unknown][] = [];

  constructor(private readonly write: (key: string, value: unknown) => void) {}

  putBoolean(key: string, value: boolean): this {
    this.changes.push([key, value]);
    return this;
  }

  putString(key: string, value: string): this {
    this.changes.push([key, value]);
    return this;
  }

  putStringSet(key: string, value: Iterable<string>): this {
    this.changes.push([key, [...value]]);
    return this;
  }

  remove(key: string): this {
    this.changes.push([key, null]);
    return this;
  }

  apply(): void {
    for (const [key, value] of this.changes) this.write(key, value);
  }

  commit(): boolean {
    this.apply();
    return true;
  }
}
