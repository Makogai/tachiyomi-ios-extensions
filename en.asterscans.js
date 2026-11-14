// Aster Scans 1 for tachiyomi-ios. Ported from keiyoushi/extensions-source (Apache-2.0).
"use strict";
var __extension = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/en/asterscans/index.ts
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default
  });

  // sdk/src/crypto.ts
  var MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
  var SBOX = new Uint8Array(256);
  var INV_SBOX = new Uint8Array(256);
  (() => {
    let p = 1;
    let q = 1;
    do {
      p = p ^ p << 1 & 255 ^ (p & 128 ? 27 : 0);
      q ^= q << 1;
      q ^= q << 2;
      q ^= q << 4;
      q &= 255;
      if (q & 128) q ^= 9;
      const x = q ^ (q << 1 | q >> 7) ^ (q << 2 | q >> 6) ^ (q << 3 | q >> 5) ^ (q << 4 | q >> 4);
      SBOX[p] = (x ^ 99) & 255;
    } while (p !== 1);
    SBOX[0] = 99;
    for (let i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i;
  })();

  // sdk/src/host.ts
  function host() {
    if (typeof __host === "undefined") {
      throw new Error("The tachiyomi-ios host API is not available here");
    }
    return __host;
  }

  // sdk/src/utils.ts
  function substringAfter(text, delimiter, missing = text) {
    const index = text.indexOf(delimiter);
    return index < 0 ? missing : text.slice(index + delimiter.length);
  }
  function base64Decode(text) {
    return host().base64Decode(text);
  }
  var log = {
    debug: (message) => host().log("debug", message),
    warn: (message) => host().log("warn", message),
    error: (message) => host().log("error", message)
  };
  var MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  function parseDate(text, pattern) {
    const tokens = pattern.match(/'[^']*'|yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|hh|h|mm|ss|SSS|a|./g) ?? [];
    const parts = { year: 1970, month: 0, day: 1, hour: 0, minute: 0, second: 0, ms: 0, pm: null };
    let rest = text.trim();
    for (const token of tokens) {
      const take = (regex) => {
        const match = regex.exec(rest);
        if (!match) return null;
        rest = rest.slice(match[0].length);
        return match[0];
      };
      let value;
      switch (token) {
        case "yyyy":
          value = take(/^\d{4}/);
          if (value) parts.year = Number(value);
          break;
        case "yy":
          value = take(/^\d{2}/);
          if (value) parts.year = 2e3 + Number(value);
          break;
        case "MMMM":
        case "MMM":
          value = take(/^[A-Za-z]+\.?/);
          if (value) parts.month = MONTHS.indexOf(value.slice(0, 3).toLowerCase());
          if (parts.month < 0) value = null;
          break;
        case "MM":
        case "M":
          value = take(token === "MM" ? /^\d{2}/ : /^\d{1,2}/);
          if (value) parts.month = Number(value) - 1;
          break;
        case "dd":
        case "d":
          value = take(token === "dd" ? /^\d{2}/ : /^\d{1,2}/);
          if (value) parts.day = Number(value);
          break;
        case "HH":
        case "H":
        case "hh":
        case "h":
          value = take(token.length === 2 ? /^\d{2}/ : /^\d{1,2}/);
          if (value) parts.hour = Number(value);
          break;
        case "mm":
          value = take(/^\d{2}/);
          if (value) parts.minute = Number(value);
          break;
        case "ss":
          value = take(/^\d{2}/);
          if (value) parts.second = Number(value);
          break;
        case "SSS":
          value = take(/^\d{3}/);
          if (value) parts.ms = Number(value);
          break;
        case "a":
          value = take(/^[AaPp][Mm]/);
          if (value) parts.pm = value.toLowerCase() === "pm";
          break;
        default: {
          const literal = token.startsWith("'") ? token.slice(1, -1) : token;
          value = rest.startsWith(literal) ? take(new RegExp(`^${literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)) : null;
          if (value === null && /^\s+$/.test(literal)) value = take(/^\s*/);
        }
      }
      if (value === null) return 0;
    }
    if (parts.pm !== null) {
      if (parts.pm && parts.hour < 12) parts.hour += 12;
      if (!parts.pm && parts.hour === 12) parts.hour = 0;
    }
    const date = new Date(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second, parts.ms);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  // sdk/src/filterCache.ts
  var FILTER_DATA = "filter_data";
  var MAX_AGE_MS = 3 * 24 * 60 * 60 * 1e3;
  var FilterDataCache = class {
    constructor(source, fetchFilterData) {
      this.source = source;
      this.fetchFilterData = fetchFilterData;
      this.inFlight = false;
    }
    /** The stored data, or null. Starts a background fetch when it is missing or stale. */
    read() {
      let stored = null;
      try {
        const json = this.source.preferences.getString(FILTER_DATA, "");
        if (json !== "") stored = JSON.parse(json);
      } catch {
        stored = null;
      }
      if (stored === null || Date.now() - stored.fetchedAt > MAX_AGE_MS) this.triggerBackgroundFetch();
      return stored?.data ?? null;
    }
    triggerBackgroundFetch() {
      if (this.inFlight) return;
      this.inFlight = true;
      Promise.resolve().then(() => this.fetchFilterData()).then((data) => {
        this.source.preferences.edit().putString(FILTER_DATA, JSON.stringify({ fetchedAt: Date.now(), data })).apply();
      }).catch((error) => {
        try {
          log.warn(`${this.source.name}: failed to fetch filter data: ${String(error)}`);
        } catch {
        }
      }).finally(() => {
        this.inFlight = false;
      });
    }
  };

  // sdk/src/filters.ts
  var Filter = class {
    constructor(name, state) {
      this.name = name;
      this.state = state;
    }
    /** Copies the state from the app's JSON for this filter. */
    applyJSON(json) {
      if ("state" in json && json.state !== void 0) {
        this.state = json.state;
      }
    }
  };
  var Header = class extends Filter {
    constructor(name) {
      super(name, 0);
    }
    toJSON() {
      return { type: "header", name: this.name };
    }
    applyJSON() {
    }
  };
  var Separator = class extends Filter {
    constructor(name = "") {
      super(name, 0);
    }
    toJSON() {
      return { type: "separator", name: this.name };
    }
    applyJSON() {
    }
  };
  var Select = class extends Filter {
    constructor(name, values, state = 0) {
      super(name, state);
      this.values = values;
    }
    toJSON() {
      return { type: "select", name: this.name, values: this.values.map(String), state: this.state };
    }
  };
  var Text = class extends Filter {
    constructor(name, state = "") {
      super(name, state);
    }
    toJSON() {
      return { type: "text", name: this.name, state: this.state };
    }
  };
  var _TriState = class _TriState extends Filter {
    constructor(name, state = _TriState.STATE_IGNORE) {
      super(name, state);
    }
    isIgnored() {
      return this.state === _TriState.STATE_IGNORE;
    }
    isIncluded() {
      return this.state === _TriState.STATE_INCLUDE;
    }
    isExcluded() {
      return this.state === _TriState.STATE_EXCLUDE;
    }
    toJSON() {
      return { type: "tristate", name: this.name, state: this.state };
    }
  };
  _TriState.STATE_IGNORE = 0;
  _TriState.STATE_INCLUDE = 1;
  _TriState.STATE_EXCLUDE = 2;
  var TriState = _TriState;
  var Group = class extends Filter {
    toJSON() {
      return { type: "group", name: this.name, state: this.state.map((child) => child.toJSON()) };
    }
    applyJSON(json) {
      if (json.type !== "group") return;
      this.state.forEach((child, index) => {
        const childJSON = json.state[index];
        if (childJSON) child.applyJSON(childJSON);
      });
    }
  };
  function applyFilterStates(filters, json) {
    filters.forEach((filter, index) => {
      const state = json[index];
      if (state && state.type === filter.toJSON().type) filter.applyJSON(state);
    });
    return filters;
  }
  var ValueSelect = class extends Select {
    constructor(name, options, defaultValue) {
      super(
        name,
        options.map(([label]) => label),
        Math.max(0, options.findIndex(([, value]) => value === defaultValue))
      );
      this.options = options;
    }
    selectedValue() {
      return this.options[this.state]?.[1] ?? "";
    }
  };
  var ValueTriState = class extends TriState {
    constructor(name, value, state = TriState.STATE_IGNORE) {
      super(name, state);
      this.value = value;
    }
  };

  // sdk/src/url.ts
  var QUERY_COMPONENT_ENCODE_SET = " !\"#$&'(),/:;<=>?@[]\\^`{|}~";
  var QUERY_COMPONENT_REENCODE_SET = ` "'<>#&=`;
  var PATH_SEGMENT_ENCODE_SET = ' "<>^`{}|/\\?#';
  var FRAGMENT_ENCODE_SET = "";
  function hex(byte) {
    return "%" + byte.toString(16).toUpperCase().padStart(2, "0");
  }
  function utf8(codePoint) {
    if (codePoint < 128) return [codePoint];
    if (codePoint < 2048) return [192 | codePoint >> 6, 128 | codePoint & 63];
    if (codePoint < 65536) {
      return [224 | codePoint >> 12, 128 | codePoint >> 6 & 63, 128 | codePoint & 63];
    }
    return [
      240 | codePoint >> 18,
      128 | codePoint >> 12 & 63,
      128 | codePoint >> 6 & 63,
      128 | codePoint & 63
    ];
  }
  function canonicalize(input, encodeSet, options = {}) {
    const { alreadyEncoded = false, plusIsSpace = false } = options;
    let out = "";
    for (let i = 0; i < input.length; ) {
      const codePoint = input.codePointAt(i);
      const char = String.fromCodePoint(codePoint);
      i += char.length;
      if (alreadyEncoded && (codePoint === 9 || codePoint === 10 || codePoint === 12 || codePoint === 13)) {
        continue;
      }
      if (codePoint === 43 && plusIsSpace) {
        out += alreadyEncoded ? "+" : "%2B";
      } else if (codePoint < 32 || codePoint === 127 || codePoint >= 128 || encodeSet.includes(char) || codePoint === 37 && (!alreadyEncoded || !/^%[0-9a-fA-F]{2}/.test(input.slice(i - 1, i + 2)))) {
        out += utf8(codePoint).map(hex).join("");
      } else {
        out += char;
      }
    }
    return out;
  }
  function percentDecode(input) {
    try {
      return decodeURIComponent(input.replace(/\+/g, "%2B"));
    } catch {
      return input;
    }
  }
  var HttpUrl = class _HttpUrl {
    constructor(scheme, host2, port, encodedSegments, query, fragment) {
      this.scheme = scheme;
      this.host = host2;
      this.port = port;
      this.encodedSegments = encodedSegments;
      this.query = query;
      this.fragment = fragment;
    }
    /** Parses an absolute http(s) URL, or returns null. */
    static parse(url) {
      const match = /^(https?):\/\/([^/?#:]+)(?::(\d+))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/i.exec(url.trim());
      if (!match) return null;
      const [, scheme, host2, port, path, query, fragment] = match;
      const segments = (path || "/").replace(/^\//, "").split("/");
      const pairs = query === void 0 ? null : query === "" ? [] : query.split("&").map((part) => {
        const index = part.indexOf("=");
        return index < 0 ? [part, null] : [part.slice(0, index), part.slice(index + 1)];
      });
      return new _HttpUrl(
        scheme.toLowerCase(),
        host2.toLowerCase(),
        port ? Number(port) : null,
        segments,
        pairs,
        fragment === void 0 ? null : percentDecode(fragment)
      );
    }
    static get(url) {
      const parsed = _HttpUrl.parse(url);
      if (!parsed) throw new Error(`Invalid URL: ${url}`);
      return parsed;
    }
    get encodedPath() {
      return "/" + this.encodedSegments.join("/");
    }
    get pathSegments() {
      return this.encodedSegments.map(percentDecode);
    }
    get encodedQuery() {
      if (this.query === null) return null;
      return this.query.map(([name, value]) => value === null ? name : `${name}=${value}`).join("&");
    }
    queryParameter(name) {
      const pair = this.query?.find(([key]) => percentDecode(key) === name);
      return pair?.[1] == null ? null : percentDecode(pair[1]);
    }
    newBuilder() {
      return new HttpUrlBuilder(
        this.scheme,
        this.host,
        this.port,
        [...this.encodedSegments],
        this.query ? this.query.map(([name, value]) => [name, value]) : null,
        this.fragment
      );
    }
    /** Resolves `link` against this URL, as a browser does for an `href`. */
    resolve(link) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(link)) return _HttpUrl.parse(link);
      if (link.startsWith("//")) return _HttpUrl.parse(`${this.scheme}:${link}`);
      const origin = `${this.scheme}://${this.host}${this.port ? `:${this.port}` : ""}`;
      if (link.startsWith("/")) return _HttpUrl.parse(origin + link);
      if (link.startsWith("?")) return _HttpUrl.parse(origin + this.encodedPath + link);
      const base = this.encodedPath.replace(/[^/]*$/, "");
      return _HttpUrl.parse(origin + base + link);
    }
    toString() {
      let url = `${this.scheme}://${this.host}`;
      if (this.port !== null && !(this.scheme === "https" && this.port === 443) && !(this.scheme === "http" && this.port === 80)) {
        url += `:${this.port}`;
      }
      url += this.encodedPath;
      const query = this.encodedQuery;
      if (query !== null) url += `?${query}`;
      if (this.fragment !== null) url += `#${canonicalize(this.fragment, FRAGMENT_ENCODE_SET)}`;
      return url;
    }
    toJSON() {
      return this.toString();
    }
  };
  var HttpUrlBuilder = class {
    constructor(scheme, host2, port, segments, query, fragmentValue) {
      this.scheme = scheme;
      this.host = host2;
      this.port = port;
      this.segments = segments;
      this.query = query;
      this.fragmentValue = fragmentValue;
    }
    addQueryParameter(name, value) {
      (this.query ?? (this.query = [])).push([
        canonicalize(name, QUERY_COMPONENT_ENCODE_SET, { plusIsSpace: true }),
        value === null ? null : canonicalize(value, QUERY_COMPONENT_ENCODE_SET, { plusIsSpace: true })
      ]);
      return this;
    }
    addEncodedQueryParameter(name, value) {
      (this.query ?? (this.query = [])).push([
        canonicalize(name, QUERY_COMPONENT_REENCODE_SET, { alreadyEncoded: true, plusIsSpace: true }),
        value === null ? null : canonicalize(value, QUERY_COMPONENT_REENCODE_SET, { alreadyEncoded: true, plusIsSpace: true })
      ]);
      return this;
    }
    setQueryParameter(name, value) {
      this.removeAllQueryParameters(name);
      return this.addQueryParameter(name, value);
    }
    removeAllQueryParameters(name) {
      const encoded = canonicalize(name, QUERY_COMPONENT_ENCODE_SET, { plusIsSpace: true });
      if (this.query) this.query = this.query.filter(([key]) => key !== encoded);
      return this;
    }
    addPathSegment(segment) {
      return this.pushSegment(canonicalize(segment, PATH_SEGMENT_ENCODE_SET));
    }
    /** Adds `/`-separated segments, encoding each. */
    addPathSegments(segments) {
      for (const segment of segments.split("/")) this.addPathSegment(segment);
      return this;
    }
    /** Replaces the path segment at `index`. */
    setPathSegment(index, segment) {
      if (index < 0 || index >= this.segments.length) throw new RangeError(`No path segment ${index} in /${this.segments.join("/")}`);
      this.segments[index] = canonicalize(segment, PATH_SEGMENT_ENCODE_SET);
      return this;
    }
    pushSegment(encoded) {
      if (this.segments.length === 1 && this.segments[0] === "") {
        this.segments[0] = encoded;
      } else if (this.segments[this.segments.length - 1] === "") {
        this.segments[this.segments.length - 1] = encoded;
      } else {
        this.segments.push(encoded);
      }
      return this;
    }
    fragment(fragment) {
      this.fragmentValue = fragment;
      return this;
    }
    build() {
      const port = this.port === null ? "" : `:${this.port}`;
      const query = this.query === null ? "" : "?" + this.query.map(([n, v]) => v === null ? n : `${n}=${v}`).join("&");
      const fragment = this.fragmentValue === null ? "" : `#${this.fragmentValue}`;
      return HttpUrl.get(`${this.scheme}://${this.host}${port}/${this.segments.join("/")}${query}${fragment}`);
    }
  };
  function toHttpUrl(url) {
    return HttpUrl.get(url);
  }

  // sdk/src/html.ts
  var Element = class _Element {
    constructor(native) {
      this.native = native;
    }
    select(css) {
      return Elements.wrap(this.native.select(css).map((element) => new _Element(element)));
    }
    selectFirst(css) {
      const found = this.native.selectFirst(css);
      return found ? new _Element(found) : null;
    }
    /**
     * The first match, or an error naming the selector and page. Mirrors Jsoup's `expectFirst`;
     * use it where upstream writes `selectFirst(css)!!`, so a layout change says what broke.
     */
    expectFirst(css) {
      const found = this.selectFirst(css);
      if (!found) throw new SelectorError(css, this.native.location());
      return found;
    }
    /** Normalised text of the element and its children. */
    text() {
      return this.native.text();
    }
    ownText() {
      return this.native.ownText();
    }
    wholeText() {
      return this.native.wholeText();
    }
    html() {
      return this.native.html();
    }
    outerHtml() {
      return this.native.outerHtml();
    }
    /** Attribute value, or "" when absent. `abs:` resolves URLs against the document location. */
    attr(name) {
      if (name.toLowerCase().startsWith("abs:")) return this.absUrl(name.slice(4));
      return this.native.attr(name);
    }
    hasAttr(name) {
      return this.native.hasAttr(name);
    }
    /**
     * The attribute as an absolute URL, or "" when absent. Jsoup ignores surrounding whitespace
     * (`data-src="\n  https://…"` is common); SwiftSoup's Foundation URLs do not, so the SDK
     * retries with the trimmed value.
     */
    absUrl(name) {
      const resolved = this.native.absUrl(name);
      if (resolved !== "") return resolved;
      const raw = this.native.attr(name).replace(/[\t\n\r]/g, "").trim();
      if (raw === "") return "";
      const absolute = HttpUrl.parse(raw);
      if (absolute) return absolute.toString();
      return HttpUrl.parse(this.native.location())?.resolve(raw)?.toString() ?? "";
    }
    tagName() {
      return this.native.tagName();
    }
    id() {
      return this.native.id();
    }
    className() {
      return this.native.attr("class");
    }
    hasClass(name) {
      return this.native.hasClass(name);
    }
    /** Contents of `<script>` and `<style>` elements. */
    data() {
      return this.native.data();
    }
    val() {
      return this.native.val();
    }
    hasText() {
      return this.text().trim().length > 0;
    }
    parent() {
      const parent = this.native.parent();
      return parent ? new _Element(parent) : null;
    }
    children() {
      return Elements.wrap(this.native.children().map((element) => new _Element(element)));
    }
    nextElementSibling() {
      const next = this.native.nextElementSibling();
      return next ? new _Element(next) : null;
    }
    previousElementSibling() {
      const previous = this.native.previousElementSibling();
      return previous ? new _Element(previous) : null;
    }
  };
  var SelectorError = class extends Error {
    constructor(selector, location) {
      super(`Selector '${selector}' matched 0 nodes on ${location || "the parsed HTML"}`);
      this.selector = selector;
      this.location = location;
      this.name = "SelectorError";
    }
  };
  var Document = class extends Element {
    location() {
      return this.native.location();
    }
  };
  var Elements = class _Elements extends Array {
    static wrap(items) {
      const elements = new _Elements();
      elements.push(...items);
      return elements;
    }
    /** Combined text, space-separated. */
    text() {
      return this.map((element) => element.text()).filter((text) => text.length > 0).join(" ");
    }
    html() {
      return this.map((element) => element.html()).join("\n");
    }
    /** The attribute of the first element that has it. */
    attr(name) {
      for (const element of this) {
        if (element.hasAttr(name.replace(/^abs:/, ""))) return element.attr(name);
      }
      return "";
    }
    hasText() {
      return this.some((element) => element.hasText());
    }
    eachText() {
      return this.map((element) => element.text()).filter((text) => text.length > 0);
    }
    /** The first element, or an error naming the selector that found nothing. */
    expectFirst(css = "(selection)") {
      const found = this[0];
      if (!found) throw new SelectorError(css, "");
      return found;
    }
    first() {
      return this[0] ?? null;
    }
    last() {
      return this[this.length - 1] ?? null;
    }
    isEmpty() {
      return this.length === 0;
    }
    isNotEmpty() {
      return this.length > 0;
    }
    select(css) {
      return _Elements.wrap(this.flatMap((element) => [...element.select(css)]));
    }
  };
  function parseHtml(html, baseUri = "") {
    return new Document(host().parseHtml(html, baseUri));
  }

  // sdk/src/i18n.ts
  var Intl = class {
    constructor(language, messages2, baseLanguage = "en") {
      this.language = language;
      this.messages = messages2;
      this.baseLanguage = baseLanguage;
    }
    lookup(key) {
      const primary = this.language.split("-")[0];
      return this.messages[this.language]?.[key] ?? this.messages[primary]?.[key] ?? this.messages[this.baseLanguage]?.[key];
    }
    /** `intl["key"]` upstream. */
    get(key) {
      return this.lookup(key) ?? key;
    }
    /** `intl.format("key", args…)`: replaces `%s`, `%d` and `%1$s`-style placeholders in order. */
    format(key, ...args) {
      let next = 0;
      return this.get(key).replace(
        /%(?:(\d+)\$)?[sd]/g,
        (_, position) => String(args[position ? Number(position) - 1 : next++] ?? "")
      );
    }
  };

  // sdk/src/http.ts
  var _Fetch = class _Fetch {
    constructor(kind, initiator) {
      this.kind = kind;
      this.initiator = initiator;
    }
    /** The same request, made from the page at `url`. */
    from(url) {
      return new _Fetch(this.kind, url.toString());
    }
  };
  _Fetch.DOCUMENT = new _Fetch("document", null);
  _Fetch.XHR = new _Fetch("xhr", null);
  _Fetch.IMAGE = new _Fetch("image", null);
  var Fetch = _Fetch;
  var FormBody = class {
    constructor() {
      this.pairs = [];
    }
    add(name, value) {
      this.pairs.push([name, value]);
      return this;
    }
    build() {
      const formSet = " \"':;<=>@[]^`{}|/\\?#&!$(),~";
      const encode = (text) => canonicalize(text, formSet, { plusIsSpace: true }).replace(/%20/g, "+");
      return {
        content: this.pairs.map(([name, value]) => `${encode(name)}=${encode(value)}`).join("&"),
        contentType: "application/x-www-form-urlencoded"
      };
    }
  };
  var Response = class {
    constructor(code, url, headerMap, body) {
      this.code = code;
      this.url = url;
      this.headerMap = headerMap;
      this.body = body;
    }
    get isSuccessful() {
      return this.code >= 200 && this.code < 300;
    }
    header(name) {
      return this.headerMap[name.toLowerCase()] ?? null;
    }
    /** Parses the body as HTML; relative links resolve against the final URL. */
    asJsoup() {
      return parseHtml(this.body, this.url);
    }
    /** Parses the body as JSON. A failure names the URL and shows the start of the body. */
    parseAs() {
      try {
        return JSON.parse(this.body);
      } catch (error) {
        const preview = this.body.slice(0, 200).replace(/\s+/g, " ");
        throw new Error(`JSON parse failed at ${this.url} (HTTP ${this.code}): ${error.message}; body starts: ${preview}`);
      }
    }
  };
  var HttpError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "HttpError";
    }
  };
  var ClientBuilder = class {
    constructor() {
      this.rateLimits = [];
      this.cookieRules = [];
    }
    /**
     * At most `permits` requests per `periodMs`, at least `intervalMs` apart, for URLs where
     * `shouldLimit` is true. The first matching rule applies, so add specific rules first.
     */
    rateLimit(permits, periodMs = 1e3, shouldLimit = () => true, intervalMs = 0) {
      this.rateLimits.push({ permits, periodMs, intervalMs, shouldLimit });
      return this;
    }
    /** Cookies sent with every request to `domain` (or its subdomains), overriding stored ones. */
    addCookie(domain, cookies) {
      this.cookieRules.push({
        domain: typeof domain === "string" ? () => domain : domain,
        cookies: typeof cookies === "function" ? cookies : () => cookies
      });
      return this;
    }
    rateLimitFor(url) {
      const parsed = HttpUrl.parse(url);
      if (!parsed) return null;
      const index = this.rateLimits.findIndex((rule) => rule.shouldLimit(parsed));
      return index < 0 ? null : index;
    }
    cookiesFor(url) {
      const parsed = HttpUrl.parse(url);
      if (!parsed) return [];
      for (const rule of this.cookieRules) {
        const domain = rule.domain();
        if (parsed.host === domain || parsed.host.endsWith(`.${domain}`)) return rule.cookies();
      }
      return [];
    }
  };
  var HttpClient = class {
    constructor(sourceIndex, builder, defaultHeaders) {
      this.sourceIndex = sourceIndex;
      this.builder = builder;
      this.defaultHeaders = defaultHeaders;
    }
    get(url, options) {
      return this.request("GET", url, null, options);
    }
    post(url, body, options) {
      return this.request("POST", url, body, options);
    }
    request(method, url, body, options = {}) {
      const opts = options instanceof Fetch ? { fetch: options } : options;
      const target = url.toString();
      const headers = { ...this.defaultHeaders(), ...opts.headers ?? {} };
      if (body && !Object.keys(headers).some((name) => name.toLowerCase() === "content-type")) {
        headers["Content-Type"] = body.contentType;
      }
      const payload = {
        source: this.sourceIndex(),
        url: target,
        method,
        headers,
        body: body?.content ?? null,
        bodyBase64: null,
        fetch: opts.fetch?.kind ?? null,
        initiator: opts.fetch?.initiator ?? null,
        cookies: this.builder.cookiesFor(target),
        rateLimit: this.builder.rateLimitFor(target),
        ensureSuccess: opts.ensureSuccess ?? true,
        responseType: opts.responseType ?? "text"
      };
      return new Promise((resolve, reject) => {
        host().http(JSON.stringify(payload), (error, json) => {
          if (error !== null || json === null) {
            reject(new HttpError(`${error ?? "No response"} (${method} ${target})`));
            return;
          }
          const response = JSON.parse(json);
          resolve(new Response(response.status, response.url, response.headers, response.body));
        });
      });
    }
  };

  // sdk/src/models.ts
  function urlWithoutDomain(url) {
    const match = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/?#]*(.*)$/.exec(url);
    if (!match) return url;
    return match[1] === "" ? "/" : match[1];
  }
  var _SManga = class _SManga {
    constructor() {
      this.url = "";
      this.title = "";
      this.artist = null;
      this.author = null;
      this.description = null;
      this.genre = null;
      this.status = _SManga.UNKNOWN;
      this.thumbnail_url = null;
      /** 0 = always update, 1 = only fetch once. */
      this.update_strategy = 0;
      this.initialized = false;
    }
    static create() {
      return new _SManga();
    }
    /** Builds an SManga from the JSON the app sends. */
    static from(json) {
      return Object.assign(new _SManga(), json);
    }
    setUrlWithoutDomain(url) {
      this.url = urlWithoutDomain(url);
    }
  };
  _SManga.UNKNOWN = 0;
  _SManga.ONGOING = 1;
  _SManga.COMPLETED = 2;
  _SManga.LICENSED = 3;
  _SManga.PUBLISHING_FINISHED = 4;
  _SManga.CANCELLED = 5;
  _SManga.ON_HIATUS = 6;
  var SManga = _SManga;
  var SChapter = class _SChapter {
    constructor() {
      this.url = "";
      this.name = "";
      /** Milliseconds since 1970; 0 when unknown. */
      this.date_upload = 0;
      /** -1 when unknown. */
      this.chapter_number = -1;
      this.scanlator = null;
    }
    static create() {
      return new _SChapter();
    }
    static from(json) {
      return Object.assign(new _SChapter(), json);
    }
    setUrlWithoutDomain(url) {
      this.url = urlWithoutDomain(url);
    }
  };
  var Page = class _Page {
    constructor(index, url = "", imageUrl = null) {
      this.index = index;
      this.url = url;
      this.imageUrl = imageUrl;
    }
    static from(json) {
      return new _Page(json.index, json.url ?? "", json.imageUrl ?? null);
    }
    toJSON() {
      return { index: this.index, url: this.url, imageUrl: this.imageUrl };
    }
  };
  var MangasPage = class {
    constructor(mangas, hasNextPage) {
      this.mangas = mangas;
      this.hasNextPage = hasNextPage;
    }
  };
  var SMangaUpdate = class {
    constructor(manga, chapters) {
      this.manga = manga;
      this.chapters = chapters;
    }
  };

  // sdk/src/preferences.ts
  var PreferenceScreen = class {
    constructor() {
      this.preferences = [];
    }
    addPreference(preference) {
      this.preferences.push(preference);
    }
  };
  var SharedPreferences = class {
    constructor(sourceIndex) {
      this.sourceIndex = sourceIndex;
    }
    read(key) {
      const json = host().prefGet(this.sourceIndex(), key);
      return json == null ? void 0 : JSON.parse(json);
    }
    getBoolean(key, defaultValue) {
      const value = this.read(key);
      return typeof value === "boolean" ? value : defaultValue;
    }
    getString(key, defaultValue) {
      const value = this.read(key);
      return typeof value === "string" ? value : defaultValue;
    }
    getStringSet(key, defaultValue) {
      const value = this.read(key);
      return new Set(Array.isArray(value) ? value : defaultValue);
    }
    edit() {
      return new PreferencesEditor((key, value) => host().prefSet(this.sourceIndex(), key, JSON.stringify(value)));
    }
  };
  var PreferencesEditor = class {
    constructor(write) {
      this.write = write;
      this.changes = [];
    }
    putBoolean(key, value) {
      this.changes.push([key, value]);
      return this;
    }
    putString(key, value) {
      this.changes.push([key, value]);
      return this;
    }
    putStringSet(key, value) {
      this.changes.push([key, [...value]]);
      return this;
    }
    remove(key) {
      this.changes.push([key, null]);
      return this;
    }
    apply() {
      for (const [key, value] of this.changes) this.write(key, value);
    }
    commit() {
      this.apply();
      return true;
    }
  };

  // sdk/src/source.ts
  var KeiSource = class {
    constructor() {
      /** Bump when the site changes so much that old URLs are useless; it changes the ID. */
      this.versionId = 1;
      /** A fixed ID (decimal string) when upstream hard-codes one in `build.gradle.kts`. */
      this.id = null;
      this.supportsLatest = true;
      /** Set by the runtime: this source's position in the extension. */
      this.index = -1;
      this.builtClient = null;
      this.preferences = new SharedPreferences(() => this.index);
    }
    /** Override to add rate limits and cookies. Mirrors `OkHttpClient.Builder.configureClient()`. */
    configureClient(_builder) {
    }
    /** Override to add or replace headers. Mirrors `Headers.Builder.configureHeaders()`. */
    configureHeaders(headers) {
      return headers;
    }
    /** Headers for every request: `Referer: <baseUrl>/` plus `configureHeaders`. Read fresh each time. */
    get headers() {
      return this.configureHeaders({ Referer: `${this.baseUrl}/` });
    }
    get clientBuilder() {
      return this.ensureClient().builder;
    }
    get client() {
      return this.ensureClient().client;
    }
    ensureClient() {
      if (!this.builtClient) {
        const builder = new ClientBuilder();
        this.configureClient(builder);
        this.builtClient = { builder, client: new HttpClient(() => this.index, builder, () => this.headers) };
      }
      return this.builtClient;
    }
    /** Override to declare settings. Mirrors `ConfigurableSource.setupPreferenceScreen`. */
    setupPreferenceScreen(_screen) {
    }
    /** When the query is a URL, look it up instead of searching, as `KeiSource.getSearchManga` does. */
    async getSearchManga(page, query, filters) {
      const url = HttpUrl.parse(query);
      if (url) return this.getMangasByUrl(url, page);
      return this.getSearchMangaList(page, query, filters);
    }
    async getMangaByUrl(_url) {
      throw new Error("getMangaByUrl not implemented");
    }
    async getMangasByUrl(url, _page) {
      const manga = await this.getMangaByUrl(url);
      return new MangasPage(manga ? [manga] : [], false);
    }
    getFilterList() {
      return [];
    }
    async getImageUrl(_page) {
      throw new Error("getImageUrl not implemented");
    }
    getImageRequest(page) {
      if (!page.imageUrl) throw new Error(`Page ${page.index + 1} has no image URL`);
      return { url: page.imageUrl, headers: this.headers };
    }
    /**
     * Override to unscramble images (replaces upstream's Bitmap/Canvas interceptors): given the
     * downloaded image's size, return the tile moves, or null to leave it as is.
     */
    async getImageTransform(_page, _width, _height) {
      return null;
    }
    /** The page a person would open for this manga. Used by "Open in WebView". */
    getMangaUrl(manga) {
      return this.baseUrl + manga.url;
    }
    getChapterUrl(chapter) {
      return this.baseUrl + chapter.url;
    }
    toString() {
      return `${this.name} (${this.lang.toUpperCase()})`;
    }
  };

  // sdk/src/runtime.ts
  var API_LEVEL = 2;
  var methods = {
    getPopularManga: (source, [page]) => source.getPopularManga(page),
    getLatestUpdates: (source, [page]) => source.getLatestUpdates(page),
    getSearchManga: (source, [page, query, filters]) => source.getSearchManga(
      page,
      query,
      applyFilterStates(source.getFilterList(), filters ?? [])
    ),
    getFilterList: (source) => source.getFilterList(),
    getMangaUpdate: (source, [manga, chapters, fetchDetails, fetchChapters]) => source.fetchMangaUpdate(
      SManga.from(manga),
      chapters.map((chapter) => SChapter.from(chapter)),
      fetchDetails,
      fetchChapters
    ),
    getPageList: (source, [chapter]) => source.getPageList(SChapter.from(chapter)),
    getImageUrl: (source, [page]) => source.getImageUrl(Page.from(page)),
    getImageRequest: (source, [page]) => source.getImageRequest(Page.from(page)),
    getImageTransform: (source, [page, width, height]) => source.getImageTransform(Page.from(page), width, height)
  };
  function describeError(error) {
    if (error instanceof Error) {
      return error.stack ? `${error.name}: ${error.message}
${error.stack}` : `${error.name}: ${error.message}`;
    }
    return String(error);
  }
  function failure(source, method, error) {
    const message = `${source.toString()} ${method} failed: ${describeError(error)}`;
    try {
      host().log("error", message);
    } catch {
    }
    return message;
  }
  function defineExtension(sources) {
    sources.forEach((source, index) => {
      source.index = index;
    });
    return {
      api: API_LEVEL,
      sources,
      describe(index) {
        const source = sources[index];
        const screen = new PreferenceScreen();
        source.setupPreferenceScreen(screen);
        const builder = source.clientBuilder;
        return JSON.stringify({
          name: source.name,
          lang: source.lang,
          baseUrl: source.baseUrl,
          supportsLatest: source.supportsLatest,
          versionId: source.versionId,
          id: source.id,
          client: {
            userAgent: null,
            headers: {},
            rateLimits: builder.rateLimits.map(({ permits, periodMs, intervalMs }) => ({ permits, periodMs, intervalMs }))
          },
          preferences: screen.preferences.map((preference) => preference.toJSON()),
          hasImageTransform: source.getImageTransform !== KeiSource.prototype.getImageTransform
        });
      },
      invoke(index, method, argumentsJSON, callback) {
        const source = sources[index];
        const call = methods[method];
        if (!source || !call) {
          callback(`Unknown call ${method} on source ${index}`, null);
          return;
        }
        Promise.resolve().then(() => call(source, JSON.parse(argumentsJSON))).then(
          (result) => callback(null, JSON.stringify(result ?? null)),
          (error) => callback(failure(source, method, error), null)
        );
      },
      rateLimitFor(index, url) {
        return sources[index].clientBuilder.rateLimitFor(url);
      },
      cookiesFor(index, url) {
        return JSON.stringify(sources[index].clientBuilder.cookiesFor(url));
      }
    };
  }

  // sdk/themes/mangathemesia/intl.ts
  var intlFor = (lang) => new Intl(lang, messages);
  var messages = {
    "en": {
      alt_names_heading: "Alternative Names:",
      author_filter_title: "Author",
      year_filter_title: "Year",
      status_filter_title: "Status",
      status_filter_option_all: "All",
      status_filter_option_ongoing: "Ongoing",
      status_filter_option_completed: "Completed",
      status_filter_option_hiatus: "Hiatus",
      status_filter_option_dropped: "Dropped",
      type_filter_title: "Type",
      type_filter_option_all: "All",
      type_filter_option_manga: "Manga",
      type_filter_option_manhwa: "Manhwa",
      type_filter_option_manhua: "Manhua",
      type_filter_option_comic: "Comic",
      order_by_filter_title: "Sort By",
      order_by_filter_default: "Default",
      order_by_filter_az: "A-Z",
      order_by_filter_za: "Z-A",
      order_by_filter_latest_update: "Latest Update",
      order_by_filter_latest_added: "Latest Added",
      order_by_filter_popular: "Popular",
      project_filter_title: "Filter Project",
      project_filter_all_manga: "Show all manga",
      project_filter_only_project: "Show only project manga",
      genre_filter_title: "Genre",
      genre_exclusion_warning: "Genre exclusion is not available for all sources",
      project_filter_warning: "NOTE: Can't be used with other filter!",
      project_filter_name: "%s Project List page",
      pref_dynamic_url_title: "Automatically update dynamic URLs",
      pref_dynamic_url_summary: 'Automatically update random numbers in manga URLs.\nHelps mitigating HTTP 404 errors during update and "in library" marks when browsing.\nNote: This setting may require clearing database in advanced settings and migrating all manga to the same source.',
      pref_hide_paid_chapters_title: "Hide chapters which require a purchase",
      pref_hide_paid_chapters_summary: "Hide chapters which must be purchased using coins.\nYou might want to disable this if you want to be notified of paid chapters so that you can go purchase them."
    },
    "es": {
      alt_names_heading: "Nombres alternativos:",
      author_filter_title: "Autor",
      year_filter_title: "Año",
      status_filter_title: "Estado",
      status_filter_option_all: "Todos",
      status_filter_option_ongoing: "En curso",
      status_filter_option_completed: "Completado",
      status_filter_option_hiatus: "En pausa",
      status_filter_option_dropped: "Abandonado",
      type_filter_title: "Tipo",
      type_filter_option_all: "Todos",
      order_by_filter_title: "Ordenar por",
      order_by_filter_default: "Por defecto",
      order_by_filter_latest_update: "Última actualización",
      order_by_filter_latest_added: "Último añadido",
      project_filter_title: "Filtrar proyectos",
      project_filter_all_manga: "Mostrar todos los mangas",
      project_filter_only_project: "Mostrar solo los proyectos",
      genre_filter_title: "Género",
      genre_exclusion_warning: "La exclusión de géneros puede no funcionar correctamente",
      project_filter_warning: "NOTA: ¡No se puede usar con otros filtros!",
      project_filter_name: "%s Página de proyectos"
    }
  };

  // sdk/themes/mangathemesia/mangathemesia.ts
  var MANGA_PAGE_ID_REGEX = /(?:post_id["']?\s*:\s*|ts_dynamic_ajax_view\D*|tsUpdateView\D*)(\d+)/;
  var CHAPTER_PAGE_ID_REGEX = /chapter_id\s*=\s*(\d+);/;
  var JSON_IMAGE_LIST_REGEX = /["']?(?:images|imageUrls)["']?\s*[:=]\s*(\[.*?])/;
  var ALT_NAME_SEPARATOR = /[|/•,;]/;
  var AuthorFilter = class extends Text {
  };
  var YearFilter = class extends Text {
  };
  var SelectFilter = class extends ValueSelect {
  };
  var StatusFilter = class extends SelectFilter {
  };
  var TypeFilter = class extends SelectFilter {
  };
  var OrderByFilter = class extends SelectFilter {
  };
  var ProjectFilter = class extends SelectFilter {
  };
  var Genre = class extends ValueTriState {
  };
  var GenreListFilter = class extends Group {
  };
  var MangaThemesia = class _MangaThemesia extends KeiSource {
    constructor() {
      super(...arguments);
      this.intlCache = null;
      this.filterData = new FilterDataCache(this, () => this.fetchFilterData());
    }
    get mangaUrlDirectory() {
      return "/manga";
    }
    /** A `parseDate` pattern. */
    get datePattern() {
      return "MMMM d, yyyy";
    }
    get projectPageString() {
      return "/project";
    }
    /** Set to false to stop reporting views to the site through admin-ajax.php. */
    get sendViewCount() {
      return true;
    }
    get hasProjectPage() {
      return false;
    }
    get intl() {
      this.intlCache ?? (this.intlCache = intlFor(this.lang));
      return this.intlCache;
    }
    // Popular and latest are searches with an order and nothing else.
    get popularFilter() {
      return [new OrderByFilter("", this.orderByFilterOptions, "popular")];
    }
    get latestFilter() {
      return [new OrderByFilter("", this.orderByFilterOptions, "update")];
    }
    getPopularManga(page) {
      return this.getSearchMangaList(page, "", this.popularFilter);
    }
    getLatestUpdates(page) {
      return this.getSearchMangaList(page, "", this.latestFilter);
    }
    // Search
    async getMangaByUrl(url) {
      if (url.host !== toHttpUrl(this.baseUrl).host) return null;
      const manga = SManga.create();
      manga.url = url.encodedPath;
      const details = await this.getMangaDetails(manga);
      return details.title ? details : null;
    }
    searchMangaUrl(page, query, filters = []) {
      const url = toHttpUrl(this.baseUrl).newBuilder();
      url.addPathSegment(this.mangaUrlDirectory.slice(1));
      if (query) url.addQueryParameter("title", query);
      url.addQueryParameter("page", String(page));
      for (const filter of filters) {
        if (filter instanceof StatusFilter) url.addQueryParameter("status", filter.selectedValue());
        else if (filter instanceof TypeFilter) url.addQueryParameter("type", filter.selectedValue());
        else if (filter instanceof OrderByFilter) url.addQueryParameter("order", filter.selectedValue());
        else if (filter instanceof GenreListFilter) {
          for (const genre of filter.state) {
            if (genre.state !== TriState.STATE_IGNORE) {
              url.addQueryParameter("genre[]", genre.state === TriState.STATE_EXCLUDE ? `-${genre.value}` : genre.value);
            }
          }
        } else if (filter instanceof AuthorFilter) {
          if (filter.state) url.addQueryParameter("author", filter.state);
        } else if (filter instanceof YearFilter) {
          if (filter.state) url.addQueryParameter("yearx", filter.state);
        } else if (filter instanceof ProjectFilter) {
          if (filter.selectedValue() === "project-filter-on") url.setPathSegment(0, this.projectPageString.slice(1));
        }
      }
      url.addPathSegment("");
      return url;
    }
    async getSearchMangaList(page, query, filters) {
      const url = this.searchMangaUrl(page, query, filters);
      return this.searchMangaParse((await this.client.get(url.build(), Fetch.DOCUMENT)).asJsoup());
    }
    searchMangaParse(document) {
      const mangas = document.select(this.searchMangaSelector()).map((element) => this.searchMangaFromElement(element));
      const nextSelector = this.searchMangaNextPageSelector();
      const hasNextPage = nextSelector !== null && document.select(nextSelector).first() !== null;
      return new MangasPage([...mangas], hasNextPage);
    }
    searchMangaSelector() {
      return ".utao .uta .imgu, .listupd .bs .bsx, .listo .bs .bsx";
    }
    searchMangaFromElement(element) {
      const manga = SManga.create();
      manga.thumbnail_url = this.imgAttrOf(element.select("img"));
      manga.title = element.select("a").attr("title");
      manga.setUrlWithoutDomain(element.select("a").attr("href"));
      return manga;
    }
    searchMangaNextPageSelector() {
      return "div.pagination .next, div.hpage .r";
    }
    // Details and chapters
    async fetchMangaUpdate(manga) {
      const document = (await this.client.get(this.getMangaUrl(manga), Fetch.DOCUMENT)).asJsoup();
      this.sendView(this.postId(document));
      return new SMangaUpdate(this.mangaDetailsParse(document), this.chapterListParse(document));
    }
    static selector(selector, contains) {
      return contains.map((text) => selector.replaceAll("%s", text)).join(", ");
    }
    get seriesDetailsSelector() {
      return "div.bigcontent, div.animefull, div.main-info, div.postbody";
    }
    get seriesTitleSelector() {
      return ".entry-title, .ts-breadcrumb li:last-child span";
    }
    get seriesArtistSelector() {
      return _MangaThemesia.selector(
        ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .fmed b:contains(%s)+span, span:contains(%s)",
        ["artist", "Artiste", "Artista", "الرسام", "الناشر", "İllüstratör", "Çizer", "Sanatçı", "นักวาด"]
      );
    }
    get seriesAuthorSelector() {
      return _MangaThemesia.selector(
        ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .fmed b:contains(%s)+span, span:contains(%s)",
        ["Author", "Auteur", "autor", "المؤلف", "Mangaka", "seniman", "Pengarang", "Yazar", "ผู้แต่ง", "นักเขียน"]
      );
    }
    get seriesDescriptionSelector() {
      return ".desc, .entry-content[itemprop=description]";
    }
    get seriesAltNameSelector() {
      return ".alternative, .wd-full:contains(alt) span, .alter, .seriestualt, " + _MangaThemesia.selector(".infotable tr:contains(%s) td:last-child", ["Alternative", "Alternatif", "الأسماء الثانوية"]);
    }
    get seriesGenreSelector() {
      return "div.gnr a, .mgen a, .seriestugenre a, " + _MangaThemesia.selector("span:contains(%s)", ["genre", "التصنيف"]);
    }
    get seriesTypeSelector() {
      return _MangaThemesia.selector(
        ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .tsinfo .imptdt:contains(%s) a, .fmed b:contains(%s)+span, span:contains(%s) a",
        ["type", "ประเภท", "النوع", "tipe", "Türü"]
      ) + ", a[href*=type\\=]";
    }
    get seriesStatusSelector() {
      return _MangaThemesia.selector(
        ".infotable tr:contains(%s) td:last-child, .tsinfo .imptdt:contains(%s) i, .fmed b:contains(%s)+span span:contains(%s)",
        ["status", "Statut", "Durum", "連載状況", "Estado", "الحالة", "حالة العمل", "สถานะ", "stato", "Statüsü"]
      );
    }
    get seriesThumbnailSelector() {
      return ".infomanga > div[itemprop=image] img, .thumb img";
    }
    get altNamePrefix() {
      return `${this.intl.get("alt_names_heading")} `;
    }
    async getMangaDetails(manga) {
      return this.mangaDetailsParse((await this.client.get(this.getMangaUrl(manga), Fetch.DOCUMENT)).asJsoup());
    }
    mangaDetailsParse(document) {
      const manga = SManga.create();
      manga.setUrlWithoutDomain(document.location());
      const details = document.selectFirst(this.seriesDetailsSelector);
      if (!details) return manga;
      manga.title = details.expectFirst(this.seriesTitleSelector).text();
      manga.artist = this.removeEmptyPlaceholder(details.selectFirst(this.seriesArtistSelector)?.ownText());
      manga.author = this.removeEmptyPlaceholder(details.selectFirst(this.seriesAuthorSelector)?.ownText());
      const description = details.selectFirst(this.seriesDescriptionSelector)?.text();
      manga.description = description ? description : null;
      const altName = details.selectFirst(this.seriesAltNameSelector)?.ownText();
      if (altName && altName.trim()) {
        const names = altName.split(ALT_NAME_SEPARATOR).map((name) => `- ${name.trim()}`).join("\n");
        manga.description = (manga.description ? `${manga.description}

` : "") + `${this.altNamePrefix}
${names}`.trim();
      }
      const genres = details.select(this.seriesGenreSelector).map((element) => element.text());
      const type = details.selectFirst(this.seriesTypeSelector)?.ownText();
      if (type && type.trim()) genres.push(type);
      manga.genre = genres.map((genre) => {
        const lower = genre.toLocaleLowerCase(this.lang);
        return (lower.charAt(0).toLocaleUpperCase(this.lang) + lower.slice(1)).trim();
      }).join(", ");
      manga.status = this.parseStatus(details.selectFirst(this.seriesStatusSelector)?.text() ?? null);
      manga.thumbnail_url = this.imgAttrOf(details.select(this.seriesThumbnailSelector));
      return manga;
    }
    removeEmptyPlaceholder(value) {
      if (!value || !value.trim() || ["-", "N/A", "n/a", "Unknown"].includes(value)) return null;
      return value;
    }
    parseStatus(text) {
      if (text === null) return SManga.UNKNOWN;
      const lower = text.toLowerCase();
      const has = (words) => words.some((word) => lower.includes(word.toLowerCase()));
      if (has([
        "مستمرة",
        "en curso",
        "ongoing",
        "on going",
        "new season",
        "mass released",
        "ativo",
        "en cours",
        "en cours de publication",
        "đang tiến hành",
        "em lançamento",
        "онгоінг",
        "publishing",
        "devam ediyor",
        "em andamento",
        "in corso",
        "güncel",
        "berjalan",
        "продолжается",
        "updating",
        "lançando",
        "in arrivo",
        "emision",
        "en emision",
        "مستمر",
        "curso",
        "en marcha",
        "publicandose",
        "publicando",
        "连载中",
        "devam etmekte",
        "連載中"
      ])) {
        return SManga.ONGOING;
      }
      if (has([
        "completed",
        "completo",
        "complété",
        "fini",
        "achevé",
        "terminé",
        "tamamlandı",
        "đã hoàn thành",
        "hoàn thành",
        "مكتملة",
        "завершено",
        "finished",
        "finalizad",
        "completata",
        "one-shot",
        "bitti",
        "tamat",
        "completado",
        "concluído",
        "完結",
        "concluido",
        "已完结",
        "bitmiş"
      ])) {
        return SManga.COMPLETED;
      }
      if (has(["canceled", "cancelled", "cancelado", "cancellato", "cancelados", "dropped", "discontinued", "abandonné"])) return SManga.CANCELLED;
      if (has(["hiatus", "on hold", "season end", "pausado", "en espera", "en pause", "en attente", "hiato"])) return SManga.ON_HIATUS;
      return SManga.UNKNOWN;
    }
    chapterListSelector() {
      return "div.bxcl li, div.cl li, #chapterlist li, ul li:has(div.chbox):has(div.eph-num)";
    }
    chapterListParse(document) {
      const chapters = document.select(this.chapterListSelector()).map((element) => this.chapterFromElement(element));
      if (chapters.length > 0 && chapters[0].date_upload === 0) {
        const date = document.select(".listinfo time[itemprop=dateModified], .fmed:contains(update) time, span:contains(update) time").attr("datetime");
        if (date) chapters[0].date_upload = parseDate(date, "yyyy-MM-dd");
      }
      return [...chapters];
    }
    chapterFromElement(element) {
      const chapter = SChapter.create();
      const urlElements = element.select("a");
      chapter.setUrlWithoutDomain(urlElements.attr("href"));
      chapter.name = element.select(".lch a, .chapternum").text() || urlElements.expectFirst("a").text();
      chapter.date_upload = this.parseChapterDate(element.selectFirst(".chapterdate")?.text() ?? null);
      return chapter;
    }
    parseChapterDate(date) {
      return date ? parseDate(date, this.datePattern) : 0;
    }
    // Pages
    get pageSelector() {
      return "div#readerarea img";
    }
    async getPageList(chapter) {
      const document = (await this.client.get(this.getChapterUrl(chapter), Fetch.DOCUMENT)).asJsoup();
      this.sendView(this.postId(document));
      return this.pageListParse(document);
    }
    pageListParse(document) {
      const htmlPages = document.select(this.pageSelector).filter((img) => this.imgAttr(img) !== "").map((img, index) => new Page(index, "", this.imgAttr(img)));
      if (htmlPages.length > 0) return htmlPages;
      const script = document.selectFirst("script[src^=data:text/javascript;base64,dHNfcmVhZGVyLnJ1bih7]");
      const docString = script ? base64Decode(substringAfter(script.attr("src"), "base64,")) ?? "" : document.outerHtml();
      const imageListJson = JSON_IMAGE_LIST_REGEX.exec(docString)?.[1] ?? "";
      let imageList = [];
      try {
        imageList = JSON.parse(imageListJson);
      } catch {
        imageList = [];
      }
      return imageList.map((url, index) => new Page(index, "", url.startsWith("/") ? this.baseUrl + url : url));
    }
    /** Reports the view to the site, as upstream does; never fails the call. */
    sendView(postId) {
      if (!this.sendViewCount || !postId) return;
      const body = new FormBody().add("action", "dynamic_view_ajax").add("post_id", postId).build();
      this.client.post(`${this.baseUrl}/wp-admin/admin-ajax.php`, body, Fetch.XHR).catch((error) => {
        try {
          log.debug(`${this.name}: view not sent: ${String(error)}`);
        } catch {
        }
      });
    }
    postId(document) {
      for (const script of document.select("script")) {
        const data = script.data();
        const match = MANGA_PAGE_ID_REGEX.exec(data) ?? CHAPTER_PAGE_ID_REGEX.exec(data);
        if (match) return match[1];
      }
      return null;
    }
    // Filters
    get statusOptions() {
      return [
        [this.intl.get("status_filter_option_all"), ""],
        [this.intl.get("status_filter_option_ongoing"), "ongoing"],
        [this.intl.get("status_filter_option_completed"), "completed"],
        [this.intl.get("status_filter_option_hiatus"), "hiatus"],
        [this.intl.get("status_filter_option_dropped"), "dropped"]
      ];
    }
    get typeFilterOptions() {
      return [
        [this.intl.get("type_filter_option_all"), ""],
        [this.intl.get("type_filter_option_manga"), "Manga"],
        [this.intl.get("type_filter_option_manhwa"), "Manhwa"],
        [this.intl.get("type_filter_option_manhua"), "Manhua"],
        [this.intl.get("type_filter_option_comic"), "Comic"]
      ];
    }
    get orderByFilterOptions() {
      return [
        [this.intl.get("order_by_filter_default"), ""],
        [this.intl.get("order_by_filter_az"), "title"],
        [this.intl.get("order_by_filter_za"), "titlereverse"],
        [this.intl.get("order_by_filter_latest_update"), "update"],
        [this.intl.get("order_by_filter_latest_added"), "latest"],
        [this.intl.get("order_by_filter_popular"), "popular"]
      ];
    }
    get projectFilterOptions() {
      return [
        [this.intl.get("project_filter_all_manga"), ""],
        [this.intl.get("project_filter_only_project"), "project-filter-on"]
      ];
    }
    async fetchFilterData() {
      return this.parseGenres((await this.client.get(`${this.baseUrl}${this.mangaUrlDirectory}`, Fetch.DOCUMENT)).asJsoup()) ?? [];
    }
    parseGenres(document) {
      const list = document.selectFirst("ul.genrez");
      if (!list) return null;
      return list.select("li").map((li) => ({
        name: li.expectFirst("label").text(),
        value: li.expectFirst("input[type=checkbox]").attr("value")
      }));
    }
    getFilterList() {
      const genres = (this.filterData.read() ?? []).map((genre) => new Genre(genre.name, genre.value, genre.state ?? TriState.STATE_IGNORE));
      const filters = [
        new Separator(),
        new AuthorFilter(this.intl.get("author_filter_title")),
        new YearFilter(this.intl.get("year_filter_title")),
        new StatusFilter(this.intl.get("status_filter_title"), this.statusOptions),
        new TypeFilter(this.intl.get("type_filter_title"), this.typeFilterOptions),
        new OrderByFilter(this.intl.get("order_by_filter_title"), this.orderByFilterOptions)
      ];
      if (genres.length > 0) {
        filters.push(new Header(this.intl.get("genre_exclusion_warning")), new GenreListFilter(this.intl.get("genre_filter_title"), genres));
      }
      if (this.hasProjectPage) {
        filters.push(
          new Separator(),
          new Header(this.intl.get("project_filter_warning")),
          new Header(this.intl.format("project_filter_name", this.name)),
          new ProjectFilter(this.intl.get("project_filter_title"), this.projectFilterOptions)
        );
      }
      return filters;
    }
    // Helpers
    imgAttr(element) {
      if (element.hasAttr("data-lazy-src")) return element.attr("abs:data-lazy-src");
      if (element.hasAttr("data-src")) return element.attr("abs:data-src");
      if (element.hasAttr("data-cfsrc")) return element.attr("abs:data-cfsrc");
      return element.attr("abs:src");
    }
    imgAttrOf(elements) {
      const first = elements.first();
      return first ? this.imgAttr(first) : "";
    }
  };

  // src/en/asterscans/index.ts
  var AsterScans = class extends MangaThemesia {
    constructor() {
      super(...arguments);
      this.name = "Aster Scans";
      this.lang = "en";
      this.baseUrl = "https://asterscans.com";
    }
  };
  var index_default = defineExtension([new AsterScans()]);
  return __toCommonJS(index_exports);
})();
