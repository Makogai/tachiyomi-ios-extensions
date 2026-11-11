// Atsumaru 1 for tachiyomi-ios. Ported from keiyoushi/extensions-source (Apache-2.0).
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

  // src/en/atsumaru/index.ts
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
  function parseIsoDate(text) {
    const time = Date.parse(text);
    return Number.isNaN(time) ? 0 : time;
  }

  // src/en/atsumaru/filters.ts
  var GenreFilter = class extends Group {
    constructor(genres, excludedIds = /* @__PURE__ */ new Set()) {
      super(
        "Genres",
        genres.map(
          (genre) => new TriState(genre.name, excludedIds.has(genre.id) ? TriState.STATE_EXCLUDE : TriState.STATE_IGNORE)
        )
      );
      this.genreIds = genres.map((it) => it.id);
    }
  };
  var TagFilter = class extends Group {
    constructor(letters, tags) {
      super(
        letters,
        tags.map((tag) => new TriState(tag.name))
      );
      this.tagIds = tags.map((it) => it.id);
    }
  };
  var TagFilters = class extends Group {
    constructor(tags) {
      const groups = /* @__PURE__ */ new Map();
      const sorted = [...tags].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
      for (const tag of sorted) {
        const c = tag.name.charAt(0).toUpperCase();
        const key = c === "" || c < "A" || c > "Z" ? "0-9" : c;
        const list = groups.get(key) ?? [];
        list.push(tag);
        groups.set(key, list);
      }
      super(
        "Tags",
        [...groups].map(([letters, tagsChunk]) => new TagFilter(letters, tagsChunk))
      );
    }
  };
  var TypeFilter = class extends Group {
    constructor(types) {
      super(
        "Manga Type",
        types.map((type) => new CheckBox(type.name, false))
      );
      this.ids = types.map((it) => it.id);
    }
  };
  var StatusFilter = class extends Group {
    constructor(statuses) {
      super(
        "Publishing Status",
        statuses.map((status) => new CheckBox(status.name, false))
      );
      this.ids = statuses.map((it) => it.id);
    }
  };
  var YearFilter = class extends Text {
    constructor() {
      super("Year (e.g., 2024)");
    }
  };
  var MinChaptersFilter = class extends Text {
    constructor() {
      super("Minimum Chapters");
    }
  };
  var SortFilter = class extends Sort {
    constructor() {
      super("Sort By", ["Popularity", "Trending", "Date Added", "Release Date", "Top Rated", "Title"], {
        index: 0,
        ascending: false
      });
    }
  };
  SortFilter.VALUES = ["views", "trending", "dateAdded", "released", "mbRating", "title"];
  var AdultFilter = class extends CheckBox {
    constructor(state) {
      super("Show Adult Content", state);
    }
  };
  var OfficialFilter = class extends CheckBox {
    constructor() {
      super("Only Official Translations", false);
    }
  };

  // src/en/atsumaru/dto.ts
  function hasNextPage(results) {
    return results.page * results.request_params.per_page < results.found;
  }
  var PROTOCOL_REGEX = /^https?:?\/\//;
  function jsonNames(dto, names) {
    let value = void 0;
    for (const [key, element] of Object.entries(dto)) {
      if (names.includes(key)) value = element;
    }
    return value;
  }
  function primitiveContent(element) {
    if (typeof element === "string") return element;
    if (typeof element === "number" || typeof element === "boolean") return String(element);
    return null;
  }
  function isObject(element) {
    return typeof element === "object" && element !== null && !Array.isArray(element);
  }
  function getImagePath(dto) {
    const imagePath = jsonNames(dto, ["imagePath", "poster", "image"]);
    let url = dto.largeImage ?? null;
    if (url === null) {
      if (isObject(imagePath)) url = primitiveContent(imagePath.largeImage ?? imagePath.image);
      else url = primitiveContent(imagePath);
    }
    if (url === null) return null;
    url = url.startsWith("/") ? url.slice(1) : url;
    return url.startsWith("static/") ? url.slice("static/".length) : url;
  }
  function parseNames(element) {
    if (!Array.isArray(element)) return [];
    return element.map((item) => isObject(item) ? primitiveContent(item.name) : primitiveContent(item)).filter((it) => it !== null);
  }
  function parseAuthorsWithType(element) {
    if (!Array.isArray(element)) return [];
    const result = [];
    for (const item of element) {
      if (isObject(item)) {
        const name = primitiveContent(item.name);
        if (name === null) continue;
        result.push([name, primitiveContent(item.type)]);
      } else {
        const name = primitiveContent(item);
        if (name !== null) result.push([name, null]);
      }
    }
    return result;
  }
  function mangaToSManga(dto, baseUrl) {
    const manga = SManga.create();
    manga.url = dto.id;
    manga.title = dto.title;
    const imagePath = getImagePath(dto);
    if (imagePath !== null) {
      const url = imagePath.startsWith("http") ? imagePath : imagePath.startsWith("//") ? `https:${imagePath}` : `${baseUrl}/static/${imagePath}`;
      manga.thumbnail_url = url.replace(PROTOCOL_REGEX, "https://");
    }
    const description = [];
    if (dto.avgRating != null && dto.avgRating > 0) {
      description.push(`**Rating**: ${dto.avgRating.toFixed(2)}/10`);
    }
    if (dto.released != null && dto.released > 0) {
      description.push(`**Year**: ${new Date(dto.released).getFullYear()}`);
    }
    const views = primitiveContent(dto.views);
    if (views !== null) description.push(`**Views**: ${views}`);
    if (dto.synopsis != null && dto.synopsis.trim() !== "") {
      description.push("\n");
      description.push(`**Synopsis**: ${dto.synopsis}`);
    }
    const names = dto.otherNames?.filter((it) => it !== dto.title);
    if (names && names.length > 0) {
      description.push("\n");
      description.push(`**Alternative Names**:
${names.map((it) => `- ${it}`).join("\n")}`);
    }
    manga.description = description.join("\n");
    const genre = [];
    if (dto.type != null) genre.push(dto.type);
    genre.push(...parseNames(jsonNames(dto, ["genres", "tags"])));
    manga.genre = genre.join(", ");
    const authorsList = parseAuthorsWithType(dto.authors);
    manga.author = authorsList.filter((it) => it[1] === "Author" || it[1] === null).map((it) => it[0]).join(", ");
    manga.artist = authorsList.filter((it) => it[1] === "Artist").map((it) => it[0]).join(", ");
    switch (dto.status?.toLowerCase()?.trim()) {
      case "ongoing":
        manga.status = SManga.ONGOING;
        break;
      case "completed":
        manga.status = SManga.COMPLETED;
        break;
      case "hiatus":
        manga.status = SManga.ON_HIATUS;
        break;
      case "canceled":
        manga.status = SManga.CANCELLED;
        break;
      default:
        manga.status = SManga.UNKNOWN;
    }
    return manga;
  }
  function dateUploadMillis(chapter) {
    const date = chapter.createdAt;
    if (typeof date === "number") return Number.isInteger(date) ? date : parseIsoDate(String(date));
    if (typeof date === "string") return /^[+-]?\d+$/.test(date) ? Number(date) : parseIsoDate(date);
    return 0;
  }
  function chapterToSChapter(dto, slug, scanlatorName = null) {
    const chapter = SChapter.create();
    chapter.url = `${slug}/${dto.id}`;
    chapter.chapter_number = dto.number;
    chapter.name = dto.title;
    chapter.scanlator = scanlatorName;
    if (dto.createdAt != null) chapter.date_upload = dateUploadMillis(dto);
    return chapter;
  }
  function filterDataToFilters(data, excludedGenreIds = /* @__PURE__ */ new Set()) {
    const filters = [];
    if (data.genres) filters.push(new GenreFilter(data.genres.map(({ name, id }) => ({ name, id })), excludedGenreIds));
    if (data.tags) filters.push(new TagFilters(data.tags.map(({ name, id }) => ({ name, id }))));
    if (data.types) filters.push(new TypeFilter(data.types.map(({ name, id }) => ({ name, id }))));
    if (data.statuses) filters.push(new StatusFilter(data.statuses.map(({ name, id }) => ({ name, id }))));
    return filters;
  }

  // src/en/atsumaru/index.ts
  var PREF_SHOW_18 = "pref_18_mode";
  var PREF_EXCLUDE_GENRES = "pref_exclude_genres";
  var PREF_DEDUPLICATE_CHAPTERS = "pref_deduplicate_chapters";
  var PREF_SCANLATOR_BLACKLIST = "pref_scanlator_blacklist";
  var BROWSE_LIMIT = 40;
  var PROTOCOL_REGEX2 = /^https?:?\/\//;
  var FILTER_DATA_KEY = "filter_data_cache";
  function compareNullable(a, b) {
    if (a === b) return 0;
    if (a === null) return -1;
    if (b === null) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  }
  var Atsumaru = class extends KeiSource {
    constructor() {
      super(...arguments);
      this.name = "Atsumaru";
      this.lang = "en";
      this.baseUrl = "https://atsu.moe";
      this.versionId = 2;
      this.filterFetchStarted = false;
    }
    configureClient(builder) {
      builder.rateLimit(2);
    }
    configureHeaders(headers) {
      return { ...headers, "Content-Type": "application/json" };
    }
    // ============================== Popular ===============================
    async getPopularManga(page) {
      const offset = (page - 1) * BROWSE_LIMIT;
      const [, response] = await Promise.all([
        this.ensureFilterData(),
        this.client.get(
          `${this.baseUrl}/api/home2/popular?offset=${offset}&limit=${BROWSE_LIMIT}&types=Manga,Manwha,Manhua,OEL&mediums=Comic&timeframe=daily${this.get18Mode()}${this.excludedGenresQuery()}`,
          Fetch.XHR
        )
      ]);
      const data = response.parseAs();
      return new MangasPage(
        data.items.map((it) => mangaToSManga(it, this.baseUrl)),
        true
      );
    }
    // =============================== Latest ===============================
    async getLatestUpdates(page) {
      const offset = (page - 1) * BROWSE_LIMIT;
      const [, response] = await Promise.all([
        this.ensureFilterData(),
        this.client.get(
          `${this.baseUrl}/api/home2/recentlyUpdated?offset=${offset}&limit=${BROWSE_LIMIT}&types=Manga,Manwha,Manhua,OEL&mediums=Comic${this.get18Mode()}${this.excludedGenresQuery()}`,
          Fetch.XHR
        )
      ]);
      const data = response.parseAs();
      return new MangasPage(
        data.items.map((it) => mangaToSManga(it, this.baseUrl)),
        true
      );
    }
    // =============================== Search ===============================
    async getSearchMangaList(page, query, filters) {
      const url = toHttpUrl(`${this.baseUrl}/collections/manga/documents/search`).newBuilder();
      url.addQueryParameter("q", query === "" ? "*" : query);
      const filterBy = [];
      filterBy.push("hidden:!=true");
      const includedGenres = [];
      const excludedGenres = [];
      const includedTags = [];
      const excludedTags = [];
      const typesList = [];
      const statuses = [];
      let year = null;
      let minChapters = null;
      let showAdult = false;
      let officialTranslation = false;
      let sortBy = "";
      const toIntOrNull = (text) => /^[+-]?\d+$/.test(text) ? Number(text) : null;
      for (const filter of filters) {
        if (filter instanceof GenreFilter) {
          filter.state.forEach((state, index) => {
            if (state.state === TriState.STATE_INCLUDE) includedGenres.push(filter.genreIds[index]);
            else if (state.state === TriState.STATE_EXCLUDE) excludedGenres.push(filter.genreIds[index]);
          });
        } else if (filter instanceof TagFilters) {
          for (const letter of filter.state) {
            letter.state.forEach((state, index) => {
              if (state.state === TriState.STATE_INCLUDE) includedTags.push(letter.tagIds[index]);
              else if (state.state === TriState.STATE_EXCLUDE) excludedTags.push(letter.tagIds[index]);
            });
          }
        } else if (filter instanceof TypeFilter) {
          filter.state.forEach((checkBox, index) => {
            if (checkBox.state) typesList.push(filter.ids[index]);
          });
        } else if (filter instanceof StatusFilter) {
          filter.state.forEach((checkBox, index) => {
            if (checkBox.state) statuses.push(filter.ids[index]);
          });
        } else if (filter instanceof YearFilter) {
          if (filter.state !== "") year = toIntOrNull(filter.state);
        } else if (filter instanceof MinChaptersFilter) {
          if (filter.state !== "") minChapters = toIntOrNull(filter.state);
        } else if (filter instanceof SortFilter) {
          const direction = filter.state.ascending ? "asc" : "desc";
          sortBy = `${SortFilter.VALUES[filter.state.index]}:${direction}`;
        } else if (filter instanceof AdultFilter) {
          showAdult = filter.state || this.get18Mode() !== "";
        } else if (filter instanceof OfficialFilter) {
          officialTranslation = filter.state;
        }
      }
      if (includedGenres.length > 0) {
        filterBy.push(includedGenres.map((it) => `genreIds:=\`${it}\``).join(" && "));
      }
      if (excludedGenres.length > 0) {
        filterBy.push(`genreIds:!=[${excludedGenres.map((it) => `\`${it}\``).join(",")}]`);
      }
      if (includedTags.length > 0) {
        filterBy.push(includedTags.map((it) => `tagIds:=\`${it}\``).join(" && "));
      }
      if (excludedTags.length > 0) {
        filterBy.push(`tagIds:!=[${excludedTags.map((it) => `\`${it}\``).join(",")}]`);
      }
      if (typesList.length > 0) {
        filterBy.push(`type:=[${typesList.map((it) => `\`${it}\``).join(",")}]`);
      }
      if (statuses.length > 0) {
        filterBy.push(`status:=[${statuses.map((it) => `\`${it}\``).join(",")}]`);
      }
      if (year !== null) filterBy.push(`releaseYear:=[${year}]`);
      if (minChapters !== null) filterBy.push(`chapterCount:>=${minChapters}`);
      if (!showAdult) filterBy.push(`isAdult:=${showAdult}`);
      if (officialTranslation) filterBy.push(`officialTranslation:=${officialTranslation}`);
      filterBy.push("(mbContentRating:=[`Safe`,`Suggestive`,`Erotica`] || mbContentRating:!=*)");
      filterBy.push("medium:!=[`Novel`]");
      filterBy.push("views:>0");
      url.addQueryParameter("filter_by", filterBy.join(" && "));
      if (sortBy !== "") url.addQueryParameter("sort_by", sortBy);
      if (query !== "") {
        url.addQueryParameter("query_by", "title,englishTitle,otherNames,authors");
        url.addQueryParameter("query_by_weights", "4,3,2,1");
        url.addQueryParameter("num_typos", "4,3,2,1");
      }
      url.addQueryParameter("page", String(page));
      url.addQueryParameter("per_page", "40");
      const response = await this.client.get(url.build(), Fetch.XHR);
      const body = response.body;
      if (body.includes('"hits"')) {
        const data = response.parseAs();
        return new MangasPage(
          data.hits.map((it) => mangaToSManga(it.document, this.baseUrl)),
          hasNextPage(data)
        );
      } else {
        const data = response.parseAs();
        return new MangasPage(
          data.items.map((it) => mangaToSManga(it, this.baseUrl)),
          true
        );
      }
    }
    async getMangaByUrl(url) {
      if (url.host !== toHttpUrl(this.baseUrl).host) return null;
      if (url.pathSegments[0] !== "manga") return null;
      const id = url.pathSegments[1];
      if (id === void 0) return null;
      const manga = SManga.create();
      manga.url = id;
      const updated = (await this.fetchMangaUpdate(manga, [], true, false)).manga;
      updated.initialized = true;
      return updated;
    }
    // =============================== Filters ===============================
    async fetchFilterData() {
      const filters = (await this.client.get(`${this.baseUrl}/api/explore/availableFilters`, Fetch.XHR)).parseAs();
      const entries = (list) => list?.map(({ id, name }) => ({ id, name })) ?? null;
      return {
        genres: entries(filters.genres),
        tags: entries(filters.tags),
        types: entries(filters.types),
        statuses: entries(filters.statuses)
      };
    }
    async ensureFilterData() {
      if (this.filterFetchStarted) return;
      this.filterFetchStarted = true;
      try {
        const data = await this.fetchFilterData();
        this.preferences.edit().putString(FILTER_DATA_KEY, JSON.stringify(data)).apply();
      } catch {
        this.filterFetchStarted = false;
      }
    }
    get filterData() {
      const json = this.preferences.getString(FILTER_DATA_KEY, "");
      if (json === "") return null;
      try {
        return JSON.parse(json);
      } catch {
        return null;
      }
    }
    getFilterList() {
      const excludedGenres = this.preferences.getStringSet(PREF_EXCLUDE_GENRES, []);
      const data = this.filterData;
      const filters = data !== null ? filterDataToFilters(data, excludedGenres) : [];
      return [
        ...filters,
        new YearFilter(),
        new MinChaptersFilter(),
        new SortFilter(),
        new AdultFilter(this.get18Mode() !== ""),
        new OfficialFilter()
      ];
    }
    // =========================== Manga Details ============================
    getMangaUrl(manga) {
      return `${this.baseUrl}/manga/${manga.url}`;
    }
    async fetchMangaUpdate(manga, chapters, fetchDetails, fetchChapters) {
      const [details, chaptersDto] = await Promise.all([
        fetchDetails || fetchChapters ? this.client.get(`${this.baseUrl}/api/manga/page?id=${manga.url}`, Fetch.XHR).then((response) => response.parseAs().mangaPage) : Promise.resolve(null),
        fetchChapters ? this.client.get(`${this.baseUrl}/api/manga/allChapters?mangaId=${manga.url}`, Fetch.XHR).then((response) => response.parseAs()) : Promise.resolve(null)
      ]);
      const updatedManga = fetchDetails && details !== null ? mangaToSManga(details, this.baseUrl) : manga;
      let updatedChapters;
      if (fetchChapters && chaptersDto !== null) {
        updatedChapters = this.chaptersFromDto(manga, details, chaptersDto.chapters);
      } else {
        updatedChapters = chapters;
      }
      return new SMangaUpdate(updatedManga, updatedChapters);
    }
    chaptersFromDto(manga, details, chapters) {
      const scanlatorMap = new Map((details?.scanlators ?? []).map((it) => [it.id, it.name]));
      const blacklist = this.scanlatorBlacklist;
      const filteredChapters = blacklist.size === 0 ? chapters : chapters.filter((chapter) => {
        const name = chapter.scanlationMangaId != null ? scanlatorMap.get(chapter.scanlationMangaId) : void 0;
        return name === void 0 || !blacklist.has(name.trim().toLowerCase());
      });
      let chapterDtos;
      if (this.deduplicateChapters) {
        const scores = new Map((details?.scanlators ?? []).map((it) => [it.id, it.score]));
        const score = (it) => (it.scanlationMangaId != null ? scores.get(it.scanlationMangaId) : void 0) ?? Number.MIN_SAFE_INTEGER;
        const groups = /* @__PURE__ */ new Map();
        for (const chapter of filteredChapters) {
          const list = groups.get(chapter.number) ?? [];
          list.push(chapter);
          groups.set(chapter.number, list);
        }
        chapterDtos = [...groups.values()].map(
          (uploads) => uploads.reduce((max, it) => {
            const byScore = score(max) - score(it);
            const compare = byScore !== 0 ? byScore : dateUploadMillis(max) - dateUploadMillis(it);
            return compare < 0 ? it : max;
          })
        );
      } else {
        chapterDtos = filteredChapters;
      }
      return chapterDtos.map(
        (it) => chapterToSChapter(it, manga.url, it.scanlationMangaId != null ? scanlatorMap.get(it.scanlationMangaId) ?? null : null)
      ).sort(
        (a, b) => b.chapter_number - a.chapter_number || compareNullable(a.scanlator, b.scanlator) || b.date_upload - a.date_upload
      );
    }
    // ============================== Chapters ==============================
    getChapterUrl(chapter) {
      const [slug, name] = chapter.url.split("/");
      return `${this.baseUrl}/read/${slug}/${name}`;
    }
    // =============================== Pages ================================
    async getPageList(chapter) {
      const [slug, name] = chapter.url.split("/");
      const url = toHttpUrl(`${this.baseUrl}/api/read/chapter`).newBuilder().addQueryParameter("mangaId", slug).addQueryParameter("chapterId", name).build();
      const data = (await this.client.get(url, Fetch.XHR)).parseAs();
      return data.readChapter.pages.map((page, index) => {
        let imageUrl;
        if (page.image.startsWith("http")) {
          imageUrl = page.image;
        } else if (page.image.startsWith("//")) {
          imageUrl = `https:${page.image}`;
        } else {
          let path = page.image.startsWith("/") ? page.image.slice(1) : page.image;
          path = path.startsWith("static/") ? path.slice("static/".length) : path;
          imageUrl = `${this.baseUrl}/static/${path}`;
        }
        return new Page(index, "", imageUrl.replace(PROTOCOL_REGEX2, "https://cdn."));
      });
    }
    get18Mode() {
      const isEnabled = this.preferences.getBoolean(PREF_SHOW_18, false);
      return isEnabled ? "&adult=1" : "";
    }
    excludedGenresQuery() {
      const ids = this.preferences.getStringSet(PREF_EXCLUDE_GENRES, []);
      if (ids.size === 0) return "";
      return `&excludedTags=${[...ids].join(",")}`;
    }
    get deduplicateChapters() {
      return this.preferences.getBoolean(PREF_DEDUPLICATE_CHAPTERS, false);
    }
    get scanlatorBlacklist() {
      return new Set(
        this.preferences.getString(PREF_SCANLATOR_BLACKLIST, "").split(",").map((it) => it.trim().toLowerCase()).filter((it) => it !== "")
      );
    }
    setupPreferenceScreen(screen) {
      screen.addPreference(
        new SwitchPreferenceCompat({
          key: PREF_SHOW_18,
          title: "Toggle adult mode",
          // Upstream: summaryOff "Safe (default)", summaryOn "+18".
          summary: "Off: Safe (default). On: +18",
          defaultValue: false
        })
      );
      const genreFilter = this.getFilterList().find((filter) => filter instanceof GenreFilter);
      const genres = genreFilter?.state ?? [];
      const genreIds = genreFilter?.genreIds ?? [];
      const selected = this.preferences.getStringSet(PREF_EXCLUDE_GENRES, []);
      const entryMap = new Map(genreIds.map((id, index) => [id, genres[index].name]));
      screen.addPreference(
        new MultiSelectListPreference({
          key: PREF_EXCLUDE_GENRES,
          title: "Exclude Genres from Browse",
          summary: selected.size === 0 ? "None" : [...selected].map((it) => entryMap.get(it) ?? it).join(", "),
          entries: genres.map((it) => it.name),
          entryValues: genreIds,
          defaultValue: []
        })
      );
      screen.addPreference(
        new SwitchPreferenceCompat({
          key: PREF_DEDUPLICATE_CHAPTERS,
          title: "Deduplicate chapters",
          summary: "Show one upload per chapter, from the highest rated group that has it",
          defaultValue: false
        })
      );
      screen.addPreference(
        new EditTextPreference({
          key: PREF_SCANLATOR_BLACKLIST,
          title: "Excluded scanlators",
          summary: "Comma-separated group names to exclude from the chapter list",
          defaultValue: ""
        })
      );
    }
  };
  var index_default = defineExtension([new Atsumaru()]);
  return __toCommonJS(index_exports);
})();
