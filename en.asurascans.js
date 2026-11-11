// Asura Scans 1 for tachiyomi-ios. Ported from keiyoushi/extensions-source (Apache-2.0).
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

  // src/en/asurascans/index.ts
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default
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
  function substringAfter(text, delimiter, missing = text) {
    const index = text.indexOf(delimiter);
    return index < 0 ? missing : text.slice(index + delimiter.length);
  }
  function substringBefore(text, delimiter, missing = text) {
    const index = text.indexOf(delimiter);
    return index < 0 ? missing : text.slice(0, index);
  }
  function removeSuffix(text, suffix) {
    return text.endsWith(suffix) ? text.slice(0, text.length - suffix.length) : text;
  }
  var log = {
    debug: (message) => host().log("debug", message),
    warn: (message) => host().log("warn", message),
    error: (message) => host().log("error", message)
  };
  function parseIsoDate(text) {
    const time = Date.parse(text);
    return Number.isNaN(time) ? 0 : time;
  }
  var seconds = (value) => value * 1e3;

  // src/en/asurascans/dto.ts
  function mangaDtoToSManga(dto, baseUrl) {
    const manga = SManga.create();
    manga.title = dto.title;
    manga.thumbnail_url = dto.cover ?? dto.coverUrl ?? null;
    manga.url = `/series/${dto.slug}`;
    const segments = toHttpUrl(`${baseUrl}${dto.public_url}`).pathSegments;
    return { manga, slug: segments[segments.length - 1] };
  }
  function toSMangaDetails(dto) {
    const manga = SManga.create();
    manga.title = dto.title;
    manga.thumbnail_url = dto.coverUrl;
    manga.author = dto.author ?? null;
    manga.artist = dto.artist ?? null;
    manga.description = parseDescription(dto);
    const genres = [];
    if (dto.type != null) genres.push(dto.type.charAt(0).toUpperCase() + dto.type.slice(1));
    if (dto.genres != null) genres.push(...dto.genres.map((genre) => genre.name));
    manga.genre = genres.join(", ");
    manga.status = parseStatus(dto);
    manga.initialized = true;
    return manga;
  }
  function parseDescription(dto) {
    let result = "";
    const metadata = [];
    if (dto.popularityRank != null) metadata.push(`Rank: #${dto.popularityRank}`);
    if (dto.rating != null) metadata.push(`Rating: ${dto.rating.toFixed(2)}`);
    if (dto.bookmarkCount != null) {
      const count = dto.bookmarkCount;
      const formatted = count >= 1e6 ? `${(count / 1e6).toFixed(1)}M` : count >= 1e3 ? `${(count / 1e3).toFixed(1)}K` : String(count);
      metadata.push(`Bookmarks: ${formatted}`);
    }
    if (metadata.length > 0) {
      result += metadata.join(" • ");
    }
    const description = dto.description != null ? parseHtml(dto.description).text() : "";
    if (description !== "") {
      if (result !== "") result += "\n\n";
      result += description;
    }
    const cleanAltTitles = dto.alternativeTitles == null ? null : (dto.alternativeTitles.includes("•") ? dto.alternativeTitles.split("•") : dto.alternativeTitles.split(",")).map((title) => title.trim()).filter((title) => title !== "");
    if (cleanAltTitles != null && cleanAltTitles.length > 0) {
      if (result !== "") result += "\n\n";
      result += "Alternative Titles:\n";
      result += cleanAltTitles.map((title) => `- ${title}`).join("\n");
    }
    return result;
  }
  function parseStatus(dto) {
    switch (dto.status?.toLowerCase()) {
      case "ongoing":
        return SManga.ONGOING;
      case "completed":
        return SManga.COMPLETED;
      case "hiatus":
        return SManga.ON_HIATUS;
      case "dropped":
      case "axed":
        return SManga.CANCELLED;
      default:
        return SManga.UNKNOWN;
    }
  }
  function applyMangaUrl(dto, manga, baseUrl) {
    manga.url = `/series/${dto.seriesSlug}`;
    const segments = toHttpUrl(`${baseUrl}${dto.publicUrl}`).pathSegments;
    return segments[segments.length - 1];
  }
  function isLocked(dto) {
    if (dto.is_premium ?? dto.is_locked ?? false) return true;
    const until = dto.early_access_until;
    if (until == null) return false;
    const time = parseIsoDate(until);
    return time !== 0 && time > Date.now();
  }
  function chapterDtoToSChapter(dto) {
    const chapter = SChapter.create();
    const numberStr = removeSuffix(String(dto.number), ".0");
    chapter.url = `/series/${dto.series_slug ?? null}/chapter/${numberStr}`;
    let name = "";
    if (isLocked(dto)) name += "🔒 ";
    name += `Chapter ${numberStr}`;
    if (dto.title != null) name += ` - ${dto.title}`;
    chapter.name = name;
    chapter.date_upload = parseIsoDate(dto.created_at ?? "");
    return chapter;
  }

  // src/en/asurascans/filters.ts
  function isUriFilter(filter) {
    return typeof filter?.addToUri === "function";
  }
  var UriPartFilter = class extends Select {
    constructor(name, param, vals, defaultValue = null) {
      const index = vals.findIndex(([, value]) => value === defaultValue);
      super(
        name,
        vals.map(([label]) => label),
        index !== -1 ? index : 0
      );
      this.param = param;
      this.vals = vals;
    }
    addToUri(builder) {
      const value = this.vals[this.state][1];
      if (value.trim() !== "") {
        builder.addQueryParameter(this.param, value);
      }
    }
  };
  var UriSortFilter = class extends Sort {
    constructor(name, sortParam, orderParam, vals, defaultValue, ascendingValue, descendingValue) {
      const index = vals.findIndex(([, value]) => value === defaultValue);
      super(
        name,
        vals.map(([label]) => label),
        { index: index !== -1 ? index : 0, ascending: false }
      );
      this.sortParam = sortParam;
      this.orderParam = orderParam;
      this.vals = vals;
      this.ascendingValue = ascendingValue;
      this.descendingValue = descendingValue;
    }
    addToUri(builder) {
      const state = this.state;
      if (state === null) return;
      const selected = this.vals[state.index][1];
      const order = state.ascending ? this.ascendingValue : this.descendingValue;
      builder.addQueryParameter(this.sortParam, selected);
      builder.addQueryParameter(this.orderParam, order);
    }
  };
  var UriMultiSelectOption = class extends CheckBox {
    constructor(name, value) {
      super(name);
      this.value = value;
    }
  };
  var UriMultiSelectFilter = class extends Group {
    constructor(name, param, vals) {
      super(
        name,
        vals.map(([label, value]) => new UriMultiSelectOption(label, value))
      );
      this.param = param;
    }
    addToUri(builder) {
      const checked = this.state.filter((option) => option.state).map((option) => option.value);
      if (checked.length > 0) {
        builder.addQueryParameter(this.param, checked.join(","));
      }
    }
  };
  var SortFilter = class extends UriSortFilter {
    constructor(defaultSort = null) {
      super(
        "Sort By",
        "sort",
        "order",
        [
          ["Latest Update", "latest"],
          ["Popular", "popular"],
          ["Rating", "rating"],
          ["A-Z", "title"],
          ["Newest", "update"]
        ],
        defaultSort,
        "asc",
        "desc"
      );
    }
  };
  var StatusFilter = class extends UriPartFilter {
    constructor() {
      super("Status", "status", [
        ["All", ""],
        ["Ongoing", "ongoing"],
        ["Completed", "completed"],
        ["Hiatus", "hiatus"],
        ["Dropped", "dropped"],
        ["Axed", "axed"]
      ]);
    }
  };
  var TypeFilter = class extends UriPartFilter {
    constructor() {
      super("Type", "type", [
        ["All", ""],
        ["Manhwa", "manhwa"],
        ["Manhua", "manhua"],
        ["Mangatoon", "manga"]
      ]);
    }
  };
  var GenresFilter = class extends UriMultiSelectFilter {
    constructor(genres) {
      super(
        "Genres",
        "genres",
        genres.map((genre) => [genre.name, genre.slug])
      );
    }
  };
  var CreatorFilter = class extends Select {
    constructor(authors, artists) {
      super("Creators", ["", ...artists, ...artists]);
      this.authors = authors;
      this.artists = artists;
    }
    addToUri(builder) {
      const state = this.state;
      let parm = null;
      let selected = null;
      if (state === 0) {
        parm = null;
      } else if (state >= 1 && state <= this.artists.length) {
        parm = "artist";
        selected = this.artists[state - 1];
      } else {
        parm = "author";
        selected = this.authors[state - 1 - this.artists.length];
      }
      if (parm !== null) {
        builder.addQueryParameter(parm, selected ?? null);
      }
    }
  };
  var MinChaptersFilter = class extends Text {
    constructor() {
      super("Min Chapters");
    }
    addToUri(builder) {
      if (this.state.trim() !== "") {
        builder.addQueryParameter("min_chapters", this.state);
      }
    }
  };

  // src/en/asurascans/filterCache.ts
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

  // src/en/asurascans/index.ts
  var PER_PAGE_LIMIT = 20;
  var OLD_FORMAT_MANGA_REGEX = /^\/manga\/(\d+-)?([^/]+)\/?$/;
  var PREF_HIDE_PREMIUM_CHAPTERS = "pref_hide_premium_chapters";
  var SLUG_MAP = "slug_map_v2";
  var URL_RANDOM_PART = /-[a-z0-9]{8}$/;
  var AsuraScans = class extends KeiSource {
    constructor() {
      super(...arguments);
      this.name = "Asura Scans";
      this.lang = "en";
      this.baseUrl = "https://asurascans.com";
      this.apiUrl = "https://api.asurascans.com/api";
      /**
       * Stands in for upstream's `SManga.memo["slug"]`: series slug → the site's random slug
       * (`nano-machine` → `nano-machine-f212c582`), learnt from listings and details. The SDK's
       * models have no memo; without an entry the URL without the random part is used, which the
       * site redirects (upstream's own fallback in `fetchMangaUpdate`).
       */
      this.slugMemo = /* @__PURE__ */ new Map();
      // ============================== Filters ==============================
      this.filterCache = new FilterDataCache(this, () => this.fetchFilterData());
    }
    configureClient(builder) {
      builder.rateLimit(2, seconds(2), (url) => !url.encodedPath.includes("/covers/"));
    }
    async getPopularManga(page) {
      return this.getSearchMangaList(page, "", [new SortFilter("popular")]);
    }
    async getLatestUpdates(page) {
      return this.getSearchMangaList(page, "", [new SortFilter("latest")]);
    }
    // ============================== Search ===============================
    async getSearchMangaList(page, query, filters) {
      const url = toHttpUrl(`${this.apiUrl}/series`).newBuilder();
      url.addQueryParameter("offset", String((page - 1) * PER_PAGE_LIMIT));
      url.addQueryParameter("limit", String(PER_PAGE_LIMIT));
      if (query.trim() !== "") {
        url.addQueryParameter("search", query);
      }
      for (const filter of filters) {
        if (isUriFilter(filter)) filter.addToUri(url);
      }
      const response = await this.client.get(url.build(), Fetch.XHR);
      const result = response.parseAs();
      const mangas = (result.data ?? []).map((dto) => {
        const { manga, slug } = mangaDtoToSManga(dto, this.baseUrl);
        this.slugMemo.set(this.getMangaSlug(manga.url), slug);
        return manga;
      });
      return new MangasPage(mangas, result.meta.has_more ?? false);
    }
    async getMangaByUrl(url) {
      if (url.host === toHttpUrl(this.baseUrl).host && url.pathSegments[0] === "comics") {
        const slug = url.pathSegments[1];
        const tmpManga = SManga.create();
        tmpManga.url = `/series/${slug}`;
        this.slugMemo.set(slug, slug);
        return (await this.fetchMangaUpdate(tmpManga, [], true, false)).manga;
      }
      return null;
    }
    // ============================== Details ==============================
    getMangaUrl(manga) {
      const slug = this.getMangaSlug(manga.url);
      let randomSlug = this.slugMemo.get(slug);
      if (randomSlug === void 0) {
        let oldSlugMap = {};
        try {
          oldSlugMap = JSON.parse(this.preferences.getString(SLUG_MAP, "{}"));
        } catch {
        }
        const old = oldSlugMap[slug];
        randomSlug = typeof old === "string" ? old : slug;
      }
      return `${this.baseUrl}/comics/${randomSlug}`;
    }
    async fetchMangaUpdate(manga, _chapters, _fetchDetails, _fetchChapters) {
      const url = this.getMangaUrl(manga);
      let response = await this.client.get(url, { fetch: Fetch.DOCUMENT, ensureSuccess: false });
      if (!response.isSuccessful) {
        response = await this.client.get(url.replace(URL_RANDOM_PART, ""), Fetch.DOCUMENT);
      }
      const document = response.asJsoup();
      const updatedManga = toSMangaDetails(this.extractAstroProp(document, "title", "description"));
      const randomMangaSlug = applyMangaUrl(
        this.extractAstroProp(document, "publicUrl"),
        updatedManga,
        this.baseUrl
      );
      this.slugMemo.set(this.getMangaSlug(updatedManga.url), randomMangaSlug);
      const hidePremium = this.hidePremiumChapters();
      const chapters = (this.extractAstroProp(document, "chapters").chapters ?? []).filter((chapter) => !(hidePremium && isLocked(chapter))).map((chapter) => chapterDtoToSChapter(chapter));
      return new SMangaUpdate(updatedManga, chapters);
    }
    // fetchRelatedMangaList is not ported: the SDK has no related-manga call.
    getChapterUrl(chapter) {
      const seriesSlug = substringBefore(substringAfter(chapter.url, "/series/"), "/");
      const randomSlug = this.slugMemo.get(seriesSlug) ?? seriesSlug;
      const number = substringAfter(chapter.url, "/chapter/");
      return `${this.baseUrl}/comics/${randomSlug}/chapter/${number}`;
    }
    // =============================== Pages ===============================
    async getPageList(chapter) {
      const url = this.getChapterUrl(chapter);
      const response = await this.client.get(url, Fetch.DOCUMENT);
      const document = response.asJsoup();
      let pages;
      try {
        pages = this.extractAstroProp(document, "pages").pages ?? [];
      } catch {
        pages = [];
      }
      if (pages.length === 0) {
        return [];
      }
      return pages.map((pageDto, index) => {
        let pageUrl;
        if (pageDto.tiles != null && pageDto.tiles.length > 0) {
          const data = {
            tiles: pageDto.tiles,
            tileCols: pageDto.tile_cols ?? 4,
            tileRows: pageDto.tile_rows ?? 5
          };
          pageUrl = toHttpUrl(pageDto.url).newBuilder().fragment(JSON.stringify(data)).build().toString();
        } else {
          pageUrl = pageDto.url;
        }
        return new Page(index, "", pageUrl);
      });
    }
    /**
     * Upstream's `scrambledImageInterceptor`: the image URL's fragment carries the tile order;
     * tile `w` of the download (row-major, `tileCols` × `tileRows` tiles of `width / tileCols` ×
     * `height / tileRows`) is drawn at position `tiles[w]` of an output trimmed to whole tiles.
     */
    async getImageTransform(page, width, height) {
      const imageUrl = page.imageUrl ?? page.url;
      const fragment = toHttpUrl(imageUrl).fragment;
      if (fragment === null) return null;
      if (!fragment.startsWith("{")) return null;
      const pageData = JSON.parse(fragment);
      const tileW = Math.trunc(width / pageData.tileCols);
      const tileH = Math.trunc(height / pageData.tileRows);
      const tiles = pageData.tiles.map((j, w) => {
        const srcCol = w % pageData.tileCols;
        const srcRow = Math.trunc(w / pageData.tileCols);
        const dstCol = j % pageData.tileCols;
        const dstRow = Math.trunc(j / pageData.tileCols);
        return {
          sx: srcCol * tileW,
          sy: srcRow * tileH,
          sw: tileW,
          sh: tileH,
          dx: dstCol * tileW,
          dy: dstRow * tileH
        };
      });
      return { width: tileW * pageData.tileCols, height: tileH * pageData.tileRows, tiles };
    }
    /** Upstream's `fetchFilterData`: genres from the browse page and the creators list. */
    async fetchFilterData() {
      const [genres, creators] = await Promise.all([
        this.client.get(`${this.baseUrl}/browse`, Fetch.DOCUMENT).then((response) => this.extractAstroPropFromResponse(response, "availableGenres").availableGenres),
        this.client.get(`${this.apiUrl}/creators`, Fetch.XHR).then((response) => response.parseAs().data)
      ]);
      return { genres, authors: creators.authors, artists: creators.artists };
    }
    getFilterList() {
      const filters = [new SortFilter(), new StatusFilter(), new TypeFilter()];
      const dto = this.filterCache.read();
      if (dto !== null) {
        filters.push(new GenresFilter(dto.genres));
        filters.push(new CreatorFilter(dto.authors, dto.artists));
      }
      filters.push(new MinChaptersFilter());
      if (dto === null) filters.push(new Separator(), new Header(FILTER_FETCH_HINT));
      return filters;
    }
    // ============================= Utilities =============================
    getMangaSlug(url) {
      if (url.includes("/series/")) return substringBefore(substringAfter(url, "/series/"), "/");
      if (url.includes("/comics/")) return substringBefore(substringAfter(url, "/comics/"), "/");
      if (url.includes("/manga/")) {
        return OLD_FORMAT_MANGA_REGEX.exec(url)?.[2] ?? substringBefore(substringAfter(url, "/manga/"), "/");
      }
      return url.replace(/^\/+|\/+$/g, "");
    }
    setupPreferenceScreen(screen) {
      screen.addPreference(
        new SwitchPreferenceCompat({
          key: PREF_HIDE_PREMIUM_CHAPTERS,
          title: "Hide premium chapters",
          summary: "Hides the chapters that require a subscription to view",
          defaultValue: true
        })
      );
    }
    hidePremiumChapters() {
      return this.preferences.getBoolean(PREF_HIDE_PREMIUM_CHAPTERS, true);
    }
    extractAstroProp(document, ...key) {
      const selector = key.map((it) => `[props*=${it}]`).join("");
      const prop = document.selectFirst(selector)?.attr("props");
      if (prop === void 0) throw new Error(`Unable to find prop with [${key.join(", ")}]`);
      const json = JSON.parse(prop);
      return unwrapAstro(json);
    }
    extractAstroPropFromResponse(response, key) {
      return this.extractAstroProp(response.asJsoup(), key);
    }
  };
  function isIntPrimitive(value) {
    if (typeof value === "number") return Number.isInteger(value);
    if (typeof value === "string") return /^[+-]?\d+$/.test(value);
    return false;
  }
  function unwrapAstro(json) {
    if (Array.isArray(json)) {
      if (json.length === 0) return null;
      if (json.length === 1 && isIntPrimitive(json[0])) return null;
      if (json.length === 2 && isIntPrimitive(json[0])) return unwrapAstro(json[1]);
      return json.map(unwrapAstro);
    }
    if (json !== null && typeof json === "object") {
      return Object.fromEntries(Object.entries(json).map(([key, value]) => [key, unwrapAstro(value)]));
    }
    return json;
  }
  var index_default = defineExtension([new AsuraScans()]);
  return __toCommonJS(index_exports);
})();
