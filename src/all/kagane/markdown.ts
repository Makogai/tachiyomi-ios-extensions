// The parts of keiyoushi's `MarkdownDescription.Builder` (core/.../utils/Markdown.kt @ d9420cd1)
// that Kagane uses: markdown, rating, field, links and altTitles.

const MARKDOWN_INDENT = /^[ \t]+/gm;
const MARKDOWN_INLINE = /[\\*_[\]<]/g;
// The renderer drops an escaped backtick, so only one that could pair up is escaped.
const MARKDOWN_BACKTICK = /`(?=[^`]*`)/g;
// Line starts: quotes, headings, list markers, fences, setext underlines and table delimiters, then list numbers.
const MARKDOWN_BLOCK = /^(?:>|#{1,6}(?=\s|$)|[-+](?=\s|$)|~{3}|[-=:|~][-=:|~ \t]*$)|(?<=^\d{1,9})[.)](?=\s|$)/gm;

export function escapeMarkdown(text: string): string {
  return text
    .replace(MARKDOWN_INDENT, "")
    .replace(MARKDOWN_INLINE, (match) => `\\${match}`)
    .replace(MARKDOWN_BLOCK, (match) => `\\${match}`)
    .replace(MARKDOWN_BACKTICK, (match) => `\\${match}`);
}

function encodeMarkdownUrl(url: string): string {
  return url.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/`/g, "%60");
}

function markdownList(label: string, items: string[]): string | null {
  const lines = items.filter((item) => item.trim() !== "");
  if (lines.length === 0) return null;
  return `**${escapeMarkdown(label)}:**\n` + lines.map((line) => `- ${line}`).join("\n");
}

/** Formats `rating`, out of `max`, as five stars with half stars. */
export function ratingStars(rating: number, max = 10): string {
  const halves = Math.min(10, Math.max(0, Math.ceil((rating * 10) / max - 0.5)));
  return "★".repeat(Math.trunc(halves / 2)) + "✬".repeat(halves % 2) + "☆".repeat(5 - Math.trunc((halves + 1) / 2));
}

const SEPARATOR = "---";

export class MarkdownDescriptionBuilder {
  private readonly sections: string[] = [];
  private lastIsInline = false;
  private lastIsRating = false;

  private add(section: string | null | undefined): this {
    if (section == null || section.trim() === "") return this;
    this.sections.push(section);
    this.lastIsInline = false;
    this.lastIsRating = false;
    return this;
  }

  private addInline(text: string | null | undefined): this {
    if (text == null || text.trim() === "") return this;
    if (this.lastIsRating) this.sections[this.sections.length - 1] += `\n${text}`;
    else if (this.lastIsInline) this.sections[this.sections.length - 1] += ` · ${text}`;
    else this.sections.push(text);
    this.lastIsInline = true;
    this.lastIsRating = false;
    return this;
  }

  rating(rating: number | null | undefined, max = 10, votes: number | null = null): this {
    if (rating == null || !Number.isFinite(rating)) return this;
    // BigDecimal(value.toString()).setScale(2, HALF_UP).stripTrailingZeros().toPlainString()
    const number = String(Math.round(Number((rating * 100).toPrecision(15))) / 100);
    this.add(`${ratingStars(rating, max)} ${number}` + (votes != null ? ` (${votes})` : ""));
    this.lastIsRating = true;
    return this;
  }

  markdown(markdown: string | null | undefined): this {
    return this.add(markdown?.trim());
  }

  field(label: string, value: string | string[] | null | undefined): this {
    if (Array.isArray(value)) {
      return this.field(
        label,
        value
          .filter((item) => item.trim() !== "")
          .map((item) => item.trim())
          .join(", "),
      );
    }
    const trimmed = value?.trim();
    return this.addInline(trimmed ? `**${escapeMarkdown(label)}:** ${escapeMarkdown(trimmed)}` : null);
  }

  altTitles(titles: string[], label = "Alternative Names"): this {
    const items = [...new Set(titles.map((title) => title.trim()).filter((title) => title !== ""))].map(escapeMarkdown);
    return this.add(markdownList(label, items));
  }

  links(links: [string, string | null][], label = "Links"): this {
    return this.add(
      markdownList(
        label,
        links.flatMap(([text, url]) =>
          url != null && url.trim() !== "" ? [`[${escapeMarkdown(text)}](${encodeMarkdownUrl(url)})`] : [],
        ),
      ),
    );
  }

  separator(): this {
    return this.add(SEPARATOR);
  }

  build(): string | null {
    const kept: string[] = [];
    for (const section of this.sections) {
      if (section !== SEPARATOR || (kept.length > 0 && kept[kept.length - 1] !== SEPARATOR)) kept.push(section);
    }
    if (kept[kept.length - 1] === SEPARATOR) kept.pop();
    const result = kept.join("\n\n");
    return result === "" ? null : result;
  }
}
