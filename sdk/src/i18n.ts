/**
 * keiyoushi's `lib:i18n` `Intl`: strings per language, falling back to the base language and
 * then to the key. Upstream reads `assets/i18n/messages_<lang>.properties`; a port inlines those
 * files as `{ en: { key: "text" }, "pt-BR": { … } }`.
 */
export class Intl {
  constructor(
    readonly language: string,
    private readonly messages: Record<string, Record<string, string>>,
    readonly baseLanguage = "en",
  ) {}

  private lookup(key: string): string | undefined {
    const primary = this.language.split("-")[0];
    return this.messages[this.language]?.[key] ?? this.messages[primary]?.[key] ?? this.messages[this.baseLanguage]?.[key];
  }

  /** `intl["key"]` upstream. */
  get(key: string): string {
    return this.lookup(key) ?? key;
  }

  /** `intl.format("key", args…)`: replaces `%s`, `%d` and `%1$s`-style placeholders in order. */
  format(key: string, ...args: unknown[]): string {
    let next = 0;
    return this.get(key).replace(/%(?:(\d+)\$)?[sd]/g, (_, position: string | undefined) =>
      String(args[position ? Number(position) - 1 : next++] ?? ""),
    );
  }
}
