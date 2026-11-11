// Comix 1 for tachiyomi-ios. Ported from keiyoushi/extensions-source (Apache-2.0).
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

  // src/en/comix/index.ts
  var index_exports = {};
  __export(index_exports, {
    bootstrapScript: () => bootstrapScript,
    browseFlow: () => browseFlow,
    chaptersFlow: () => chaptersFlow,
    default: () => index_default,
    readerFlow: () => readerFlow
  });

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

  // sdk/src/host.ts
  function host() {
    if (typeof __host === "undefined") {
      throw new Error("The tachiyomi-ios host API is not available here");
    }
    return __host;
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
      return this.native.attr(name);
    }
    hasAttr(name) {
      return this.native.hasAttr(name);
    }
    absUrl(name) {
      return this.native.absUrl(name);
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
    parseAs() {
      return JSON.parse(this.body);
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
            reject(new HttpError(error ?? "No response"));
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
          (error) => callback(describeError(error), null)
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

  // sdk/src/utils.ts
  function substringBefore(text, delimiter, missing = text) {
    const index = text.indexOf(delimiter);
    return index < 0 ? missing : text.slice(0, index);
  }
  function removePrefix(text, prefix) {
    return text.startsWith(prefix) ? text.slice(prefix.length) : text;
  }
  function removeSuffix(text, suffix) {
    return text.endsWith(suffix) ? text.slice(0, text.length - suffix.length) : text;
  }
  function runWebView(options) {
    const native = host();
    if (!native.webview) return Promise.reject(new Error("This app version has no WebView for extensions"));
    return new Promise((resolve, reject) => {
      native.webview(JSON.stringify({ timeoutMs: 3e4, ...options }), (error, json) => {
        if (error !== null || json === null) reject(new Error(error ?? "WebView failed"));
        else resolve(JSON.parse(json));
      });
    });
  }

  // src/en/comix/assets.ts
  var HARVEST_BROWSE = `(() => {
    "use strict";

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const waitFor = async (check, { timeoutMs = 30000, intervalMs = 250 } = {}) => {
        const deadline = Date.now() + timeoutMs;
        for (;;) {
            let value = null;
            try { value = check(); } catch (e) { value = null; }
            if (value) return value;
            if (Date.now() >= deadline) return null;
            await sleep(Math.min(intervalMs, Math.max(1, deadline - Date.now())));
        }
    };
    const waitForStable = async (probe, { timeoutMs = 30000, intervalMs = 300, stableRounds = 2 } = {}) => {
        const deadline = Date.now() + timeoutMs;
        let lastSignature = null;
        let stable = 0;
        let value = null;
        while (Date.now() < deadline) {
            value = probe();
            const signature = JSON.stringify(value);
            if (signature === lastSignature) {
                if (++stable >= stableRounds) return value;
            } else {
                stable = 0;
                lastSignature = signature;
            }
            await sleep(intervalMs);
        }
        return value;
    };
    const readInitialData = (doc) => {
        const candidates = [];
        const byId = doc.querySelector("script#initial-data");
        if (byId) candidates.push(byId);
        for (const script of doc.querySelectorAll('script[type="application/json"]')) {
            if (script !== byId) candidates.push(script);
        }
        for (const script of candidates) {
            try {
                const data = JSON.parse(script.textContent || "null");
                if (data && typeof data === "object") return data;
            } catch (e) {  }
        }
        return null;
    };
    const walkJson = (data, visit, maxDepth = 12) => {
        const stack = [[data, 0]];
        while (stack.length) {
            const [value, depth] = stack.pop();
            visit(value, depth);
            if (depth >= maxDepth || !value || typeof value !== "object") continue;
            const children = Array.isArray(value) ? value : Object.values(value);
            for (let i = children.length - 1; i >= 0; i--) stack.push([children[i], depth + 1]);
        }
    };
    const findObjects = (data, pred) => {
        const found = [];
        walkJson(data, (value) => {
            if (value && typeof value === "object" && !Array.isArray(value) && pred(value)) {
                found.push(value);
            }
        });
        return found;
    };
    const findListParams = (data) => {
        const paramObjects = findObjects(data, (o) =>
            typeof o.page === "number" &&
            (typeof o.limit === "number" || typeof o.perPage === "number"));
        if (!paramObjects.length) return null;
        const params = paramObjects[0];
        const container = findObjects(data, (o) => o.params === params && typeof o.perPage === "number")[0];
        return { params, perPage: container ? container.perPage : null };
    };
    const MANGA_PATH = /^\\/title\\/([a-z0-9]+)-/i;
    const CHAPTER_PATH = /^\\/title\\/([a-z0-9]+)-[^/]+\\/(\\d+)-chapter-(\\d+(?:\\.\\d+)?)/i;
    const pathOf = (href) => {
        if (!href) return "";
        if (/^https?:\\/\\//i.test(href)) {
            try { return new URL(href).pathname; } catch (e) { return href; }
        }
        return href.split(/[?#]/)[0];
    };
    const parseMangaPath = (path) => {
        const match = MANGA_PATH.exec(path || "");
        return match ? { hid: match[1] } : null;
    };
    const parseChapterPath = (path) => {
        const match = CHAPTER_PATH.exec(path || "");
        return match ? { hid: match[1], id: Number(match[2]), number: parseFloat(match[3]) } : null;
    };
    const textOf = (el) => (el && el.textContent ? el.textContent : "").replace(/\\s+/g, " ").trim();
    const imageSrc = (img) => {
        const src = img.getAttribute("src") || "";
        const lazy = img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || "";
        if (lazy && (!src || src.startsWith("data:"))) return lazy;
        return src || lazy || null;
    };

    const OPTIONS = Object.assign(
        { timeoutMs: 30000, pollMs: 250, stableRounds: 2 },
        window.__comixHarvestOptions || {});

    const cardRoot = (anchor) => {
        let el = anchor;
        for (let depth = 0; el && depth < 5; depth++) {
            if (el.querySelector && el.querySelector("img")) return el;
            el = el.parentElement;
        }
        return anchor;
    };

    const bestTitle = (entry) => {
        const candidates = [];
        for (const anchor of entry.anchors) {
            const img = anchor.querySelector("img");
            if (img) candidates.push((img.getAttribute("alt") || "").trim());
            candidates.push(textOf(anchor));
            candidates.push((anchor.getAttribute("aria-label") || "").trim());
            candidates.push((anchor.getAttribute("title") || "").trim());
        }
        const usable = candidates.filter((t) => t && t.length >= 2 && t.length <= 140);
        if (usable.length) return usable[0];
        const slug = (entry.url.split("/").pop() || "").replace(/^[a-z0-9]+-/i, "");
        const words = slug.replace(/-/g, " ").trim();
        return words ? words.replace(/\\b\\w/g, (c) => c.toUpperCase()) : "";
    };

    const collect = () => {
        const byHid = new Map();
        for (const anchor of Array.from(document.querySelectorAll("a[href]"))) {
            const path = pathOf(anchor.getAttribute("href") || "");
            const manga = parseMangaPath(path);
            if (!manga || parseChapterPath(path)) continue;
            let entry = byHid.get(manga.hid);
            if (!entry) {
                entry = { hid: manga.hid, url: path, anchors: [], cover: null };
                byHid.set(manga.hid, entry);
            }
            entry.anchors.push(anchor);
            if (!entry.cover) {
                const card = cardRoot(anchor);
                const img = card ? card.querySelector("img") : null;
                if (img) entry.cover = imageSrc(img);
            }
        }
        return Array.from(byHid.values()).map((entry) => ({
            hid: entry.hid,
            url: entry.url,
            title: bestTitle(entry),
            cover: entry.cover,
        }));
    };

    const harvest = async () => {
        const data = readInitialData(document);
        const list = data ? findListParams(data) : null;
        let items = collect();
        if (!items.length) {

            await waitFor(() => collect().length > 0 || null,
                { timeoutMs: OPTIONS.timeoutMs, intervalMs: OPTIONS.pollMs });
            items = collect();
        }
        if (items.length) {

            items = await waitForStable(collect,
                { timeoutMs: Math.min(OPTIONS.timeoutMs, 8000), intervalMs: OPTIONS.pollMs, stableRounds: OPTIONS.stableRounds }) || items;
        }
        const lateData = readInitialData(document);
        const lateList = lateData ? findListParams(lateData) : null;
        const finalList = lateList || list;
        return {
            page: "browse",
            listParams: finalList ? finalList.params : null,
            perPage: finalList ? finalList.perPage : null,
            count: items.length,
            items,
        };
    };

    const done = (result) => {
        window.__comixHarvest = result;
        console.log("[comix-harvest:browse] " + JSON.stringify(result));
    };
    window.__comixHarvestPromise = (async () => {
        try {
            const result = await harvest();
            done(result);
            return result;
        } catch (e) {
            const result = { page: "browse", error: String((e && e.message) || e), items: [], count: 0 };
            done(result);
            return result;
        }
    })();
})();
`;
  var HARVEST_CHAPTERS = `(() => {
    "use strict";

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const waitFor = async (check, { timeoutMs = 30000, intervalMs = 250 } = {}) => {
        const deadline = Date.now() + timeoutMs;
        for (;;) {
            let value = null;
            try { value = check(); } catch (e) { value = null; }
            if (value) return value;
            if (Date.now() >= deadline) return null;
            await sleep(Math.min(intervalMs, Math.max(1, deadline - Date.now())));
        }
    };
    const readInitialData = (doc) => {
        const candidates = [];
        const byId = doc.querySelector("script#initial-data");
        if (byId) candidates.push(byId);
        for (const script of doc.querySelectorAll('script[type="application/json"]')) {
            if (script !== byId) candidates.push(script);
        }
        for (const script of candidates) {
            try {
                const data = JSON.parse(script.textContent || "null");
                if (data && typeof data === "object") return data;
            } catch (e) {  }
        }
        return null;
    };
    const walkJson = (data, visit, maxDepth = 12) => {
        const stack = [[data, 0]];
        while (stack.length) {
            const [value, depth] = stack.pop();
            visit(value, depth);
            if (depth >= maxDepth || !value || typeof value !== "object") continue;
            const children = Array.isArray(value) ? value : Object.values(value);
            for (let i = children.length - 1; i >= 0; i--) stack.push([children[i], depth + 1]);
        }
    };
    const findObjects = (data, pred) => {
        const found = [];
        walkJson(data, (value) => {
            if (value && typeof value === "object" && !Array.isArray(value) && pred(value)) {
                found.push(value);
            }
        });
        return found;
    };
    const anchoredNumber = (data, anchor) => {
        let best = null;
        let bestCount = Infinity;
        for (const obj of findObjects(data, (o) => Object.values(o).some((v) => v === anchor))) {
            const numbers = Object.values(obj).filter((v) => typeof v === "number" && isFinite(v));
            if (numbers.length && numbers.length < bestCount) {
                best = numbers[0];
                bestCount = numbers.length;
            }
        }
        return best;
    };
    const MANGA_PATH = /^\\/title\\/([a-z0-9]+)-/i;
    const CHAPTER_PATH = /^\\/title\\/([a-z0-9]+)-[^/]+\\/(\\d+)-chapter-(\\d+(?:\\.\\d+)?)/i;
    const pathOf = (href) => {
        if (!href) return "";
        if (/^https?:\\/\\//i.test(href)) {
            try { return new URL(href).pathname; } catch (e) { return href; }
        }
        return href.split(/[?#]/)[0];
    };
    // Recommended titles, chapters and other links off this page
    const leavesPage = (el) => {
        const path = pathOf(el.getAttribute("href") || "");
        return path !== "" && path !== location.pathname;
    };
    const parseMangaPath = (path) => {
        const match = MANGA_PATH.exec(path || "");
        return match ? { hid: match[1] } : null;
    };
    const parseChapterPath = (path) => {
        const match = CHAPTER_PATH.exec(path || "");
        return match ? { hid: match[1], id: Number(match[2]), number: parseFloat(match[3]) } : null;
    };
    const textOf = (el) => (el && el.textContent ? el.textContent : "").replace(/\\s+/g, " ").trim();
    // The signed-in hero "Resume Ch. N" link also points at a chapter
    const isChapterRow = (anchor) => !!anchor.closest("li");

    const OPTIONS = Object.assign(
        { timeoutMs: 45000, settleMs: 5000, pollMs: 100, maxRounds: 40, stopAtIds: [] },
        window.__comixHarvestOptions || {});
    const stopAt = new Set((OPTIONS.stopAtIds || []).map(Number));

    const rowRoot = (anchor) => {
        let el = anchor;
        for (let depth = 0; depth < 4 && el.parentElement; depth++) {
            const parent = el.parentElement;
            const links = Array.from(parent.querySelectorAll("a[href]"))
                .filter((x) => parseChapterPath(pathOf(x.getAttribute("href") || "")));
            if (links.length !== 1) break;
            el = parent;
        }
        return el;
    };

    // "Ch.<n>", then the name
    const nameOf = (anchor) => Array.from(anchor.children).slice(1).map(textOf).join(" ").trim();

    // The group, or the uploader when there is none
    const groupOf = (row) => {
        if (!row) return null;
        const group = row.querySelector('a[href^="/groups/"]');
        if (group && textOf(group)) {
            const id = /^\\/groups\\/(\\d+)/.exec(group.getAttribute("href") || "");
            return { id: id ? Number(id[1]) : null, name: textOf(group) };
        }
        const uploader = row.querySelector('a[href^="/u/"]');
        return uploader && textOf(uploader) ? { id: null, name: textOf(uploader) } : null;
    };

    // "70" or "1.2k"
    const votesOf = (row) => {
        if (!row) return 0;
        for (const span of row.querySelectorAll("span")) {
            const match = span.querySelector("svg") && /^(\\d+(?:\\.\\d+)?)(k?)$/i.exec(textOf(span));
            if (match) return Math.round(parseFloat(match[1]) * (match[2] ? 1000 : 1));
        }
        return 0;
    };

    const findMoreControl = (scope) => {
        const inOrder = Array.from(document.querySelectorAll("a[href], button, [role='button']"));
        const orderOf = new Map(inOrder.map((el, i) => [el, i]));
        let lastAnchorIdx = -1;
        for (const el of inOrder) {
            const href = el.getAttribute("href");
            if (href && parseChapterPath(pathOf(href)) && isChapterRow(el)) lastAnchorIdx = orderOf.get(el);
        }
        const currents = inOrder.filter((el) => (orderOf.get(el) ?? -1) > lastAnchorIdx &&
            (el.getAttribute("aria-current") === "page" || /\\bis-active\\b/.test(String(el.className || ""))) &&
            /^\\d{1,4}$/.test((textOf(el) || "").trim()));
        if (currents.length) {
            const cur = currents[0];
            const curNum = parseInt((textOf(cur) || "").trim(), 10);
            let box = cur.parentElement;
            for (let d = 0; d < 3 && box && box.tagName !== "NAV"; d++) box = box.parentElement;
            const boxEls = Array.from((box || cur.parentElement || document)
                .querySelectorAll("button, a[href], [role='button']"));
            let nextBtn = null;
            let numbered = null;
            for (const el of boxEls) {
                if (el.disabled || el.getAttribute("aria-disabled") === "true" || leavesPage(el)) continue;
                const label = (textOf(el) || el.getAttribute("aria-label") || "").trim();
                if (/next/i.test(label)) nextBtn = el;
                else if (/^\\d{1,4}$/.test(label) && parseInt(label, 10) === curNum + 1) numbered = el;
            }
            return nextBtn || numbered || null;
        }
        const controls = Array.from((scope || document).querySelectorAll("button, a[href], [role='button']"));
        const scored = [];
        for (const el of controls) {
            if (el.disabled) continue;
            if (el.getAttribute("aria-current") === "page") continue;
            if (el.getAttribute("aria-disabled") === "true") continue;
            if (leavesPage(el)) continue;
            if (/desc/i.test(String(el.className || ""))) continue;
            const label = (textOf(el) || el.getAttribute("aria-label") || "").trim();
            if (!label) continue;
            const afterList = lastAnchorIdx < 0 || (orderOf.get(el) ?? -1) > lastAnchorIdx;
            let score = -1;
            if (/next/i.test(label)) score = afterList ? 5 : 2;
            else if (/load\\s*more|show\\s*more|view\\s*more|more\\s+chapters/i.test(label)) score = afterList ? 4 : -1;
            else if (/^\\d{1,4}$/.test(label)) score = 1;
            if (score >= 0) scored.push({ el, score });
        }
        scored.sort((a, b) => b.score - a.score);
        return scored.length ? scored[0].el : null;
    };

    const describe = (el) => el ? {
        tag: el.tagName,
        cls: String(el.className || "").slice(0, 60),
        label: (textOf(el) || el.getAttribute("aria-label") || "").trim().slice(0, 40),
    } : null;

    const reportedTotal = () => {
        if (!document.body) return null;
        const m = /Showing\\s+\\d+\\s+to\\s+\\d+\\s+of\\s+([\\d,]+)\\s+items/i.exec(textOf(document.body));
        return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
    };

    const harvest = async () => {
        const here = parseMangaPath(location.pathname || pathOf(location.href || ""));
        const hid = here ? here.hid : null;
        const data = readInitialData(document);
        const mangaId = data && hid ? anchoredNumber(data, hid) : null;

        const byId = new Map();
        const absorb = () => {
            let added = 0;
            for (const anchor of Array.from(document.querySelectorAll("a[href]"))) {
                const path = pathOf(anchor.getAttribute("href") || "");
                const chapter = parseChapterPath(path);
                if (!chapter || !isChapterRow(anchor)) continue;
                if (hid && chapter.hid !== hid) continue;
                if (byId.has(chapter.id)) continue;
                const row = rowRoot(anchor);
                byId.set(chapter.id, {
                    id: chapter.id,
                    number: chapter.number,
                    url: path,
                    text: row ? textOf(row) : textOf(anchor),
                    name: nameOf(anchor),
                    votes: votesOf(row),
                    group: groupOf(row),
                });
                added++;
            }
            return added;
        };
        const reachedKnown = () => Array.from(byId.keys()).some((id) => stopAt.has(id));

        await waitFor(() => (absorb(), byId.size > 0) || null,
            { timeoutMs: OPTIONS.timeoutMs, intervalMs: OPTIONS.pollMs });

        const sectionRoot = () => {
            const first = Array.from(document.querySelectorAll("a[href]"))
                .find((a) => {
                    const c = parseChapterPath(pathOf(a.getAttribute("href") || ""));
                    return c && (!hid || c.hid === hid) && isChapterRow(a);
                });
            if (!first) return document.body;
            const rendered = Array.from(document.querySelectorAll("a[href]"))
                .filter((a) => {
                    const c = parseChapterPath(pathOf(a.getAttribute("href") || ""));
                    return c && (!hid || c.hid === hid) && isChapterRow(a);
                }).length;
            let root = first;
            for (let depth = 0; depth < 12 && root.parentElement; depth++) {
                const parent = root.parentElement;
                const inside = Array.from(parent.querySelectorAll("a[href]"))
                    .filter((a) => {
                        const c = parseChapterPath(pathOf(a.getAttribute("href") || ""));
                        return c && (!hid || c.hid === hid) && isChapterRow(a);
                    }).length;
                if (inside >= rendered) root = parent;
                else break;
            }
            return root;
        };

        const activate = async (el, entry) => {
            const r0 = el.getBoundingClientRect();
            const inView = r0.width > 0 && r0.top >= 0 && r0.bottom <= window.innerHeight &&
                r0.left >= 0 && r0.right <= window.innerWidth;
            if (!inView) {
                try { el.scrollIntoView({ block: "center" }); } catch (e) {}
                await sleep(350);
            } else {
                await sleep(60);
            }
            let tapped = false;
            if (typeof window.__comixNativeTap === "function") {
                const r = el.getBoundingClientRect();
                if (entry) {
                    entry.rect = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
                    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                    entry.atPoint = describe(at);
                }
                if (r.width > 0 && r.height > 0) {
                    try {
                        window.__comixNativeTap(r.left + r.width / 2, r.top + r.height / 2);
                        tapped = true;
                    } catch (e) {}
                }
            }
            if (!tapped) {
                try { el.click(); } catch (e) {}
            }
            return tapped;
        };

        const diag = [];
        let rounds = 0;
        let complete = false;
        let stoppedAtKnown = reachedKnown();
        while (!stoppedAtKnown && rounds < OPTIONS.maxRounds) {
            let control = findMoreControl(sectionRoot());
            if (!control) control = findMoreControl(document);
            if (!control) {
                complete = byId.size > 0;
                break;
            }
            const before = byId.size;
            rounds++;
            const entry = {
                round: rounds,
                control: describe(control),
                before,
                tapBridge: typeof window.__comixNativeTap === "function",
                total: reportedTotal(),
            };
            const usedTap = await activate(control, entry);
            entry.method = usedTap ? "tap" : "click";
            let grew = await waitFor(() => (absorb(), byId.size > before) || null,
                { timeoutMs: OPTIONS.settleMs, intervalMs: OPTIONS.pollMs });
            if (!grew && !reachedKnown()) {
                await activate(control, null);
                grew = await waitFor(() => (absorb(), byId.size > before) || null,
                    { timeoutMs: OPTIONS.settleMs, intervalMs: OPTIONS.pollMs });
            }
            if (!grew && !reachedKnown()) {
                try { control.click(); } catch (e) {}
                grew = await waitFor(() => (absorb(), byId.size > before) || null,
                    { timeoutMs: OPTIONS.settleMs, intervalMs: OPTIONS.pollMs });
            }
            entry.after = byId.size;
            entry.url = location.href;
            diag.push(entry);
            const now = parseMangaPath(location.pathname);
            if (hid && (!now || now.hid !== hid)) throw new Error("Left the title page for " + location.pathname);
            if (reachedKnown()) {
                stoppedAtKnown = true;
                break;
            }
            if (!grew) {
                complete = byId.size > 0;
                break;
            }
        }

        // Item count seen before a failed page cleared the list
        const total = reportedTotal() ?? diag.map((e) => e.total).filter((t) => t != null).pop() ?? null;
        if (total != null && byId.size < total && !stoppedAtKnown) complete = false;
        const chapters = Array.from(byId.values())
            .sort((a, b) => (b.number - a.number) || (b.id - a.id));
        return {
            page: "manga",
            hid,
            mangaId,
            count: chapters.length,
            complete,
            stoppedAtKnown,
            rounds,
            reportedTotal: total,
            diag: diag.slice(0, 12),
            chapters,
        };
    };

    const done = (result) => {
        window.__comixHarvest = result;
        console.log("[comix-harvest:chapters] " + JSON.stringify(result));
    };
    window.__comixHarvestPromise = (async () => {
        try {
            const result = await harvest();
            done(result);
            return result;
        } catch (e) {
            const result = { page: "manga", error: String((e && e.message) || e), chapters: [], count: 0 };
            done(result);
            return result;
        }
    })();
})();
`;
  var CHAPTER_PAGES = `// Every build you re-mangle, this file gets a little shorter. Love, the mouse.
// Posts "total", then "page" or "miss" per page, then "done"; window[seekName] is [page waited on, retry count]
(pass, reject, seekName, knownIndices) => {
    const startedAt = Date.now();
    const FIRST_PAGE_TIMEOUT_MS = 30000;
    const WALK_TIMEOUT_MS = 220000;
    const SLOT_TIMEOUT_MS = 15000;
    const SETTLE_MS = 100;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    let container = null;
    let slots = [];
    let total = 0;
    const shapeOf = (element) => element.tagName + "." + (element.getAttribute("class") || "");
    // Pages: same-shaped children holding off-site images, innermost and tallest in a scroller
    const site = location.hostname.replace(/^www\\./, "");
    const isForeignImage = (img) => {
        try {
            const host = new URL(img.getAttribute("src") || "", location.href).hostname;
            return host !== site && !host.endsWith("." + site);
        } catch (e) {
            return false;
        }
    };
    const scrolls = (element) => element.scrollHeight > element.clientHeight &&
        (element === document.scrollingElement || /(auto|scroll)/.test(getComputedStyle(element).overflowY));
    const insideScroller = (element) => {
        for (let parent = element.parentElement; parent; parent = parent.parentElement) if (scrolls(parent)) return true;
        return false;
    };
    const findReader = () => {
        const totals = new Set();
        for (const element of document.body.querySelectorAll("*")) {
            if (element.firstElementChild) continue;
            const match = /^\\s*\\d+\\s*\\/\\s*(\\d+)\\s*$/.exec(element.textContent || "");
            if (match) totals.add(parseInt(match[1], 10));
        }
        const matches = [];
        for (const element of document.body.querySelectorAll("*")) {
            const withImage = Array.prototype.find.call(element.children,
                (child) => Array.prototype.some.call(child.querySelectorAll("img"), isForeignImage));
            if (!withImage) continue;
            const shape = shapeOf(withImage);
            const count = Array.prototype.filter.call(element.children, (child) => shapeOf(child) === shape).length;
            if (totals.size && !totals.has(count)) continue;
            if (insideScroller(element)) matches.push({ element, shape });
        }
        // Wrappers match too; keep the innermost
        let best = null;
        for (const match of matches) {
            if (matches.some((other) => other !== match && match.element.contains(other.element))) continue;
            if (!best || match.element.offsetHeight > best.element.offsetHeight) best = match;
        }
        return best && {
            element: best.element,
            slots: Array.prototype.filter.call(best.element.children, (child) => shapeOf(child) === best.shape),
        };
    };
    // Settled after two matching polls; found again if replaced
    let candidate = null;
    const attachReader = () => {
        if (container && container.isConnected) return true;
        const reader = document.body && findReader();
        const settled = reader && candidate && reader.element === candidate.element &&
            reader.slots.length === candidate.slots.length;
        candidate = reader;
        if (!settled) return false;
        ({ element: container, slots } = reader);
        total = slots.length;
        container.querySelectorAll("img[src]").forEach(record);
        return true;
    };
    const slotIndex = (img) => {
        let slot = img;
        while (slot.parentElement && slot.parentElement !== container) slot = slot.parentElement;
        return slots.indexOf(slot);
    };

    // Latest url per page; the reader swaps hosts on failure
    const captured = new Map(knownIndices.map((index) => [index, null]));
    const missed = new Set();
    const record = (img) => {
        if (!container || !attachReader()) return;
        let url;
        try { url = new URL(img.getAttribute("src") || "", location.href); } catch (e) { return; }
        if (!/^https?:$/.test(url.protocol)) return;
        const index = slotIndex(img);
        if (index < 0 || captured.get(index) === url.href) return;
        captured.set(index, url.href);
        missed.delete(index);
        pass(JSON.stringify({ type: "page", index, url: url.href }));
    };

    // A saved paged reader becomes the strip until the reader starts
    const savedReader = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
            const raw = localStorage.getItem(key);
            const stored = JSON.parse(raw);
            if (stored && stored.state && "readingDirection" in stored.state && stored.state.readingDirection !== "ttb") {
                savedReader[key] = raw;
                stored.state.readingDirection = "ttb";
                localStorage.setItem(key, JSON.stringify(stored));
            }
        } catch (e) {}
    }
    const restoreReader = () => {
        Object.entries(savedReader).forEach(([key, raw]) => localStorage.setItem(key, raw));
        Object.keys(savedReader).forEach((key) => delete savedReader[key]);
    };

    // Started at document-start, before the reader runs
    const recordImage = (node) => {
        if (node.tagName === "IMG") record(node);
        else if (node.querySelectorAll) node.querySelectorAll("img[src]").forEach(record);
    };
    new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "attributes") recordImage(mutation.target);
            else mutation.addedNodes.forEach(recordImage);
        }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });

    const waitForReader = async () => {
        while (Date.now() < startedAt + FIRST_PAGE_TIMEOUT_MS) {
            if (attachReader()) return;
            await sleep(200);
        }
        throw new Error("The reader didn't load any pages");
    };

    const waited = new Map();
    let retries = 0;
    const readSeek = () => {
        const value = window[seekName];
        if (!Array.isArray(value)) return -1;
        const [seek, retry] = value;
        if (retry !== retries) {
            retries = retry;
            if (missed.delete(seek)) waited.delete(seek);
        }
        return seek;
    };

    const walk = async () => {
        await waitForReader();
        restoreReader();
        pass(JSON.stringify({ type: "total", total }));
        const done = (i) => captured.has(i) || missed.has(i);
        while (Date.now() < startedAt + WALK_TIMEOUT_MS) {
            // Waited-on page first, then forward, then the rest
            const seek = readSeek();
            let target = seek >= 0 && seek < total && !done(seek) ? seek : -1;
            for (let i = Math.max(seek, 0); target < 0 && i < total; i++) if (!done(i)) target = i;
            for (let i = 0; target < 0 && i < total; i++) if (!done(i)) target = i;
            if (target < 0) break;

            const time = (waited.get(target) || 0) + SETTLE_MS;
            waited.set(target, time);
            if (time > SLOT_TIMEOUT_MS) {
                missed.add(target);
                pass(JSON.stringify({ type: "miss", index: target }));
                continue;
            }
            // Pages the observer saw before they joined the list
            if (attachReader()) {
                container.querySelectorAll("img[src]").forEach(record);
                slots[target].scrollIntoView({ block: "center" });
            }
            await sleep(SETTLE_MS);
        }
        pass(JSON.stringify({ type: "done" }));
    };

    walk().catch((e) => {
        restoreReader();
        reject(e && e.message || String(e));
    });
}
`;
  var SOLVE_CAPTCHA = '// Answers the site\'s rotate or click-the-shapes captcha, then posts the solved message the site\'s own captcha page sends\n// Shows the site\'s own captcha page when it is a Cloudflare Turnstile check\n// Rotation search ported from https://github.com/nekomangaorg/Neko (ComixWafSolver)\n// Shapes: go-captcha\'s stock set (https://github.com/wenlng/go-captcha-assets, Apache-2.0) as 60x60 bitmaps\n(reject) => {\n    const SHAPES = [\n        "AAAAAH4AAAAAAAAf8AAAAAAAA/+AAAAAAAB//AAAAAAAB//gAAAAAAB//gAAAA8AB//wAAAB+AD//wAAAD/gD//+AAAH/gD///wAAH/wD///8AAP/4D///+AAP/8H////AAP/+H////AAP/+H////AAP//H////AAf//n////AB///3///+AH///3///8AP///////wAf///////gA///////+AA///////4AA///////wAA////////wAf////////8f////////+P////////+H/////////A/////////AB////////AAAf//////AAA//////+AAB//////8AAH//////4AAP//////wAAf//////gAB//////+AAD//////8AAH//////8AAP//////8AAf//////8AAf///9//8AAf///9//8AA////87/8AAf///85/4AAf///48/4AAP///48fwAAD///48HAAAAA//4+AAAAAA//w+AAAAAAf/w+AAAAAAf/w+AAAAAAP/h+AAAAAAH/B+AAAAAAD8B4AAAAAAAADwAAAAAAAADAAAAAAAAACAAAAAAAAAAAAAA",\n        "AAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAH8AAAAAAAAP+AAAAAAAAf/AAAAAAAB//gAAAAAAH//4AAAAAf/////AAAB//////gAAB//////wAAD//////wAAD//////4AAD//////4AAD//////4AAD//////4AAH//////4AAH//////4AAH//////8AAP//////+AAf///////AB////////gD////////wH////////4H////////8P////////8P////////8P////////8P////////8H////////8D////////4D////////wB////////wB////////gA////////gA////////gA////////gA////////gA////////gB////////gB////////gB////////wB////////wB////////gB////////gA////////AAf//////+AAH//////8AAA//////AAAAP////8AAAAH////4AAAAD////4AAAAD////wAAAAB////wAAAAB////gAAAAA//f/gAAAAAf4D/AAAAAAHAAcAAAAAAAAAAAAAAAAAAAAAAA",\n        "P+AAAAAAf8f+AAAAAAf+//AAAAAA////////////////////////////////////////////////////////////////AAAAAA///+AAAAAAf/P8AAAAAAP8H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4H4AAAAAAH4P8AAAAAAf+/+AAAAAA////AAAAAA////////////////////////////////////////////////////////////////AAAAAA//f+AAAAAA//P+AAAAAAf+",\n        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH//////8AAf//////+AAf///////AA////////AA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////gA////////AAf///////AAP//////+AAD//////4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",\n        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAACAAAAAf/gB/+AAAB//4H//gAAH//+f//4AAP//////8AAf//////+AA////////AB////////gD////////wD////////wH////////4H////////4P////////8P////////8P////////8P////////8P////////8P////////8P////////8P////////8P////////8P////////8P////////8P////////8H////////4H////////4D////////wD////////wB////////gA////////AAf//////+AAP//////8AAH//////4AAD//////wAAB//////gAAA//////AAAAf////+AAAAP////8AAAAH////4AAAAD////wAAAAB////gAAAAA////AAAAAAf//+AAAAAAP//8AAAAAAH//4AAAAAAD//wAAAAAAB//gAAAAAAA//AAAAAAAAf+AAAAAAAAP8AAAAAAAAH4AAAAAAAADwAAAAAAAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",\n        "AAAAH4AAAAAAAAf+AAAAAAAA//AAAAAAAA//AAAAAAAB//gAAAAAAB//gAAAAAAB//gAAAAD/D//w/wAAH/n//5/4AAP//////8AAf//////+AAf//////+AAf/8//P/+AAf/8P+P/+AAf/8H4P/+AAf/4AAH/+AAf/4AAH/+AAf/4AAH/+AAP/wAAD/8AAH/gAAB/4AAH/AAAA/4AAP4AAAAH8AAfAAAAAA+AD/AAAAAA/wP/gAAAAB/8f/wAAAAB/+f/wAAAAD/+//4AAAAH////4AAAAH////4AAAAH////4AAAAH////4AAAAH////4AAAAH//f/wAAAAD/+f/gAAAAB/+P/gAAAAB/8D/AAAAAA/wAfAAAAAA+AAP4AAAAH8AAH/AAAA/4AAH/gAAB/4AAP/wAAD/8AAf/4AAH/+AAf/4AAH/+AAf/4AAH/+AAf/8H4P/+AAf/8f8P/+AAf/8//P/+AAf//////+AAf//////8AAP//////8AAH/n//5/4AAD/D//w/gAAAAB//gAAAAAAB//gAAAAAAB//gAAAAAAA//AAAAAAAA//AAAAAAAAP8AAAAAAAAH4AAAA",\n        "AAAAAAAAAAAAAABgAAAAAAAAP8AAAAAAAAf+AAAAAAAA//AAAAAAAB//gAAAAAAB//gAAAAAAD//wAAAAAAD//wAAAAAAD//wAAAAAAH//4AAAAAAH//4AAAAAAH//4AAAAAAH//4AAAAAAH//4AAAAAAH//4AAAAAAH//4AAAAf8H//4P+AB//v/////gD////////wH////////4P////////8P////////8f////////+f////////+f////////+P////////8P////////8P////////8H////////4D////////wD////////wB////////gAf//////+AAP//////8AAD//////wAAAf////+AAAAH////4AAAAP////8AAAAf////+AAAAf////+AAAA//////AAAB//////gAAB//////gAAB//////gAAD//////wAAD//////wAAD//////wAAD//////wAAD//+f//wAAD//+f//wAAD//8P//wAAD//4H//wAAD//wD//wAAD//gB//wAAB//AA//gAAA/+AAf/AAAAf4AAH+AAAAAAAAAAAAAAAAAAAAAA",\n        "AAAAAAPgAAAAD8AB/gAAAAH/gD/wAAAAH/wP/4AAAAP/8P/4AAAAP/+P/8AAAAf//H/8AAAAf//j/8AAAAf//j/8AAAA///x/+AAAA///x/+AAAA///5/+AAAAD//5/+AAAAAf/5/+AAAAAH/9/+AAAP/h/8/8OAA//4/8H8fgD//wH8A8fwH//gB4AYf8P//AAwAI/+f/+AAAAA////+AAAAB////8AAAAD////8AAAAD//f/8AAAAD/+f/8AAAAD/+P/gAAAAD/8P+AAAAAD/8H8OAAAAH/4DweAAAAH/wBh+AAAAH/gAD/AAAAP/AAH/gAAAf+AAH/gAAAf4AAP/wAAA/gAAf/wAAAAAAAf/wAAAAPAA//mAAP//AA//nAAf//AA//HgA///gA//P4D///gB//P8H///gB//P/H///gB/+P/H///gB/+P/j///gA/+P/x///gA/+P/wf//gA//P/4P//AAf/P/8D/8AAD+H/+AHAAAAAH//gAAAAAAH//wAAAAAAD//wAAAAAAB//wAAAAAAB//gAAAAAAA//AAAAAAAAf+AAAAAAAAP8AAAAAAAAH4AAAAAAAABgAAAA",\n        "AAAA//AAAAAAAH//4AAAAAA////AAAAAD////wAAAAP////8AAAAf////+AAAB//////gAAD//////wAAH//////4AAP//////8AAf//////+AA////////AA///wD///AB//+AAf//gD//4AAH//wD//gAAB//wH//AAAA//4H/+AAAAf/4P/8AAAAP/8P/4AAAAH/8P/4AAAAH/8f/wAAAAD/+f/wAAAAD/+f/gAAAAB/+//gAAAAB////gAAAAB////AAAAAA////AAAAAA////AAAAAA////AAAAAA////AAAAAA////AAAAAA////AAAAAA////AAAAAA////gAAAAB////gAAAAB//f/gAAAAB/+f/wAAAAD/+f/wAAAAD/+P/4AAAAH/8P/4AAAAH/8P/8AAAAP/8H/+AAAAf/4H//AAAA//4D//gAAB//wD//4AAH//wB//+AAf//gA///wD///AA////////AAf//////+AAP//////8AAH//////4AAD//////wAAB//////gAAAf////+AAAAP////8AAAAD////wAAAAA////AAAAAAH//4AAAAAAA//AAAA",\n        "AAAAAAAAAAAAAAAAAAAAAAwAAAAEAAAB+AAAB+AAAD/gAAH/AAAD/4DAf/AAAD/8Hg//AAAD/+Px//AAAD/8f4//AAAD/8f8//AAAD/4/8f/AAAB/5/+f+AAAB/x/+P+AAAB/x/+P+AAAB/j//H+AAAAAB//AAAAAAAA//AAAAAAP4P/HwAAAD/+H/P/AAAH//D+P/gAAP//h+P/wAAP//wOf/wAAP//gAf/wAAH//AA//gAAH/+AA//gAAD/+AB//AAAB/wAA/+AAAY/gAA/8IAA8eAAB/48AB+MOAB/h+AD/AeAB/D/AH/g/AAAH/gP/x/gAAP/wf/z/gf+P/4//j/j//H/4//j/z//H/8//n/z//n/8f/n/z//n/4P/n/x//j/wA/H/5//j8AAAH/4//gAAAAH/4f/gAAAAH/wP/gAAAAH/AD/gAAAAH8Hg/gAAAADgf4HAAAAAAB/+AAAAAAAD//AAAAAAAD//AAAAAAAB/+AAAAAAAB/+AAAAAAAA/8AAAAAAAA/8AAAAAAAAf4AAAAAAAAf4AAAAAAAAPwAAAAAAAAHgAAAAAAAADAAAAAAAAAAAAAAAAAAAAAAAAA",\n        "AAAAH4AAAAAAAAf+AAAAAAAA//AAAAAAAA//AAAAAAAB//gAAAAAAB//gAAAAAAB//gAAAAB+D//w/gAAH/j//x/wAAP//////4AAP//////8AAf//////+AAf//////+AAf//////+AAf//////+AAf//////+AAf//////+AAf//wD//8AAP/+AAf/8AAH/8AAP/4AAH/4AAH/4AAH/wAAD/4AAf/gAAB/+AD//AAAA//wP//AAAA//8f//AAAA//+f/+AAAAf/+//+AAAAf////+AAAAf////+AAAAf////+AAAAf////+AAAAf////+AAAAf//f/+AAAAf/+f//AAAA//+P//AAAA//8D//AAAA//wAf/gAAB/+AAH/wAAD/4AAH/4AAH/4AAH/8AAP/4AAP/+AAf/8AAf//wD//+AAf//////+AAf//////+AAf//////+AAf//////+AAf//////+AAf//////+AAP//////8AAP//////8AAH/j//x/4AAB/B//wfgAAAAB//wAAAAAAB//gAAAAAAB//gAAAAAAA//gAAAAAAAf/AAAAAAAAP+AAAAAAAAH4AAAA",\n        "AAB////gAAAAD////wAAAAH////4AAAAP////8AAAAf////+AAAA//////AAAB//////gAAD//////wAAH//////4AAP//////8AAf//////+AA////////AB////////gD////////wH////////4P////////8f////////+////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////f////////+P////////8H////////4D////////wB////////gA////////AAf//////+AAP//////8AAH//////4AAD//////wAAB//////gAAA//////AAAAf////+AAAAP////8AAAAH////4AAAAD////wAAAAB////gAA",\n        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAAAAAD//4AAAAAAf//+AAAAAB////gAAAAD////4AAAAP////8AAAAf/////AAAA//////gAAB//////wAAD//////4AAH//////4AAP//////8AAP//////+AAf///////AA////////AA////////gB////////gB////////gB////////wD////////wD////////wD////////4D////////4H////////4H////////4H////////4H////////4H////////4H////////4H////////4H////////4D////////4D////////4D////////4D////////wB////////wB////////wB////////gA////////gA////////AAf///////AAf//////+AAP//////+AAH//////8AAH//////4AAD//////wAAB//////gAAA//////AAAAP////+AAAAH////8AAAAD////wAAAAA////AAAAAAH//8AAAAAAA//gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",\n    ];\n    const SHAPE_SIZE = 60;\n    const MASTER_PALETTE = ["#fde98e", "#60c1ff", "#fcb08e", "#fb88ff", "#b4fed4", "#cbfaa9", "#78d6f8"];\n    const THUMB_PALETTE = ["#1f55c4", "#780592", "#2f6b00", "#910000", "#864401", "#675901", "#016e5c"];\n    const GRID = 40;\n    const SIZES = Array.from({ length: 19 }, (_, i) => i + 18);\n    const ANGLES = Array.from({ length: 120 }, (_, i) => i * 3).filter((a) => (a >= 15 && a <= 75) || (a >= 285 && a <= 345));\n    const CONFIDENT_MARGIN = 2.2;\n    const CHALLENGES_PER_ROUND = 5;\n    const ROUNDS = 3;\n    const TURNSTILE_SCRIPT = "challenges.cloudflare.com/turnstile";\n    const TURNSTILE_WAIT_MS = 20000;\n\n    const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));\n    const masterPalette = MASTER_PALETTE.map(rgb);\n    const thumbPalette = THUMB_PALETTE.map(rgb);\n\n    const loadImage = (src) => new Promise((resolve, fail) => {\n        const image = new Image();\n        image.onload = () => resolve(image);\n        image.onerror = () => fail(new Error("Could not decode the captcha image"));\n        image.src = src;\n    });\n\n    const imageData = (image) => {\n        const canvas = document.createElement("canvas");\n        canvas.width = image.width;\n        canvas.height = image.height;\n        const context = canvas.getContext("2d");\n        context.drawImage(image, 0, 0);\n        return context.getImageData(0, 0, image.width, image.height);\n    };\n\n    const dilate = (mask, w, h, r) => {\n        const out = new Uint8Array(w * h);\n        for (let y = 0; y < h; y++) {\n            for (let x = 0; x < w; x++) {\n                if (!mask[y * w + x]) continue;\n                for (let dy = -r; dy <= r; dy++) {\n                    const ny = y + dy;\n                    if (ny < 0 || ny >= h) continue;\n                    for (let dx = -r; dx <= r; dx++) {\n                        const nx = x + dx;\n                        if (nx >= 0 && nx < w) out[ny * w + nx] = 1;\n                    }\n                }\n            }\n        }\n        return out;\n    };\n\n    const invert = (mask) => mask.map((v) => 1 - v);\n    const erode = (mask, w, h, r) => invert(dilate(invert(mask), w, h, r));\n\n    const neighbours = (mask, w, h) => {\n        const out = new Uint8Array(w * h);\n        for (let y = 0; y < h; y++) {\n            for (let x = 0; x < w; x++) {\n                let n = 0;\n                for (let dy = -1; dy <= 1; dy++) {\n                    for (let dx = -1; dx <= 1; dx++) {\n                        if (!dy && !dx) continue;\n                        const ny = y + dy, nx = x + dx;\n                        if (ny >= 0 && ny < h && nx >= 0 && nx < w) n += mask[ny * w + nx];\n                    }\n                }\n                out[y * w + x] = n;\n            }\n        }\n        return out;\n    };\n\n    // 4-connected components as lists of pixel indices\n    const components = (mask, w, h) => {\n        const seen = new Uint8Array(w * h);\n        const out = [];\n        for (let start = 0; start < w * h; start++) {\n            if (!mask[start] || seen[start]) continue;\n            const stack = [start];\n            const pixels = [];\n            seen[start] = 1;\n            while (stack.length) {\n                const p = stack.pop();\n                pixels.push(p);\n                const x = p % w, y = (p - x) / w;\n                for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {\n                    if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;\n                    const q = ny * w + nx;\n                    if (mask[q] && !seen[q]) {\n                        seen[q] = 1;\n                        stack.push(q);\n                    }\n                }\n            }\n            out.push(pixels);\n        }\n        return out;\n    };\n\n    const bounds = (pixels, w) => {\n        let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1, sumX = 0, sumY = 0;\n        for (const p of pixels) {\n            const x = p % w, y = (p - x) / w;\n            minX = Math.min(minX, x); maxX = Math.max(maxX, x);\n            minY = Math.min(minY, y); maxY = Math.max(maxY, y);\n            sumX += x; sumY += y;\n        }\n        return { minX, maxX, minY, maxY, cx: sumX / pixels.length, cy: sumY / pixels.length };\n    };\n\n    // Area-normalised, centroid-centred GRID x GRID mask, sampled back from the source pixels\n    const normalise = (pixels, w) => {\n        const b = bounds(pixels, w);\n        const bw = b.maxX - b.minX + 1, bh = b.maxY - b.minY + 1;\n        const src = new Uint8Array(bw * bh);\n        for (const p of pixels) {\n            const x = p % w, y = (p - x) / w;\n            src[(y - b.minY) * bw + (x - b.minX)] = 1;\n        }\n        const scale = Math.sqrt(pixels.length) / (GRID * 0.42);\n        const out = new Uint8Array(GRID * GRID);\n        for (let gy = 0; gy < GRID; gy++) {\n            const sy = Math.floor((gy - GRID / 2 + 0.5) * scale + b.cy - b.minY + 0.5);\n            if (sy < 0 || sy >= bh) continue;\n            for (let gx = 0; gx < GRID; gx++) {\n                const sx = Math.floor((gx - GRID / 2 + 0.5) * scale + b.cx - b.minX + 0.5);\n                if (sx >= 0 && sx < bw) out[gy * GRID + gx] = src[sy * bw + sx];\n            }\n        }\n        return out;\n    };\n\n    const shapeBits = SHAPES.map((encoded) => {\n        const bytes = atob(encoded);\n        const bits = new Uint8Array(SHAPE_SIZE * SHAPE_SIZE);\n        for (let i = 0; i < bits.length; i++) bits[i] = (bytes.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;\n        return bits;\n    });\n\n    // Shape scaled to (size+10)^2 like go-captcha draws it, by averaging 4x4 samples per pixel\n    const resized = new Map();\n    const resize = (shape, size) => {\n        const key = `${shape}/${size}`;\n        if (!resized.has(key)) {\n            const s = size + 10, f = SHAPE_SIZE / s, bits = shapeBits[shape];\n            const out = new Uint8Array(s * s);\n            let area = 0;\n            for (let y = 0; y < s; y++) {\n                for (let x = 0; x < s; x++) {\n                    let sum = 0;\n                    for (let i = 0; i < 4; i++) {\n                        for (let j = 0; j < 4; j++) {\n                            sum += bits[Math.floor((y + (i + 0.5) / 4) * f) * SHAPE_SIZE + Math.floor((x + (j + 0.5) / 4) * f)];\n                        }\n                    }\n                    if (sum > 8) { out[y * s + x] = 1; area++; }\n                }\n            }\n            resized.set(key, { side: s, mask: out, area });\n        }\n        return resized.get(key);\n    };\n\n    const templates = new Map();\n    const template = (shape, size, thumb) => {\n        const key = `${shape}/${size}/${thumb}`;\n        if (!templates.has(key)) {\n            const { side, mask } = resize(shape, size);\n            const pad = 3, out = side + 2 * pad + Math.ceil(side * 0.5);\n            const c = (side - 1) / 2, oc = (out - 1) / 2;\n            const rotations = ANGLES.map((angle) => {\n                const rad = (angle * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);\n                let rotated = new Uint8Array(out * out);\n                for (let y = 0; y < out; y++) {\n                    for (let x = 0; x < out; x++) {\n                        const dx = x - oc, dy = y - oc;\n                        const sx = Math.round(cos * dx - sin * dy + c), sy = Math.round(sin * dx + cos * dy + c);\n                        if (sx >= 0 && sx < side && sy >= 0 && sy < side) rotated[y * out + x] = mask[sy * side + sx];\n                    }\n                }\n                if (thumb) rotated = thumbClean(rotated, out, out);\n                const pixels = [];\n                rotated.forEach((v, i) => { if (v) pixels.push(i); });\n                return normalise(pixels, out);\n            });\n            templates.set(key, rotations);\n        }\n        return templates.get(key);\n    };\n\n    // Strip shapes: bridge the noise lines drawn across them, then drop line/mark pixels\n    const thumbClean = (mask, w, h) => {\n        const closed = erode(dilate(mask, w, h, 1), w, h, 1).map((v, i) => v | mask[i]);\n        const n = neighbours(closed, w, h);\n        return closed.map((v, i) => (v && n[i] >= 4 ? 1 : 0));\n    };\n\n    const scores = (blob, thumb) => SHAPES.map((_, shape) => {\n        const size = SIZES.reduce((a, b) => (Math.abs(resize(shape, b).area - blob.area) < Math.abs(resize(shape, a).area - blob.area) ? b : a));\n        let best = 0;\n        for (const t of template(shape, size, thumb)) {\n            let inter = 0, union = 0;\n            for (let i = 0; i < t.length; i++) {\n                inter += t[i] & blob.mask[i];\n                union += t[i] | blob.mask[i];\n            }\n            best = Math.max(best, inter / union);\n        }\n        return best;\n    });\n\n    const nearestColour = (data, palette) => {\n        const n = data.length / 4;\n        const nearest = new Uint8Array(n), distance = new Float32Array(n);\n        for (let p = 0; p < n; p++) {\n            let best = 0, bestD = Infinity;\n            for (let k = 0; k < palette.length; k++) {\n                const dr = data[p * 4] - palette[k][0], dg = data[p * 4 + 1] - palette[k][1], db = data[p * 4 + 2] - palette[k][2];\n                const d = dr * dr + dg * dg + db * db;\n                if (d < bestD) { bestD = d; best = k; }\n            }\n            nearest[p] = best;\n            distance[p] = Math.sqrt(bestD);\n        }\n        return { nearest, distance };\n    };\n\n    // Picture shapes: flat palette-coloured blobs of shape size with a dark shadow beside them\n    const masterBlobs = ({ width: w, height: h, data }) => {\n        const { nearest, distance } = nearestColour(data, masterPalette);\n        const dark = new Uint8Array(w * h);\n        for (let p = 0; p < w * h; p++) dark[p] = data[p * 4] + data[p * 4 + 1] + data[p * 4 + 2] < 150 ? 1 : 0;\n        const blobs = [];\n        const tooBig = (pixels) => {\n            const b = bounds(pixels, w);\n            return pixels.length > 1400 || b.maxY - b.minY >= 60 || b.maxX - b.minX >= 60;\n        };\n        // Petals of one shape don\'t touch: join pieces within `group` px, splitting too-big groups finer\n        const pieces = (pixels, group, found) => {\n            const sub = new Uint8Array(w * h);\n            for (const p of pixels) sub[p] = 1;\n            for (const joined of components(group ? dilate(sub, w, h, group) : sub, w, h)) {\n                const own = joined.filter((p) => sub[p]);\n                if (!own.length) continue;\n                if (group && tooBig(own)) pieces(own, group - 1, found);\n                else found.push(own);\n            }\n            return found;\n        };\n        for (let k = 0; k < masterPalette.length; k++) {\n            const pixels = [];\n            for (let p = 0; p < w * h; p++) if (nearest[p] === k && distance[p] < 40) pixels.push(p);\n            for (const blob of pieces(pixels, 2, [])) {\n                const b = bounds(blob, w);\n                const bh = b.maxY - b.minY + 1, bw = b.maxX - b.minX + 1;\n                if (blob.length < 120 || blob.length > 1400 || bh < 14 || bh > 60 || bw < 14 || bw > 60) continue;\n                const own = new Uint8Array(w * h);\n                for (const p of blob) own[p] = 1;\n                const ring = dilate(own, w, h, 2);\n                let shadow = 0;\n                for (let p = 0; p < w * h; p++) if (ring[p] && !own[p] && dark[p]) shadow++;\n                const meanDistance = blob.reduce((s, p) => s + distance[p], 0) / blob.length;\n                if (shadow < 3 || meanDistance > 20) continue;\n                blobs.push({ x: Math.round(b.cx), y: Math.round(b.cy), area: blob.length, mask: normalise(blob, w) });\n            }\n        }\n        return blobs;\n    };\n\n    // Strip shapes, left to right: the largest single-colour blobs once the noise is cleaned off\n    const thumbBlobs = ({ width: w, height: h, data }, count) => {\n        const { nearest, distance } = nearestColour(data, thumbPalette);\n        const found = [];\n        for (let k = 0; k < thumbPalette.length; k++) {\n            const mask = new Uint8Array(w * h);\n            for (let p = 0; p < w * h; p++) mask[p] = data[p * 4 + 3] > 128 && distance[p] < 60 && nearest[p] === k ? 1 : 0;\n            found.push(...components(thumbClean(mask, w, h), w, h));\n        }\n        found.sort((a, b) => b.length - a.length);\n        return found.slice(0, count)\n            .sort((a, b) => bounds(a, w).cx - bounds(b, w).cx)\n            .map((pixels) => {\n                const own = new Uint8Array(w * h);\n                for (const p of pixels) own[p] = 1;\n                const opened = dilate(erode(own, w, h, 1), w, h, 1);\n                const kept = pixels.filter((p) => opened[p]);\n                const shape = kept.length >= 0.6 * pixels.length ? kept : pixels;\n                return { area: shape.length, mask: normalise(shape, w) };\n            });\n    };\n\n    const softmax = (values) => {\n        const max = Math.max(...values);\n        const e = values.map((v) => Math.exp((v - max) / 0.01));\n        const sum = e.reduce((a, b) => a + b, 0);\n        return e.map((v) => v / sum);\n    };\n\n    // Rotate captcha: clockwise angle that lines the piece up with the picture\'s centre\n    const planRotate = async (challenge) => {\n        const [image, piece] = await Promise.all([loadImage(challenge.image_base64), loadImage(challenge.thumb_base64)]);\n        const size = piece.width, offset = Math.floor((image.width - size) / 2);\n        const reference = imageData(image), rotated = imageData(piece).data;\n        const gray = (data, i) => (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;\n        const center = (size - 1) / 2, scale = size / 128;\n        let bestAngle = 0, bestScore = Infinity;\n        for (let degrees = 0; degrees < 360; degrees++) {\n            const rad = (degrees * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);\n            let sum = 0, valid = 0;\n            for (let i = 0; i < 128 * 128; i++) {\n                const gx = (i % 128) * scale, gy = Math.floor(i / 128) * scale;\n                const vx = gx - center, vy = gy - center;\n                const x = center + vx * cos + vy * sin, y = center - vx * sin + vy * cos;\n                if (x < 0 || x >= size || y < 0 || y >= size) continue;\n                const index = Math.floor(y) * size + Math.floor(x);\n                if (rotated[index * 4 + 3] <= 128) continue;\n                const diff = gray(reference.data, (offset + Math.floor(gy)) * reference.width + offset + Math.floor(gx)) - gray(rotated, index);\n                sum += diff * diff;\n                valid++;\n            }\n            if (valid >= 100 && sum / valid < bestScore) {\n                bestScore = sum / valid;\n                bestAngle = degrees;\n            }\n        }\n        return { margin: Infinity, answer: { angle: bestAngle } };\n    };\n\n    // Click captcha: picture blob for each strip shape, and how far the best pairing beats the runner-up\n    const planClick = async (challenge) => {\n        const [image, thumb] = await Promise.all([loadImage(challenge.image_base64), loadImage(challenge.thumb_base64)]);\n        const masters = masterBlobs(imageData(image));\n        const thumbs = thumbBlobs(imageData(thumb), challenge.count);\n        if (thumbs.length < challenge.count || masters.length < thumbs.length) return { margin: -Infinity };\n        const mp = masters.map((m) => softmax(scores(m, false)));\n        const tp = thumbs.map((t) => softmax(scores(t, true)));\n        const similarity = tp.map((t) => mp.map((m) => Math.log(t.reduce((s, v, i) => s + v * m[i], 0) + 1e-12)));\n        let best = { total: -Infinity }, second = -Infinity;\n        const search = (i, used, total, picks) => {\n            if (i === thumbs.length) {\n                if (total > best.total) { second = best.total; best = { total, picks: [...picks] }; } else if (total > second) second = total;\n                return;\n            }\n            for (let j = 0; j < masters.length; j++) {\n                if (used & (1 << j)) continue;\n                picks.push(j);\n                search(i + 1, used | (1 << j), total + similarity[i][j], picks);\n                picks.pop();\n            }\n        };\n        search(0, 0, 0, []);\n        return {\n            margin: (best.total - second) / thumbs.length,\n            answer: { dots: best.picks.flatMap((j) => [masters[j].x, masters[j].y]).join(",") },\n        };\n    };\n\n    class UnknownCaptcha extends Error {}\n\n    const json = async (response) => {\n        if (!response.ok) throw new Error(`HTTP error ${response.status}`);\n        return response.json();\n    };\n\n    // Up to CHALLENGES_PER_ROUND challenges; answers the first confident one, else the most confident\n    const round = async () => {\n        let best = null;\n        for (let i = 0; i < CHALLENGES_PER_ROUND; i++) {\n            const challenge = await json(await fetch("/@waf/generate", { headers: { Accept: "application/json" } }));\n            if (!challenge.image_base64 || !challenge.thumb_base64) throw new UnknownCaptcha();\n            let plan;\n            if (challenge.count > 0) plan = planClick;\n            else if (challenge.thumb_size > 0) plan = planRotate;\n            else throw new UnknownCaptcha();\n            const attempt = { challenge, ...(await plan(challenge)) };\n            if (!best || attempt.margin > best.margin) best = attempt;\n            if (best.margin >= CONFIDENT_MARGIN) break;\n        }\n        if (!best.answer) return false;\n        const response = await fetch("/@waf/verify", {\n            method: "POST",\n            headers: { "Content-Type": "application/json" },\n            body: JSON.stringify({ captcha_id: best.challenge.captcha_id, ...best.answer }),\n        });\n        return (await json(response)).success === true;\n    };\n\n    // Site\'s own page in place of this one; it posts the solved message itself\n    const showSitePage = (page) => {\n        const timer = setTimeout(() => reject("Couldn\'t pass the site\'s Cloudflare check, open in WebView to pass it"), TURNSTILE_WAIT_MS);\n        parent.addEventListener("message", (event) => {\n            if (event.data?.type === "waf-captcha-solved") clearTimeout(timer);\n        });\n        document.open();\n        document.write(page);\n        document.close();\n    };\n\n    (async () => {\n        const response = await fetch(location.pathname);\n        if (!response.ok) throw new Error(`HTTP error ${response.status}`);\n        const page = await response.text();\n        if (page.includes(TURNSTILE_SCRIPT)) return showSitePage(page);\n        for (let i = 0; i < ROUNDS; i++) {\n            if (await round()) {\n                parent.postMessage({ type: "waf-captcha-solved" }, location.origin);\n                return;\n            }\n        }\n        reject("Couldn\'t solve the site\'s captcha, open in WebView to solve it");\n    })().catch((error) => reject(\n        error instanceof UnknownCaptcha\n            ? "The site changed its captcha, open in WebView to solve it"\n            : `Couldn\'t solve the site\'s captcha (${error.message}), open in WebView to solve it`,\n    ));\n}\n';

  // src/en/comix/descrambler.ts
  var GRID_COLS = 5;
  var GRID_ROWS = 5;
  var NUM_TILES = GRID_COLS * GRID_ROWS;
  var LCG_MULTIPLIER = 1664525;
  var LCG_INCREMENT = 1013904223;
  function toInt32(text) {
    if (text === null || !/^[+-]?\d+$/.test(text.trim())) return null;
    return Number(BigInt.asIntN(32, BigInt(text.trim())));
  }
  function decodeScrambleHash(hash) {
    switch (hash?.trim()) {
      case "03632":
        return 58414;
      case "02900":
        return 117532;
      default:
        return 0;
    }
  }
  function scrambleSeed(info) {
    const seed = toInt32(info.seed);
    const shouldDescrambleGrid = info.grid === "5x5" && (info.algo === null || info.algo === "1" || info.algo === "2" || info.algo === "3") && seed !== null && seed !== 0;
    return shouldDescrambleGrid ? seed ^ decodeScrambleHash(info.hash) : null;
  }
  function inverse(arr) {
    const result = new Array(arr.length);
    arr.forEach((value, index) => {
      result[value] = index;
    });
    return result;
  }
  function buildOrder(seed, n) {
    const arr = Array.from({ length: n }, (_, i) => i);
    let state = seed | 1;
    for (let i = n - 1; i >= 1; i--) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      const j = (state >>> 0) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return inverse(arr);
  }
  function buildOrderLcg(seed, n) {
    const arr = Array.from({ length: n }, (_, i) => i);
    let state = seed | 0;
    for (let i = n - 1; i >= 1; i--) {
      state = Math.imul(state, LCG_MULTIPLIER) + LCG_INCREMENT | 0;
      const j = (state >>> 0) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return inverse(arr);
  }
  function descrambleTransform(width, height, seed, algo) {
    const tileW = Math.floor(width / GRID_COLS);
    const tileH = Math.floor(height / GRID_ROWS);
    const order = algo === "3" ? buildOrder(seed, NUM_TILES) : buildOrderLcg(seed, NUM_TILES);
    const tiles = [{ sx: 0, sy: 0, sw: width, sh: height, dx: 0, dy: 0 }];
    for (let dstIdx = 0; dstIdx < NUM_TILES; dstIdx++) {
      const srcIdx = order[dstIdx];
      tiles.push({
        sx: srcIdx % GRID_COLS * tileW,
        sy: Math.floor(srcIdx / GRID_COLS) * tileH,
        sw: tileW,
        sh: tileH,
        dx: dstIdx % GRID_COLS * tileW,
        dy: Math.floor(dstIdx / GRID_COLS) * tileH
      });
    }
    return { width, height, tiles };
  }

  // src/en/comix/dto.ts
  function posterFrom(poster, baseUrl, quality) {
    if (!poster) return null;
    let path;
    if (quality === "large") path = poster.large ?? poster.medium ?? poster.small;
    else if (quality === "small") path = poster.small ?? poster.medium ?? poster.large;
    else path = poster.medium ?? poster.large ?? poster.small;
    return path ? baseUrl.resolve(path)?.toString() ?? null : null;
  }
  var substringAfterTitle = (url) => {
    const index = url.indexOf("/title");
    return index < 0 ? url : url.slice(index + "/title".length);
  };
  function toBasicSManga(manga, baseUrl, posterQuality) {
    const result = SManga.create();
    result.url = manga.url != null ? substringAfterTitle(manga.url) : `/${manga.hid}`;
    result.title = manga.title;
    result.thumbnail_url = posterFrom(manga.poster, baseUrl, posterQuality);
    return result;
  }
  var MARKDOWN_INDENT = /^[ \t]+/gm;
  var MARKDOWN_INLINE = /[\\*_[\]<]/g;
  var MARKDOWN_BACKTICK = /`(?=[^`]*`)/g;
  var MARKDOWN_BLOCK = /^(?:>|#{1,6}(?=\s|$)|[-+](?=\s|$)|~{3}|[-=:|~][-=:|~ \t]*$)|(?<=^\d{1,9})[.)](?=\s|$)/gm;
  function escapeMarkdown(text) {
    return text.replace(MARKDOWN_INDENT, "").replace(MARKDOWN_INLINE, (it) => `\\${it}`).replace(MARKDOWN_BLOCK, (it) => `\\${it}`).replace(MARKDOWN_BACKTICK, (it) => `\\${it}`);
  }
  function ratingStars(rating, max = 10) {
    const halves = Math.min(10, Math.max(0, Math.ceil(rating * 10 / max - 0.5)));
    return "★".repeat(Math.floor(halves / 2)) + "✬".repeat(halves % 2) + "☆".repeat(5 - Math.floor((halves + 1) / 2));
  }
  function markdownList(label, items) {
    const lines = items.filter((it) => it.trim() !== "");
    if (lines.length === 0) return null;
    return `**${escapeMarkdown(label)}:**
` + lines.map((it) => `- ${it}`).join("\n");
  }
  var encodeMarkdownUrl = (url) => url.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/`/g, "%60");
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
    rating(rating, max = 10) {
      if (rating == null || !Number.isFinite(rating)) return this;
      const number = String(Number(rating.toFixed(2)));
      this.add(`${ratingStars(rating, max)} ${number}`);
      this.lastIsRating = true;
      return this;
    }
    markdown(markdown) {
      return this.add(markdown?.trim());
    }
    field(label, value) {
      const trimmed = value?.trim();
      return this.addInline(trimmed ? `**${escapeMarkdown(label)}:** ${escapeMarkdown(trimmed)}` : null);
    }
    altTitles(titles, label = "Alternative Names") {
      const items = [...new Set(titles.map((it) => it.trim()).filter((it) => it !== ""))].map(escapeMarkdown);
      return this.add(markdownList(label, items));
    }
    links(links, label = "Links") {
      return this.add(
        markdownList(
          label,
          links.flatMap(([text, url]) => url && url.trim() !== "" ? [`[${escapeMarkdown(text)}](${encodeMarkdownUrl(url)})`] : [])
        )
      );
    }
    build() {
      const text = this.sections.join("\n\n");
      return text === "" ? null : text;
    }
  };
  function getTrackerLinks(links) {
    if (!links) return [];
    const siteNames = { al: "AniList", mal: "MyAnimeList", mu: "MangaUpdates", md: "MangaDex", mb: "MangaBaka" };
    const known = Object.entries(siteNames).map(([key, name]) => [name, links[key] ?? null]);
    const unknown = Object.entries(links).filter(([key]) => !(key in siteNames)).map(([key, url]) => [key.toUpperCase(), url?.startsWith("http") ? url : null]);
    return [...known, ...unknown];
  }
  function getGenres(manga, showTags) {
    const list = [];
    switch (manga.type ?? "") {
      case "manhwa":
        list.push("Manhwa");
        break;
      case "manhua":
        list.push("Manhua");
        break;
      case "manga":
        list.push("Manga");
        break;
      default:
        list.push("Other");
    }
    (manga.genres ?? manga.genre)?.forEach((it) => list.push(it.title));
    (manga.demographics ?? manga.demographic)?.forEach((it) => list.push(it.title));
    if (showTags) manga.tags?.forEach((it) => list.push(it.title));
    const contentRating = manga.contentRating ?? "safe";
    if (contentRating === "erotica" || contentRating === "pornographic") list.push("NSFW");
    return [...new Set(list)].join(", ");
  }
  function toSManga(manga, baseUrl, posterQuality, altTitlesInDesc, scorePosition, showExtraInfo, showTags) {
    const result = toBasicSManga(manga, baseUrl, posterQuality);
    result.author = (manga.authors ?? manga.author)?.map((it) => it.title).join(", ") ?? null;
    result.artist = (manga.artists ?? manga.artist)?.map((it) => it.title).join(", ") ?? null;
    const builder = new MarkdownDescriptionBuilder();
    const score = (manga.ratedAvg ?? 0) > 0 ? manga.ratedAvg : null;
    if (scorePosition === "top") builder.rating(score);
    builder.markdown(manga.synopsis);
    if (altTitlesInDesc) builder.altTitles(manga.altTitles?.length ? manga.altTitles : manga.alt_titles ?? []);
    if (showExtraInfo) {
      const contentRating = manga.contentRating ?? "safe";
      builder.field("Year", manga.year != null && manga.year > 0 ? String(manga.year) : null);
      builder.field("Language", manga.originalLanguage?.toUpperCase());
      builder.field("Content rating", contentRating.charAt(0).toUpperCase() + contentRating.slice(1));
      builder.field("Rank", (manga.rank ?? 0) > 0 ? `#${manga.rank}` : null);
      builder.field("Rated by", (manga.ratedCount ?? 0) > 0 ? String(manga.ratedCount) : null);
      builder.field("Followed by", (manga.followsTotal ?? 0) > 0 ? String(manga.followsTotal) : null);
      builder.links(getTrackerLinks(manga.links), "Trackers");
    }
    if (scorePosition === "bottom") builder.rating(score);
    result.description = builder.build();
    result.initialized = true;
    switch (manga.status ?? "") {
      case "releasing":
        result.status = SManga.ONGOING;
        break;
      case "on_hiatus":
        result.status = SManga.ON_HIATUS;
        break;
      case "finished":
        result.status = SManga.COMPLETED;
        break;
      case "discontinued":
        result.status = SManga.CANCELLED;
        break;
      default:
        result.status = SManga.UNKNOWN;
    }
    result.genre = getGenres(manga, showTags);
    return result;
  }
  function hasNextPage(items) {
    const meta = items.meta ?? items.pagination;
    if (!meta) return false;
    return (meta.page ?? 1) < Math.max(meta.lastPage ?? 1, meta.last_page ?? 1);
  }
  function chapterToSChapter(chapter, mangaSlug) {
    const result = SChapter.create();
    const url = chapter.url ?? "";
    const number = removeSuffix(String(chapter.number), ".0");
    const index = url.indexOf("/title/");
    result.url = index !== -1 ? url.slice(index + 1) : `title/${mangaSlug}/${chapter.id}-chapter-${number}`;
    result.name = `Chapter ${number}` + (chapter.name ? `: ${chapter.name}` : "");
    result.date_upload = parseRelativeDate(chapter.createdAtFormatted ?? "");
    result.chapter_number = chapter.number;
    result.scanlator = chapter.group != null ? chapter.group.name : chapter.isOfficial ? "Official" : "Unknown";
    return {
      chapter: result,
      meta: { id: chapter.id, votes: chapter.votes ?? 0, official: chapter.isOfficial ?? false, groupId: chapter.group?.id ?? null }
    };
  }
  var DATE_REGEX = /^(\d+)\s*(s|m|h|d|w|mo|mos|y|yr|yrs|min|mins|sec|secs|hr|hrs|day|days|week|weeks|month|months|year|years)$/;
  function parseRelativeDate(dateStr, latest = false, now = /* @__PURE__ */ new Date()) {
    if (dateStr === "") return 0;
    const trimmed = removeSuffix(dateStr.trim().toLowerCase(), " ago");
    const match = DATE_REGEX.exec(trimmed);
    if (!match) return 0;
    const amount = Number(match[1]) - (latest ? 1 : 0);
    const date = new Date(now.getTime());
    switch (match[2]) {
      case "s":
      case "sec":
      case "secs":
        date.setSeconds(date.getSeconds() - amount);
        break;
      case "m":
      case "min":
      case "mins":
        date.setMinutes(date.getMinutes() - amount);
        break;
      case "h":
      case "hr":
      case "hrs":
        date.setHours(date.getHours() - amount);
        break;
      case "d":
      case "day":
      case "days":
        date.setDate(date.getDate() - amount);
        break;
      case "w":
      case "week":
      case "weeks":
        date.setDate(date.getDate() - amount * 7);
        break;
      case "mo":
      case "mos":
      case "month":
      case "months":
        date.setMonth(date.getMonth() - amount);
        break;
      default:
        date.setFullYear(date.getFullYear() - amount);
    }
    return date.getTime();
  }

  // src/en/comix/filters.ts
  function isUriFilter(filter) {
    return typeof filter.addToUri === "function";
  }
  function isTermFilter(filter) {
    return typeof filter.hasSelection === "boolean";
  }
  var OLDEST_YEAR = 1928;
  var CONTENT_RATING_OPTIONS = [
    ["Show all", ""],
    ["Safe only", "safe"],
    ["Up to Suggestive", "suggestive"],
    ["Up to Erotica", "erotica"],
    ["Up to Pornographic", "pornographic"]
  ];
  function getYearsArray(forFromFilter) {
    const newest = (/* @__PURE__ */ new Date()).getFullYear() + 1;
    const years = [];
    for (let year = newest; year >= OLDEST_YEAR; year--) years.push([String(year), String(year)]);
    const any = ["Any", ""];
    return forFromFilter ? [...years, any] : [any, ...years];
  }
  var getGenres2 = () => [
    ["Action", "6"],
    ["Adult", "87264"],
    ["Adventure", "7"],
    ["Boys Love", "8"],
    ["Comedy", "9"],
    ["Crime", "10"],
    ["Drama", "11"],
    ["Ecchi", "87265"],
    ["Fantasy", "12"],
    ["Girls Love", "13"],
    ["Harem", "40"],
    ["Hentai", "87266"],
    ["Historical", "14"],
    ["Horror", "15"],
    ["Isekai", "16"],
    ["Magical Girls", "17"],
    ["Mature", "87267"],
    ["Mecha", "18"],
    ["Medical", "19"],
    ["Mystery", "20"],
    ["Philosophical", "21"],
    ["Psychological", "22"],
    ["Romance", "23"],
    ["Sci-Fi", "24"],
    ["Slice of Life", "25"],
    ["Smut", "87268"],
    ["Sports", "26"],
    ["Superhero", "27"],
    ["Thriller", "28"],
    ["Tragedy", "29"],
    ["Wuxia", "30"]
  ];
  var getFormats = () => [
    ["4-Koma", "93164"],
    ["Adaptation", "93167"],
    ["Anthology", "93165"],
    ["Award Winning", "93166"],
    ["Doujinshi", "93168"],
    ["Full Color", "93172"],
    ["Long Strip", "93170"],
    ["Oneshot", "93169"],
    ["Web Comic", "93171"]
  ];
  var getDemographics = () => [
    ["Josei", "3"],
    ["Seinen", "4"],
    ["Shoujo", "1"],
    ["Shounen", "2"]
  ];
  var getTypes = () => [
    ["Manga", "manga"],
    ["Manhwa", "manhwa"],
    ["Manhua", "manhua"],
    ["Other", "other"]
  ];
  function getContentRatingsUpTo(maxRating) {
    if (maxRating === "") return [];
    const ratings = ["safe", "suggestive", "erotica", "pornographic"];
    const index = ratings.indexOf(maxRating);
    return index === -1 ? [] : ratings.slice(0, index + 1);
  }
  var UriPartFilter = class extends Select {
    constructor(name, param, vals, defaultValue = null) {
      const index = vals.findIndex(([, value]) => value === defaultValue);
      super(
        name,
        vals.map(([title]) => title),
        index !== -1 ? index : 0
      );
      this.param = param;
      this.vals = vals;
    }
    addToUri(builder) {
      const value = this.vals[this.state]?.[1] ?? "";
      if (value !== "") builder.addQueryParameter(this.param, value);
    }
  };
  var UriMultiSelectOption = class extends CheckBox {
    constructor(name, value) {
      super(name);
      this.value = value;
    }
  };
  var UriMultiSelectFilter = class extends Group {
    constructor(name, param, vals, selectedValues = /* @__PURE__ */ new Set(), onlyIfSome = false) {
      super(
        name,
        vals.map(([title, value]) => {
          const option = new UriMultiSelectOption(title, value);
          option.state = selectedValues.has(value);
          return option;
        })
      );
      this.param = param;
      this.vals = vals;
      this.onlyIfSome = onlyIfSome;
    }
    addToUri(builder) {
      const checked = this.state.filter((it) => it.state);
      if (this.onlyIfSome && checked.length === this.vals.length) return;
      checked.forEach((it) => builder.addQueryParameter(this.param, it.value));
    }
  };
  var UriTriSelectOption = class extends TriState {
    constructor(name, value) {
      super(name);
      this.value = value;
    }
  };
  var DemographicFilter = class extends Group {
    constructor(demographics, selectedValues) {
      super(
        "Demographic",
        demographics.map(([title, value]) => {
          const option = new UriTriSelectOption(title, value);
          if (!selectedValues.has(value)) option.state = TriState.STATE_EXCLUDE;
          return option;
        })
      );
      this.isPreferenceFilter = true;
    }
    addToUri(builder) {
      this.state.filter((it) => it.state === TriState.STATE_INCLUDE).forEach((it) => builder.addQueryParameter("demographics[]", it.value));
      this.state.filter((it) => it.state === TriState.STATE_EXCLUDE).forEach((it) => builder.addQueryParameter("genres_ex[]", it.value));
    }
  };
  var TypeFilter = class extends UriMultiSelectFilter {
    constructor(selectedValues) {
      super("Type", "types[]", getTypes(), selectedValues, true);
      this.isPreferenceFilter = true;
    }
  };
  var TermGroupFilter = class extends Group {
    constructor(title, options, excludedValues = /* @__PURE__ */ new Set()) {
      super(
        title,
        options.map(([name, value]) => {
          const option = new UriTriSelectOption(name, value);
          if (excludedValues.has(value)) option.state = TriState.STATE_EXCLUDE;
          return option;
        })
      );
    }
    get hasSelection() {
      return this.state.some((it) => it.state !== TriState.STATE_IGNORE);
    }
    addToUri(builder) {
      this.state.filter((it) => it.state === TriState.STATE_INCLUDE).forEach((it) => builder.addQueryParameter("genres_in[]", it.value));
      this.state.filter((it) => it.state === TriState.STATE_EXCLUDE).forEach((it) => builder.addQueryParameter("genres_ex[]", it.value));
    }
  };
  var GenreFilter = class extends TermGroupFilter {
    constructor(genres, blockedGenres) {
      super("Genres", genres, blockedGenres);
      this.isPreferenceFilter = true;
    }
  };
  var FormatFilter = class extends TermGroupFilter {
    constructor(formats) {
      super("Formats", formats);
    }
  };
  var TagsFilter = class extends Text {
    constructor() {
      super("Tags");
    }
  };
  var StatusFilter = class extends UriMultiSelectFilter {
    constructor() {
      super("Status", "statuses[]", [
        ["Releasing", "releasing"],
        ["Finished", "finished"],
        ["On Hiatus", "on_hiatus"],
        ["Discontinued", "discontinued"],
        ["Not Yet Released", "not_yet_released"]
      ]);
    }
  };
  var YearFromFilter = class extends UriPartFilter {
    constructor() {
      super("From", "year_from", getYearsArray(true), "");
    }
  };
  var YearToFilter = class extends UriPartFilter {
    constructor() {
      super("To", "year_to", getYearsArray(false), "");
    }
    addToUri(builder) {
      if (this.state > 0) super.addToUri(builder);
    }
  };
  var AuthorFilter = class extends Text {
    constructor() {
      super("Author");
    }
  };
  var ArtistFilter = class extends Text {
    constructor() {
      super("Artist");
    }
  };
  var MatchModeFilter = class extends UriPartFilter {
    constructor() {
      super("Match", "genres_mode", [
        ["All (AND)", "and"],
        ["Any (OR)", "or"]
      ]);
      this.requiresTermSelection = true;
    }
  };
  var ContentRatingFilter = class extends UriPartFilter {
    constructor(defaultValue) {
      super("Content rating", "content_rating", CONTENT_RATING_OPTIONS, defaultValue);
      this.isPreferenceFilter = true;
    }
    // The site reads one comma-separated content_rating
    addToUri(builder) {
      let ratings = getContentRatingsUpTo(CONTENT_RATING_OPTIONS[this.state]?.[1] ?? "");
      if (ratings.length === 0) ratings = getContentRatingsUpTo("pornographic");
      builder.addQueryParameter("content_rating", ratings.join(","));
    }
  };
  var ChapterLengthFilter = class extends Text {
    constructor(name, param) {
      super(name);
      this.param = param;
    }
    addToUri(builder) {
      if (this.state !== "") {
        const value = /^[+-]?\d+$/.test(this.state) ? Number(this.state) : null;
        if (value === null || value <= 0) throw new Error(`${this.name} must be a positive integer greater than 0`);
        builder.addQueryParameter(this.param, String(value));
      }
    }
  };
  var SORTABLES = [
    ["Relevance", "relevance"],
    ["Latest update", "chapter_updated_at"],
    ["Recently added", "created_at"],
    ["Title", "title"],
    ["Year", "year"],
    ["Highest rated", "score"],
    ["Most viewed · 7 days", "views_7d"],
    ["Most viewed · 30 days", "views_30d"],
    ["Most viewed · 90 days", "views_90d"],
    ["Most viewed · all time", "views_total"],
    ["Most followed", "follows_total"]
  ];
  var SortFilter = class extends Sort {
    constructor() {
      super(
        "Sort By",
        SORTABLES.map(([title]) => title),
        { index: 0, ascending: false }
      );
    }
    addToUri(builder, query = "") {
      if (this.state !== null) {
        const selected = SORTABLES[this.state.index]?.[1] ?? "relevance";
        const order = selected === "relevance" && query.trim() === "" ? "chapter_updated_at" : selected;
        builder.addQueryParameter(`order[${order}]`, this.state.ascending ? "asc" : "desc");
      }
    }
  };
  var Filters = class {
    constructor(contentRating, selectedTypes, selectedDemographics, blockedGenres) {
      this.contentRating = contentRating;
      this.selectedTypes = selectedTypes;
      this.selectedDemographics = selectedDemographics;
      this.blockedGenres = blockedGenres;
    }
    getFilterList() {
      return [
        new SortFilter(),
        new ContentRatingFilter(this.contentRating),
        new TypeFilter(this.selectedTypes),
        new Separator(),
        new Header("Tags — comma separated"),
        new TagsFilter(),
        new Header("Match: AND requires every selection, OR matches any"),
        new MatchModeFilter(),
        new GenreFilter(getGenres2(), this.blockedGenres),
        new FormatFilter(getFormats()),
        new Separator(),
        new DemographicFilter(getDemographics(), this.selectedDemographics),
        new StatusFilter(),
        new ChapterLengthFilter("Minimum Chapter Length", "min_chap"),
        new ChapterLengthFilter("Maximum Chapter Length", "max_chap"),
        new Separator(),
        new Header("Release Year"),
        new YearFromFilter(),
        new YearToFilter(),
        new Separator(),
        new Header("Author / Artist — comma separated"),
        new AuthorFilter(),
        new ArtistFilter()
      ];
    }
  };

  // src/en/comix/index.ts
  var PREF_POSTER_QUALITY = "pref_poster_quality";
  var PREF_CONTENT_RATING = "pref_content_rating";
  var PREF_DEFAULT_TYPES = "pref_default_types";
  var PREF_DEFAULT_DEMOGRAPHICS = "pref_default_demographics";
  var PREF_BLOCKED_GENRES = "pref_blocked_genres";
  var LEGACY_HIDE_NSFW_PREF = "nsfw_pref";
  var DEDUPLICATE_CHAPTERS = "pref_deduplicate_chapters";
  var PREF_FETCH_CHAPTERS_UNTIL_KNOWN = "pref_fetch_chapters_until_known";
  var PREF_SCANLATOR_BLACKLIST = "pref_scanlator_blacklist";
  var ALTERNATIVE_NAMES_IN_DESCRIPTION = "pref_alt_names_in_description";
  var PREF_SHOW_EXTRA_INFO = "pref_show_extra_info";
  var PREF_SHOW_TAGS_IN_GENRES = "pref_show_tags_in_genres";
  var PREF_SCORE_POSITION = "pref_score_position";
  var PREF_SOLVE_CAPTCHA = "pref_solve_captcha";
  var CHAPTER_LIST_STATE_PREFIX = "chapter_list_state_";
  var DEFAULT_CONTENT_RATING = "suggestive";
  var WEBVIEW_TIMEOUT_MS = 12e4;
  var CHAPTER_LIST_TIMEOUT_MS = 20 * 6e4;
  var READER_TIMEOUT_MS = 24e4;
  var READER_PAGE_TIMEOUT_MS = 12e4;
  var OFFICIAL_GROUP_ID = 10702;
  var CHAPTER_DATA_VERSION = 1;
  var TAG_ID_CACHE_SIZE = 50;
  var RECENT_QUERIES_TTL_MS = 12e4;
  var SCRAMBLE_PATH_FALLBACK_REGEX = /\/(?:i5|s?i+)\//;
  var CAPTCHA_DISABLED = 'Open in WebView to solve the captcha, or turn on "Solve captchas" in extension settings';
  function bootstrapScript(solveCaptchas, flow) {
    return `(function () {
  if (window.top !== window || window.__cxStarted) return;
  window.__cxStarted = true;
  try { localStorage.setItem("__pu1", "[" + Date.now() + "]"); } catch (e) {}
  var finished = false;
  var send = function (value) { if (!finished) __tachiyomi.post(typeof value === "string" ? value : JSON.stringify(value)); };
  var finish = function (value) { if (finished) return; send(value); finished = true; __tachiyomi.done(); };
  var fail = function (message) { finish({ type: "error", message: String(message && message.message || message) }); };
  window.__cxReject = fail;
  var solving = false;
  var runSolver = function (frameWindow) {
    if (solving) return;
    solving = true;
    try {
      frameWindow.eval("(" + ${JSON.stringify(SOLVE_CAPTCHA)} + "\\n)(function (message) { top.__cxReject(message); })");
    } catch (e) {
      fail("Couldn't solve the site's captcha (" + e.message + "), open in WebView to solve it");
    }
  };
  var checkCaptcha = function () {
    if (finished) return;
    if (location.pathname === "/@waf/challenge") {
      if (!${solveCaptchas}) return fail(${JSON.stringify(CAPTCHA_DISABLED)});
      if (document.readyState === "complete") runSolver(window);
      return;
    }
    var frames = document.querySelectorAll("iframe");
    for (var i = 0; i < frames.length; i++) {
      if ((frames[i].getAttribute("src") || "").indexOf("/@waf/challenge") < 0) continue;
      if (!${solveCaptchas}) return fail(${JSON.stringify(CAPTCHA_DISABLED)});
      try {
        var frameWindow = frames[i].contentWindow;
        if (frameWindow && frameWindow.location.pathname === "/@waf/challenge" && frameWindow.document.readyState === "complete") runSolver(frameWindow);
      } catch (e) {}
    }
  };
  setInterval(checkCaptcha, 500);
  var whenReady = function (start) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
  };
  ${flow}
})();`;
  }
  function browseFlow() {
    return `whenReady(function () {
    window.__comixHarvestOptions = { timeoutMs: 60000, settleMs: 4000 };
    ${HARVEST_BROWSE}
    window.__comixHarvestPromise.then(function (result) {
      var items = (result.items || []).map(function (item) {
        return { hid: item.hid, title: item.title || "", url: item.url, poster: item.cover ? { small: item.cover, medium: item.cover, large: item.cover } : null };
      });
      var page = (result.listParams && result.listParams.page) || 1;
      var perPage = result.perPage || (result.listParams && result.listParams.limit) || 28;
      var hasNext = items.length > 0 && items.length >= perPage;
      if (result.error && !items.length) return fail(result.error);
      finish({ type: "result", result: { items: items, meta: { page: page, lastPage: hasNext ? page + 1 : page, hasNext: hasNext } } });
    }).catch(fail);
  });`;
  }
  function chaptersFlow(mangaId, knownIds) {
    return `var titlePath = ${JSON.stringify(`/title/${mangaId}`)};
  // Comix blocks chapter-list paging that is too fast or evenly spaced (upstream's RequestPacer)
  var nextAt = 0;
  var paceDelay = function () {
    var now = Date.now();
    var start = Math.max(now, nextAt);
    nextAt = start + 2500 + Math.floor(Math.random() * 2500);
    return start - now;
  };
  var isChapterList = function (url) {
    try {
      var segments = new URL(String(url), location.href).pathname.split("/").slice(1);
      return segments.length === 5 && segments[0] === "api" && segments[1] === "v1" && segments[2] === "manga" && segments[4] === "chapters";
    } catch (e) { return false; }
  };
  var xhrOpen = XMLHttpRequest.prototype.open;
  var xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) { this.__cxUrl = url; return xhrOpen.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    var xhr = this, args = arguments;
    if (isChapterList(xhr.__cxUrl)) {
      var delay = paceDelay();
      if (delay > 0) { setTimeout(function () { xhrSend.apply(xhr, args); }, delay); return; }
    }
    return xhrSend.apply(this, arguments);
  };
  var pageFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || String(input);
    if (isChapterList(url)) {
      var delay = paceDelay();
      if (delay > 0) return new Promise(function (resolve) { setTimeout(resolve, delay); }).then(function () { return pageFetch.call(window, input, init); });
    }
    return pageFetch.apply(window, arguments);
  };
  whenReady(function () {
    // Only on the requested title's page
    if (location.pathname !== titlePath && location.pathname.indexOf(titlePath + "-") !== 0) return;
    window.__comixHarvestOptions = { timeoutMs: 60000, settleMs: 6000, maxRounds: 1000, stopAtIds: ${JSON.stringify(knownIds)} };
    ${HARVEST_CHAPTERS}
    var dateOf = function (text) {
      var m = /(\\d+)\\s*(s|m|h|d|w|mo|mos|y|yr|yrs|min|mins|sec|secs|hr|hrs|day|days|week|weeks|month|months|year|years)\\s+ago/i.exec(text || "");
      return m ? m[1] + " " + m[2] + " ago" : "";
    };
    window.__comixHarvestPromise.then(function (result) {
      var queries = null;
      try {
        var raw = document.querySelector("script#initial-data");
        if (raw && raw.textContent) queries = JSON.parse(raw.textContent).queries || null;
      } catch (e) {}
      finish({ type: "result", result: {
        chapters: (result.chapters || []).map(function (ch) {
          return { id: ch.id, url: ch.url, number: ch.number, name: ch.name, votes: ch.votes, createdAtFormatted: dateOf(ch.text), group: ch.group, isOfficial: false };
        }),
        complete: !!result.complete,
        error: result.error || null,
        queries: queries
      } });
    }).catch(function (e) {
      finish({ type: "result", result: { chapters: [], complete: false, error: String(e), queries: null } });
    });
  });`;
  }
  function readerFlow(seek, onlyIndex) {
    return `window.__cxSeek = [${seek}, 0];
  var onlyIndex = ${onlyIndex};
  (${CHAPTER_PAGES}
  )(function (payload) {
    var message = JSON.parse(payload);
    if (message.type === "done") return finish(payload);
    send(payload);
    if (onlyIndex >= 0 && message.type === "page" && message.index === onlyIndex) finish({ type: "done" });
  }, fail, "__cxSeek", []);`;
  }
  var INITIAL_DATA_POLL = `(function () {
  // script#initial-data is partial while the document is still parsing
  if (document.readyState === "loading") return "";
  var raw = document.querySelector("script#initial-data");
  return raw && raw.textContent ? raw.textContent : "";
})()`;
  function messagesOf(result) {
    return result.payloads.flatMap((payload) => {
      try {
        return [JSON.parse(payload)];
      } catch {
        return [];
      }
    });
  }
  function resultOf(result, timeoutMessage = "Timed out waiting for WebView") {
    const messages = messagesOf(result);
    const error = messages.find((it) => it.type === "error");
    if (error) throw new Error(error.message ?? "WebView failed");
    const data = messages.find((it) => it.type === "result");
    if (!data) throw new Error(timeoutMessage);
    return data.result;
  }
  var Comix = class extends KeiSource {
    constructor() {
      super(...arguments);
      this.name = "Comix";
      this.lang = "en";
      this.baseUrl = "https://comix.to";
      /** Page image URLs from reader walks, for the image rate limit (upstream's isPageImage). */
      this.pageImages = /* @__PURE__ */ new Set();
      this.tagIdCache = /* @__PURE__ */ new Map();
      // The detail page's data, reused briefly so a details and chapters refresh is one navigation
      this.lastQueries = null;
    }
    get baseUrlHost() {
      return toHttpUrl(this.baseUrl).host;
    }
    configureClient(builder) {
      builder.rateLimit(2, 1e3, (url) => url.host === this.baseUrlHost && !url.encodedPath.startsWith("/images/covers/"));
      builder.rateLimit(2, 1e3, (url) => this.pageImages.has(url.toString()));
      builder.rateLimit(5);
    }
    // ============================== Browse ==============================
    async getPopularManga(page) {
      const builder = toHttpUrl(this.baseUrl).newBuilder();
      builder.addPathSegment("browse");
      builder.addQueryParameter("order[score]", "desc");
      builder.addQueryParameter("page", String(page));
      this.applyPreferenceFilters(builder);
      return this.getMangaListFromBrowse(builder.build());
    }
    async getLatestUpdates(page) {
      const builder = toHttpUrl(this.baseUrl).newBuilder();
      builder.addPathSegment("browse");
      builder.addQueryParameter("order[chapter_updated_at]", "desc");
      builder.addQueryParameter("page", String(page));
      this.applyPreferenceFilters(builder);
      return this.getMangaListFromBrowse(builder.build());
    }
    async getMangaListFromBrowse(url) {
      const result = await runWebView({
        url: url.toString(),
        script: bootstrapScript(this.solveCaptchas, browseFlow()),
        timeoutMs: WEBVIEW_TIMEOUT_MS,
        loadImages: false
      });
      const searchResponse = resultOf(result);
      const base = toHttpUrl(this.baseUrl);
      const mangas = (searchResponse.items ?? []).map((it) => toBasicSManga(it, base, this.posterQuality));
      return new MangasPage(mangas, hasNextPage(searchResponse));
    }
    async getSearchMangaList(page, query, filters) {
      const textOf = (type) => filters.find((it) => it instanceof type)?.state;
      const authorState = textOf(AuthorFilter);
      const artistState = textOf(ArtistFilter);
      const tagsState = textOf(TagsFilter);
      const authorIds = authorState != null ? await this.resolveTagIdsForNames("author", authorState) : [];
      const artistIds = artistState != null ? await this.resolveTagIdsForNames("artist", artistState) : [];
      const tagIds = tagsState != null ? await this.resolveTagIdsForNames("tag", tagsState) : [];
      const hasTermSelection = filters.some((it) => isTermFilter(it) && it.hasSelection) || tagIds.length > 0;
      const builder = toHttpUrl(this.baseUrl).newBuilder().addPathSegment("browse");
      for (const filter of filters) {
        if (!isUriFilter(filter)) continue;
        if (filter.requiresTermSelection && !hasTermSelection) continue;
        filter.addToUri(builder, query);
      }
      authorIds.forEach((it) => builder.addQueryParameter("authors[]", it));
      artistIds.forEach((it) => builder.addQueryParameter("artists[]", it));
      tagIds.forEach((it) => builder.addQueryParameter("genres_in[]", it));
      if (query.trim() !== "") builder.addQueryParameter("keyword", query);
      builder.addQueryParameter("page", String(page));
      return this.getMangaListFromBrowse(builder.build());
    }
    async getMangaByUrl(url) {
      if (removePrefix(url.host, "www.") !== removePrefix(this.baseUrlHost, "www.")) return null;
      if (url.pathSegments.length < 2 || url.pathSegments[0] !== "title") return null;
      const mangaSlug = url.pathSegments[1];
      if (substringBefore(mangaSlug, "-") === "") return null;
      const manga = { url: `/${mangaSlug}`, title: "" };
      const updated = (await this.fetchMangaUpdate(manga, [], true, false)).manga;
      updated.url = manga.url;
      return updated;
    }
    sourceFilters() {
      return new Filters(this.contentRating(), this.defaultTypes(), this.defaultDemographics(), this.blockedGenres());
    }
    applyPreferenceFilters(builder) {
      for (const filter of this.sourceFilters().getFilterList()) {
        if (isUriFilter(filter) && filter.isPreferenceFilter) filter.addToUri(builder);
      }
    }
    async resolveTagIdsForNames(type, raw) {
      const names = raw.split(",").map((it) => it.trim()).filter((it) => it !== "");
      const ids = [];
      for (const name of names) ids.push(...await this.resolveTagIds(type, name));
      return ids;
    }
    async resolveTagIds(type, name) {
      const cacheKey = `${type}\0${name.toLowerCase()}`;
      const cached = this.tagIdCache.get(cacheKey);
      if (cached) {
        this.tagIdCache.delete(cacheKey);
        this.tagIdCache.set(cacheKey, cached);
        return cached;
      }
      const url = toHttpUrl(this.baseUrl).newBuilder().addPathSegments("api/v1/tags/search").addQueryParameter("type", type).addQueryParameter("q", name).addQueryParameter("limit", "20").build();
      const hits = (await this.client.get(url, Fetch.XHR)).parseAs().result ?? [];
      if (hits.length === 0) throw new Error(`No ${type} named "${name}"`);
      const exact = hits.filter((it) => it.label.toLowerCase() === name.toLowerCase());
      const ids = (exact.length > 0 ? exact : hits).map((it) => String(it.id));
      this.tagIdCache.set(cacheKey, ids);
      if (this.tagIdCache.size > TAG_ID_CACHE_SIZE) this.tagIdCache.delete(this.tagIdCache.keys().next().value);
      return ids;
    }
    // ======================== Details and chapters ========================
    async fetchMangaUpdate(manga, chapters, fetchDetails, fetchChapters) {
      let cachedQueries = null;
      const getQueries = async () => {
        cachedQueries ?? (cachedQueries = await this.navigateForQueries(this.getMangaUrl(manga)));
        return cachedQueries;
      };
      const deduplicate = this.preferences.getBoolean(DEDUPLICATE_CHAPTERS, false);
      const scanlatorBlacklist = this.scanlatorBlacklist();
      const blacklistSignature = [...scanlatorBlacklist].sort().join(",");
      const mangaId = substringBefore(removePrefix(manga.url, "/"), "-");
      const listMemo = this.readChapterListState(mangaId);
      const fetchUntilKnown = fetchChapters && this.preferences.getBoolean(PREF_FETCH_CHAPTERS_UNTIL_KNOWN, true) && listMemo !== null && listMemo.deduplicated === deduplicate && listMemo.blacklist === blacklistSignature && listMemo.version === CHAPTER_DATA_VERSION && listMemo.complete !== false;
      const knownIds = fetchUntilKnown ? chapters.map((it) => this.chapterId(it)).filter((it) => it !== null) : [];
      const detailBeforeChapters = fetchUntilKnown ? mangaDetail(await getQueries()) : null;
      let unchanged = false;
      if (fetchUntilKnown && listMemo?.fetchedAt != null) {
        const formatted = detailBeforeChapters?.chapterUpdatedAtFormatted;
        const uploadedBy = formatted ? parseRelativeDate(formatted, true) : 0;
        unchanged = uploadedBy >= 1 && uploadedBy <= listMemo.fetchedAt;
      }
      let walkedQueries = null;
      let updatedChapters = chapters;
      if (fetchChapters && !unchanged) {
        const knownDates = /* @__PURE__ */ new Map();
        chapters.forEach((chapter) => {
          const id = this.chapterId(chapter);
          if (id !== null && chapter.date_upload > 0) knownDates.set(id, chapter.date_upload);
        });
        const mangaSlug = removePrefix(manga.url, "/");
        const fetchStartedAt = Date.now();
        const chapterList = await this.getWebViewChapterList(manga, knownIds);
        if (chapterList.queries) {
          walkedQueries = chapterList.queries;
          cachedQueries = walkedQueries;
          this.rememberQueries(this.getMangaUrl(manga), walkedQueries);
        }
        if (!chapterList.complete && chapters.length === 0) {
          throw new Error(chapterList.error ?? "Chapter list is incomplete");
        }
        const metas = /* @__PURE__ */ new Map();
        const fetched = chapterList.chapters.map((it) => {
          const { chapter, meta } = chapterToSChapter(it, mangaSlug);
          metas.set(chapter.url, meta);
          const date = knownDates.get(meta.id);
          if (date !== void 0) chapter.date_upload = date;
          return chapter;
        });
        const candidates = fetchUntilKnown || !chapterList.complete ? [...fetched, ...chapters] : fetched;
        updatedChapters = this.selectChapters(candidates, deduplicate, scanlatorBlacklist, metas);
        this.writeChapterListState(mangaId, {
          deduplicated: deduplicate,
          blacklist: blacklistSignature,
          version: CHAPTER_DATA_VERSION,
          complete: chapterList.complete,
          ...chapterList.complete ? { fetchedAt: fetchStartedAt } : {}
        });
      }
      let detail;
      if (detailBeforeChapters !== null) detail = detailBeforeChapters;
      else if (!fetchDetails) detail = null;
      else if (walkedQueries !== null) detail = mangaDetail(walkedQueries);
      else detail = mangaDetail(await getQueries());
      const updatedManga = detail !== null && fetchDetails ? this.parseMangaDetails(detail) : manga;
      return new SMangaUpdate(updatedManga, updatedChapters);
    }
    rememberQueries(url, queries) {
      this.lastQueries = { url, at: Date.now(), queries };
    }
    /**
     * The title page's initial data. Upstream always navigates a WebView because the site refuses
     * OkHttp; the app's client is accepted, so HTTP comes first and the WebView is the fallback.
     */
    async navigateForQueries(url) {
      const recent = this.lastQueries;
      if (recent && recent.url === url && Date.now() - recent.at < RECENT_QUERIES_TTL_MS) return recent.queries;
      let raw = null;
      try {
        const response = await this.client.get(url, { fetch: Fetch.DOCUMENT, ensureSuccess: false });
        if (response.isSuccessful) raw = response.asJsoup().selectFirst("script#initial-data")?.data() ?? null;
      } catch {
        raw = null;
      }
      if (!raw) {
        const result = await runWebView({
          url,
          script: bootstrapScript(this.solveCaptchas, ""),
          pollScript: INITIAL_DATA_POLL,
          timeoutMs: WEBVIEW_TIMEOUT_MS
        });
        const error = messagesOf(result).find((it) => it.type === "error");
        if (error) throw new Error(error.message ?? "WebView failed");
        raw = result.result;
        if (!raw) throw new Error("Timed out waiting for WebView");
      }
      const queries = JSON.parse(raw).queries;
      if (!queries || typeof queries !== "object" || Array.isArray(queries)) throw new Error("Could not find queries in initial data");
      this.rememberQueries(url, queries);
      return queries;
    }
    parseMangaDetails(detail) {
      return toSManga(
        detail,
        toHttpUrl(this.baseUrl),
        this.posterQuality,
        this.preferences.getBoolean(ALTERNATIVE_NAMES_IN_DESCRIPTION, false),
        this.preferences.getString(PREF_SCORE_POSITION, "top"),
        this.preferences.getBoolean(PREF_SHOW_EXTRA_INFO, true),
        this.preferences.getBoolean(PREF_SHOW_TAGS_IN_GENRES, false)
      );
    }
    getMangaUrl(manga) {
      return `${this.baseUrl}/title${manga.url}`;
    }
    getChapterUrl(chapter) {
      return `${this.baseUrl}/${chapter.url}`;
    }
    chapterId(chapter, metas) {
      const meta = metas?.get(chapter.url);
      if (meta) return meta.id;
      const segments = HttpUrl.parse(this.getChapterUrl(chapter))?.pathSegments;
      const last = segments?.[segments.length - 1];
      if (last === void 0) return null;
      const id = substringBefore(last, "-chapter-");
      return /^-?\d+$/.test(id) ? Number(id) : null;
    }
    async getWebViewChapterList(manga, knownIds) {
      const mangaId = substringBefore(removePrefix(manga.url, "/"), "-");
      const result = await runWebView({
        url: this.getMangaUrl(manga),
        script: bootstrapScript(this.solveCaptchas, chaptersFlow(mangaId, knownIds)),
        timeoutMs: CHAPTER_LIST_TIMEOUT_MS,
        loadImages: false
      });
      return resultOf(result, "Timed out reading the chapter list");
    }
    selectChapters(allChapters, shouldDeduplicate, scanlatorBlacklist, metas) {
      const seenUrls = /* @__PURE__ */ new Set();
      const uniqueChapters = allChapters.filter((it) => seenUrls.has(it.url) ? false : (seenUrls.add(it.url), true));
      const groupId = (chapter) => metas.get(chapter.url)?.groupId ?? null;
      const filteredChapters = scanlatorBlacklist.size === 0 ? uniqueChapters : uniqueChapters.filter(
        (chapter) => !scanlatorBlacklist.has((chapter.scanlator ?? "").trim().toLowerCase()) && !(groupId(chapter) !== null && scanlatorBlacklist.has(String(groupId(chapter))))
      );
      let finalChapters = filteredChapters;
      if (shouldDeduplicate) {
        const chapterMap = /* @__PURE__ */ new Map();
        const votes = (chapter) => metas.get(chapter.url)?.votes ?? 0;
        const isOfficial = (chapter) => metas.get(chapter.url)?.official === true;
        for (const ch of filteredChapters) {
          const key = ch.chapter_number;
          const current = chapterMap.get(key);
          if (current === void 0) {
            chapterMap.set(key, ch);
            continue;
          }
          const newIsOfficial = isOfficial(ch);
          const currentIsOfficial = isOfficial(current);
          const newIsOfficialGroup = groupId(ch) === OFFICIAL_GROUP_ID;
          const currentIsOfficialGroup = groupId(current) === OFFICIAL_GROUP_ID;
          let better;
          if (newIsOfficial && !currentIsOfficial) better = true;
          else if (!newIsOfficial && currentIsOfficial) better = false;
          else if (newIsOfficialGroup && !currentIsOfficialGroup) better = true;
          else if (!newIsOfficialGroup && currentIsOfficialGroup) better = false;
          else if (votes(ch) !== votes(current)) better = votes(ch) > votes(current);
          else better = (this.chapterId(ch, metas) ?? 0) > (this.chapterId(current, metas) ?? 0);
          if (better) chapterMap.set(key, ch);
        }
        finalChapters = [...chapterMap.values()];
      }
      return [...finalChapters].sort((a, b) => b.chapter_number - a.chapter_number);
    }
    readChapterListState(mangaId) {
      const raw = this.preferences.getString(CHAPTER_LIST_STATE_PREFIX + mangaId, "");
      if (raw === "") return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    writeChapterListState(mangaId, state) {
      this.preferences.edit().putString(CHAPTER_LIST_STATE_PREFIX + mangaId, JSON.stringify(state)).apply();
    }
    // =============================== Pages ===============================
    // Comix image domains block any image requests with Referer/Origin
    getImageRequest(page) {
      if (!page.imageUrl) throw new Error(`Page ${page.index + 1} has no image URL`);
      const headers = { ...this.headers };
      delete headers["Referer"];
      return { url: page.imageUrl, headers };
    }
    /** Walks the reader until every page URL is captured; pages it missed are walked again in getImageUrl. */
    async getPageList(chapter) {
      const chapterUrl = this.getChapterUrl(chapter);
      const { total, pages, error } = await this.runReaderWalk(chapterUrl, -1, -1, READER_TIMEOUT_MS);
      if (total === null) throw new Error(error ?? "The reader didn't load any pages");
      return Array.from({ length: total }, (_, index) => new Page(index, chapterUrl, pages.get(index) ?? null));
    }
    async getImageUrl(page) {
      const { pages, error } = await this.runReaderWalk(page.url, page.index, page.index, READER_PAGE_TIMEOUT_MS);
      const url = pages.get(page.index);
      if (!url) throw new Error(error ?? `Page ${page.index + 1} didn't load in the reader`);
      return url;
    }
    async runReaderWalk(chapterUrl, seek, onlyIndex, timeoutMs) {
      const result = await runWebView({
        url: chapterUrl,
        script: bootstrapScript(this.solveCaptchas, readerFlow(seek, onlyIndex)),
        timeoutMs,
        loadImages: true
      });
      let total = null;
      let error = result.timedOut ? "Timed out loading the reader" : null;
      const pages = /* @__PURE__ */ new Map();
      for (const message of messagesOf(result)) {
        if (message.type === "total" && message.total != null) total = message.total;
        else if (message.type === "page" && message.index != null && message.url) {
          pages.set(message.index, message.url);
          this.pageImages.add(message.url);
        } else if (message.type === "error") error = message.message ?? "WebView failed";
      }
      return { total, pages, error };
    }
    /**
     * Upstream's Descrambler as tile moves. The scramble parameters come from the image response
     * headers; a `#scramble=<seed>,<grid>,<algo>,<hash>` fragment on the image URL carries them
     * when already known. Only the scrambled path family is checked.
     */
    async getImageTransform(page, width, height) {
      if (!page.imageUrl) return null;
      const url = HttpUrl.parse(page.imageUrl);
      if (!url) return null;
      let info = scrambleInfoFromFragment(url.fragment);
      if (info === null) {
        if (!SCRAMBLE_PATH_FALLBACK_REGEX.test(url.encodedPath)) return null;
        const request = this.getImageRequest(new Page(page.index, page.url, url.newBuilder().fragment(null).build().toString()));
        const response = await this.client.get(request.url, {
          headers: request.headers,
          fetch: Fetch.IMAGE,
          ensureSuccess: false,
          responseType: "base64"
        });
        if (!response.isSuccessful) return null;
        info = {
          seed: response.header("x-scramble-seed"),
          grid: response.header("x-scramble-grid"),
          algo: response.header("x-scramble-algo"),
          hash: response.header("x-scramble-hash")
        };
      }
      const seed = scrambleSeed(info);
      return seed === null ? null : descrambleTransform(width, height, seed, info.algo);
    }
    // ============================== Filters ==============================
    getFilterList() {
      return this.sourceFilters().getFilterList();
    }
    // ============================ Preferences ============================
    get solveCaptchas() {
      return this.preferences.getBoolean(PREF_SOLVE_CAPTCHA, false);
    }
    get posterQuality() {
      return this.preferences.getString(PREF_POSTER_QUALITY, "large");
    }
    scanlatorBlacklist() {
      return new Set(
        this.preferences.getString(PREF_SCANLATOR_BLACKLIST, "").split(",").map((it) => it.trim().toLowerCase()).filter((it) => it !== "")
      );
    }
    defaultTypes() {
      return this.preferences.getStringSet(PREF_DEFAULT_TYPES, getTypes().map(([, value]) => value));
    }
    defaultDemographics() {
      const all = getDemographics().map(([, value]) => value);
      const selected = this.preferences.getStringSet(PREF_DEFAULT_DEMOGRAPHICS, all);
      return selected.size === 0 ? new Set(all) : selected;
    }
    blockedGenres() {
      return this.preferences.getStringSet(PREF_BLOCKED_GENRES, []);
    }
    // The legacy "Hide NSFW" boolean still exists in some users' preferences;
    // map it to a sensible default until they pick a value explicitly.
    contentRating() {
      const unset = "\0";
      const stored = this.preferences.getString(PREF_CONTENT_RATING, unset);
      if (stored !== unset) return stored;
      if (!this.preferences.getBoolean(LEGACY_HIDE_NSFW_PREF, true)) return "";
      return DEFAULT_CONTENT_RATING;
    }
    setupPreferenceScreen(screen) {
      screen.addPreference(
        new SwitchPreferenceCompat({
          key: PREF_SOLVE_CAPTCHA,
          title: "Solve captchas",
          summary: `Solve the site's "Verify you're human" captcha automatically`,
          defaultValue: false
        })
      );
      screen.addPreference(
        new SwitchPreferenceCompat({
          key: PREF_FETCH_CHAPTERS_UNTIL_KNOWN,
          title: "Faster chapter list fetching",
          summary: "Enabled: Uses fewer requests, but may miss newly added older chapters (e.g. chapter 5.5 when the latest known chapter is 150).\n\nDisabled: Finds older chapter additions, but fetching large chapter lists is slower.",
          defaultValue: true
        })
      );
      screen.addPreference(
        new ListPreference({
          key: PREF_POSTER_QUALITY,
          title: "Thumbnail Quality",
          summary: "Change the quality of the thumbnail. Current: %s.",
          entries: ["Small", "Medium", "Large"],
          entryValues: ["small", "medium", "large"],
          defaultValue: "large"
        })
      );
      screen.addPreference(
        new ListPreference({
          key: PREF_CONTENT_RATING,
          title: "Content rating",
          summary: "Maximum content rating shown in popular, latest, and search results. The Content rating filter in search overrides this. Current: %s.",
          entries: ["Show all", "Safe only", "Up to Suggestive", "Up to Erotica", "Up to Pornographic"],
          entryValues: ["", "safe", "suggestive", "erotica", "pornographic"],
          defaultValue: DEFAULT_CONTENT_RATING
        })
      );
      screen.addPreference(
        new MultiSelectListPreference({
          key: PREF_DEFAULT_TYPES,
          title: "Default types",
          summary: "Types to include in popular, latest, and search results. The Type filter in search overrides this.",
          entries: getTypes().map(([title]) => title),
          entryValues: getTypes().map(([, value]) => value),
          defaultValue: getTypes().map(([, value]) => value)
        })
      );
      screen.addPreference(
        new MultiSelectListPreference({
          key: PREF_DEFAULT_DEMOGRAPHICS,
          title: "Default demographics",
          summary: "Unticked demographics are hidden from popular, latest, and search results. The Demographic filter in search overrides this.",
          entries: getDemographics().map(([title]) => title),
          entryValues: getDemographics().map(([, value]) => value),
          defaultValue: getDemographics().map(([, value]) => value)
        })
      );
      screen.addPreference(
        new MultiSelectListPreference({
          key: PREF_BLOCKED_GENRES,
          title: "Blocked genres",
          summary: "Genres always excluded from results. The search filter can still include a blocked genre as a one-off override.",
          entries: getGenres2().map(([title]) => title),
          entryValues: getGenres2().map(([, value]) => value),
          defaultValue: []
        })
      );
      screen.addPreference(
        new SwitchPreferenceCompat({
          key: DEDUPLICATE_CHAPTERS,
          title: "Deduplicate Chapters",
          summary: "Remove duplicate chapters from the chapter list.\nOfficial chapters (Comix-marked) are preferred, followed by the highest-voted or most recent.\nWarning: It can be slow on large lists.",
          defaultValue: false
        })
      );
      screen.addPreference(
        new EditTextPreference({
          key: PREF_SCANLATOR_BLACKLIST,
          title: "Scanlator Blacklist",
          summary: "Filter out chapters from specific groups. Comma-separated list of group names or group IDs (e.g., 'Violet Scans, 307').",
          defaultValue: ""
        })
      );
      screen.addPreference(
        new SwitchPreferenceCompat({ key: ALTERNATIVE_NAMES_IN_DESCRIPTION, title: "Show Alternative Names in Description", defaultValue: false })
      );
      screen.addPreference(
        new SwitchPreferenceCompat({
          key: PREF_SHOW_EXTRA_INFO,
          title: "Show extra info in description",
          summary: "Append publication year, language, content rating, rank, ratings count, follower count, and tracker links to the manga description.",
          defaultValue: true
        })
      );
      screen.addPreference(
        new SwitchPreferenceCompat({
          key: PREF_SHOW_TAGS_IN_GENRES,
          title: "Show tags in genre chips",
          summary: "Include the site's narrative tag list (e.g. Demons, Vampires, Time Travel) alongside the curated genres in the manga details. Off by default — the curated set matches what the site itself shows on the page.",
          defaultValue: false
        })
      );
      screen.addPreference(
        new ListPreference({
          key: PREF_SCORE_POSITION,
          title: "Score display position",
          summary: "%s",
          entries: ["Top of description", "Bottom of description", "Don't show"],
          entryValues: ["top", "bottom", "none"],
          defaultValue: "top"
        })
      );
    }
  };
  function mangaDetail(queries) {
    const entry = Object.entries(queries).find(([key]) => key.includes('"detail"'));
    if (!entry || !entry[1] || typeof entry[1] !== "object") throw new Error("Could not find manga detail in queries");
    return entry[1];
  }
  function scrambleInfoFromFragment(fragment) {
    if (!fragment?.startsWith("scramble=")) return null;
    const [seed, grid, algo, hash] = fragment.slice("scramble=".length).split(",");
    const orNull = (value) => value === void 0 || value === "" ? null : value;
    return { seed: orNull(seed), grid: orNull(grid), algo: orNull(algo), hash: orNull(hash) };
  }
  var index_default = defineExtension([new Comix()]);
  return __toCommonJS(index_exports);
})();
