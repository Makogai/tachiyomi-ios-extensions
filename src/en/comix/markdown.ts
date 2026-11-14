// Port of keiyoushi's MarkdownDescription.Builder (core/.../utils/Markdown.kt) @ d9420cd1, which the SDK
// does not have: the parts Comix uses for its descriptions.


const MARKDOWN_INDENT = /^[ \t]+/gm;
const MARKDOWN_INLINE = /[\\*_[\]<]/g;
const MARKDOWN_BACKTICK = /`(?=[^`]*`)/g;
const MARKDOWN_BLOCK = /^(?:>|#{1,6}(?=\s|$)|[-+](?=\s|$)|~{3}|[-=:|~][-=:|~ \t]*$)|(?<=^\d{1,9})[.)](?=\s|$)/gm;

function escapeMarkdown(text: string): string {
  return text
    .replace(MARKDOWN_INDENT, "")
    .replace(MARKDOWN_INLINE, (it) => `\\${it}`)
    .replace(MARKDOWN_BLOCK, (it) => `\\${it}`)
    .replace(MARKDOWN_BACKTICK, (it) => `\\${it}`);
}

function ratingStars(rating: number, max = 10): string {
  const halves = Math.min(10, Math.max(0, Math.ceil((rating * 10) / max - 0.5)));
  return "★".repeat(Math.floor(halves / 2)) + "✬".repeat(halves % 2) + "☆".repeat(5 - Math.floor((halves + 1) / 2));
}

function markdownList(label: string, items: string[]): string | null {
  const lines = items.filter((it) => it.trim() !== "");
  if (lines.length === 0) return null;
  return `**${escapeMarkdown(label)}:**\n` + lines.map((it) => `- ${it}`).join("\n");
}

const encodeMarkdownUrl = (url: string) =>
  url.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/`/g, "%60");

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

  rating(rating: number | null | undefined, max = 10): this {
    if (rating == null || !Number.isFinite(rating)) return this;
    const number = String(Number(rating.toFixed(2)));
    this.add(`${ratingStars(rating, max)} ${number}`);
    this.lastIsRating = true;
    return this;
  }

  markdown(markdown: string | null | undefined): this {
    return this.add(markdown?.trim());
  }

  field(label: string, value: string | null | undefined): this {
    const trimmed = value?.trim();
    return this.addInline(trimmed ? `**${escapeMarkdown(label)}:** ${escapeMarkdown(trimmed)}` : null);
  }

  altTitles(titles: string[], label = "Alternative Names"): this {
    const items = [...new Set(titles.map((it) => it.trim()).filter((it) => it !== ""))].map(escapeMarkdown);
    return this.add(markdownList(label, items));
  }

  links(links: [string, string | null | undefined][], label = "Links"): this {
    return this.add(
      markdownList(
        label,
        links.flatMap(([text, url]) => (url && url.trim() !== "" ? [`[${escapeMarkdown(text)}](${encodeMarkdownUrl(url)})`] : [])),
      ),
    );
  }

  build(): string | null {
    const text = this.sections.join("\n\n");
    return text === "" ? null : text;
  }
}
