import { host, type HostElement } from "./host.js";

/**
 * Jsoup-style HTML, backed by the app's SwiftSoup (a Swift port of Jsoup). Selectors are
 * Jsoup's, including `:has()`, `:contains()`, `:containsData()`, `:matches()` and `[attr~=regex]`,
 * and `attr("abs:href")` resolves against the document URL, so upstream selectors port unchanged.
 */
export class Element {
  constructor(readonly native: HostElement) {}

  select(css: string): Elements {
    return Elements.wrap(this.native.select(css).map((element) => new Element(element)));
  }

  selectFirst(css: string): Element | null {
    const found = this.native.selectFirst(css);
    return found ? new Element(found) : null;
  }

  /** Normalised text of the element and its children. */
  text(): string {
    return this.native.text();
  }

  ownText(): string {
    return this.native.ownText();
  }

  wholeText(): string {
    return this.native.wholeText();
  }

  html(): string {
    return this.native.html();
  }

  outerHtml(): string {
    return this.native.outerHtml();
  }

  /** Attribute value, or "" when absent. `abs:` resolves URLs against the document location. */
  attr(name: string): string {
    return this.native.attr(name);
  }

  hasAttr(name: string): boolean {
    return this.native.hasAttr(name);
  }

  absUrl(name: string): string {
    return this.native.absUrl(name);
  }

  tagName(): string {
    return this.native.tagName();
  }

  id(): string {
    return this.native.id();
  }

  className(): string {
    return this.native.attr("class");
  }

  hasClass(name: string): boolean {
    return this.native.hasClass(name);
  }

  /** Contents of `<script>` and `<style>` elements. */
  data(): string {
    return this.native.data();
  }

  val(): string {
    return this.native.val();
  }

  hasText(): boolean {
    return this.text().trim().length > 0;
  }

  parent(): Element | null {
    const parent = this.native.parent();
    return parent ? new Element(parent) : null;
  }

  children(): Elements {
    return Elements.wrap(this.native.children().map((element) => new Element(element)));
  }

  nextElementSibling(): Element | null {
    const next = this.native.nextElementSibling();
    return next ? new Element(next) : null;
  }

  previousElementSibling(): Element | null {
    const previous = this.native.previousElementSibling();
    return previous ? new Element(previous) : null;
  }
}

/** A parsed page. `location()` is the URL it was loaded from, as in Jsoup. */
export class Document extends Element {
  location(): string {
    return this.native.location();
  }
}

/** A list of elements with Jsoup's `Elements` helpers. */
export class Elements extends Array<Element> {
  static wrap(items: Element[]): Elements {
    const elements = new Elements();
    elements.push(...items);
    return elements;
  }

  /** Combined text, space-separated. */
  text(): string {
    return this.map((element) => element.text())
      .filter((text) => text.length > 0)
      .join(" ");
  }

  html(): string {
    return this.map((element) => element.html()).join("\n");
  }

  /** The attribute of the first element that has it. */
  attr(name: string): string {
    for (const element of this) {
      if (element.hasAttr(name.replace(/^abs:/, ""))) return element.attr(name);
    }
    return "";
  }

  hasText(): boolean {
    return this.some((element) => element.hasText());
  }

  eachText(): string[] {
    return this.map((element) => element.text()).filter((text) => text.length > 0);
  }

  first(): Element | null {
    return this[0] ?? null;
  }

  last(): Element | null {
    return this[this.length - 1] ?? null;
  }

  isEmpty(): boolean {
    return this.length === 0;
  }

  isNotEmpty(): boolean {
    return this.length > 0;
  }

  select(css: string): Elements {
    return Elements.wrap(this.flatMap((element) => [...element.select(css)]));
  }
}

/** Parses `html`; relative URLs resolve against `baseUri`. */
export function parseHtml(html: string, baseUri = ""): Document {
  return new Document(host().parseHtml(html, baseUri));
}
