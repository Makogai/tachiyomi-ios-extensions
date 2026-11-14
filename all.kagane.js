// Kagane 3 for tachiyomi-ios. Ported from keiyoushi/extensions-source (Apache-2.0).
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

  // src/all/kagane/index.ts
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
  var log = {
    debug: (message) => host().log("debug", message),
    warn: (message) => host().log("warn", message),
    error: (message) => host().log("error", message)
  };
  function parseIsoDate(text) {
    const time = Date.parse(text);
    return Number.isNaN(time) ? 0 : time;
  }

  // sdk/src/filterCache.ts
  var FILTER_DATA = "filter_data";
  var MAX_AGE_MS = 3 * 24 * 60 * 60 * 1e3;
  var FILTER_FETCH_HINT = "Tap 'Reset' to load filters";
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
  var Text = class extends Filter {
    constructor(name, state = "") {
      super(name, state);
    }
    toJSON() {
      return { type: "text", name: this.name, state: this.state };
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
  function jsonBody(value) {
    return { content: JSON.stringify(value), contentType: "application/json; charset=utf-8" };
  }
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

  // src/all/kagane/filters.ts
  function getGenresList(meta) {
    return Object.entries(meta.genres).map(([id, name]) => new FilterData(id, name)).sort((a, b) => compare(a.name, b.name));
  }
  function compare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  var CONTENT_RATINGS = ["safe", "fifteenplus", "eighteenplus"];
  var CONTENT_RATING_LABELS = {
    safe: "Safe",
    fifteenplus: "Fifteen Plus",
    eighteenplus: "Eighteen Plus"
  };
  function isJsonFilter(filter) {
    return typeof filter?.addToJsonObject === "function";
  }
  var SelectFilterOption = class {
    constructor(name, value) {
      this.name = name;
      this.value = value;
    }
  };
  var getSortFilter = () => [
    new SelectFilterOption("Relevance", ""),
    new SelectFilterOption("Popular (Total Views)", "total_views"),
    new SelectFilterOption("Popular (Average Views)", "avg_views"),
    new SelectFilterOption("Popular (Today)", "avg_views_today"),
    new SelectFilterOption("Popular (Week)", "avg_views_week"),
    new SelectFilterOption("Popular (Month)", "avg_views_month"),
    new SelectFilterOption("Latest", "updated_at"),
    new SelectFilterOption("Books count", "current_books"),
    new SelectFilterOption("Created at", "created_at")
  ];
  var SortFilter = class extends Sort {
    constructor(selection = { index: 0, ascending: false }, options = getSortFilter()) {
      super(
        "Sort By",
        options.map((option) => option.name),
        selection
      );
      this.options = options;
    }
    get selected() {
      const index = this.state?.index;
      return (index != null ? this.options[index] : void 0) ?? this.options[0];
    }
    toUriPart() {
      const base = this.selected.value;
      const order = this.state?.ascending === true ? ",asc" : ",desc";
      return base !== "" ? base + order : "";
    }
  };
  var FilterData = class {
    constructor(id, name) {
      this.id = id;
      this.name = name;
    }
  };
  var MultiSelectOption = class extends CheckBox {
    constructor(name, id = name) {
      super(name, false);
      this.id = id;
    }
  };
  var JsonMultiSelectFilter = class extends Group {
    constructor(name, param, genres) {
      super(name, genres);
      this.param = param;
    }
    addToJsonObject(builder, key = "") {
      const whatToInclude = this.state.filter((option) => option.state).map((option) => option.id);
      if (whatToInclude.length > 0) {
        if (key === "") {
          builder[this.param] = whatToInclude;
        } else {
          builder[key] = { [this.param]: whatToInclude };
        }
      }
    }
  };
  var AGE_RATINGS = {
    safe: "Safe",
    fifteenplus: "FifteenPlus",
    eighteenplus: "EighteenPlus"
  };
  var ContentRatingFilter = class extends Group {
    constructor(defaultRatings, pornographic, disturbing, ratings = CONTENT_RATINGS.map((it) => new FilterData(it, CONTENT_RATING_LABELS[it]))) {
      super(
        "Content Rating",
        ratings.map((rating) => {
          const option = new MultiSelectOption(rating.name, rating.id);
          option.state = defaultRatings.has(rating.id);
          return option;
        })
      );
      this.pornographic = pornographic;
      this.disturbing = disturbing;
    }
    addToJsonObject(builder) {
      const selected = this.state.filter((option) => option.state).map((option) => option.id);
      if (selected.length === 0) return;
      builder["age_rating"] = [...new Set(selected.map((id) => AGE_RATINGS[id]))];
      if (!this.pornographic) {
        builder["is_pornographic"] = false;
      }
      if (!this.disturbing) {
        builder["is_disturbing"] = false;
      }
    }
  };
  var MultiSelectTriOption = class extends TriState {
    constructor(name, id = name) {
      super(name);
      this.id = id;
    }
  };
  var JsonMultiSelectTriFilter = class extends Group {
    constructor(name, param, genres, extraExcluded = /* @__PURE__ */ new Set()) {
      super(name, genres);
      this.param = param;
      this.extraExcluded = extraExcluded;
    }
    addToJsonObject(builder, key = "", matchAll = null) {
      const whatToInclude = this.state.filter((option) => option.state === TriState.STATE_INCLUDE).map((option) => option.id);
      const whatToExclude = [
        ...this.state.filter((option) => option.state === TriState.STATE_EXCLUDE).map((option) => option.id),
        ...this.extraExcluded
      ];
      if (whatToInclude.length > 0 || whatToExclude.length > 0) {
        const object = {};
        if (matchAll === true) {
          object["match_all"] = true;
        }
        object["values"] = whatToInclude;
        if (whatToExclude.length > 0) {
          object["exclude"] = whatToExclude;
        }
        builder[key] = object;
      }
    }
  };
  var GenresFilter = class extends JsonMultiSelectTriFilter {
    constructor(genres, excludedIds = /* @__PURE__ */ new Set()) {
      super(
        "Genres",
        "genres",
        genres.map((genre) => new MultiSelectTriOption(genre.name, genre.id)),
        excludedIds
      );
    }
  };
  var TagsSearchFilter = class extends Text {
    constructor(tagData) {
      super("Tags (e.g. Medieval, -Politics)");
      this.tagData = tagData;
    }
  };
  var StaffSearchFilter = class extends Text {
    constructor() {
      super("Person (e.g. ONE, -Kokou no Hashiguchi)");
    }
  };
  var GroupsSearchFilter = class extends Text {
    constructor() {
      super("Group (e.g. Asura Scans, -The Hours Between)");
    }
  };
  function toIntOrNull(text) {
    return /^[+-]?\d+$/.test(text) ? Number(text) : null;
  }
  var RangeTextFilter = class extends Text {
    // Accepts "a", "a-b", or "a+" (open-ended).
    parseRange() {
      const input = this.state.trim();
      let minText;
      let maxText;
      if (input.endsWith("+")) {
        minText = input.slice(0, -1);
        maxText = null;
      } else {
        const index = input.indexOf("-");
        minText = index < 0 ? input : input.slice(0, index);
        maxText = index < 0 ? null : input.slice(index + 1);
      }
      const min = toIntOrNull(minText.trim());
      const max = maxText !== null ? toIntOrNull(maxText.trim()) : null;
      return min === null && max === null ? null : [min, max];
    }
  };
  var YearFilter = class extends RangeTextFilter {
    constructor() {
      super("Year (e.g. 2024, 2024-2026, or 2024+)");
    }
  };
  var ChapterCountFilter = class extends RangeTextFilter {
    constructor() {
      super("Chapters (e.g. 1-20, 21-100, 101+)");
    }
  };
  var SourcesFilter = class extends JsonMultiSelectFilter {
    constructor(sources) {
      super(
        "Sources",
        "source_id",
        sources.map((source) => new MultiSelectOption(source.name, source.id))
      );
    }
  };
  var FORMAT_OPTIONS = ["Manga", "Manhwa", "Manhua", "Comic", "Other"];
  var FormatFilter = class extends JsonMultiSelectFilter {
    constructor(excluded = /* @__PURE__ */ new Set()) {
      super(
        "Format",
        "format",
        FORMAT_OPTIONS.map((it) => {
          const option = new MultiSelectOption(it);
          option.state = excluded.size > 0 && !excluded.has(it);
          return option;
        })
      );
    }
  };
  var PUBLICATION_STATUS_OPTIONS = [
    ["Ongoing", "Ongoing"],
    ["Completed", "Completed"],
    ["Hiatus", "Hiatus"],
    ["Cancelled", "Abandoned"]
  ];
  var PublicationStatusFilter = class extends JsonMultiSelectFilter {
    constructor() {
      super(
        "Status",
        "upload_status",
        PUBLICATION_STATUS_OPTIONS.map(([name, value]) => new MultiSelectOption(name, value))
      );
    }
  };
  var MatchAllGenresFilter = class extends CheckBox {
    constructor() {
      super("Match all selected genres", true);
    }
  };
  var MatchAllTagsFilter = class extends CheckBox {
    constructor() {
      super("Match all selected tags", true);
    }
  };

  // src/all/kagane/api.ts
  var MAX_SOURCE_FILTER = 50;
  function searchMangaUrl(apiUrl, page, sortParam) {
    const url = toHttpUrl(`${apiUrl}/search/series`).newBuilder();
    url.addQueryParameter("page", String(page - 1));
    url.addQueryParameter("size", String(35));
    if (sortParam !== "") url.addQueryParameter("sort", sortParam);
    return url.build();
  }
  function sortParamOf(filters) {
    let sortParam = "";
    for (const filter of filters) {
      if (filter instanceof SortFilter) sortParam = filter.toUriPart();
    }
    return sortParam;
  }
  async function searchMangaBody(query, filters, displayMode, langs, resolveStaff, resolveGroups) {
    const body = {};
    if (query.trim() !== "") {
      body["title"] = query;
    }
    body["source_type"] = displayMode === "official" ? ["Official"] : ["Official", "Unofficial", "Mixed"];
    let genresMatchAll = null;
    let tagsMatchAll = null;
    for (const filter of filters) {
      if (filter instanceof MatchAllGenresFilter) {
        genresMatchAll = filter.state ? true : null;
      } else if (filter instanceof MatchAllTagsFilter) {
        tagsMatchAll = filter.state ? true : null;
      }
    }
    for (const filter of filters) {
      if (filter instanceof GenresFilter) {
        filter.addToJsonObject(body, "genres", genresMatchAll);
      } else if (filter instanceof TagsSearchFilter) {
        const rawInput = filter.state.trim();
        if (rawInput !== "") {
          const tagEntries = rawInput.split(",").map((entry) => entry.trim()).filter((entry) => entry !== "");
          const includeIds = [];
          const excludeIds = [];
          for (const entry of tagEntries) {
            const isExclude = entry.startsWith("-");
            const tagName = isExclude ? entry.slice(1).trim() : entry;
            const tagId = filter.tagData[tagName.toLowerCase()];
            if (tagId !== void 0) {
              if (isExclude) excludeIds.push(tagId);
              else includeIds.push(tagId);
            }
          }
          if (includeIds.length > 0 || excludeIds.length > 0) {
            const tags = {};
            if (tagsMatchAll === true) {
              tags["match_all"] = true;
            }
            tags["values"] = includeIds;
            if (excludeIds.length > 0) {
              tags["exclude"] = excludeIds;
            }
            body["tags"] = tags;
          }
        }
      } else if (filter instanceof SourcesFilter) {
        if (filter.state.filter((option) => option.state).length > MAX_SOURCE_FILTER) {
          throw new Error(`Select at most ${MAX_SOURCE_FILTER} sources in the Sources filter`);
        }
        filter.addToJsonObject(body);
      } else if (filter instanceof StaffSearchFilter) {
        const [include, exclude] = await resolveStaff(filter.state);
        if (include.length > 0 || exclude.length > 0) {
          const staff = { values: [...new Set(include)] };
          if (exclude.length > 0) staff["exclude"] = [...new Set(exclude)];
          body["staff"] = staff;
        }
      } else if (filter instanceof GroupsSearchFilter) {
        const [include, exclude] = await resolveGroups(filter.state);
        if (include.length > 0 || exclude.length > 0) {
          const groups = { values: [...new Set(include)] };
          if (exclude.length > 0) groups["exclude"] = [...new Set(exclude)];
          body["groups"] = groups;
        }
      } else if (filter instanceof YearFilter) {
        const range = filter.parseRange();
        if (range !== null) {
          const year = {};
          if (range[0] !== null) year["min"] = range[0];
          if (range[1] !== null) year["max"] = range[1];
          body["start_year"] = year;
        }
      } else if (filter instanceof ChapterCountFilter) {
        const range = filter.parseRange();
        if (range !== null) {
          const books = {};
          if (range[0] !== null) books["min"] = range[0];
          if (range[1] !== null) books["max"] = range[1];
          body["current_books"] = books;
        }
      } else if (isJsonFilter(filter)) {
        filter.addToJsonObject(body);
      }
    }
    body["content_lang"] = langs;
    return body;
  }
  async function resolveMemberEntries(input, search) {
    const include = [];
    const exclude = [];
    for (const entry of input.split(",")) {
      const trimmed = entry.trim();
      if (trimmed === "") continue;
      const isExclude = trimmed.startsWith("-");
      const name = isExclude ? trimmed.slice(1).trim() : trimmed;
      if (name === "") continue;
      for (const id of await search(name)) {
        if (isExclude) exclude.push(id);
        else include.push(id);
      }
    }
    return [include, exclude];
  }
  function groupSearchUrl(apiUrl, name) {
    return toHttpUrl(`${apiUrl}/groups/search`).newBuilder().addQueryParameter("q", name).addQueryParameter("limit", "8").build();
  }
  function seriesUrl(apiUrl, seriesId) {
    return `${apiUrl}/series/${seriesId}`;
  }
  function bookIndexUrl(apiUrl, seriesId) {
    return `${apiUrl}/series/${seriesId}/books/index?fields=List`;
  }
  function trackerSeriesUrl(apiUrl, trackerId) {
    return `${apiUrl}/trackers/${trackerId}/series`;
  }
  function challengeUrl(apiUrl, chapterId) {
    return toHttpUrl(`${apiUrl}/books/${chapterId}`).newBuilder().addQueryParameter("intent", "Read").build();
  }
  function pageImageUrl(cacheUrl, dataSaver2, chapterId, file, token) {
    return toHttpUrl(`${cacheUrl}/api/v2/books/page`).newBuilder().addPathSegment(dataSaver2 ? "datasaver" : "original").addPathSegment(chapterId).addPathSegment(file).addQueryParameter("token", token).build().toString();
  }
  function withToken(url, token) {
    return url.newBuilder().setQueryParameter("token", token).build().toString();
  }

  // src/all/kagane/markdown.ts
  var MARKDOWN_INDENT = /^[ \t]+/gm;
  var MARKDOWN_INLINE = /[\\*_[\]<]/g;
  var MARKDOWN_BACKTICK = /`(?=[^`]*`)/g;
  var MARKDOWN_BLOCK = /^(?:>|#{1,6}(?=\s|$)|[-+](?=\s|$)|~{3}|[-=:|~][-=:|~ \t]*$)|(?<=^\d{1,9})[.)](?=\s|$)/gm;
  function escapeMarkdown(text) {
    return text.replace(MARKDOWN_INDENT, "").replace(MARKDOWN_INLINE, (match) => `\\${match}`).replace(MARKDOWN_BLOCK, (match) => `\\${match}`).replace(MARKDOWN_BACKTICK, (match) => `\\${match}`);
  }
  function encodeMarkdownUrl(url) {
    return url.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/`/g, "%60");
  }
  function markdownList(label, items) {
    const lines = items.filter((item) => item.trim() !== "");
    if (lines.length === 0) return null;
    return `**${escapeMarkdown(label)}:**
` + lines.map((line) => `- ${line}`).join("\n");
  }
  function ratingStars(rating, max = 10) {
    const halves = Math.min(10, Math.max(0, Math.ceil(rating * 10 / max - 0.5)));
    return "★".repeat(Math.trunc(halves / 2)) + "✬".repeat(halves % 2) + "☆".repeat(5 - Math.trunc((halves + 1) / 2));
  }
  var SEPARATOR = "---";
  var MarkdownDescriptionBuilder = class {
    constructor() {
      this.sections = [];
      this.lastIsInline = false;
      this.lastIsRating = false;
    }
    add(section) {
      if (section == null || section.trim() === "") return this;
      this.sections.push(section);
      this.lastIsInline = false;
      this.lastIsRating = false;
      return this;
    }
    addInline(text) {
      if (text == null || text.trim() === "") return this;
      if (this.lastIsRating) this.sections[this.sections.length - 1] += `
${text}`;
      else if (this.lastIsInline) this.sections[this.sections.length - 1] += ` · ${text}`;
      else this.sections.push(text);
      this.lastIsInline = true;
      this.lastIsRating = false;
      return this;
    }
    rating(rating, max = 10, votes = null) {
      if (rating == null || !Number.isFinite(rating)) return this;
      const number = String(Math.round(Number((rating * 100).toPrecision(15))) / 100);
      this.add(`${ratingStars(rating, max)} ${number}` + (votes != null ? ` (${votes})` : ""));
      this.lastIsRating = true;
      return this;
    }
    markdown(markdown) {
      return this.add(markdown?.trim());
    }
    field(label, value) {
      if (Array.isArray(value)) {
        return this.field(
          label,
          value.filter((item) => item.trim() !== "").map((item) => item.trim()).join(", ")
        );
      }
      const trimmed = value?.trim();
      return this.addInline(trimmed ? `**${escapeMarkdown(label)}:** ${escapeMarkdown(trimmed)}` : null);
    }
    altTitles(titles, label = "Alternative Names") {
      const items = [...new Set(titles.map((title) => title.trim()).filter((title) => title !== ""))].map(escapeMarkdown);
      return this.add(markdownList(label, items));
    }
    links(links, label = "Links") {
      return this.add(
        markdownList(
          label,
          links.flatMap(
            ([text, url]) => url != null && url.trim() !== "" ? [`[${escapeMarkdown(text)}](${encodeMarkdownUrl(url)})`] : []
          )
        )
      );
    }
    separator() {
      return this.add(SEPARATOR);
    }
    build() {
      const kept = [];
      for (const section of this.sections) {
        if (section !== SEPARATOR || kept.length > 0 && kept[kept.length - 1] !== SEPARATOR) kept.push(section);
      }
      if (kept[kept.length - 1] === SEPARATOR) kept.pop();
      const result = kept.join("\n\n");
      return result === "" ? null : result;
    }
  };

  // src/all/kagane/parse.ts
  function hasNextPage(dto) {
    return !(dto.last ?? true);
  }
  function bookToSManga(id, book, apiUrl, showSource2, sources, cleanTitle2) {
    const manga = SManga.create();
    manga.title = showSource2 && sources.size > 0 ? `${book.title.trim()} [${sources.get(book.source_id ?? "") ?? null}]` : clean(book.title, cleanTitle2);
    manga.url = id;
    manga.thumbnail_url = book.cover_image_id != null ? `${apiUrl}/image/${book.cover_image_id}` : null;
    return manga;
  }
  function staffIdsNamed(dto, name) {
    const lower = name.toLowerCase();
    return (dto.content ?? []).filter(
      (staff) => staff.name.toLowerCase() === lower || staff.native_name?.toLowerCase() === lower || (staff.alternate_names ?? []).some((alt) => alt.toLowerCase() === lower)
    ).map((staff) => staff.staff_id);
  }
  function groupIdsNamed(dto, name) {
    return (dto.items ?? []).filter((group) => group.title.toLowerCase() === name.toLowerCase()).map((group) => group.group_id);
  }
  function detailsToSManga(dto, apiUrl, sourceName, baseUrl, showEdition2, showSource2, showDetails2, cleanTitle2) {
    const manga = SManga.create();
    const base = dto.title.trim();
    const withEdition = showEdition2 && dto.edition_info?.trim() ? `${base} (${dto.edition_info})` : base;
    manga.title = showSource2 && sourceName != null ? `${withEdition} [${sourceName}]` : clean(withEdition, cleanTitle2);
    const covers = dto.series_covers ?? [];
    manga.thumbnail_url = covers.length > 0 ? `${apiUrl}/image/${covers[0].image_id}` : null;
    const seriesStaff = dto.series_staff ?? [];
    const byAuthorRoles = seriesStaff.filter((staff) => roleIs(staff, BOOK_CREATOR_ROLES));
    const byArtistRoles = seriesStaff.filter((staff) => roleIs(staff, ARTIST_ROLES));
    const builder = new MarkdownDescriptionBuilder();
    builder.markdown(dto.description != null ? parseHtml(dto.description.trim().replace(/\n/g, "<br>")).wholeText() : null);
    if (showDetails2) {
      const originalName = dto.original_language != null ? LANGUAGE_NAMES[dto.original_language] ?? null : null;
      builder.rating(dto.average_rating != null ? dto.average_rating / 10 : null, 10, dto.total_ratings ?? null);
      builder.field(
        "Content Rating",
        dto.age_rating != null ? toContentRating(dto.age_rating, dto.is_pornographic, dto.is_disturbing) : null
      );
      builder.field(
        "Followers",
        dto.subscriber_count != null && dto.subscriber_count > 0 ? toCompactCount(dto.subscriber_count) : null
      );
      builder.field("Format", dto.format);
      builder.field("Original Language", originalName);
      const translatedName = dto.translated_language != null ? LANGUAGE_NAMES[dto.translated_language] ?? null : null;
      builder.field("Translated Language", translatedName !== originalName ? translatedName : null);
      builder.field("Views", dto.total_views != null && dto.total_views > 0 ? toCompactCount(dto.total_views) : null);
      builder.field(
        "Volumes",
        dto.current_volumes != null && dto.current_volumes > 0 ? String(dto.current_volumes) : null
      );
      const start = dto.start_year != null && dto.start_year > 0 ? dto.start_year : null;
      builder.field(
        "Year",
        start == null ? null : dto.end_year != null && dto.end_year > start ? `${start}–${dto.end_year}` : `${start}`
      );
    }
    const others = seriesStaff.filter((staff) => !roleIs(staff, BOOK_CREATOR_ROLES) && !roleIs(staff, ARTIST_ROLES)).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    const byRole = /* @__PURE__ */ new Map();
    for (const staff of others) {
      const list = byRole.get(staff.role) ?? [];
      list.push(staff);
      byRole.set(staff.role, list);
    }
    for (const [role, members] of byRole) {
      builder.field(
        role,
        members.map((member) => displayWithNative(member.name, member.native_name))
      );
    }
    if (sourceName != null && dto.source_id != null) {
      builder.links([[sourceName, `${baseUrl}/sources/${dto.source_id}`]], "Source");
    }
    if (showDetails2) {
      const links = dto.series_links ?? [];
      const byLabel = (list) => list.map((link) => [link.label ?? link.url, link.url]);
      builder.links(byLabel(links.filter((link) => link.kind === "Official")), "Official Link(s)");
      builder.links(byLabel(links.filter((link) => link.kind === "Tracker")), "Tracker(s)");
      builder.links(
        byLabel(links.filter((link) => link.kind != null && link.kind !== "Official" && link.kind !== "Tracker")),
        "Other(s)"
      );
    }
    builder.altTitles(
      (dto.series_alternate_titles ?? []).map((title) => title.title),
      "Associated Name(s)"
    );
    manga.description = builder.build();
    manga.author = distinctByStaffId(byAuthorRoles).map((staff) => staff.name).join(", ");
    manga.artist = distinctByStaffId(byArtistRoles).map((staff) => staff.name).join(", ");
    manga.genre = (dto.genres ?? []).map((genre) => genre.genre_name).join(", ");
    manga.status = toStatus(dto.upload_status);
    return manga;
  }
  function distinctByStaffId(staff) {
    const seen = /* @__PURE__ */ new Set();
    return [...staff].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)).filter((member) => {
      if (seen.has(member.staff_id)) return false;
      seen.add(member.staff_id);
      return true;
    });
  }
  function toStatus(status) {
    switch (status.toUpperCase()) {
      case "ONGOING":
        return SManga.ONGOING;
      case "COMPLETED":
        return SManga.COMPLETED;
      case "HIATUS":
        return SManga.ON_HIATUS;
      case "ABANDONED":
        return SManga.CANCELLED;
      default:
        return SManga.UNKNOWN;
    }
  }
  var LANGUAGE_NAMES = {
    en: "English",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    es: "Spanish",
    "es-419": "Latin American Spanish",
    fr: "French",
    de: "German",
    pt: "Portuguese",
    "pt-BR": "Brazilian Portuguese",
    ru: "Russian",
    it: "Italian",
    id: "Indonesian",
    vi: "Vietnamese",
    th: "Thai",
    pl: "Polish",
    hi: "Hindi",
    ar: "Arabic"
  };
  var BOOK_CREATOR_ROLES = /* @__PURE__ */ new Set(["author", "story", "original creator"]);
  var ARTIST_ROLES = /* @__PURE__ */ new Set(["artist", "art"]);
  var CAMEL_CASE_WEIGHT = /(?<!^)([A-Z])/g;
  function toCompactCount(value) {
    const format = (n) => n.toFixed(1).replace(/\.0$/, "");
    if (value >= 1e9) return `${format(value / 1e9)}B`;
    if (value >= 1e6) return `${format(value / 1e6)}M`;
    if (value >= 1e3) return `${format(value / 1e3)}K`;
    return String(value);
  }
  function roleIs(staff, roles) {
    return roles.has(staff.role.trim().toLowerCase());
  }
  function displayWithNative(name, native) {
    return native == null || native.trim() === "" || native === name ? name : `${name} (${native})`;
  }
  function toContentRating(rating, isPornographic, isDisturbing) {
    let base;
    switch (rating) {
      case "Safe":
        base = "Safe";
        break;
      case "FifteenPlus":
        base = "Fifteen Plus";
        break;
      case "EighteenPlus":
        base = "Eighteen Plus";
        break;
      default:
        base = rating.replace(CAMEL_CASE_WEIGHT, " $1").trim();
    }
    const flags = [];
    if (isPornographic === true) flags.push("Pornographic");
    if (isDisturbing === true) flags.push("Disturbing");
    return flags.length === 0 ? base : `${base} (${flags.join(", ")})`;
  }
  function toBooks(index) {
    if (index.books.length !== index.count) throw new Error("Incomplete Kagane chapter index");
    return index.books.map((row) => {
      const values = /* @__PURE__ */ new Map();
      index.fields.forEach((field, i) => {
        if (i < row.length) values.set(field, row[i]);
      });
      const value = (key) => {
        if (!values.has(key)) throw new Error(`Key ${key} is missing in the map.`);
        return values.get(key);
      };
      const releasedAt = value("released_at");
      return {
        id: value("book_id"),
        title: value("title"),
        createdAt: releasedAt != null ? new Date(releasedAt * 1e3).toISOString() : null,
        pagesCount: value("page_count"),
        number: value("sort_no"),
        chapterNo: value("chapter_no"),
        volumeNo: value("volume_no"),
        groups: value("group_ix").map((ix) => index.groups[ix])
      };
    });
  }
  function parseChapterList(books, format, seriesId, chapterTitleMode2) {
    const useSourceChapterNumber = format !== null && ["Dark Horse Comics", "Flame Comics", "MangaDex", "Square Enix Manga"].includes(format);
    return [...books].sort((a, b) => b.number - a.number).map((book) => bookToSChapter(book, seriesId, useSourceChapterNumber, chapterTitleMode2));
  }
  function bookToSChapter(book, seriesId, useSourceChapterNumber = false, chapterTitleMode2 = "optional") {
    const chapter = SChapter.create();
    chapter.url = `/series/${seriesId}/reader/${book.id}`;
    chapter.name = buildChapterName(book, chapterTitleMode2);
    chapter.date_upload = book.createdAt != null ? parseIsoDate(book.createdAt) : 0;
    if (useSourceChapterNumber) {
      chapter.chapter_number = book.number;
    }
    let scanlator = book.groups.map((group) => group.title).join(", ");
    const stripped = book.title.trim().replace(METADATA_REGEX, "");
    const match = CHAPTER_GROUP_REGEX.exec(stripped);
    if (match !== null && match[0] === stripped) {
      const groupTag = match[1] ?? match[2];
      if (groupTag != null) scanlator += ` (${groupTag})`;
    }
    chapter.scanlator = scanlator;
    return chapter;
  }
  function isNullOrBlank(text) {
    return text == null || text.trim() === "";
  }
  function buildChapterName(book, mode = "optional") {
    const trimmedTitle = book.title.trim();
    const { chapterNo, volumeNo } = book;
    switch (mode) {
      case "optional":
        if (trimmedTitle === "" && isNullOrBlank(chapterNo) && !isNullOrBlank(volumeNo)) {
          return buildChapterName(book, "vol_chapter");
        }
        if (trimmedTitle === "" && !isNullOrBlank(chapterNo)) return `Ch.${chapterNo}`;
        return trimmedTitle;
      case "always":
        if (isNullOrBlank(chapterNo) && !isNullOrBlank(volumeNo)) return buildChapterName(book, "vol_chapter");
        if (trimmedTitle === "") return `Ch.${chapterNo}`;
        return `Ch.${chapterNo} ${trimmedTitle}`;
      case "vol_chapter":
      case "vol_local": {
        const volPart = !isNullOrBlank(volumeNo) ? `Vol.${volumeNo} ` : "";
        const chPart = !isNullOrBlank(chapterNo) ? `Ch.${chapterNo}` : "";
        const numPart = `${volPart}${chPart}`.trim();
        if (numPart === "") return trimmedTitle;
        if (trimmedTitle === "" || mode === "vol_local") return numPart;
        return `${numPart} ${trimmedTitle}`;
      }
      default:
        return trimmedTitle;
    }
  }
  function pageListParse(challenge, chapterId, dataSaver2) {
    const accessToken = challenge.access_token;
    return (challenge.manifest?.pages ?? []).map((page) => {
      const pageUrl = pageImageUrl(challenge.cache_url, dataSaver2, chapterId, `${page.page_id}.${page.ext ?? "jxl"}`, accessToken);
      return new Page(page.page_no, pageUrl, pageUrl);
    });
  }
  function genresParse(genres) {
    const map = {};
    for (const genre of genres) map[genre.id] = genre.genre_name;
    return map;
  }
  function tagsParse(tags) {
    const map = {};
    for (const tag of tags) map[tag.tag_name.toLowerCase()] = tag.id;
    return map;
  }
  var BRACKET_REGEX = /(\([^()]*\)|\[[^[\]]*\])\s*$/;
  var METADATA_REGEX = /(?:\s*\{[^{}]*\})+\s*$/;
  var CHAPTER_GROUP_REGEX = /^Chapter\s+.*(?:-\s*Volume\s+.*\(([^()]+)\)|\[([^[\]]+)\])\s*$/i;
  function clean(text, removeExtras) {
    return removeExtras ? text.replace(BRACKET_REGEX, "").trim() : text.trim();
  }

  // src/all/kagane/settings.ts
  var CONTENT_RATING = "pref_content_rating";
  var CONTENT_RATING_DEFAULT = "safe";
  var PORN_PREF = "pref_show_pornographic";
  var DISTURBING_PREF = "pref_show_disturbing";
  var GENRES_ID_PREF = "pref_genre_id_exclude";
  var FORMATS_PREF = "pref_format_exclude";
  var SOURCE_DISPLAY_MODE = "pref_source_display_mode";
  var SOURCE_DISPLAY_MODE_DEFAULT = "all";
  var CLEAN_TITLE = "pref_clean_title";
  var CLEAN_TITLE_DEFAULT = false;
  var SHOW_SOURCE = "pref_show_source";
  var SHOW_SOURCE_DEFAULT = false;
  var SHOW_EDITION = "pref_show_edition";
  var SHOW_EDITION_DEFAULT = false;
  var SHOW_DETAILS = "pref_show_details";
  var SHOW_DETAILS_DEFAULT = true;
  var DATA_SAVER = "data_saver_default";
  var CHAPTER_TITLE_MODE = "chapter_title_mode";
  var CHAPTER_TITLE_MODE_DEFAULT = "optional";
  var CHAPTER_TITLE_MODES = ["optional", "always", "vol_local", "vol_chapter"];
  var CHAPTER_TITLE_MODE_NAMES = [
    "Title only (e.g. 'Manga Title' / 'Ch.5')",
    "Ch.X + title (e.g. 'Ch.5 Manga Title')",
    "Vol.X Ch.Y (e.g. 'Vol.1 Ch.5')",
    "Vol.X Ch.Y + title (e.g. 'Vol.1 Ch.5 Manga Title')"
  ];
  function setupPreferenceScreen(screen, preferences, genreMap) {
    screen.addPreference(
      new ListPreference({
        key: CONTENT_RATING,
        title: "Content Rating",
        entries: CONTENT_RATINGS.map((it) => CONTENT_RATING_LABELS[it]),
        entryValues: CONTENT_RATINGS,
        summary: "%s",
        defaultValue: CONTENT_RATING_DEFAULT
      })
    );
    screen.addPreference(
      new SwitchPreferenceCompat({
        key: PORN_PREF,
        title: "Show pornographic",
        summary: "Sexually explicit content",
        defaultValue: true
      })
    );
    screen.addPreference(
      new SwitchPreferenceCompat({
        key: DISTURBING_PREF,
        title: "Show disturbing",
        summary: "Series marked disturbing, such as graphic violence or abuse",
        defaultValue: true
      })
    );
    const excludedGenres = excludedGenreIds(preferences);
    screen.addPreference(
      new MultiSelectListPreference({
        key: GENRES_ID_PREF,
        title: "Exclude Genres",
        entries: [...genreMap.values()],
        entryValues: [...genreMap.keys()],
        summary: [...genreMap.keys()].filter((id) => excludedGenres.has(id)).map((id) => genreMap.get(id)).join(", "),
        defaultValue: []
      })
    );
    const excludedFormatSet = excludedFormats(preferences);
    screen.addPreference(
      new MultiSelectListPreference({
        key: FORMATS_PREF,
        title: "Exclude Formats",
        entries: FORMAT_OPTIONS,
        entryValues: FORMAT_OPTIONS,
        summary: FORMAT_OPTIONS.filter((it) => excludedFormatSet.has(it)).join(", "),
        defaultValue: []
      })
    );
    screen.addPreference(
      new ListPreference({
        key: SOURCE_DISPLAY_MODE,
        title: "Source Display Selection",
        summary: "%s",
        entries: ["Show All (Official + Scanlations)", "Official Sources Only"],
        entryValues: ["all", "official"],
        defaultValue: SOURCE_DISPLAY_MODE_DEFAULT
      })
    );
    screen.addPreference(
      new SwitchPreferenceCompat({ key: SHOW_EDITION, title: "Show edition name in title", defaultValue: SHOW_EDITION_DEFAULT })
    );
    screen.addPreference(
      new SwitchPreferenceCompat({ key: SHOW_SOURCE, title: "Show source name in title", defaultValue: SHOW_SOURCE_DEFAULT })
    );
    screen.addPreference(
      new SwitchPreferenceCompat({
        key: CLEAN_TITLE,
        title: "Clean title",
        summary: "Removes extra brackets or parentheses in title (Disables others)",
        defaultValue: CLEAN_TITLE_DEFAULT
      })
    );
    screen.addPreference(
      new SwitchPreferenceCompat({
        key: SHOW_DETAILS,
        title: "Show details in description",
        summary: "Rating, content rating, format, languages, year, volumes, views and links",
        defaultValue: SHOW_DETAILS_DEFAULT
      })
    );
    screen.addPreference(new SwitchPreferenceCompat({ key: DATA_SAVER, title: "Data saver", defaultValue: false }));
    screen.addPreference(
      new ListPreference({
        key: CHAPTER_TITLE_MODE,
        title: "Chapter title format",
        entries: CHAPTER_TITLE_MODE_NAMES,
        entryValues: CHAPTER_TITLE_MODES,
        summary: "How the chapter title should be displayed",
        defaultValue: CHAPTER_TITLE_MODE_DEFAULT
      })
    );
  }
  function contentRating(preferences) {
    const stored = removeLegacyRating(preferences.getString(CONTENT_RATING, ""));
    const maxRating = stored ?? CONTENT_RATING_DEFAULT;
    const index = CONTENT_RATINGS.indexOf(maxRating);
    return CONTENT_RATINGS.slice(0, Math.max(index, 0) + 1);
  }
  function showPornographic(preferences) {
    const ratings = contentRating(preferences);
    return ratings[ratings.length - 1] === "eighteenplus" && preferences.getBoolean(PORN_PREF, false);
  }
  function showDisturbing(preferences) {
    const ratings = contentRating(preferences);
    return ratings[ratings.length - 1] === "eighteenplus" && preferences.getBoolean(DISTURBING_PREF, false);
  }
  function excludedGenreIds(preferences) {
    return preferences.getStringSet(GENRES_ID_PREF, []);
  }
  function excludedFormats(preferences) {
    return preferences.getStringSet(FORMATS_PREF, []);
  }
  function sourceDisplayMode(preferences) {
    return preferences.getString(SOURCE_DISPLAY_MODE, SOURCE_DISPLAY_MODE_DEFAULT);
  }
  function cleanTitle(preferences) {
    return preferences.getBoolean(CLEAN_TITLE, CLEAN_TITLE_DEFAULT);
  }
  function showEdition(preferences) {
    return !cleanTitle(preferences) && preferences.getBoolean(SHOW_EDITION, SHOW_EDITION_DEFAULT);
  }
  function showSource(preferences) {
    return !cleanTitle(preferences) && preferences.getBoolean(SHOW_SOURCE, SHOW_SOURCE_DEFAULT);
  }
  function showDetails(preferences) {
    return preferences.getBoolean(SHOW_DETAILS, SHOW_DETAILS_DEFAULT);
  }
  function dataSaver(preferences) {
    return preferences.getBoolean(DATA_SAVER, false);
  }
  function chapterTitleMode(preferences) {
    return preferences.getString(CHAPTER_TITLE_MODE, CHAPTER_TITLE_MODE_DEFAULT);
  }
  function removeLegacyRating(value) {
    switch (value) {
      case "safe":
      case "fifteenplus":
      case "eighteenplus":
        return value;
      case "suggestive":
        return "fifteenplus";
      case "erotica":
      case "pornographic":
        return "eighteenplus";
      default:
        return null;
    }
  }

  // src/all/kagane/tokens.ts
  var TOKEN_REFRESH_INTERVAL_MS = 6e4;
  var PageTokens = class {
    constructor() {
      this.tokens = /* @__PURE__ */ new Map();
    }
    get(chapterId) {
      return this.tokens.get(chapterId);
    }
    put(chapterId, token) {
      this.tokens.delete(chapterId);
      this.tokens.set(chapterId, token);
      while (this.tokens.size > 16) {
        this.tokens.delete(this.tokens.keys().next().value);
      }
    }
    /**
     * Upstream's `refreshToken`, called by the interceptor after the image host rejects a token;
     * `fetchToken` answers the book's read challenge. Kept for when the SDK can retry image
     * requests; nothing calls it yet.
     */
    async refreshToken(chapterId, rejected, fetchToken) {
      const known = this.get(chapterId);
      if (known !== void 0 && known.value !== rejected) return known.value;
      const now = Date.now();
      if (known !== void 0 && now - known.issuedAt < TOKEN_REFRESH_INTERVAL_MS) {
        throw new Error("Failed to retrieve token");
      }
      this.put(chapterId, { value: rejected, issuedAt: now });
      let token;
      try {
        token = await fetchToken();
      } catch {
        throw new Error("Failed to retrieve token");
      }
      this.put(chapterId, { value: token, issuedAt: now });
      return token;
    }
  };

  // src/all/kagane/index.ts
  var LINK_HOSTS = /* @__PURE__ */ new Set(["kagane.cx", "kagane.moe", "kagane.net"]);
  var Kagane = class extends KeiSource {
    constructor(lang) {
      super();
      this.lang = lang;
      this.name = "Kagane";
      // Upstream picks a mirror from the hub (fetchBaseUrls); the SDK has a fixed base URL.
      this.baseUrl = "https://kagane.moe";
      this.mangaMemo = /* @__PURE__ */ new Map();
      // Tokens are valid for one book only
      this.pageTokens = new PageTokens();
      this.integrityToken = "";
      this.integrityExp = 0;
      // ============================= Filters ==============================
      this.filterCache = new FilterDataCache(this, () => this.fetchFilterData());
      this.sourceCache = null;
    }
    get kaganeLangs() {
      return [this.lang];
    }
    get apiUrl() {
      return `${this.baseUrl}/api/v2`;
    }
    configureClient(builder) {
      builder.rateLimit(3);
    }
    /**
     * The first half of upstream's `refreshTokenInterceptor`: page URLs carry the book's token, and
     * the newest token known for the book replaces it. Upstream also asks for a new token when the
     * image host answers 401/403/507; the SDK has no hook on image responses for that.
     *
     * `imageFetch = Fetch.XHR` upstream: the image host 404s without the site's Origin.
     */
    getImageRequest(page) {
      if (!page.imageUrl) throw new Error(`Page ${page.index + 1} has no image URL`);
      let url = page.imageUrl;
      const parsed = toHttpUrl(url);
      const urlToken = parsed.queryParameter("token");
      if (urlToken !== null) {
        const segments = parsed.pathSegments;
        const chapterId = segments[segments.length - 2];
        url = withToken(parsed, this.pageTokens.get(chapterId)?.value ?? urlToken);
      }
      return { url, headers: { ...this.headers, Origin: this.baseUrl } };
    }
    // ========================= Popular and latest =========================
    async getPopularManga(page) {
      return this.getSearchMangaList(page, "", [new SortFilter({ index: 1, ascending: false }), ...this.preferenceFilters()]);
    }
    async getLatestUpdates(page) {
      return this.getSearchMangaList(page, "", [new SortFilter({ index: 6, ascending: false }), ...this.preferenceFilters()]);
    }
    /** The filters popular and latest take from the settings. */
    preferenceFilters() {
      const prefs = this.preferences;
      return [
        new ContentRatingFilter(new Set(contentRating(prefs)), showPornographic(prefs), showDisturbing(prefs)),
        new FormatFilter(excludedFormats(prefs)),
        new GenresFilter([], excludedGenreIds(prefs))
      ];
    }
    // =============================== Search ===============================
    async getSearchMangaList(page, query, filters) {
      const sortParam = sortParamOf(filters);
      const body = await searchMangaBody(
        query,
        filters,
        sourceDisplayMode(this.preferences),
        this.kaganeLangs,
        (input) => resolveMemberEntries(input, (name) => this.searchStaff(name)),
        (input) => resolveMemberEntries(input, (name) => this.searchGroups(name))
      );
      const response = await this.client.post(searchMangaUrl(this.apiUrl, page, sortParam), jsonBody(body), Fetch.XHR);
      const dto = response.parseAs();
      const sources = this.sources;
      const showSource2 = showSource(this.preferences);
      const cleanTitle2 = cleanTitle(this.preferences);
      const mangas = (dto.content ?? []).map((book) => bookToSManga(book.series_id, book, this.apiUrl, showSource2, sources, cleanTitle2));
      return new MangasPage(mangas, hasNextPage(dto));
    }
    async searchStaff(name) {
      const response = await this.client.post(`${this.apiUrl}/search/staff`, jsonBody({ name }), Fetch.XHR);
      return staffIdsNamed(response.parseAs(), name);
    }
    async searchGroups(name) {
      const response = await this.client.get(groupSearchUrl(this.apiUrl, name), Fetch.XHR);
      return groupIdsNamed(response.parseAs(), name);
    }
    // ====================== Manga Details + Chapters ======================
    async getMangaById(seriesId) {
      return (await this.client.get(seriesUrl(this.apiUrl, seriesId), Fetch.XHR)).parseAs();
    }
    async getMangaByUrl(url) {
      if (!LINK_HOSTS.has(url.host)) return null;
      const segments = url.pathSegments;
      if (segments.length < 2 || segments[0] !== "series") return null;
      const seriesId = segments[1].slice(-36);
      const dto = await this.getMangaById(seriesId);
      const manga = this.parseMangaDetails(dto);
      manga.url = seriesId;
      manga.initialized = true;
      this.rememberManga(seriesId, dto);
      return manga;
    }
    parseMangaDetails(details) {
      const prefs = this.preferences;
      const sourceName = details.source_id != null ? this.sources.get(details.source_id) ?? null : null;
      return detailsToSManga(
        details,
        this.apiUrl,
        sourceName,
        this.baseUrl,
        showEdition(prefs),
        showSource(prefs),
        showDetails(prefs),
        cleanTitle(prefs)
      );
    }
    rememberManga(seriesId, dto) {
      const memo = { format: dto.format ?? "" };
      if (dto.tracker_id != null && dto.tracker_id !== "") memo.trackerId = dto.tracker_id;
      if (dto.slug != null && dto.slug.trim() !== "") memo.slug = dto.slug;
      this.mangaMemo.set(seriesId, memo);
      return memo;
    }
    getMangaUrl(manga) {
      const slug = this.mangaMemo.get(manga.url)?.slug;
      const seriesSegment = slug != null ? `${slug}-${manga.url}` : manga.url;
      return `${this.baseUrl}/series/${seriesSegment}`;
    }
    async fetchMangaUpdate(manga, chapters, fetchDetails, fetchChapters) {
      const seriesId = manga.url;
      let updatedManga = manga;
      if (fetchDetails) {
        const dto = await this.getMangaById(seriesId);
        updatedManga = this.parseMangaDetails(dto);
        this.rememberManga(seriesId, dto);
      }
      let updatedChapters = chapters;
      if (fetchChapters) {
        const index = (await this.client.get(bookIndexUrl(this.apiUrl, seriesId), Fetch.XHR)).parseAs();
        const titleMode = chapterTitleMode(this.preferences);
        updatedChapters = parseChapterList(toBooks(index), this.chapterFormat(seriesId, updatedManga), seriesId, titleMode);
      }
      return new SMangaUpdate(updatedManga, updatedChapters);
    }
    chapterFormat(seriesId, manga) {
      const format = this.mangaMemo.get(seriesId)?.format;
      if (format != null && format.trim() !== "") return format;
      return manga.genre != null ? manga.genre.split(", ")[0] : null;
    }
    getChapterUrl(chapter) {
      const parts = chapter.url.split("/");
      const slug = parts.length === 5 ? this.mangaMemo.get(parts[2].slice(-36))?.slug : void 0;
      if (slug == null || parts.length !== 5) return `${this.baseUrl}${chapter.url}`;
      return `${this.baseUrl}/series/${slug}-${parts[2].slice(-36)}/reader/${parts[4]}`;
    }
    // =========================== Related Manga ============================
    /** Upstream's `fetchRelatedMangaList`; the SDK has no related-manga call yet. */
    async fetchRelatedMangaList(manga) {
      const trackerId = this.mangaMemo.get(manga.url)?.trackerId;
      if (trackerId == null) return [];
      const response = await this.client.get(trackerSeriesUrl(this.apiUrl, trackerId), Fetch.XHR);
      const sources = this.sources;
      const showSource2 = showSource(this.preferences);
      const cleanTitle2 = cleanTitle(this.preferences);
      return (response.parseAs().book_series ?? []).map((book) => bookToSManga(book.id, book, this.apiUrl, showSource2, sources, cleanTitle2));
    }
    // =============================== Pages ================================
    async getPageList(chapter) {
      if (chapter.url.includes(";")) {
        throw new Error("Outdated chapter URL. Please refresh the chapter list");
      }
      const segments = toHttpUrl(`${this.baseUrl}${chapter.url}`).pathSegments;
      const chapterId = segments[segments.length - 1].slice(-36);
      const challengeResp = await this.getChallengeResponse(chapterId);
      this.pageTokens.put(chapterId, { value: challengeResp.access_token, issuedAt: Date.now() });
      return pageListParse(challengeResp, chapterId, dataSaver(this.preferences));
    }
    /** Upstream's `refreshToken`; see tokens.ts. */
    async refreshToken(chapterId, rejected) {
      return this.pageTokens.refreshToken(chapterId, rejected, async () => (await this.getChallengeResponse(chapterId)).access_token);
    }
    async getIntegrityToken() {
      if (this.integrityExp < Date.now()) {
        const res = (await this.client.post(`${this.baseUrl}/api/integrity`, jsonBody(""), Fetch.XHR)).parseAs();
        this.integrityToken = res.token;
        this.integrityExp = res.exp * 1e3;
      }
      return this.integrityToken;
    }
    async getChallengeResponse(chapterId) {
      const integrityToken = await this.getIntegrityToken();
      const response = await this.client.post(challengeUrl(this.apiUrl, chapterId), null, {
        headers: { "x-integrity-token": integrityToken },
        fetch: Fetch.XHR
      });
      return response.parseAs();
    }
    // ============================ Preferences =============================
    setupPreferenceScreen(screen) {
      const genreFilter = this.getFilterList().find((filter) => filter instanceof GenresFilter);
      const genreMap = new Map(
        (genreFilter?.state ?? []).map((option) => [option.id, option.name.charAt(0).toUpperCase() + option.name.slice(1)])
      );
      setupPreferenceScreen(screen, this.preferences, genreMap);
    }
    async fetchFilterData() {
      const [genres, tags, sources] = await Promise.all([
        this.client.get(`${this.apiUrl}/genres/list`, Fetch.XHR).then((response) => genresParse(response.parseAs())),
        this.client.get(`${this.apiUrl}/tags/list`, Fetch.XHR).then((response) => tagsParse(response.parseAs())),
        this.client.post(`${this.apiUrl}/sources/list`, jsonBody({ source_types: null }), Fetch.XHR).then((response) => response.parseAs().sources)
      ]);
      return { genres, tags, sources };
    }
    get sources() {
      if (this.sourceCache === null || this.sourceCache.size === 0) {
        this.getFilterList();
      }
      return this.sourceCache ?? (this.sourceCache = /* @__PURE__ */ new Map());
    }
    getFilterList() {
      const meta = this.filterCache.read();
      const prefs = this.preferences;
      const filters = [
        new SortFilter(),
        new ContentRatingFilter(new Set(contentRating(prefs)), showPornographic(prefs), showDisturbing(prefs)),
        new FormatFilter(excludedFormats(prefs)),
        new PublicationStatusFilter(),
        new Separator()
      ];
      if (meta !== null) {
        this.sourceCache = new Map(meta.sources.map((source) => [source.source_id, source.title]));
        const displayMode = sourceDisplayMode(prefs);
        const validSources = meta.sources.filter(
          (source) => displayMode === "official" ? source.source_type.toLowerCase() === "official" : true
        );
        const sourceFilters = validSources.map((source) => new FilterData(source.source_id, source.title)).sort((a, b) => compare(a.name, b.name));
        filters.push(
          new GenresFilter(getGenresList(meta), excludedGenreIds(prefs)),
          new MatchAllGenresFilter(),
          new TagsSearchFilter(meta.tags),
          new MatchAllTagsFilter(),
          new SourcesFilter(sourceFilters),
          new Separator()
        );
      }
      filters.push(new YearFilter(), new ChapterCountFilter(), new StaffSearchFilter(), new GroupsSearchFilter());
      if (meta === null) filters.push(new Separator(), new Header(FILTER_FETCH_HINT));
      return filters;
    }
  };
  var LANGS = ["en", "ja", "ko", "zh", "es", "es-419", "fr", "de", "pt", "pt-BR", "ru", "it", "id", "vi", "th", "pl", "hi", "ar"];
  var index_default = defineExtension(LANGS.map((lang) => new Kagane(lang)));
  return __toCommonJS(index_exports);
})();
