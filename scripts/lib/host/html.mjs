// Jsoup-style HTML for the Node harness: parse5 (an HTML5-spec parser, like Jsoup's tree builder)
// with css-select, plus Jsoup's own selector extensions. It implements the `HostElement` contract
// from sdk/src/host.ts, so extensions run here exactly as in the app, which uses SwiftSoup.
//
// Known differences from SwiftSoup are listed in docs/ARCHITECTURE.md ("Node harness").
import * as CSSselect from "css-select";
import { isTag } from "domhandler";
import * as DomUtils from "domutils";
import { parse, serialize, serializeOuter } from "parse5";
import { adapter as treeAdapter } from "parse5-htmlparser2-tree-adapter";

// Tags SwiftSoup treats as blocks (Tag.swift), for the spaces `text()` puts between them.
const BLOCK_TAGS = new Set(
  (
    "html head body frameset script noscript style meta link title frame noframes noembed section nav aside hgroup " +
    "header footer p h1 h2 h3 h4 h5 h6 ul ol pre listing div blockquote hr address figure figcaption form fieldset " +
    "center dir applet marquee ins del s dl dt dd li table caption thead tfoot tbody colgroup col tr th td video " +
    "audio canvas details menu plaintext template article main svg math"
  ).split(" "),
);
const PRESERVE_WHITESPACE_TAGS = new Set(["pre", "plaintext", "title", "textarea"]);
// Jsoup keeps the contents of these as data nodes: they are in `data()`, not in `text()`.
const DATA_TAGS = new Set(["script", "style"]);
const WHITESPACE = new Set([" ", "\t", "\n", "\f", "\r", " "]);

const isElement = (node) => node && (node.type === "tag" || node.type === "script" || node.type === "style");
const nameOf = (node) => (isElement(node) ? node.name.toLowerCase() : "");

function preserveWhitespace(node) {
  for (let current = node, depth = 0; current && depth < 6; current = current.parent, depth++) {
    if (PRESERVE_WHITESPACE_TAGS.has(nameOf(current))) return true;
  }
  return false;
}

/** Appends `text` with runs of whitespace collapsed to one space, as Jsoup's `appendNormalisedWhitespace`. */
function appendNormalised(state, text, stripLeading) {
  let reachedNonWhite = false;
  for (const char of text) {
    if (WHITESPACE.has(char)) {
      if ((stripLeading && !reachedNonWhite) || state.lastWasWhite) continue;
      state.out += " ";
      state.lastWasWhite = true;
    } else {
      state.out += char;
      state.lastWasWhite = false;
      reachedNonWhite = true;
    }
  }
}

const trim = (text) => text.replace(/^[\s ]+|[\s ]+$/g, "");

function isDataText(node) {
  return node.type === "text" && DATA_TAGS.has(nameOf(node.parent));
}

// Parsed trees never change (the host contract has no mutation), so text is computed once per node;
// `:contains` selectors otherwise recompute it for every candidate element.
const textCache = new WeakMap();

/** SwiftSoup's `text()`: normalised text of the node and its descendants, script/style excluded. */
export function textOf(node) {
  let text = textCache.get(node);
  if (text === undefined) {
    text = computeText(node);
    textCache.set(node, text);
  }
  return text;
}

function computeText(node) {
  const state = { out: "", lastWasWhite: false };
  const visit = (current) => {
    if (current.type === "text") {
      if (isDataText(current)) return;
      if (preserveWhitespace(current.parent)) {
        state.out += current.data;
        state.lastWasWhite = current.data.endsWith(" ");
      } else {
        appendNormalised(state, current.data, state.out.length === 0 || state.lastWasWhite);
      }
      return;
    }
    if (isElement(current)) {
      const name = nameOf(current);
      if (state.out.length > 0 && (BLOCK_TAGS.has(name) || name === "br") && !state.lastWasWhite) {
        state.out += " ";
        state.lastWasWhite = true;
      }
    }
    for (const child of current.children ?? []) visit(child);
  };
  visit(node);
  return trim(state.out);
}

/** SwiftSoup's `ownText()`: only the element's own text nodes, `<br>` as a space. */
export function ownTextOf(node) {
  const state = { out: "", lastWasWhite: false };
  for (const child of node.children ?? []) {
    if (child.type === "text" && !isDataText(child)) {
      if (preserveWhitespace(child.parent)) state.out += child.data;
      else appendNormalised(state, child.data, state.out.length === 0 || /\s$/.test(state.out));
      state.lastWasWhite = /\s$/.test(state.out);
    } else if (nameOf(child) === "br" && !/\s$/.test(state.out)) {
      state.out += " ";
    }
  }
  return trim(state.out);
}

/** SwiftSoup's `text(trimAndNormaliseWhitespace: false)`: raw text, a space before blocks and `<br>`. */
export function wholeTextOf(node) {
  let out = "";
  let lastWasWhite = false;
  const visit = (current) => {
    if (current.type === "text") {
      if (isDataText(current)) return;
      out += current.data;
      if (current.data.length > 0) lastWasWhite = current.data.endsWith(" ");
      return;
    }
    if (isElement(current)) {
      const name = nameOf(current);
      if (out.length > 0 && (BLOCK_TAGS.has(name) || name === "br") && !lastWasWhite) {
        out += " ";
        lastWasWhite = true;
      }
    }
    for (const child of current.children ?? []) visit(child);
  };
  visit(node);
  return out;
}

/** Jsoup's `data()`: script and style contents and comments, recursively. */
export function dataOf(node) {
  let out = "";
  for (const child of node.children ?? []) {
    if (isDataText(child)) out += child.data;
    else if (child.type === "comment") out += child.data;
    else if (isElement(child)) out += dataOf(child);
  }
  return out;
}

function attrOf(node, name) {
  if (!isElement(node)) return undefined;
  const key = name.toLowerCase();
  for (const [attribute, value] of Object.entries(node.attribs ?? {})) {
    if (attribute.toLowerCase() === key) return value;
  }
  return undefined;
}

function rootOf(node) {
  let current = node;
  while (current.parent) current = current.parent;
  return current;
}

/** Resolves `relative` against `base` like Jsoup's `StringUtil.resolve` (WHATWG URL rules here). */
export function resolveUrl(base, relative) {
  // SwiftSoup resolves with Foundation's URL(string:relativeTo:), which rejects surrounding
  // whitespace (Jsoup trims it). Mirror the app; the SDK's absUrl retries with the trimmed value.
  if (/^\s|\s$/.test(relative)) return "";
  const cleaned = relative;
  try {
    return base ? new URL(cleaned, base).toString() : new URL(cleaned).toString();
  } catch {
    try {
      return new URL(cleaned).toString();
    } catch {
      return "";
    }
  }
}

const elementSiblingIndex = (node) => (node.parent ? DomUtils.getChildren(node.parent).filter(isElement).indexOf(node) : 0);

// Selectors

const hex = (text) => Buffer.from(text, "utf8").toString("hex");
const unhex = (text) => Buffer.from(text, "hex").toString("utf8");

/** Java regex → JavaScript: a leading `(?i)` becomes the `i` flag. */
function javaRegex(pattern) {
  let flags = "";
  let source = pattern;
  const inline = /^\(\?([imsu]+)\)/.exec(source);
  if (inline) {
    source = source.slice(inline[0].length);
    flags = [...new Set(inline[1].replace("u", ""))].join("");
  }
  return new RegExp(source, flags);
}

const normaliseSearch = (text) => trim(text.replace(/[\s ]+/g, " ")).toLowerCase();

// Jsoup pseudo-classes that css-select lacks or defines differently (`:contains` is case-sensitive
// there, `:eq` is a position in the result set there and a sibling index in Jsoup).
const jsoupPseudos = {
  "jsoup-contains": (node, arg) => textOf(node).toLowerCase().includes(normaliseSearch(unhex(arg))),
  "jsoup-containsown": (node, arg) => ownTextOf(node).toLowerCase().includes(normaliseSearch(unhex(arg))),
  "jsoup-containswholetext": (node, arg) => wholeTextOf(node).includes(unhex(arg)),
  "jsoup-containswholeowntext": (node, arg) =>
    (node.children ?? []).filter((child) => child.type === "text").map((child) => child.data).join("").includes(unhex(arg)),
  "jsoup-containsdata": (node, arg) => dataOf(node).includes(unhex(arg)),
  "jsoup-matches": (node, arg) => javaRegex(unhex(arg)).test(textOf(node)),
  "jsoup-matchesown": (node, arg) => javaRegex(unhex(arg)).test(ownTextOf(node)),
  "jsoup-matcheswholetext": (node, arg) => javaRegex(unhex(arg)).test(wholeTextOf(node)),
  "jsoup-matcheswholeowntext": (node, arg) =>
    javaRegex(unhex(arg)).test((node.children ?? []).filter((child) => child.type === "text").map((child) => child.data).join("")),
  "jsoup-eq": (node, arg) => elementSiblingIndex(node) === Number(arg),
  "jsoup-lt": (node, arg) => elementSiblingIndex(node) < Number(arg),
  "jsoup-gt": (node, arg) => elementSiblingIndex(node) > Number(arg),
  "jsoup-attrprefix": (node, arg) => {
    const prefix = unhex(arg).toLowerCase();
    return Object.keys(node.attribs ?? {}).some((name) => name.toLowerCase().startsWith(prefix));
  },
  "jsoup-attrregex": (node, arg) => {
    const [name, pattern] = unhex(arg).split("\u0000");
    const value = attrOf(node, name);
    return value !== undefined && javaRegex(pattern).test(value);
  },
};

const TEXT_PSEUDOS = new Set([
  "contains",
  "containsown",
  "containswholetext",
  "containswholeowntext",
  "containsdata",
  "matches",
  "matchesown",
  "matcheswholetext",
  "matcheswholeowntext",
]);
const SELECTOR_PSEUDOS = new Set(["has", "not", "is", "where"]);
const INDEX_PSEUDOS = new Set(["eq", "lt", "gt"]);

/** Reads from `start` (an opening bracket) to its matching `close`, skipping quoted strings. */
function readBalanced(text, start, open, close) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (char === "\\") {
      i++;
    } else if (char === '"' || char === "'") {
      const end = text.indexOf(char, i + 1);
      if (end < 0) break;
      i = end;
    } else if (char === open) {
      depth++;
    } else if (char === close) {
      depth--;
      if (depth === 0) return { inner: text.slice(start + 1, i), end: i + 1 };
    }
  }
  throw new Error(`Did not find balanced marker at '${text.slice(start)}'`);
}

const unquote = (value) => {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && (trimmed[0] === '"' || trimmed[0] === "'") && trimmed.at(-1) === trimmed[0]) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};
const cssString = (value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function translateAttribute(content) {
  const body = content.trim();
  if (body.startsWith("^")) return `:jsoup-attrprefix(${hex(body.slice(1).trim())})`;
  const match = /^([^=!^$*~|\s]+)\s*(!=|\^=|\$=|\*=|~=|=)?(.*)$/s.exec(body);
  if (!match) throw new Error(`Could not parse attribute query '[${content}]'`);
  const [, key, operator, rest] = match;
  if (!operator) return `[${key}]`;
  const value = unquote(rest);
  switch (operator) {
    case "~=":
      return `:jsoup-attrregex(${hex(`${key}\u0000${value}`)})`;
    case "!=":
      return `:not([${key}=${cssString(value)} i])`;
    default:
      // Jsoup compares attribute values case-insensitively.
      return `[${key}${operator}${cssString(value)} i]`;
  }
}

/** Rewrites a Jsoup selector into one css-select understands, with the pseudos above. */
export function translateSelector(selector) {
  let out = "";
  for (let i = 0; i < selector.length; ) {
    const char = selector[i];
    if (char === '"' || char === "'") {
      const end = selector.indexOf(char, i + 1);
      out += selector.slice(i, end + 1);
      i = end + 1;
    } else if (char === "\\") {
      out += selector.slice(i, i + 2);
      i += 2;
    } else if (char === "[") {
      const { inner, end } = readBalanced(selector, i, "[", "]");
      out += translateAttribute(inner);
      i = end;
    } else if (char === ":" && selector[i + 1] !== ":") {
      const name = /^[\w-]+/.exec(selector.slice(i + 1))?.[0] ?? "";
      const lower = name.toLowerCase();
      let next = i + 1 + name.length;
      let argument = null;
      if (selector[next] === "(") {
        const { inner, end } = readBalanced(selector, next, "(", ")");
        argument = inner;
        next = end;
      }
      if (argument !== null && TEXT_PSEUDOS.has(lower)) {
        out += `:jsoup-${lower}(${hex(argument)})`;
      } else if (argument !== null && INDEX_PSEUDOS.has(lower)) {
        out += `:jsoup-${lower}(${Number.parseInt(argument.trim(), 10)})`;
      } else if (argument !== null && SELECTOR_PSEUDOS.has(lower)) {
        out += `:${lower}(${translateSelector(argument)})`;
      } else {
        out += selector.slice(i, next);
      }
      i = next;
    } else {
      out += char;
      i++;
    }
  }
  return out;
}

/** Splits on top-level commas. */
function splitGroups(selector) {
  const groups = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < selector.length; i++) {
    const char = selector[i];
    if (char === '"' || char === "'") {
      const end = selector.indexOf(char, i + 1);
      current += selector.slice(i, end + 1);
      i = end;
      continue;
    }
    if (char === "(" || char === "[") depth++;
    if (char === ")" || char === "]") depth--;
    if (char === "," && depth === 0) {
      groups.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  groups.push(current);
  return groups;
}

// css-select walks up through `getParent`; Jsoup stops at the element `select` was called on, so
// the adapter hides everything above the current root.
let boundary = null;
const adapter = {
  ...DomUtils,
  isTag,
  getParent: (node) => (node === boundary ? null : DomUtils.getParent(node)),
  getSiblings: (node) => (node === boundary ? [node] : DomUtils.getSiblings(node)),
  prevElementSibling: (node) => (node === boundary ? null : DomUtils.prevElementSibling(node)),
};
const compiled = new Map();

function compile(selector) {
  let query = compiled.get(selector);
  if (!query) {
    if (selector.trim() === "") throw new Error("String must not be empty");
    // Jsoup allows a leading combinator (`> a`), relative to the element.
    const groups = splitGroups(selector).map((group) => {
      const trimmed = group.trim();
      return /^[>+~]/.test(trimmed) ? `:scope ${trimmed}` : trimmed;
    });
    const translated = groups.map(translateSelector).join(", ");
    try {
      query = CSSselect.compile(translated, { adapter, pseudos: jsoupPseudos, relativeSelector: false, cacheResults: false });
    } catch (error) {
      throw new Error(`Could not parse query '${selector}': ${error.message}`);
    }
    compiled.set(selector, query);
  }
  return query;
}

/** Jsoup's `Element.select`: the element itself and its descendants that match, in document order. */
export function selectNodes(root, selector) {
  const query = compile(selector);
  boundary = root;
  try {
    const options = { adapter, context: [root], relativeSelector: false, cacheResults: false, pseudos: jsoupPseudos };
    const descendants = CSSselect.selectAll(query, DomUtils.getChildren(root).filter(isElement), options);
    return isElement(root) && CSSselect.is(root, query, options) ? [root, ...descendants] : descendants;
  } finally {
    boundary = null;
  }
}

// Parsing and the HostElement wrapper

/** Parses `html` as a full document, like `Jsoup.parse(html, baseUri)`. */
export function parseDocument(html, baseUri = "") {
  const document = parse(html, { treeAdapter, scriptingEnabled: false });
  // Jsoup takes the first <base href> as the document's base URI.
  const base = DomUtils.findOne((node) => nameOf(node) === "base" && attrOf(node, "href") !== undefined, document.children, true);
  document.location = baseUri;
  document.baseUri = base ? resolveUrl(baseUri, attrOf(base, "href")) || baseUri : baseUri;
  return document;
}

/**
 * Wraps a node in the `HostElement` interface. `observer.onSelect(selector, count, location)` is
 * called after each `select`/`selectFirst`, which `npm run debug` uses to show what matched.
 */
export function hostElement(node, observer = {}) {
  const wrap = (child) => (child ? hostElement(child, observer) : null);
  const documentOf = () => rootOf(node);
  const select = (css) => {
    const found = selectNodes(node, css);
    observer.onSelect?.(css, found.length, documentOf().location ?? "");
    return found;
  };
  return {
    select: (css) => select(css).map(wrap),
    selectFirst: (css) => wrap(select(css)[0]),
    text: () => textOf(node),
    ownText: () => ownTextOf(node),
    wholeText: () => wholeTextOf(node),
    html: () => (node.children ? serialize(node, { treeAdapter }) : ""),
    outerHtml: () => (node.type === "root" ? serialize(node, { treeAdapter }) : serializeOuter(node, { treeAdapter })),
    attr: (name) => {
      if (name.toLowerCase().startsWith("abs:")) {
        const key = name.slice(4);
        return attrOf(node, key) === undefined ? "" : resolveUrl(documentOf().baseUri, attrOf(node, key));
      }
      return attrOf(node, name) ?? "";
    },
    hasAttr: (name) =>
      name.toLowerCase().startsWith("abs:")
        ? attrOf(node, name.slice(4)) !== undefined && resolveUrl(documentOf().baseUri, attrOf(node, name.slice(4))) !== ""
        : attrOf(node, name) !== undefined,
    absUrl: (name) => (attrOf(node, name) === undefined ? "" : resolveUrl(documentOf().baseUri, attrOf(node, name))),
    tagName: () => (node.type === "root" ? "#root" : node.name),
    id: () => attrOf(node, "id") ?? "",
    hasClass: (name) =>
      (attrOf(node, "class") ?? "")
        .split(/\s+/)
        .some((value) => value.toLowerCase() === name.toLowerCase()),
    data: () => dataOf(node),
    val: () => (nameOf(node) === "textarea" ? textOf(node) : (attrOf(node, "value") ?? "")),
    parent: () => wrap(node.parent),
    children: () => (node.children ?? []).filter(isElement).map(wrap),
    nextElementSibling: () => wrap(DomUtils.nextElementSibling(node)),
    previousElementSibling: () => wrap(DomUtils.prevElementSibling(node)),
    location: () => documentOf().location ?? "",
  };
}
