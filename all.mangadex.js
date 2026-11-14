// MangaDex 2 for tachiyomi-ios. Ported from keiyoushi/extensions-source (Apache-2.0).
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

  // src/all/mangadex/index.ts
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
  function parseIsoDate(text) {
    const time = Date.parse(text);
    return Number.isNaN(time) ? 0 : time;
  }

  // sdk/src/filterCache.ts
  var MAX_AGE_MS = 3 * 24 * 60 * 60 * 1e3;

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
  var Select = class extends Filter {
    constructor(name, values, state = 0) {
      super(name, state);
      this.values = values;
    }
    toJSON() {
      return { type: "select", name: this.name, values: this.values.map(String), state: this.state };
    }
  };
  var CheckBox = class extends Filter {
    constructor(name, state = false) {
      super(name, state);
    }
    toJSON() {
      return { type: "checkbox", name: this.name, state: this.state };
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
  var Sort = class extends Filter {
    constructor(name, values, state = null) {
      super(name, state);
      this.values = values;
    }
    toJSON() {
      return { type: "sort", name: this.name, values: this.values, state: this.state };
    }
  };
  function applyFilterStates(filters, json) {
    filters.forEach((filter, index) => {
      const state = json[index];
      if (state && state.type === filter.toJSON().type) filter.applyJSON(state);
    });
    return filters;
  }

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
    constructor(mangas, hasNextPage2) {
      this.mangas = mangas;
      this.hasNextPage = hasNextPage2;
    }
  };
  var SMangaUpdate = class {
    constructor(manga, chapters) {
      this.manga = manga;
      this.chapters = chapters;
    }
  };

  // sdk/src/preferences.ts
  var Preference = class {
    constructor(options) {
      this.key = options.key;
      this.title = options.title;
      this.summary = options.summary ?? "";
      this.defaultValue = options.defaultValue;
    }
  };
  var SwitchPreferenceCompat = class extends Preference {
    toJSON() {
      return { type: "toggle", key: this.key, title: this.title, summary: this.summary, default: this.defaultValue };
    }
  };
  var ListPreference = class extends Preference {
    constructor(options) {
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
        default: this.defaultValue
      };
    }
  };
  var MultiSelectListPreference = class extends Preference {
    constructor(options) {
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
        default: this.defaultValue
      };
    }
  };
  var EditTextPreference = class extends Preference {
    toJSON() {
      return { type: "text", key: this.key, title: this.title, summary: this.summary, default: this.defaultValue };
    }
  };
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

  // src/all/mangadex/constants.ts
  var uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/;
  var uuidOnlyRegex = new RegExp(`^${uuidRegex.source}$`);
  var isUuid = (text) => uuidOnlyRegex.test(text);
  var containsUuid = (text) => uuidRegex.test(text);
  var MANGA_LIMIT = 20;
  var LATEST_CHAPTER_LIMIT = 100;
  var ALL_LANGUAGES = "all";
  var LEGACY_NO_GROUP_ID = "00e03853-1b96-4f41-9542-c71b8692033b";
  var CDN_URL = "https://uploads.mangadex.org";
  var API_URL = "https://api.mangadex.org";
  var API_MANGA_URL = `${API_URL}/manga`;
  var API_CHAPTER_URL = `${API_URL}/chapter`;
  var API_LIST_URL = `${API_URL}/list`;
  var MD_AT_HOME_TOKEN_LIFESPAN = 5 * 6e4;
  var PREFIX_ID_SEARCH = "id:";
  var PREFIX_CH_SEARCH = "ch:";
  var PREFIX_GRP_SEARCH = "grp:";
  var PREFIX_AUTHOR_SEARCH = "author:";
  var PREFIX_USER_SEARCH = "usr:";
  var PREFIX_LIST_SEARCH = "list:";
  var pathToSearchPrefix = {
    manga: PREFIX_ID_SEARCH,
    title: PREFIX_ID_SEARCH,
    chapter: PREFIX_CH_SEARCH,
    group: PREFIX_GRP_SEARCH,
    author: PREFIX_AUTHOR_SEARCH,
    user: PREFIX_USER_SEARCH,
    list: PREFIX_LIST_SEARCH
  };
  var getCoverQualityPreferenceKey = (dexLang) => `thumbnailQuality_${dexLang}`;
  var getCoverQualityPreferenceEntries = (intl) => [intl.get("cover_quality_original"), intl.get("cover_quality_medium"), intl.get("cover_quality_low")];
  var getCoverQualityPreferenceEntryValues = () => ["", ".512.jpg", ".256.jpg"];
  var getCoverQualityPreferenceDefaultValue = () => getCoverQualityPreferenceEntryValues()[0];
  var getDataSaverPreferenceKey = (dexLang) => `dataSaverV5_${dexLang}`;
  var getStandardHttpsPreferenceKey = (dexLang) => `usePort443_${dexLang}`;
  var CONTENT_RATING_PREF_VAL_SAFE = "safe";
  var CONTENT_RATING_PREF_VAL_SUGGESTIVE = "suggestive";
  var CONTENT_RATING_PREF_VAL_EROTICA = "erotica";
  var CONTENT_RATING_PREF_VAL_PORNOGRAPHIC = "pornographic";
  var contentRatingPrefDefaults = [CONTENT_RATING_PREF_VAL_SAFE, CONTENT_RATING_PREF_VAL_SUGGESTIVE];
  var allContentRatings = [CONTENT_RATING_PREF_VAL_SAFE, CONTENT_RATING_PREF_VAL_SUGGESTIVE, CONTENT_RATING_PREF_VAL_EROTICA, CONTENT_RATING_PREF_VAL_PORNOGRAPHIC];
  var getContentRatingPrefKey = (dexLang) => `contentRating_${dexLang}`;
  var JAPANESE = "ja";
  var CHINESE = "zh";
  var KOREAN = "ko";
  var ENGLISH = "en";
  var ORIGINAL_LANGUAGE_PREF_VAL_JAPANESE = JAPANESE;
  var ORIGINAL_LANGUAGE_PREF_VAL_CHINESE = CHINESE;
  var ORIGINAL_LANGUAGE_PREF_VAL_CHINESE_HK = "zh-hk";
  var ORIGINAL_LANGUAGE_PREF_VAL_KOREAN = KOREAN;
  var originalLanguagePrefDefaults = [];
  var getOriginalLanguagePrefKey = (dexLang) => `originalLanguage_${dexLang}`;
  var GROUP_AZUKI = "5fed0576-8b94-4f9a-b6a7-08eecd69800d";
  var GROUP_BILIBILI = "06a9fecb-b608-4f19-b93c-7caab06b7f44";
  var GROUP_COMIKEY = "8d8ecf83-8d42-4f8c-add8-60963f9f28d9";
  var GROUP_INKR = "caa63201-4a17-4b7f-95ff-ed884a2b7e60";
  var GROUP_MANGA_HOT = "319c1b10-cbd0-4f55-a46e-c4ee17e65139";
  var GROUP_MANGA_PLUS = "4f1de6a2-f0c5-4ac5-bce5-02c7dbb67deb";
  var defaultBlockedGroups = [GROUP_AZUKI, GROUP_BILIBILI, GROUP_COMIKEY, GROUP_INKR, GROUP_MANGA_HOT, GROUP_MANGA_PLUS];
  var getBlockedGroupsPrefKey = (dexLang) => `blockedGroups_${dexLang}`;
  var getBlockedUploaderPrefKey = (dexLang) => `blockedUploader_${dexLang}`;
  var TRY_USING_FIRST_VOLUME_COVER_DEFAULT = false;
  var getTryUsingFirstVolumeCoverPrefKey = (dexLang) => `tryUsingFirstVolumeCover_${dexLang}`;
  var getAltTitlesInDescPrefKey = (dexLang) => `altTitlesInDesc_${dexLang}`;
  var getPreferExtensionLangTitlePrefKey = (dexLang) => `preferExtensionLangTitle_${dexLang}`;
  var getFinalChapterInDescPrefKey = (dexLang) => `finalChapterInDesc_${dexLang}`;
  var getIncludeUnavailablePrefKey = (dexLang) => `includeUnavailable_${dexLang}`;
  var TAG_GROUPS_ORDER = ["content", "format", "genre", "theme"];
  var TAG_ANTHOLOGY_UUID = "51d83883-4103-437c-b4b1-731cb73d786c";
  var TAG_ONE_SHOT_UUID = "0234a31e-a729-4e28-9d6a-3f87c4966b9e";
  var romanizedLangCodes = {
    [JAPANESE]: "ja-ro",
    [KOREAN]: "ko-ro",
    [CHINESE]: "zh-ro",
    "zh-hk": "zh-ro"
  };
  var LANGUAGE_NAMES = {
    en: { ja: "Japanese", zh: "Chinese", ko: "Korean" },
    es: { ja: "Japonés", zh: "Chino", ko: "Coreano" },
    "pt-BR": { ja: "Japonês", zh: "Chinês", ko: "Coreano" },
    ru: { ja: "Японский", zh: "Китайский", ko: "Корейский" }
  };
  function languageDisplayName(intl, code) {
    const language = intl.language === "pt-BR" || intl.language === "pt" ? "pt-BR" : intl.language.split("-")[0];
    return (LANGUAGE_NAMES[language] ?? LANGUAGE_NAMES.en)[code] ?? LANGUAGE_NAMES.en[code] ?? code;
  }
  var ORIGINAL_LANGUAGE_NAMES = {
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    "zh-hk": "Chinese (Hong Kong)",
    en: "English",
    ar: "Arabic",
    bg: "Bulgarian",
    bn: "Bangla",
    ca: "Catalan",
    cs: "Czech",
    da: "Danish",
    de: "German",
    el: "Greek",
    eo: "Esperanto",
    es: "Spanish",
    "es-la": "Spanish (Latin America)",
    et: "Estonian",
    fa: "Persian",
    fi: "Finnish",
    fr: "French",
    he: "Hebrew",
    hi: "Hindi",
    hr: "Croatian",
    hu: "Hungarian",
    id: "Indonesian",
    it: "Italian",
    ka: "Georgian",
    kk: "Kazakh",
    la: "Latin",
    lt: "Lithuanian",
    mn: "Mongolian",
    ms: "Malay",
    my: "Burmese",
    ne: "Nepali",
    nl: "Dutch",
    no: "Norwegian",
    pl: "Polish",
    pt: "Portuguese",
    "pt-br": "Portuguese (Brazil)",
    ro: "Romanian",
    ru: "Russian",
    sk: "Slovak",
    sr: "Serbian",
    sv: "Swedish",
    ta: "Tamil",
    th: "Thai",
    tl: "Tagalog",
    tr: "Turkish",
    uk: "Ukrainian",
    ur: "Urdu",
    uz: "Uzbek",
    vi: "Vietnamese"
  };

  // src/all/mangadex/dto.ts
  var MANGA = "manga";
  var COVER_ART = "cover_art";
  var SCANLATION_GROUP = "scanlation_group";
  var USER = "user";
  var AUTHOR = "author";
  var ARTIST = "artist";
  function relationshipsOfType(entity, type) {
    return (entity.relationships ?? []).filter((relationship) => relationship.type === type);
  }
  function firstRelationship(entity, type) {
    return relationshipsOfType(entity, type)[0] ?? null;
  }
  function hasNextPage(page) {
    return (page.limit ?? 0) + (page.offset ?? 0) < (page.total ?? 0);
  }
  function localized(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).map(([key, text]) => [key, typeof text === "string" ? text : ""]));
  }
  function isInvalid(attributes) {
    return attributes.externalUrl != null && (attributes.pages === 0 || attributes.pages === 1 && attributes.updatedAt !== attributes.readableAt);
  }

  // src/all/mangadex/filters.ts
  var isUrlQueryFilter = (filter) => typeof filter.addQueryParameter === "function";
  var HasAvailableChaptersFilter = class extends CheckBox {
    constructor(intl) {
      super(intl.get("has_available_chapters"));
    }
    addQueryParameter(url, dexLang) {
      if (this.state) {
        url.addQueryParameter("hasAvailableChapters", "true");
        if (dexLang !== ALL_LANGUAGES) url.addQueryParameter("availableTranslatedLanguage[]", dexLang);
      }
    }
  };
  var OriginalLanguage = class extends CheckBox {
    constructor(name, isoCode, state = false) {
      super(name, state);
      this.isoCode = isoCode;
    }
  };
  var OriginalLanguageList = class extends Group {
    constructor(intl, originalLanguage) {
      super(intl.get("original_language"), originalLanguage);
    }
    addQueryParameter(url) {
      for (const lang of this.state.filter((language) => language.state)) {
        if (lang.isoCode === ORIGINAL_LANGUAGE_PREF_VAL_CHINESE) url.addQueryParameter("originalLanguage[]", ORIGINAL_LANGUAGE_PREF_VAL_CHINESE_HK);
        url.addQueryParameter("originalLanguage[]", lang.isoCode);
      }
    }
  };
  function getOriginalLanguage(preferences, dexLang, intl) {
    const originalLanguages2 = preferences.getStringSet(getOriginalLanguagePrefKey(dexLang), []);
    return [
      new OriginalLanguage(intl.format("original_language_filter_japanese", languageDisplayName(intl, JAPANESE)), ORIGINAL_LANGUAGE_PREF_VAL_JAPANESE, originalLanguages2.has(ORIGINAL_LANGUAGE_PREF_VAL_JAPANESE)),
      new OriginalLanguage(intl.format("original_language_filter_chinese", languageDisplayName(intl, CHINESE)), ORIGINAL_LANGUAGE_PREF_VAL_CHINESE, originalLanguages2.has(ORIGINAL_LANGUAGE_PREF_VAL_CHINESE)),
      new OriginalLanguage(intl.format("original_language_filter_korean", languageDisplayName(intl, KOREAN)), ORIGINAL_LANGUAGE_PREF_VAL_KOREAN, originalLanguages2.has(ORIGINAL_LANGUAGE_PREF_VAL_KOREAN))
    ];
  }
  var ValueCheck = class extends CheckBox {
    constructor(name, value, state = false) {
      super(name, state);
      this.value = value;
    }
  };
  var ContentRatingList = class extends Group {
    constructor(intl, contentRating2) {
      super(intl.get("content_rating"), contentRating2);
    }
    addQueryParameter(url) {
      for (const rating of this.state.filter((box) => box.state)) url.addQueryParameter("contentRating[]", rating.value);
    }
  };
  function getContentRating(preferences, dexLang, intl) {
    const contentRatings = preferences.getStringSet(getContentRatingPrefKey(dexLang), contentRatingPrefDefaults);
    return [
      new ValueCheck(intl.get("content_rating_safe"), "safe", contentRatings.has(CONTENT_RATING_PREF_VAL_SAFE)),
      new ValueCheck(intl.get("content_rating_suggestive"), "suggestive", contentRatings.has(CONTENT_RATING_PREF_VAL_SUGGESTIVE)),
      new ValueCheck(intl.get("content_rating_erotica"), "erotica", contentRatings.has(CONTENT_RATING_PREF_VAL_EROTICA)),
      new ValueCheck(intl.get("content_rating_pornographic"), "pornographic", contentRatings.has(CONTENT_RATING_PREF_VAL_PORNOGRAPHIC))
    ];
  }
  var DemographicList = class extends Group {
    constructor(intl, demographics) {
      super(intl.get("publication_demographic"), demographics);
    }
    addQueryParameter(url) {
      for (const demographic of this.state.filter((box) => box.state)) url.addQueryParameter("publicationDemographic[]", demographic.value);
    }
  };
  var getDemographics = (intl) => [
    new ValueCheck(intl.get("publication_demographic_none"), "none"),
    new ValueCheck(intl.get("publication_demographic_shounen"), "shounen"),
    new ValueCheck(intl.get("publication_demographic_shoujo"), "shoujo"),
    new ValueCheck(intl.get("publication_demographic_seinen"), "seinen"),
    new ValueCheck(intl.get("publication_demographic_josei"), "josei")
  ];
  var StatusList = class extends Group {
    constructor(intl, status) {
      super(intl.get("status"), status);
    }
    addQueryParameter(url) {
      for (const status of this.state.filter((box) => box.state)) url.addQueryParameter("status[]", status.value);
    }
  };
  var getStatus = (intl) => [
    new ValueCheck(intl.get("status_ongoing"), "ongoing"),
    new ValueCheck(intl.get("status_completed"), "completed"),
    new ValueCheck(intl.get("status_hiatus"), "hiatus"),
    new ValueCheck(intl.get("status_cancelled"), "cancelled")
  ];
  var getSortables = (intl) => [
    { title: intl.get("sort_alphabetic"), value: "title" },
    { title: intl.get("sort_chapter_uploaded_at"), value: "latestUploadedChapter" },
    { title: intl.get("sort_number_of_follows"), value: "followedCount" },
    { title: intl.get("sort_content_created_at"), value: "createdAt" },
    { title: intl.get("sort_content_info_updated_at"), value: "updatedAt" },
    { title: intl.get("sort_relevance"), value: "relevance" },
    { title: intl.get("sort_year"), value: "year" },
    { title: intl.get("sort_rating"), value: "rating" }
  ];
  var SortFilter = class extends Sort {
    constructor(intl, sortables) {
      super(
        intl.get("sort"),
        sortables.map((sortable) => sortable.title),
        { index: 5, ascending: false }
      );
      this.sortables = sortables;
    }
    addQueryParameter(url) {
      if (this.state != null) {
        const query = this.sortables[this.state.index]?.value;
        if (!query) return;
        url.addQueryParameter(`order[${query}]`, this.state.ascending ? "asc" : "desc");
      }
    }
  };
  function formatNoOffset(date) {
    return date.toISOString().slice(0, 19);
  }
  var DaysSinceFilter = class extends Select {
    constructor(name, queryParam, options) {
      super(
        name,
        options.map(([label]) => label)
      );
      this.queryParam = queryParam;
      this.options = options;
    }
    addQueryParameter(url) {
      const days = this.options[this.state]?.[1] ?? 0;
      if (days <= 0) return;
      const since = new Date(Date.now() - days * 864e5);
      since.setUTCMinutes(0, 0, 0);
      url.addQueryParameter(this.queryParam, formatNoOffset(since));
    }
  };
  var Tag = class extends TriState {
    constructor(id, name) {
      super(name);
      this.id = id;
    }
  };
  var TagList = class extends Group {
    addQueryParameter(url) {
      for (const tag of this.state) {
        if (tag.isIncluded()) url.addQueryParameter("includedTags[]", tag.id);
        else if (tag.isExcluded()) url.addQueryParameter("excludedTags[]", tag.id);
      }
    }
  };
  function compareNames(a, b) {
    const left = a.toLowerCase();
    const right = b.toLowerCase();
    return left < right ? -1 : left > right ? 1 : 0;
  }
  function sortIfTranslated(tags, intl) {
    if (intl.language === ENGLISH) return tags;
    return [...tags].sort((a, b) => compareNames(a.name, b.name));
  }
  var getContents = (intl) => sortIfTranslated(
    [new Tag("b29d6a3d-1569-4e7a-8caf-7557bc92cd5d", intl.get("content_gore")), new Tag("97893a4c-12af-4dac-b6be-0dffb353568e", intl.get("content_sexual_violence"))],
    intl
  );
  var getFormats = (intl) => sortIfTranslated(
    [
      new Tag("b11fda93-8f1d-4bef-b2ed-8803d3733170", intl.get("format_yonkoma")),
      new Tag("f4122d1c-3b44-44d0-9936-ff7502c39ad3", intl.get("format_adaptation")),
      new Tag("51d83883-4103-437c-b4b1-731cb73d786c", intl.get("format_anthology")),
      new Tag("0a39b5a1-b235-4886-a747-1d05d216532d", intl.get("format_award_winning")),
      new Tag("b13b2a48-c720-44a9-9c77-39c9979373fb", intl.get("format_doujinshi")),
      new Tag("7b2ce280-79ef-4c09-9b58-12b7c23a9b78", intl.get("format_fan_colored")),
      new Tag("f5ba408b-0e7a-484d-8d49-4e9125ac96de", intl.get("format_full_color")),
      new Tag("3e2b8dae-350e-4ab8-a8ce-016e844b9f0d", intl.get("format_long_strip")),
      new Tag("320831a8-4026-470b-94f6-8353740e6f04", intl.get("format_official_colored")),
      new Tag("0234a31e-a729-4e28-9d6a-3f87c4966b9e", intl.get("format_oneshot")),
      new Tag("891cf039-b895-47f0-9229-bef4c96eccd4", intl.get("format_user_created")),
      new Tag("e197df38-d0e7-43b5-9b09-2842d0c326dd", intl.get("format_web_comic"))
    ],
    intl
  );
  var getGenres = (intl) => sortIfTranslated(
    [
      new Tag("391b0423-d847-456f-aff0-8b0cfc03066b", intl.get("genre_action")),
      new Tag("87cc87cd-a395-47af-b27a-93258283bbc6", intl.get("genre_adventure")),
      new Tag("5920b825-4181-4a17-beeb-9918b0ff7a30", intl.get("genre_boys_love")),
      new Tag("4d32cc48-9f00-4cca-9b5a-a839f0764984", intl.get("genre_comedy")),
      new Tag("5ca48985-9a9d-4bd8-be29-80dc0303db72", intl.get("genre_crime")),
      new Tag("b9af3a63-f058-46de-a9a0-e0c13906197a", intl.get("genre_drama")),
      new Tag("cdc58593-87dd-415e-bbc0-2ec27bf404cc", intl.get("genre_fantasy")),
      new Tag("a3c67850-4684-404e-9b7f-c69850ee5da6", intl.get("genre_girls_love")),
      new Tag("33771934-028e-4cb3-8744-691e866a923e", intl.get("genre_historical")),
      new Tag("cdad7e68-1419-41dd-bdce-27753074a640", intl.get("genre_horror")),
      new Tag("ace04997-f6bd-436e-b261-779182193d3d", intl.get("genre_isekai")),
      new Tag("81c836c9-914a-4eca-981a-560dad663e73", intl.get("genre_magical_girls")),
      new Tag("50880a9d-5440-4732-9afb-8f457127e836", intl.get("genre_mecha")),
      new Tag("c8cbe35b-1b2b-4a3f-9c37-db84c4514856", intl.get("genre_medical")),
      new Tag("ee968100-4191-4968-93d3-f82d72be7e46", intl.get("genre_mystery")),
      new Tag("b1e97889-25b4-4258-b28b-cd7f4d28ea9b", intl.get("genre_philosophical")),
      new Tag("423e2eae-a7a2-4a8b-ac03-a8351462d71d", intl.get("genre_romance")),
      new Tag("256c8bd9-4904-4360-bf4f-508a76d67183", intl.get("genre_sci_fi")),
      new Tag("e5301a23-ebd9-49dd-a0cb-2add944c7fe9", intl.get("genre_slice_of_life")),
      new Tag("69964a64-2f90-4d33-beeb-f3ed2875eb4c", intl.get("genre_sports")),
      new Tag("7064a261-a137-4d3a-8848-2d385de3a99c", intl.get("genre_superhero")),
      new Tag("07251805-a27e-4d59-b488-f0bfbec15168", intl.get("genre_thriller")),
      new Tag("f8f62932-27da-4fe4-8ee1-6779a8c5edba", intl.get("genre_tragedy")),
      new Tag("acc803a4-c95a-4c22-86fc-eb6b582d82a2", intl.get("genre_wuxia"))
    ],
    intl
  );
  var getThemes = (intl) => sortIfTranslated(
    [
      new Tag("e64f6742-c834-471d-8d72-dd51fc02b835", intl.get("theme_aliens")),
      new Tag("3de8c75d-8ee3-48ff-98ee-e20a65c86451", intl.get("theme_animals")),
      new Tag("ea2bc92d-1c26-4930-9b7c-d5c0dc1b6869", intl.get("theme_cooking")),
      new Tag("9ab53f92-3eed-4e9b-903a-917c86035ee3", intl.get("theme_crossdressing")),
      new Tag("da2d50ca-3018-4cc0-ac7a-6b7d472a29ea", intl.get("theme_delinquents")),
      new Tag("39730448-9a5f-48a2-85b0-a70db87b1233", intl.get("theme_demons")),
      new Tag("2bd2e8d0-f146-434a-9b51-fc9ff2c5fe6a", intl.get("theme_gender_swap")),
      new Tag("3bb26d85-09d5-4d2e-880c-c34b974339e9", intl.get("theme_ghosts")),
      new Tag("fad12b5e-68ba-460e-b933-9ae8318f5b65", intl.get("theme_gyaru")),
      new Tag("aafb99c1-7f60-43fa-b75f-fc9502ce29c7", intl.get("theme_harem")),
      new Tag("5bd0e105-4481-44ca-b6e7-7544da56b1a3", intl.get("theme_incest")),
      new Tag("2d1f5d56-a1e5-4d0d-a961-2193588b08ec", intl.get("theme_loli")),
      new Tag("85daba54-a71c-4554-8a28-9901a8b0afad", intl.get("theme_mafia")),
      new Tag("a1f53773-c69a-4ce5-8cab-fffcd90b1565", intl.get("theme_magic")),
      new Tag("799c202e-7daa-44eb-9cf7-8a3c0441531e", intl.get("theme_martial_arts")),
      new Tag("ac72833b-c4e9-4878-b9db-6c8a4a99444a", intl.get("theme_military")),
      new Tag("dd1f77c5-dea9-4e2b-97ae-224af09caf99", intl.get("theme_monster_girls")),
      new Tag("36fd93ea-e8b8-445e-b836-358f02b3d33d", intl.get("theme_monsters")),
      new Tag("f42fbf9e-188a-447b-9fdc-f19dc1e4d685", intl.get("theme_music")),
      new Tag("489dd859-9b61-4c37-af75-5b18e88daafc", intl.get("theme_ninja")),
      new Tag("92d6d951-ca5e-429c-ac78-451071cbf064", intl.get("theme_office_workers")),
      new Tag("df33b754-73a3-4c54-80e6-1a74a8058539", intl.get("theme_police")),
      new Tag("9467335a-1b83-4497-9231-765337a00b96", intl.get("theme_post_apocalyptic")),
      new Tag("3b60b75c-a2d7-4860-ab56-05f391bb889c", intl.get("theme_psychological")),
      new Tag("0bc90acb-ccc1-44ca-a34a-b9f3a73259d0", intl.get("theme_reincarnation")),
      new Tag("65761a2a-415e-47f3-bef2-a9dababba7a6", intl.get("theme_reverse_harem")),
      new Tag("81183756-1453-4c81-aa9e-f6e1b63be016", intl.get("theme_samurai")),
      new Tag("caaa44eb-cd40-4177-b930-79d3ef2afe87", intl.get("theme_school_life")),
      new Tag("ddefd648-5140-4e5f-ba18-4eca4071d19b", intl.get("theme_shota")),
      new Tag("eabc5b4c-6aff-42f3-b657-3e90cbd00b75", intl.get("theme_supernatural")),
      new Tag("5fff9cde-849c-4d78-aab0-0d52b2ee1d25", intl.get("theme_survival")),
      new Tag("292e862b-2d17-4062-90a2-0356caa4ae27", intl.get("theme_time_travel")),
      new Tag("31932a7e-5b8e-49a6-9f12-2afa39dc544c", intl.get("theme_traditional_games")),
      new Tag("d7d1730f-6eb0-4ba6-9437-602cac38664c", intl.get("theme_vampires")),
      new Tag("9438db5a-7e2a-4ac0-b39e-e0d95a34b8a8", intl.get("theme_video_games")),
      new Tag("d14322ac-4d6f-4e9b-afd9-629d5f4d8a41", intl.get("theme_villainess")),
      new Tag("8c86611e-fab7-4986-9dec-d1a2f44acdd5", intl.get("theme_virtual_reality")),
      new Tag("631ef465-9aba-4afb-b0fc-ea10efe274a8", intl.get("theme_zombies"))
    ],
    intl
  );
  var getTags = (intl) => [...getContents(intl), ...getFormats(intl), ...getGenres(intl), ...getThemes(intl)];
  var getTagModes = (intl) => [
    { title: intl.get("mode_and"), value: "AND" },
    { title: intl.get("mode_or"), value: "OR" }
  ];
  var TagModeSelect = class extends Select {
    constructor(name, param, modes, state) {
      super(
        name,
        modes.map((mode) => mode.title),
        state
      );
      this.param = param;
      this.modes = modes;
    }
    addQueryParameter(url) {
      url.addQueryParameter(this.param, this.modes[this.state]?.value ?? this.modes[0].value);
    }
  };
  var TagsFilter = class extends Group {
    constructor(intl) {
      super(intl.get("tags_mode"), [
        new TagModeSelect(intl.get("included_tags_mode"), "includedTagsMode", getTagModes(intl), 0),
        new TagModeSelect(intl.get("excluded_tags_mode"), "excludedTagsMode", getTagModes(intl), 1)
      ]);
    }
    addQueryParameter(url, dexLang) {
      for (const filter of this.state) filter.addQueryParameter(url);
      void dexLang;
    }
  };
  function getMDFilterList(preferences, dexLang, intl) {
    return [
      new HasAvailableChaptersFilter(intl),
      new OriginalLanguageList(intl, getOriginalLanguage(preferences, dexLang, intl)),
      new ContentRatingList(intl, getContentRating(preferences, dexLang, intl)),
      new DemographicList(intl, getDemographics(intl)),
      new StatusList(intl, getStatus(intl)),
      new SortFilter(intl, getSortables(intl)),
      new DaysSinceFilter(intl.get("created_at"), "createdAtSince", [
        [intl.get("created_at_any"), 0],
        [intl.get("created_at_day"), 1],
        [intl.get("created_at_week"), 7],
        [intl.get("created_at_month"), 30],
        [intl.get("created_at_year"), 365]
      ]),
      new TagsFilter(intl),
      new TagList(intl.get("content"), getContents(intl)),
      new TagList(intl.get("format"), getFormats(intl)),
      new TagList(intl.get("genre"), getGenres(intl)),
      new TagList(intl.get("theme"), getThemes(intl))
    ];
  }
  function addFiltersToUrl(url, filters, dexLang) {
    for (const filter of filters) if (isUrlQueryFilter(filter)) filter.addQueryParameter(url, dexLang);
    return url;
  }

  // src/all/mangadex/api.ts
  function addAll(url, name, values) {
    for (const value of values ?? []) url.addQueryParameter(name, value);
    return url;
  }
  var getMangaListOffset = (page) => String(MANGA_LIMIT * (page - 1));
  var getLatestChapterOffset = (page) => String(LATEST_CHAPTER_LIMIT * (page - 1));
  function popularMangaUrl(page, prefs) {
    const url = toHttpUrl(API_MANGA_URL).newBuilder();
    url.addQueryParameter("order[followedCount]", "desc");
    url.addQueryParameter("hasAvailableChapters", "true");
    addAll(url, "availableTranslatedLanguage[]", prefs.translatedLanguages);
    url.addQueryParameter("limit", String(MANGA_LIMIT));
    url.addQueryParameter("offset", getMangaListOffset(page));
    url.addQueryParameter("includes[]", COVER_ART);
    addAll(url, "contentRating[]", prefs.contentRating);
    addAll(url, "originalLanguage[]", prefs.originalLanguages);
    const now = /* @__PURE__ */ new Date();
    url.addQueryParameter("createdAtSince", formatNoOffset(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 30))));
    return url.build();
  }
  function latestUpdatesUrl(page, prefs) {
    const url = toHttpUrl(API_CHAPTER_URL).newBuilder();
    url.addQueryParameter("offset", getLatestChapterOffset(page));
    url.addQueryParameter("limit", String(LATEST_CHAPTER_LIMIT));
    addAll(url, "translatedLanguage[]", prefs.translatedLanguages);
    url.addQueryParameter("order[publishAt]", "desc");
    url.addQueryParameter("includeFutureUpdates", "0");
    addAll(url, "originalLanguage[]", prefs.originalLanguages);
    addAll(url, "contentRating[]", prefs.contentRating);
    addAll(url, "excludedGroups[]", /* @__PURE__ */ new Set([...defaultBlockedGroups, ...prefs.blockedGroups]));
    addAll(url, "excludedUploaders[]", prefs.blockedUploaders);
    url.addQueryParameter("includeFuturePublishAt", "0");
    url.addQueryParameter("includeEmptyPages", "0");
    return url.build();
  }
  function mangaByIdsUrl(mangaIds, contentRating2) {
    const url = toHttpUrl(API_MANGA_URL).newBuilder();
    url.addQueryParameter("includes[]", COVER_ART);
    url.addQueryParameter("limit", String(mangaIds.length));
    addAll(url, "contentRating[]", contentRating2);
    addAll(url, "ids[]", mangaIds);
    return url.build();
  }
  var chapterUrl = (chapterId) => `${API_CHAPTER_URL}/${chapterId}`;
  var listUrl = (listId) => `${API_LIST_URL}/${listId}`;
  function searchMangaUrl(page, query, filters, dexLang, intl) {
    if (query.startsWith(PREFIX_ID_SEARCH)) {
      const mangaId = query.slice(PREFIX_ID_SEARCH.length);
      if (!containsUuid(mangaId)) throw new Error(intl.get("invalid_manga_id"));
      const url = toHttpUrl(API_MANGA_URL).newBuilder();
      url.addQueryParameter("ids[]", mangaId);
      url.addQueryParameter("includes[]", COVER_ART);
      addAll(url, "contentRating[]", allContentRatings);
      return url.build();
    }
    const tempUrl = toHttpUrl(API_MANGA_URL).newBuilder();
    tempUrl.addQueryParameter("limit", String(MANGA_LIMIT));
    tempUrl.addQueryParameter("offset", getMangaListOffset(page));
    tempUrl.addQueryParameter("includes[]", COVER_ART);
    if (query.startsWith(PREFIX_GRP_SEARCH)) {
      const groupId = query.slice(PREFIX_GRP_SEARCH.length);
      if (!containsUuid(groupId)) throw new Error(intl.get("invalid_group_id"));
      tempUrl.addQueryParameter("group", groupId);
    } else if (query.startsWith(PREFIX_AUTHOR_SEARCH)) {
      const authorId = query.slice(PREFIX_AUTHOR_SEARCH.length);
      if (!containsUuid(authorId)) throw new Error(intl.get("invalid_author_id"));
      tempUrl.addQueryParameter("authorOrArtist", authorId);
    } else {
      const actualQuery = query.replace(/\s/g, " ");
      if (actualQuery.trim() !== "") tempUrl.addQueryParameter("title", actualQuery);
    }
    return addFiltersToUrl(tempUrl, filters, dexLang).build();
  }
  function listMangaUrl(ids, filters, dexLang) {
    const tempUrl = toHttpUrl(API_MANGA_URL).newBuilder();
    tempUrl.addQueryParameter("limit", String(MANGA_LIMIT));
    tempUrl.addQueryParameter("offset", "0");
    tempUrl.addQueryParameter("includes[]", COVER_ART);
    addAll(tempUrl, "ids[]", ids);
    return addFiltersToUrl(tempUrl, filters, dexLang).build();
  }
  function searchMangaUploaderUrl(page, uploader, prefs) {
    const url = toHttpUrl(API_CHAPTER_URL).newBuilder();
    url.addQueryParameter("offset", getLatestChapterOffset(page));
    url.addQueryParameter("limit", String(LATEST_CHAPTER_LIMIT));
    addAll(url, "translatedLanguage[]", prefs.translatedLanguages);
    url.addQueryParameter("order[publishAt]", "desc");
    url.addQueryParameter("includeFutureUpdates", "0");
    url.addQueryParameter("includeFuturePublishAt", "0");
    url.addQueryParameter("includeEmptyPages", "0");
    url.addQueryParameter("uploader", uploader);
    addAll(url, "originalLanguage[]", prefs.originalLanguages);
    addAll(url, "contentRating[]", prefs.contentRating);
    addAll(url, "excludedGroups[]", /* @__PURE__ */ new Set([...defaultBlockedGroups, ...prefs.blockedGroups]));
    addAll(url, "excludedUploaders[]", prefs.blockedUploaders);
    return url.build();
  }
  function mangaDetailsUrl(mangaId) {
    const url = toHttpUrl(`${API_URL}/manga/${mangaId}`).newBuilder();
    url.addQueryParameter("includes[]", COVER_ART);
    url.addQueryParameter("includes[]", AUTHOR);
    url.addQueryParameter("includes[]", ARTIST);
    return url.build();
  }
  function aggregateUrl(mangaId, translatedLanguages) {
    const url = toHttpUrl(`${API_MANGA_URL}/${mangaId}/aggregate`).newBuilder();
    addAll(url, "translatedLanguage[]", translatedLanguages);
    return url.build();
  }
  function coverListUrl(mangaIds, locales, limit) {
    const apiUrl = toHttpUrl(`${API_URL}/cover`).newBuilder();
    apiUrl.addQueryParameter("order[volume]", "asc");
    addAll(apiUrl, "manga[]", mangaIds);
    addAll(apiUrl, "locales[]", locales);
    apiUrl.addQueryParameter("limit", String(limit));
    apiUrl.addQueryParameter("offset", "0");
    return apiUrl.build();
  }
  function paginatedChapterListUrl(mangaId, offset, prefs, includeUnavailable2) {
    const url = toHttpUrl(`${API_MANGA_URL}/${mangaId}/feed`).newBuilder();
    url.addQueryParameter("includes[]", SCANLATION_GROUP);
    url.addQueryParameter("includes[]", USER);
    url.addQueryParameter("limit", "500");
    url.addQueryParameter("offset", String(offset));
    url.addQueryParameter("order[volume]", "desc");
    url.addQueryParameter("order[chapter]", "desc");
    url.addQueryParameter("includeFuturePublishAt", "0");
    addAll(url, "translatedLanguage[]", prefs.translatedLanguages);
    addAll(url, "contentRating[]", allContentRatings);
    addAll(url, "excludedGroups[]", prefs.blockedGroups);
    addAll(url, "excludedUploaders[]", prefs.blockedUploaders);
    url.addQueryParameter("includeUnavailable", includeUnavailable2 ? "1" : "0");
    return url.build();
  }
  function atHomeServerUrl(chapterId, forceStandardHttps2) {
    return forceStandardHttps2 ? `${API_URL}/at-home/server/${chapterId}?forcePort443=true` : `${API_URL}/at-home/server/${chapterId}`;
  }

  // src/all/mangadex/intl.ts
  var messages = {
    "en": {
      alternative_titles: "Alternative titles:",
      alternative_titles_in_description: "Alternative titles in description",
      alternative_titles_in_description_summary: "Include a manga's alternative titles at the end of its description",
      block_group_by_uuid: "Block groups by UUID",
      block_group_by_uuid_summary: "Chapters from blocked groups will not show up in Latest or Manga feed. Enter as a Comma-separated list of group UUIDs",
      block_uploader_by_uuid: "Block uploader by UUID",
      block_uploader_by_uuid_summary: "Chapters from blocked uploaders will not show up in Latest or Manga feed. Enter as a Comma-separated list of uploader UUIDs",
      chapter_unavailable_prefix: "UNAVAILABLE",
      content: "Content",
      content_gore: "Gore",
      content_rating: "Content rating",
      content_rating_erotica: "Erotica",
      content_rating_genre: "Content rating: %s",
      content_rating_pornographic: "Pornographic",
      content_rating_safe: "Safe",
      content_rating_suggestive: "Suggestive",
      content_sexual_violence: "Sexual violence",
      cover_quality: "Cover quality",
      cover_quality_low: "Low",
      cover_quality_medium: "Medium",
      cover_quality_original: "Original",
      created_at: "Created within last",
      created_at_any: "Any",
      created_at_day: "Day",
      created_at_month: "Month",
      created_at_week: "Week",
      created_at_year: "Year",
      data_saver: "Data saver",
      data_saver_summary: "Enables smaller, more compressed images",
      excluded_tags_mode: "Excluded tags mode",
      filter_original_languages: "Filter original languages",
      filter_original_languages_summary: "Only show content that was originally published in the selected languages in both latest and browse",
      final_chapter: "Final chapter:",
      final_chapter_in_description: "Final chapter in description",
      final_chapter_in_description_summary: "Include a manga's final chapter number at the end of its description",
      format: "Format",
      format_adaptation: "Adaptation",
      format_anthology: "Anthology",
      format_award_winning: "Award Winning",
      format_doujinshi: "Doujinshi",
      format_fan_colored: "Fan Colored",
      format_full_color: "Full Color",
      format_long_strip: "Long Strip",
      format_official_colored: "Official Colored",
      format_oneshot: "Oneshot",
      format_user_created: "User Created",
      format_web_comic: "Web Comic",
      format_yonkoma: "4-Koma",
      genre: "Genre",
      genre_action: "Action",
      genre_adventure: "Adventure",
      genre_boys_love: "Boy's Love",
      genre_comedy: "Comedy",
      genre_crime: "Crime",
      genre_drama: "Drama",
      genre_fantasy: "Fantasy",
      genre_girls_love: "Girl's Love",
      genre_historical: "Historical",
      genre_horror: "Horror",
      genre_isekai: "Isekai",
      genre_magical_girls: "Magical Girls",
      genre_mecha: "Mecha",
      genre_medical: "Medical",
      genre_mystery: "Mystery",
      genre_philosophical: "Philosophical",
      genre_romance: "Romance",
      genre_sci_fi: "Sci-Fi",
      genre_slice_of_life: "Slice of Life",
      genre_sports: "Sports",
      genre_superhero: "Superhero",
      genre_thriller: "Thriller",
      genre_tragedy: "Tragedy",
      genre_wuxia: "Wuxia",
      has_available_chapters: "Has available chapters",
      included_tags_mode: "Included tags mode",
      include_unavailable: "Show unavailable chapters",
      include_unavailable_summary: "Include chapters that have been marked as unavailable by the source in the chapter list",
      invalid_author_id: "Not a valid author ID",
      invalid_manga_id: "Not a valid manga ID",
      invalid_group_id: "Not a valid group ID",
      invalid_uuids: "The text contains invalid UUIDs",
      migrate_warning: "Migrate this entry from MangaDex to MangaDex to update it",
      mode_and: "And",
      mode_or: "Or",
      no_group: "No Group",
      no_series_in_list: "No series in the list",
      original_language: "Original language",
      original_language_filter_chinese: "%s (Manhua)",
      original_language_filter_japanese: "%s (Manga)",
      original_language_filter_korean: "%s (Manhwa)",
      prefer_title_in_extension_language: "Use alternative titles",
      prefer_title_in_extension_language_summary: "If there is an alternative title available which matches the extension language, it will be used",
      publication_demographic: "Publication demographic",
      publication_demographic_josei: "Josei",
      publication_demographic_none: "None",
      publication_demographic_seinen: "Seinen",
      publication_demographic_shoujo: "Shoujo",
      publication_demographic_shounen: "Shounen",
      sort: "Sort",
      sort_alphabetic: "Alphabetic",
      sort_chapter_uploaded_at: "Chapter uploaded at",
      sort_content_created_at: "Content created at",
      sort_content_info_updated_at: "Content info updated at",
      sort_number_of_follows: "Number of follows",
      sort_rating: "Rating",
      sort_relevance: "Relevance",
      sort_year: "Year",
      standard_content_rating: "Default content rating",
      standard_content_rating_summary: "Show content with the selected ratings by default",
      standard_https_port: "Use HTTPS port 443 only",
      standard_https_port_summary: "Enable to only request image servers that use port 443. This allows users with stricter firewall restrictions to access MangaDex images",
      status: "Status",
      status_cancelled: "Cancelled",
      status_completed: "Completed",
      status_hiatus: "Hiatus",
      status_ongoing: "Ongoing",
      tags_mode: "Tags mode",
      theme: "Theme",
      theme_aliens: "Aliens",
      theme_animals: "Animals",
      theme_cooking: "Cooking",
      theme_crossdressing: "Crossdressing",
      theme_delinquents: "Delinquents",
      theme_demons: "Demons",
      theme_gender_swap: "Genderswap",
      theme_ghosts: "Ghosts",
      theme_gyaru: "Gyaru",
      theme_harem: "Harem",
      theme_incest: "Incest",
      theme_loli: "Loli",
      theme_mafia: "Mafia",
      theme_magic: "Magic",
      theme_martial_arts: "Martial Arts",
      theme_military: "Military",
      theme_monster_girls: "Monster Girls",
      theme_monsters: "Monsters",
      theme_music: "Music",
      theme_ninja: "Ninja",
      theme_office_workers: "Office Workers",
      theme_police: "Police",
      theme_post_apocalyptic: "Post-Apocalyptic",
      theme_psychological: "Psychological",
      theme_reincarnation: "Reincarnation",
      theme_reverse_harem: "Reverse Harem",
      theme_samurai: "Samurai",
      theme_school_life: "School Life",
      theme_shota: "Shota",
      theme_supernatural: "Supernatural",
      theme_survival: "Survival",
      theme_time_travel: "Time Travel",
      theme_traditional_games: "Traditional Games",
      theme_vampires: "Vampires",
      theme_video_games: "Video Games",
      theme_villainess: "Villainess",
      theme_virtual_reality: "Virtual Reality",
      theme_zombies: "Zombies",
      try_using_first_volume_cover: "Attempt to use the first volume cover as cover",
      try_using_first_volume_cover_summary: "May need to manually refresh entries already in library. Otherwise, clear database to have new covers to show up.",
      unable_to_process_chapter_request: "Unable to process Chapter request. HTTP code: %d",
      uploaded_by: "Uploaded by %s",
      set_custom_useragent: "Set custom User-Agent",
      set_custom_useragent_summary: "Keep it as default",
      set_custom_useragent_dialog: "Specify a custom user agent\n After each modification, the application needs to be restarted.\n\nDefault value:\n%s",
      set_custom_useragent_error_invalid: "Invalid User-Agent: %s"
    },
    "es": {
      block_group_by_uuid: "Bloquear grupos por UUID",
      block_group_by_uuid_summary: "Los capítulos de los grupos bloqueados no aparecerán en Recientes o en el Feed de mangas. Introduce una coma para separar la lista de UUIDs",
      block_uploader_by_uuid: "Bloquear uploader por UUID",
      block_uploader_by_uuid_summary: "Los capítulos de los uploaders bloqueados no aparecerán en Recientes o en el Feed de mangas. Introduce una coma para separar la lista de UUIDs",
      content: "Contenido",
      content_rating: "Clasificación de contenido",
      content_rating_erotica: "Erótico",
      content_rating_genre: "Clasificación: %s",
      content_rating_pornographic: "Pornográfico",
      content_rating_safe: "Seguro",
      content_rating_suggestive: "Sugestivo",
      content_sexual_violence: "Violencia sexual",
      cover_quality: "Calidad de la portada",
      cover_quality_low: "Bajo",
      cover_quality_medium: "Medio",
      data_saver: "Ahorro de datos",
      data_saver_summary: "Utiliza imágenes más pequeñas y más comprimidas",
      excluded_tags_mode: "Modo de etiquetas excluidas",
      filter_original_languages: "Filtrar por lenguajes",
      filter_original_languages_summary: "Muestra solo el contenido publicado en los idiomas seleccionados en recientes y en la búsqueda",
      format: "Formato",
      format_adaptation: "Adaptación",
      format_anthology: "Antología",
      format_award_winning: "Ganador de premio",
      format_fan_colored: "Coloreado por fans",
      format_full_color: "Todo a color",
      format_long_strip: "Tira larga",
      format_official_colored: "Coloreo oficial",
      format_user_created: "Creado por usuario",
      genre: "Genero",
      genre_action: "Acción",
      genre_adventure: "Aventura",
      genre_comedy: "Comedia",
      genre_crime: "Crimen",
      genre_fantasy: "Fantasia",
      genre_historical: "Histórico",
      genre_magical_girls: "Chicas mágicas",
      genre_medical: "Medico",
      genre_mystery: "Misterio",
      genre_philosophical: "Filosófico",
      genre_sci_fi: "Ciencia ficción",
      genre_slice_of_life: "Recuentos de la vida",
      genre_sports: "Deportes",
      genre_superhero: "Superhéroes",
      genre_tragedy: "Tragedia",
      has_available_chapters: "Tiene capítulos disponibles",
      included_tags_mode: "Modo de etiquetas incluidas",
      invalid_author_id: "ID de autor inválida",
      invalid_group_id: "ID de grupo inválida",
      migrate_warning: "Migre la entrada MangaDex a MangaDex para actualizarla",
      mode_and: "Y",
      mode_or: "O",
      no_group: "Sin grupo",
      no_series_in_list: "No hay series en la lista",
      original_language: "Lenguaje original",
      publication_demographic: "Demografía",
      publication_demographic_none: "Ninguna",
      sort: "Ordenar",
      sort_alphabetic: "Alfabeticamente",
      sort_chapter_uploaded_at: "Capítulo subido en",
      sort_content_created_at: "Contenido creado en",
      sort_content_info_updated_at: "Información del contenido actualizada en",
      sort_number_of_follows: "Número de seguidores",
      sort_rating: "Calificación",
      sort_relevance: "Relevancia",
      sort_year: "Año",
      standard_content_rating: "Clasificación de contenido por defecto",
      standard_content_rating_summary: "Muestra el contenido con la clasificación de contenido seleccionada por defecto",
      standard_https_port: "Utilizar el puerto 443 de HTTPS",
      standard_https_port_summary: "Habilite esta opción solicitar las imágenes a los servidores que usan el puerto 443. Esto permite a los usuarios con restricciones estrictas de firewall acceder a las imagenes en MangaDex",
      status: "Estado",
      status_cancelled: "Cancelado",
      status_completed: "Completado",
      status_hiatus: "Pausado",
      status_ongoing: "Publicandose",
      tags_mode: "Modo de etiquetas",
      theme: "Tema",
      theme_aliens: "Alienígenas",
      theme_animals: "Animales",
      theme_cooking: "Cocina",
      theme_crossdressing: "Travestismo",
      theme_delinquents: "Delincuentes",
      theme_demons: "Demonios",
      theme_gender_swap: "Cambio de sexo",
      theme_ghosts: "Fantasmas",
      theme_incest: "Incesto",
      theme_magic: "Magia",
      theme_martial_arts: "Artes marciales",
      theme_military: "Militar",
      theme_monster_girls: "Chicas monstruo",
      theme_monsters: "Monstruos",
      theme_music: "Musica",
      theme_office_workers: "Oficinistas",
      theme_police: "Policial",
      theme_post_apocalyptic: "Post-apocalíptico",
      theme_psychological: "Psicológico",
      theme_reincarnation: "Reencarnación",
      theme_reverse_harem: "Harem inverso",
      theme_school_life: "Vida escolar",
      theme_supernatural: "Sobrenatural",
      theme_survival: "Supervivencia",
      theme_time_travel: "Viaje en el tiempo",
      theme_traditional_games: "Juegos tradicionales",
      theme_vampires: "Vampiros",
      theme_villainess: "Villana",
      theme_virtual_reality: "Realidad virtual",
      unable_to_process_chapter_request: "No se ha podido procesar la solicitud del capítulo. Código HTTP: %d",
      uploaded_by: "Subido por %s"
    },
    "pt-BR": {
      alternative_titles: "Títulos alternativos:",
      alternative_titles_in_description: "Títulos alternativos na descrição",
      alternative_titles_in_description_summary: "Inclui os títulos alternativos das séries no final de cada descrição",
      block_group_by_uuid: "Bloquear grupos por UUID",
      block_group_by_uuid_summary: "Capítulos de grupos bloqueados não irão aparecer no feed de Recentes ou Mangás. Digite uma lista de UUIDs dos grupos separados por vírgulas",
      block_uploader_by_uuid: "Bloquear uploaders por UUID",
      block_uploader_by_uuid_summary: "Capítulos de usuários bloqueados não irão aparecer no feed de Recentes ou Mangás. Digite uma lista de UUIDs dos usuários separados por vírgulas",
      content: "Conteúdo",
      content_rating: "Classificação de conteúdo",
      content_rating_erotica: "Erótico",
      content_rating_genre: "Classificação: %s",
      content_rating_pornographic: "Pornográfico",
      content_rating_safe: "Seguro",
      content_rating_suggestive: "Sugestivo",
      content_sexual_violence: "Violência sexual",
      cover_quality: "Qualidade da capa",
      cover_quality_low: "Baixa",
      cover_quality_medium: "Média",
      data_saver: "Economia de dados",
      data_saver_summary: "Utiliza imagens menores e mais compactadas",
      excluded_tags_mode: "Modo de exclusão de tags",
      filter_original_languages: "Filtrar os idiomas originais",
      filter_original_languages_summary: "Mostra somente conteúdos que foram publicados originalmente nos idiomas selecionados nas seções de recentes e navegar",
      format: "Formato",
      format_adaptation: "Adaptação",
      format_anthology: "Antologia",
      format_award_winning: "Premiado",
      format_fan_colored: "Colorizado por fãs",
      format_full_color: "Colorido",
      format_long_strip: "Vertical",
      format_official_colored: "Colorizado oficialmente",
      format_user_created: "Criado por usuários",
      genre: "Gênero",
      genre_action: "Ação",
      genre_adventure: "Aventura",
      genre_comedy: "Comédia",
      genre_crime: "Crime",
      genre_fantasy: "Fantasia",
      genre_historical: "Histórico",
      genre_magical_girls: "Garotas mágicas",
      genre_medical: "Médico",
      genre_mystery: "Mistério",
      genre_philosophical: "Filosófico",
      genre_sci_fi: "Ficção científica",
      genre_slice_of_life: "Cotidiano",
      genre_sports: "Esportes",
      genre_superhero: "Super-heroi",
      genre_tragedy: "Tragédia",
      has_available_chapters: "Há capítulos disponíveis",
      included_tags_mode: "Modo de inclusão de tags",
      invalid_author_id: "ID do autor inválido",
      invalid_manga_id: "ID do mangá inválido",
      invalid_group_id: "ID do grupo inválido",
      invalid_uuids: "O texto contém UUIDs inválidos",
      migrate_warning: "Migre esta entrada do MangaDex para o MangaDex para atualizar",
      mode_and: "E",
      mode_or: "Ou",
      no_group: "Sem grupo",
      no_series_in_list: "Sem séries na lista",
      original_language: "Idioma original",
      original_language_filter_japanese: "%s (Mangá)",
      publication_demographic: "Demografia da publicação",
      publication_demographic_none: "Nenhuma",
      sort: "Ordenar",
      sort_alphabetic: "Alfabeticamente",
      sort_chapter_uploaded_at: "Upload do capítulo",
      sort_content_created_at: "Criação do conteúdo",
      sort_content_info_updated_at: "Atualização das informações",
      sort_number_of_follows: "Número de seguidores",
      sort_rating: "Nota",
      sort_relevance: "Relevância",
      sort_year: "Ano de lançamento",
      standard_content_rating: "Classificação de conteúdo padrão",
      standard_content_rating_summary: "Mostra os conteúdos com as classificações selecionadas por padrão",
      standard_https_port: "Utilizar somente a porta 443 do HTTPS",
      standard_https_port_summary: "Ative para fazer requisições em somente servidores de imagem que usem a porta 443. Isso permite com que usuários com regras mais restritas de firewall possam acessar as imagens do MangaDex.",
      status: "Estado",
      status_cancelled: "Cancelado",
      status_completed: "Completo",
      status_hiatus: "Hiato",
      status_ongoing: "Em andamento",
      tags_mode: "Modo das tags",
      theme: "Tema",
      theme_aliens: "Alienígenas",
      theme_animals: "Animais",
      theme_cooking: "Culinária",
      theme_delinquents: "Delinquentes",
      theme_demons: "Demônios",
      theme_gender_swap: "Troca de gêneros",
      theme_ghosts: "Fantasmas",
      theme_harem: "Harém",
      theme_incest: "Incesto",
      theme_mafia: "Máfia",
      theme_magic: "Magia",
      theme_martial_arts: "Artes marciais",
      theme_military: "Militar",
      theme_monster_girls: "Garotas monstro",
      theme_monsters: "Monstros",
      theme_music: "Musical",
      theme_office_workers: "Funcionários de escritório",
      theme_police: "Policial",
      theme_post_apocalyptic: "Pós-apocalíptico",
      theme_psychological: "Psicológico",
      theme_reincarnation: "Reencarnação",
      theme_reverse_harem: "Harém reverso",
      theme_school_life: "Vida escolar",
      theme_supernatural: "Sobrenatural",
      theme_survival: "Sobrevivência",
      theme_time_travel: "Viagem no tempo",
      theme_traditional_games: "Jogos tradicionais",
      theme_vampires: "Vampiros",
      theme_video_games: "Videojuegos",
      theme_villainess: "Villainess",
      theme_virtual_reality: "Realidade virtual",
      theme_zombies: "Zumbis",
      try_using_first_volume_cover: "Tentar usar a capa do primeiro volume como capa",
      try_using_first_volume_cover_summary: "Pode ser necessário atualizar os itens já adicionados na biblioteca. Alternativamente, limpe o banco de dados para as novas capas aparecerem.",
      unable_to_process_chapter_request: "Não foi possível processar a requisição do capítulo. Código HTTP: %d",
      uploaded_by: "Enviado por %s"
    },
    "ru": {
      block_group_by_uuid: "Заблокировать группы по UUID",
      block_group_by_uuid_summary: "Главы от заблокированных групп не будут отображаться в последних обновлениях и в списке глав тайтла. Введите через запятую список UUID групп.",
      block_uploader_by_uuid: "Заблокировать загрузчика по UUID",
      block_uploader_by_uuid_summary: "Главы от заблокированных загрузчиков не будут отображаться в последних обновлениях  и в списке глав тайтла. Введите через запятую список UUID загрузчиков.",
      content: "Неприемлемый контент",
      content_gore: "Жестокость",
      content_rating: "Рейтинг контента",
      content_rating_erotica: "Эротический",
      content_rating_genre: "Рейтинг контента: %s",
      content_rating_pornographic: "Порнографический",
      content_rating_safe: "Безопасный",
      content_rating_suggestive: "Намекающий",
      content_sexual_violence: "Сексуальное насилие",
      cover_quality: "Качество обложки",
      cover_quality_low: "Низкое",
      cover_quality_medium: "Среднее",
      cover_quality_original: "Оригинальное",
      data_saver: "Экономия трафика",
      data_saver_summary: "Использует меньшие по размеру, сжатые изображения",
      excluded_tags_mode: "Исключая",
      filter_original_languages: "Фильтр по языку оригинала",
      filter_original_languages_summary: "Показывать тайтлы которые изначально были выпущены только в выбранных языках в последних обновлениях и при поиске",
      format: "Формат",
      format_adaptation: "Адаптация",
      format_anthology: "Антология",
      format_award_winning: "Отмеченный наградами",
      format_doujinshi: "Додзинси",
      format_fan_colored: "Раскрашенная фанатами",
      format_full_color: "В цвете",
      format_long_strip: "Веб",
      format_official_colored: "Официально раскрашенная",
      format_oneshot: "Сингл",
      format_user_created: "Созданная пользователями",
      format_web_comic: "Веб-комикс",
      format_yonkoma: "Ёнкома",
      genre: "Жанр",
      genre_action: "Боевик",
      genre_adventure: "Приключения",
      genre_boys_love: "BL",
      genre_comedy: "Комедия",
      genre_crime: "Криминал",
      genre_drama: "Драма",
      genre_fantasy: "Фэнтези",
      genre_girls_love: "GL",
      genre_historical: "История",
      genre_horror: "Ужасы",
      genre_isekai: "Исекай",
      genre_magical_girls: "Махо-сёдзё",
      genre_mecha: "Меха",
      genre_medical: "Медицина",
      genre_mystery: "Мистика",
      genre_philosophical: "Философия",
      genre_romance: "Романтика",
      genre_sci_fi: "Научная фантастика",
      genre_slice_of_life: "Повседневность",
      genre_sports: "Спорт",
      genre_superhero: "Супергерои",
      genre_thriller: "Триллер",
      genre_tragedy: "Трагедия",
      genre_wuxia: "Культивация",
      has_available_chapters: "Есть главы",
      included_tags_mode: "Включая",
      invalid_author_id: "Недействительный ID автора",
      invalid_group_id: "Недействительный ID группы",
      mode_and: "И",
      mode_or: "Или",
      no_group: "Нет группы",
      no_series_in_list: "Лист пуст",
      original_language: "Язык оригинала",
      original_language_filter_chinese: "%s (Манхуа)",
      original_language_filter_japanese: "%s (Манга)",
      original_language_filter_korean: "%s (Манхва)",
      publication_demographic: "Целевая аудитория",
      publication_demographic_josei: "Дзёсэй",
      publication_demographic_none: "Нет",
      publication_demographic_seinen: "Сэйнэн",
      publication_demographic_shoujo: "Сёдзё",
      publication_demographic_shounen: "Сёнэн",
      sort: "Сортировать по",
      sort_alphabetic: "Алфавиту",
      sort_chapter_uploaded_at: "Загруженной главе",
      sort_content_created_at: "По дате создания",
      sort_content_info_updated_at: "По дате обновления",
      sort_number_of_follows: "Количеству фолловеров",
      sort_rating: "Популярности",
      sort_relevance: "Лучшему соответствию",
      sort_year: "Год",
      standard_content_rating: "Рейтинг контента по умолчанию",
      standard_content_rating_summary: "Показывать контент с выбранным рейтингом по умолчанию",
      standard_https_port: "Использовать только HTTPS порт 443",
      standard_https_port_summary: "Запрашивает изображения только с серверов которые используют порт 443. Это позволяет пользователям со строгими правилами брандмауэра загружать изображения с MangaDex.",
      status: "Статус",
      status_cancelled: "Отменён",
      status_completed: "Завершён",
      status_hiatus: "Приостановлен",
      status_ongoing: "Онгоинг",
      tags_mode: "Режим поиска",
      theme: "Теги",
      theme_aliens: "Инопланетяне",
      theme_animals: "Животные",
      theme_cooking: "Животные",
      theme_crossdressing: "Кроссдрессинг",
      theme_delinquents: "Хулиганы",
      theme_demons: "Демоны",
      theme_gender_swap: "Смена гендера",
      theme_ghosts: "Призраки",
      theme_gyaru: "Гяру",
      theme_harem: "Гарем",
      theme_incest: "Инцест",
      theme_loli: "Лоли",
      theme_mafia: "Мафия",
      theme_magic: "Магия",
      theme_martial_arts: "Боевые исскуства",
      theme_military: "Военные",
      theme_monster_girls: "Монстродевушки",
      theme_monsters: "Монстры",
      theme_music: "Музыка",
      theme_ninja: "Ниндзя",
      theme_office_workers: "Офисные работники",
      theme_police: "Полиция",
      theme_post_apocalyptic: "Постапокалиптика",
      theme_psychological: "Психология",
      theme_reincarnation: "Реинкарнация",
      theme_reverse_harem: "Обратный гарем",
      theme_samurai: "Самураи",
      theme_school_life: "Школа",
      theme_shota: "Шота",
      theme_supernatural: "Сверхъестественное",
      theme_survival: "Выживание",
      theme_time_travel: "Путешествие во времени",
      theme_traditional_games: "Путешествие во времени",
      theme_vampires: "Вампиры",
      theme_video_games: "Видеоигры",
      theme_villainess: "Злодейка",
      theme_virtual_reality: "Виртуальная реальность",
      theme_zombies: "Зомби",
      unable_to_process_chapter_request: "Не удалось обработать ссылку на главу. Ошибка: %d",
      uploaded_by: "Загрузил %s"
    }
  };
  function intlFor(lang) {
    const language = lang === "pt" ? "pt-BR" : lang;
    return new Intl(language, messages);
  }

  // src/all/mangadex/parse.ts
  var getUUIDFromUrl = (url) => url.slice(url.lastIndexOf("/") + 1);
  var NAMED_ENTITIES = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    hearts: "♥",
    hellip: "…",
    mdash: "—",
    ndash: "–",
    lsquo: "‘",
    rsquo: "’",
    ldquo: "“",
    rdquo: "”",
    laquo: "«",
    raquo: "»",
    copy: "©",
    reg: "®",
    trade: "™",
    deg: "°",
    times: "×",
    middot: "·",
    bull: "•",
    star: "☆",
    eacute: "é",
    egrave: "è",
    agrave: "à",
    aacute: "á",
    iacute: "í",
    oacute: "ó",
    uacute: "ú",
    ntilde: "ñ",
    ccedil: "ç",
    uuml: "ü",
    ouml: "ö",
    auml: "ä",
    szlig: "ß",
    frac12: "½",
    sup2: "²",
    larr: "←",
    rarr: "→",
    uarr: "↑",
    darr: "↓",
    spades: "♠",
    clubs: "♣",
    diams: "♦"
  };
  function removeEntities(text) {
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (whole, entity) => {
      if (entity[0] === "#") {
        const code = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 1114111 ? String.fromCodePoint(code) : whole;
      }
      return NAMED_ENTITIES[entity] ?? NAMED_ENTITIES[entity.toLowerCase()] ?? whole;
    });
  }
  var markdownLinksRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  var markdownItalicBoldRegex = /\*+\s*([^*]*)\s*\*+/g;
  var markdownItalicRegex = /_+\s*([^_]*)\s*_+/g;
  var titleSpecialCharactersRegex = /[^a-z0-9]+/g;
  var trailingHyphenRegex = /-+$/;
  function removeEntitiesAndMarkdown(text) {
    const entities = removeEntities(text);
    const index = entities.indexOf("\n---");
    return (index < 0 ? entities : entities.slice(0, index)).replace(markdownLinksRegex, "$1").replace(markdownItalicBoldRegex, "$1").replace(markdownItalicRegex, "$1").trim();
  }
  function volumesOf(volumes) {
    return volumes && !Array.isArray(volumes) ? volumes : {};
  }
  function getPublicationStatus(attr, aggregate) {
    const volumes = volumesOf(aggregate);
    const chaptersList = Object.values(volumes).flatMap((volume) => Object.values(volume.chapters ?? {}).map((chapter) => chapter.chapter));
    const tempStatus = attr.status === "ongoing" ? SManga.ONGOING : attr.status === "cancelled" ? SManga.CANCELLED : attr.status === "completed" ? SManga.PUBLISHING_FINISHED : attr.status === "hiatus" ? SManga.ON_HIATUS : SManga.UNKNOWN;
    const publishedOrCancelled = tempStatus === SManga.PUBLISHING_FINISHED || tempStatus === SManga.CANCELLED;
    const tags = attr.tags ?? [];
    const isOneShot = tags.some((tag) => tag.id === TAG_ONE_SHOT_UUID) && !tags.some((tag) => tag.id === TAG_ANTHOLOGY_UUID);
    if (attr.lastChapter != null && chaptersList.includes(attr.lastChapter) && publishedOrCancelled) return SManga.COMPLETED;
    if (isOneShot && volumes.none?.chapters?.none != null) return SManga.COMPLETED;
    return tempStatus;
  }
  function findTitleByLang(altTitles, lang) {
    const entry = altTitles.find((title) => title[lang] != null);
    if (!entry) return null;
    const values = Object.values(entry);
    return values.length === 1 ? values[0] : null;
  }
  function createBasicManga(mangaDataDto, coverFileName2, coverSuffix, lang, preferExtensionLangTitle2) {
    const manga = SManga.create();
    manga.url = `/manga/${mangaDataDto.id}`;
    const attributes = mangaDataDto.attributes;
    const titleMap = localized(attributes.title);
    const altTitles = (attributes.altTitles ?? []).map(localized);
    let title = titleMap[lang] ?? null;
    if (title == null) {
      const mainTitle = Object.values(titleMap)[0] ?? null;
      const langTitle = findTitleByLang(altTitles, lang);
      const enTitle = findTitleByLang(altTitles, "en");
      title = (preferExtensionLangTitle2 ? [langTitle, mainTitle, enTitle] : [mainTitle, langTitle, enTitle]).find((value) => value != null) ?? null;
    }
    manga.title = title == null ? "" : removeEntities(title);
    if (coverFileName2 != null) {
      manga.thumbnail_url = coverSuffix ? `${CDN_URL}/covers/${mangaDataDto.id}/${coverFileName2}${coverSuffix}` : `${CDN_URL}/covers/${mangaDataDto.id}/${coverFileName2}`;
    }
    return manga;
  }
  function capitalize(text) {
    return text ? text[0].toUpperCase() + text.slice(1) : text;
  }
  var distinct = (values) => [...new Set(values)];
  function createManga(intl, mangaDataDto, chapters, firstVolumeCover, options) {
    const attr = mangaDataDto.attributes;
    const { lang } = options;
    const nonGenres = [
      attr.publicationDemographic ? intl.get(`publication_demographic_${attr.publicationDemographic.toLowerCase()}`) : null,
      attr.contentRating && attr.contentRating !== "safe" ? intl.format("content_rating_genre", intl.get(`content_rating_${attr.contentRating.toLowerCase()}`)) : null,
      attr.originalLanguage ? capitalize(ORIGINAL_LANGUAGE_NAMES[attr.originalLanguage.toLowerCase()] ?? attr.originalLanguage) : null
    ].filter((value) => value != null);
    const authors = distinct(
      relationshipsOfType(mangaDataDto, AUTHOR).map((author) => author.attributes?.name).filter((name) => name != null)
    );
    const artists = distinct(
      relationshipsOfType(mangaDataDto, ARTIST).map((artist) => artist.attributes?.name).filter((name) => name != null)
    );
    const coverFileName2 = firstVolumeCover ?? relationshipsOfType(mangaDataDto, COVER_ART)[0]?.attributes?.fileName ?? null;
    const tags = new Map(getTags(intl).map((tag) => [tag.id, tag.name]));
    const genresMap = /* @__PURE__ */ new Map();
    for (const tag of attr.tags ?? []) {
      const group = tag.attributes?.group ?? "";
      const name = tags.get(tag.id);
      const list = genresMap.get(group) ?? [];
      if (name != null) list.push(name);
      genresMap.set(group, list);
    }
    for (const list of genresMap.values()) list.sort(compareNames);
    const genreList = [...TAG_GROUPS_ORDER.flatMap((group) => genresMap.get(group) ?? []), ...nonGenres];
    const desc = [];
    const description = localized(attr.description);
    const text = description[lang] ?? description.en;
    if (text != null) desc.push(removeEntitiesAndMarkdown(text));
    if (options.altTitlesInDesc) {
      const romanizedOriginalLang = romanizedLangCodes[attr.originalLanguage ?? ""] ?? "";
      const allLanguages = lang === ALL_LANGUAGES;
      const altTitles = (attr.altTitles ?? []).map(localized).filter((title) => allLanguages || lang in title || romanizedOriginalLang in title).map((title) => Object.entries(title)).filter((entries) => entries.length === 1).map((entries) => entries[0]).filter(([, title]) => title.length > 0).map(([code, title]) => allLanguages ? `[${code}] ${title}` : title);
      if (altTitles.length > 0) {
        desc.push(removeEntities(`${intl.get("alternative_titles")}
${altTitles.map((title) => `• ${title}`).join("\n")}`));
      }
    }
    if (options.finalChapterInDesc) {
      const finalChapter = [];
      if (attr.lastVolume) finalChapter.push(`Vol.${attr.lastVolume}`);
      if (attr.lastChapter) finalChapter.push(`Ch.${attr.lastChapter}`);
      if (finalChapter.length > 0) desc.push(removeEntities(`${intl.get("final_chapter")}
${finalChapter.join(" ")}`));
    }
    const manga = createBasicManga(mangaDataDto, coverFileName2, options.coverSuffix, lang, options.preferExtensionLangTitle);
    manga.description = desc.join("\n\n");
    manga.author = authors.join(", ");
    manga.artist = artists.join(", ");
    manga.status = getPublicationStatus(attr, chapters);
    manga.genre = genreList.filter((genre) => genre.length > 0).join(", ");
    return manga;
  }
  function createChapter(intl, lang, chapterDataDto) {
    const attr = chapterDataDto.attributes;
    let groups = relationshipsOfType(chapterDataDto, SCANLATION_GROUP).filter((group) => group.id !== LEGACY_NO_GROUP_ID).map((group) => group.attributes?.name).filter((name) => name != null).join(" & ");
    if (!groups) {
      const users = relationshipsOfType(chapterDataDto, USER).map((user) => user.attributes?.username).filter((name) => name != null);
      groups = users.length > 0 ? intl.format("uploaded_by", users.join(" & ")) : "";
    }
    if (!groups) groups = intl.get("no_group");
    const chapterName = [];
    if (attr.volume) chapterName.push(`Vol.${attr.volume}`);
    if (attr.chapter) chapterName.push(`Ch.${attr.chapter}`);
    if (attr.title) {
      if (chapterName.length > 0) chapterName.push("-");
      chapterName.push(attr.title);
    }
    if (chapterName.length === 0) chapterName.push("Oneshot");
    const unavailablePrefix = attr.isUnavailable === true ? `${intl.get("chapter_unavailable_prefix")} - ` : "";
    const languagePrefix = lang === ALL_LANGUAGES ? `[${attr.translatedLanguage}] ` : "";
    const chapter = SChapter.create();
    chapter.url = `/chapter/${chapterDataDto.id}`;
    chapter.name = removeEntities(chapterName.join(" "));
    chapter.date_upload = parseIsoDate(attr.publishAt);
    chapter.scanlator = languagePrefix + unavailablePrefix + groups;
    return chapter;
  }
  function titleToSlug(title) {
    return title.trim().toLowerCase().replace(titleSpecialCharactersRegex, "-").replace(trailingHyphenRegex, "").split("-").reduce((accumulator, element) => {
      const currentSlug = `${accumulator}-${element}`;
      return currentSlug.length > 100 ? accumulator : currentSlug;
    });
  }
  function coverFileName(manga) {
    return firstRelationship(manga, COVER_ART)?.attributes?.fileName ?? null;
  }
  function mangaIdsOfFeed(chapterListDto) {
    return [...new Set((chapterListDto.data ?? []).flatMap((chapter) => relationshipsOfType(chapter, MANGA)).map((manga) => manga.id))];
  }
  function firstVolumeCoverFileNames(covers, mangaMap) {
    const byManga = /* @__PURE__ */ new Map();
    for (const cover of covers) {
      const mangaId = firstRelationship(cover, MANGA)?.id;
      if (mangaId) byManga.set(mangaId, [...byManga.get(mangaId) ?? [], cover]);
    }
    const result = /* @__PURE__ */ new Map();
    for (const [mangaId, list] of byManga) {
      const fileName = list.find((cover) => cover.attributes?.locale === mangaMap.get(mangaId)?.originalLanguage)?.attributes?.fileName;
      if (fileName) result.set(mangaId, fileName);
    }
    return result;
  }
  function pageListParse(atHomeDto, atHomeRequestUrl, useDataSaver2, now) {
    const host2 = atHomeDto.baseUrl;
    const hash = atHomeDto.chapter.hash;
    const pageSuffix = useDataSaver2 ? atHomeDto.chapter.dataSaver.map((file) => `/data-saver/${hash}/${file}`) : atHomeDto.chapter.data.map((file) => `/data/${hash}/${file}`);
    return pageSuffix.map((imgUrl, index) => new Page(index, `${host2},${atHomeRequestUrl},${now}`, imgUrl));
  }

  // src/all/mangadex/settings.ts
  function setupPreferenceScreen(screen, intl, dexLang) {
    const toggle = (key, title, summary, defaultValue) => new SwitchPreferenceCompat({ key, title: intl.get(title), summary: intl.get(summary), defaultValue });
    screen.addPreference(
      new ListPreference({
        key: getCoverQualityPreferenceKey(dexLang),
        title: intl.get("cover_quality"),
        summary: "%s",
        entries: getCoverQualityPreferenceEntries(intl),
        entryValues: getCoverQualityPreferenceEntryValues(),
        defaultValue: getCoverQualityPreferenceDefaultValue()
      })
    );
    screen.addPreference(toggle(getTryUsingFirstVolumeCoverPrefKey(dexLang), "try_using_first_volume_cover", "try_using_first_volume_cover_summary", TRY_USING_FIRST_VOLUME_COVER_DEFAULT));
    screen.addPreference(toggle(getDataSaverPreferenceKey(dexLang), "data_saver", "data_saver_summary", false));
    screen.addPreference(toggle(getStandardHttpsPreferenceKey(dexLang), "standard_https_port", "standard_https_port_summary", false));
    screen.addPreference(toggle(getAltTitlesInDescPrefKey(dexLang), "alternative_titles_in_description", "alternative_titles_in_description_summary", false));
    screen.addPreference(toggle(getPreferExtensionLangTitlePrefKey(dexLang), "prefer_title_in_extension_language", "prefer_title_in_extension_language_summary", true));
    screen.addPreference(toggle(getFinalChapterInDescPrefKey(dexLang), "final_chapter_in_description", "final_chapter_in_description_summary", true));
    screen.addPreference(toggle(getIncludeUnavailablePrefKey(dexLang), "include_unavailable", "include_unavailable_summary", false));
    screen.addPreference(
      new MultiSelectListPreference({
        key: getContentRatingPrefKey(dexLang),
        title: intl.get("standard_content_rating"),
        summary: intl.get("standard_content_rating_summary"),
        entries: [intl.get("content_rating_safe"), intl.get("content_rating_suggestive"), intl.get("content_rating_erotica"), intl.get("content_rating_pornographic")],
        entryValues: allContentRatings,
        defaultValue: contentRatingPrefDefaults
      })
    );
    screen.addPreference(
      new MultiSelectListPreference({
        key: getOriginalLanguagePrefKey(dexLang),
        title: intl.get("filter_original_languages"),
        summary: intl.get("filter_original_languages_summary"),
        entries: [languageDisplayName(intl, JAPANESE), languageDisplayName(intl, CHINESE), languageDisplayName(intl, KOREAN)],
        entryValues: [ORIGINAL_LANGUAGE_PREF_VAL_JAPANESE, ORIGINAL_LANGUAGE_PREF_VAL_CHINESE, ORIGINAL_LANGUAGE_PREF_VAL_KOREAN],
        defaultValue: originalLanguagePrefDefaults
      })
    );
    screen.addPreference(new EditTextPreference({ key: getBlockedGroupsPrefKey(dexLang), title: intl.get("block_group_by_uuid"), summary: intl.get("block_group_by_uuid_summary"), defaultValue: "" }));
    screen.addPreference(new EditTextPreference({ key: getBlockedUploaderPrefKey(dexLang), title: intl.get("block_uploader_by_uuid"), summary: intl.get("block_uploader_by_uuid_summary"), defaultValue: "" }));
  }
  function contentRating(preferences, dexLang) {
    return [...preferences.getStringSet(getContentRatingPrefKey(dexLang), contentRatingPrefDefaults)];
  }
  function originalLanguages(preferences, dexLang) {
    const originalLanguages2 = preferences.getStringSet(getOriginalLanguagePrefKey(dexLang), originalLanguagePrefDefaults);
    if (originalLanguages2.has(ORIGINAL_LANGUAGE_PREF_VAL_CHINESE)) originalLanguages2.add(ORIGINAL_LANGUAGE_PREF_VAL_CHINESE_HK);
    return [...originalLanguages2];
  }
  function coverQuality(preferences, dexLang) {
    return preferences.getString(getCoverQualityPreferenceKey(dexLang), "");
  }
  function tryUsingFirstVolumeCover(preferences, dexLang) {
    return preferences.getBoolean(getTryUsingFirstVolumeCoverPrefKey(dexLang), TRY_USING_FIRST_VOLUME_COVER_DEFAULT);
  }
  function uuidList(preferences, key) {
    const values = preferences.getString(key, "").split(",").map((value) => value.trim()).filter(isUuid);
    return [...new Set(values)].sort();
  }
  function blockedGroups(preferences, dexLang) {
    return uuidList(preferences, getBlockedGroupsPrefKey(dexLang));
  }
  function blockedUploaders(preferences, dexLang) {
    return uuidList(preferences, getBlockedUploaderPrefKey(dexLang));
  }
  function forceStandardHttps(preferences, dexLang) {
    return preferences.getBoolean(getStandardHttpsPreferenceKey(dexLang), false);
  }
  function useDataSaver(preferences, dexLang) {
    return preferences.getBoolean(getDataSaverPreferenceKey(dexLang), false);
  }
  function altTitlesInDesc(preferences, dexLang) {
    return preferences.getBoolean(getAltTitlesInDescPrefKey(dexLang), false);
  }
  function preferExtensionLangTitle(preferences, dexLang) {
    return preferences.getBoolean(getPreferExtensionLangTitlePrefKey(dexLang), true);
  }
  function finalChapterInDesc(preferences, dexLang) {
    return preferences.getBoolean(getFinalChapterInDescPrefKey(dexLang), true);
  }
  function includeUnavailable(preferences, dexLang) {
    return preferences.getBoolean(getIncludeUnavailablePrefKey(dexLang), false);
  }

  // src/all/mangadex/index.ts
  var LANGS = [
    "all",
    "af",
    "sq",
    "ar",
    "az",
    "eu",
    "be",
    "bn",
    "bg",
    "my",
    "ca",
    "zh-Hans",
    "zh-Hant",
    "cv",
    "hr",
    "cs",
    "da",
    "nl",
    "en",
    "eo",
    "et",
    "fil",
    "fi",
    "fr",
    "ka",
    "de",
    "el",
    "he",
    "hi",
    "hu",
    "ga",
    "id",
    "it",
    "ja",
    "jv",
    "kk",
    "ko",
    "la",
    "lt",
    "ms",
    "mn",
    "ne",
    "no",
    "fa",
    "pl",
    "pt-BR",
    "pt",
    "ro",
    "ru",
    "sr",
    "sk",
    "es-419",
    "es",
    "sv",
    "ta",
    "te",
    "th",
    "tr",
    "uk",
    "ur",
    "uz",
    "vi"
  ];
  var MangaDex = class extends KeiSource {
    constructor(lang) {
      super();
      this.lang = lang;
      this.name = "MangaDex";
      this.baseUrl = "https://mangadex.org";
      this.intlValue = null;
      // Pages
      /** The last at-home answer per request URL, standing in for upstream's HTTP cache of it. */
      this.atHomeServers = /* @__PURE__ */ new Map();
    }
    get dexLang() {
      switch (this.lang) {
        case "zh-Hans":
          return "zh";
        case "zh-Hant":
          return "zh-hk";
        case "fil":
          return "tl";
        case "pt-BR":
          return "pt-br";
        case "es-419":
          return "es-la";
        default:
          return this.lang;
      }
    }
    get translatedLanguages() {
      return this.dexLang === ALL_LANGUAGES ? [] : [this.dexLang];
    }
    get intl() {
      return this.intlValue ?? (this.intlValue = intlFor(this.lang));
    }
    /** The settings every list request filters by, read fresh. */
    get listPrefs() {
      const { preferences, dexLang } = this;
      return {
        translatedLanguages: this.translatedLanguages,
        contentRating: contentRating(preferences, dexLang),
        originalLanguages: originalLanguages(preferences, dexLang),
        blockedGroups: blockedGroups(preferences, dexLang),
        blockedUploaders: blockedUploaders(preferences, dexLang)
      };
    }
    /**
     * Upstream identifies itself to MangaDex (which asks clients not to pose as browsers) with
     * `User-Agent: Tachiyomi <Android http.agent>` and an `Extra` header naming the app and
     * extension versions. Scripts cannot read either, so both name this port instead.
     */
    configureHeaders(headers) {
      return { ...headers, "User-Agent": "Tachiyomi (tachiyomi-ios-extensions)", Extra: "MangaDex JS port of Keiyoushi" };
    }
    /** `rateLimit(3)`: three requests a second, to every host. */
    configureClient(builder) {
      builder.rateLimit(3);
    }
    // Popular manga section
    async getPopularManga(page) {
      return this.parseMangasPage(await this.client.get(popularMangaUrl(page, this.listPrefs), Fetch.XHR));
    }
    async parseMangasPage(response) {
      if (response.code === 204) return new MangasPage([], false);
      const mangaListDto = response.parseAs();
      const data = mangaListDto.data ?? [];
      return new MangasPage(await this.basicMangas(data), hasNextPage(mangaListDto));
    }
    /** Browse entries for `list`, with the first volume's cover (looked up for all of `data`) when that setting is on. */
    async basicMangas(data, list = data) {
      const firstVolumeCovers = await this.fetchFirstVolumeCovers(data) ?? /* @__PURE__ */ new Map();
      const coverSuffix = coverQuality(this.preferences, this.dexLang);
      const preferExtensionLangTitle2 = preferExtensionLangTitle(this.preferences, this.dexLang);
      return list.map(
        (mangaDataDto) => createBasicManga(mangaDataDto, firstVolumeCovers.get(mangaDataDto.id) ?? coverFileName(mangaDataDto), coverSuffix, this.dexLang, preferExtensionLangTitle2)
      );
    }
    // Latest manga section
    async getLatestUpdates(page) {
      return this.latestUpdatesParse(await this.client.get(latestUpdatesUrl(page, this.listPrefs), Fetch.XHR));
    }
    /** The chapter feed names the manga; a second request loads them, kept in feed order. */
    async latestUpdatesParse(response) {
      const chapterListDto = response.parseAs();
      const mangaIds = mangaIdsOfFeed(chapterListDto);
      if (mangaIds.length === 0) return new MangasPage([], hasNextPage(chapterListDto));
      const mangaApiUrl = mangaByIdsUrl(mangaIds, contentRating(this.preferences, this.dexLang));
      const data = (await this.client.get(mangaApiUrl, Fetch.XHR)).parseAs().data ?? [];
      const mangaDtoMap = new Map(data.map((manga) => [manga.id, manga]));
      const inFeedOrder = mangaIds.map((id) => mangaDtoMap.get(id)).filter((manga) => manga != null);
      return new MangasPage(await this.basicMangas(data, inFeedOrder), hasNextPage(chapterListDto));
    }
    // Search manga section
    async getMangasByUrl(url, page) {
      if (url.host.endsWith("mangadex.org") || url.host === "canary.mangadex.dev") {
        const first = url.pathSegments[0];
        const searchPrefix = first ? pathToSearchPrefix[first] : void 0;
        if (searchPrefix) {
          const match = uuidRegex.exec(url.toString());
          if (match) return this.getSearchMangaList(page, searchPrefix + match[0], this.getFilterList());
        }
      }
      return this.getSearchMangaList(page, url.toString(), this.getFilterList());
    }
    async getSearchMangaList(page, query, filters) {
      if (isUuid(query.trim())) query = PREFIX_ID_SEARCH + query.trim();
      if (query.startsWith(PREFIX_CH_SEARCH)) {
        const mangaId = await this.getMangaIdFromChapterId(query.slice(PREFIX_CH_SEARCH.length));
        return this.parseMangasPage(await this.client.get(this.searchMangaUrl(page, PREFIX_ID_SEARCH + mangaId, filters), Fetch.XHR));
      }
      if (query.startsWith(PREFIX_USER_SEARCH)) {
        const url = searchMangaUploaderUrl(page, query.slice(PREFIX_USER_SEARCH.length), this.listPrefs);
        return this.latestUpdatesParse(await this.client.get(url, Fetch.XHR));
      }
      if (query.startsWith(PREFIX_LIST_SEARCH)) {
        const response = await this.client.get(listUrl(query.slice(PREFIX_LIST_SEARCH.length)), Fetch.XHR);
        return this.searchMangaListParse(response, page, filters);
      }
      return this.parseMangasPage(await this.client.get(this.searchMangaUrl(page, query.trim(), filters), Fetch.XHR));
    }
    async getMangaIdFromChapterId(id) {
      const response = await this.client.get(chapterUrl(id), { fetch: Fetch.XHR, ensureSuccess: false });
      if (!response.isSuccessful) throw new Error(this.intl.format("unable_to_process_chapter_request", response.code));
      const chapter = response.parseAs().data;
      const manga = chapter ? firstRelationship(chapter, MANGA) : null;
      if (!manga) throw new Error(this.intl.format("unable_to_process_chapter_request", response.code));
      return manga.id;
    }
    searchMangaUrl(page, query, filters) {
      return searchMangaUrl(page, query, filters.length ? filters : this.getFilterList(), this.dexLang, this.intl);
    }
    async searchMangaListParse(response, page, filters) {
      const listDto = response.parseAs();
      const listDtoFiltered = listDto.data ? relationshipsOfType(listDto.data, MANGA) : [];
      const amount = listDtoFiltered.length;
      if (amount < 1) throw new Error(this.intl.get("no_series_in_list"));
      const minIndex = (page - 1) * MANGA_LIMIT;
      const ids = [...new Set(listDtoFiltered.slice(minIndex, minIndex + MANGA_LIMIT).map((manga) => manga.id))];
      const finalUrl = listMangaUrl(ids, filters.length ? filters : this.getFilterList(), this.dexLang);
      const mangaList = (await this.parseMangasPage(await this.client.get(finalUrl, Fetch.XHR))).mangas;
      const more = amount / MANGA_LIMIT - (page - 1) > 1 && ids.length === MANGA_LIMIT;
      return new MangasPage(mangaList, more);
    }
    // Manga Details section
    getMangaUrl(manga) {
      return `${this.baseUrl}${manga.url.replace("/manga/", "/title/")}/${titleToSlug(manga.title)}`;
    }
    /** The API entry for a manga URL; old (pre-UUID) URLs ask the user to migrate. */
    async getMangaByUrl(url) {
      if (!containsUuid(url.toString())) throw new Error(this.intl.get("migrate_warning"));
      return this.mangaDetails(url.pathSegments[1]);
    }
    async mangaDetails(mangaId) {
      const data = (await this.client.get(mangaDetailsUrl(mangaId), Fetch.XHR)).parseAs().data;
      if (!data) throw new Error(`MangaDex has no manga ${mangaId}`);
      const chapters = await this.fetchSimpleChapterList(data);
      const firstVolumeCover = await this.fetchFirstVolumeCover(data);
      const { preferences, dexLang } = this;
      return createManga(this.intl, data, chapters, firstVolumeCover, {
        lang: dexLang,
        coverSuffix: coverQuality(preferences, dexLang),
        altTitlesInDesc: altTitlesInDesc(preferences, dexLang),
        preferExtensionLangTitle: preferExtensionLangTitle(preferences, dexLang),
        finalChapterInDesc: finalChapterInDesc(preferences, dexLang)
      });
    }
    /**
     * A quick list of the chapters, to tell a finished series from one still missing chapters.
     * Uses the 'aggregate' endpoint; see getPublicationStatus.
     */
    async fetchSimpleChapterList(manga) {
      try {
        const response = await this.client.get(aggregateUrl(manga.id, this.translatedLanguages), { fetch: Fetch.XHR, ensureSuccess: false });
        return response.parseAs().volumes ?? {};
      } catch {
        return {};
      }
    }
    async fetchFirstVolumeCover(manga) {
      return (await this.fetchFirstVolumeCovers([manga]))?.get(manga.id) ?? null;
    }
    /** The first volume's cover in the original language, when that setting is on. Uses the 'covers' endpoint. */
    async fetchFirstVolumeCovers(mangaList) {
      if (!tryUsingFirstVolumeCover(this.preferences, this.dexLang) || mangaList.length === 0) return null;
      const safeMangaList = mangaList.filter((manga) => manga.attributes?.originalLanguage);
      const mangaMap = new Map(safeMangaList.map((manga) => [manga.id, manga.attributes]));
      const locales = [...new Set(safeMangaList.map((manga) => manga.attributes.originalLanguage))];
      const limit = Math.min(mangaMap.size * locales.length, 100);
      let covers;
      try {
        covers = (await this.client.get(coverListUrl(mangaMap.keys(), locales, limit), Fetch.XHR)).parseAs().data ?? [];
      } catch {
        return null;
      }
      return firstVolumeCoverFileNames(covers, mangaMap);
    }
    // Chapter list section
    async getChapterList(manga) {
      if (!containsUuid(manga.url)) throw new Error(this.intl.get("migrate_warning"));
      const mangaId = getUUIDFromUrl(manga.url);
      const response = await this.client.get(this.paginatedChapterListUrl(mangaId, 0), Fetch.XHR);
      if (response.code === 204) return [];
      const chapterListResponse = response.parseAs();
      const chapterListResults = [...chapterListResponse.data ?? []];
      let offset = chapterListResponse.offset ?? 0;
      let more = hasNextPage(chapterListResponse);
      while (more) {
        offset += chapterListResponse.limit ?? 500;
        const newChapterList = (await this.client.get(this.paginatedChapterListUrl(mangaId, offset), Fetch.XHR)).parseAs();
        chapterListResults.push(...newChapterList.data ?? []);
        more = hasNextPage(newChapterList);
      }
      return chapterListResults.filter((chapter) => chapter.attributes && !isInvalid(chapter.attributes)).map((chapter) => createChapter(this.intl, this.lang, chapter));
    }
    paginatedChapterListUrl(mangaId, offset) {
      return paginatedChapterListUrl(mangaId, offset, this.listPrefs, includeUnavailable(this.preferences, this.dexLang));
    }
    getChapterUrl(chapter) {
      return this.baseUrl + chapter.url;
    }
    async fetchMangaUpdate(manga, chapters, fetchDetails, fetchChapters) {
      const [details, chapterList] = await Promise.all([
        fetchDetails ? this.getMangaByUrl(toHttpUrl(this.getMangaUrl(manga))) : Promise.resolve(manga),
        fetchChapters ? this.getChapterList(manga) : Promise.resolve(chapters)
      ]);
      return new SMangaUpdate(details, chapterList);
    }
    async getPageList(chapter) {
      if (!containsUuid(chapter.url)) throw new Error(this.intl.get("migrate_warning"));
      const chapterId = chapter.url.slice(chapter.url.indexOf("/chapter/") + "/chapter/".length);
      const url = atHomeServerUrl(chapterId, forceStandardHttps(this.preferences, this.dexLang));
      const atHomeDto = (await this.client.get(url, Fetch.XHR)).parseAs();
      const now = Date.now();
      this.atHomeServers.set(url, { baseUrl: atHomeDto.baseUrl, fetchedAt: now });
      return pageListParse(atHomeDto, url, useDataSaver(this.preferences, this.dexLang), now);
    }
    /** `getValidImageUrlForPage`: the page's server while it is fresh, else the chapter's current one. */
    async getImageRequest(page) {
      const [host2, tokenRequestUrl, time] = page.url.split(",");
      if (!page.imageUrl || !tokenRequestUrl) throw new Error(`Page ${page.index + 1} has no image URL`);
      const server = Date.now() - Number(time) > MD_AT_HOME_TOKEN_LIFESPAN ? await this.getMdAtHomeUrl(tokenRequestUrl) : host2;
      return { url: server + page.imageUrl, headers: this.headers };
    }
    async getMdAtHomeUrl(tokenRequestUrl) {
      const known = this.atHomeServers.get(tokenRequestUrl);
      if (known && Date.now() - known.fetchedAt <= MD_AT_HOME_TOKEN_LIFESPAN) return known.baseUrl;
      const baseUrl = (await this.client.get(tokenRequestUrl, Fetch.XHR)).parseAs().baseUrl;
      this.atHomeServers.set(tokenRequestUrl, { baseUrl, fetchedAt: Date.now() });
      return baseUrl;
    }
    // Settings and filters
    setupPreferenceScreen(screen) {
      setupPreferenceScreen(screen, this.intl, this.dexLang);
    }
    getFilterList() {
      return getMDFilterList(this.preferences, this.dexLang, this.intl);
    }
  };
  var index_default = defineExtension(LANGS.map((lang) => new MangaDex(lang)));
  return __toCommonJS(index_exports);
})();
