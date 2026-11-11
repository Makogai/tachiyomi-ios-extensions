// MangaFire 1 for tachiyomi-ios. Ported from keiyoushi/extensions-source (Apache-2.0).
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

  // src/all/mangafire/index.ts
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default,
    solverPageScript: () => solverPageScript
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
  function substringAfterLast(text, delimiter, missing = text) {
    const index = text.lastIndexOf(delimiter);
    return index < 0 ? missing : text.slice(index + delimiter.length);
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

  // src/all/mangafire/dto.ts
  function mangaToSManga(dto) {
    const manga = SManga.create();
    manga.url = `/title/${dto.hid}${dto.slug != null ? `-${dto.slug}` : ""}`;
    manga.title = dto.title;
    manga.thumbnail_url = dto.poster?.large ?? dto.poster?.medium ?? dto.poster?.small ?? null;
    manga.initialized = false;
    return manga;
  }
  var ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };
  function decodeEntities(text) {
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (match, name) => {
      if (name[0] === "#") {
        const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
        return Number.isNaN(code) ? match : String.fromCodePoint(code);
      }
      return ENTITIES[name.toLowerCase()] ?? match;
    });
  }
  function htmlToMarkdown(html) {
    const text = html.replace(/\r/g, "").replace(/\s*\n\s*/g, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote)>/gi, "\n\n").replace(/<li[^>]*>/gi, "- ").replace(/<(b|strong)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, "**$3**").replace(/<(i|em)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, "*$3*").replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)").replace(/<[^>]+>/g, "");
    return decodeEntities(text).split("\n").map((line) => line.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  function detailsToSManga(dto) {
    const manga = mangaToSManga(dto);
    manga.author = dto.authors?.map((it) => it.title).join(", ") ?? null;
    manga.artist = dto.artists?.map((it) => it.title).join(", ") ?? null;
    manga.description = dto.synopsisHtml != null ? htmlToMarkdown(dto.synopsisHtml) : null;
    const genres = [];
    if (dto.type != null) genres.push(dto.type.charAt(0).toUpperCase() + dto.type.slice(1));
    dto.genres?.forEach((it) => genres.push(it.title));
    dto.themes?.forEach((it) => genres.push(it.title));
    manga.genre = genres.join(", ");
    switch (dto.status?.toLowerCase()) {
      case "releasing":
        manga.status = SManga.ONGOING;
        break;
      case "finished":
        manga.status = SManga.COMPLETED;
        break;
      case "on_hiatus":
        manga.status = SManga.ON_HIATUS;
        break;
      case "discontinued":
        manga.status = SManga.CANCELLED;
        break;
      default:
        manga.status = SManga.UNKNOWN;
    }
    manga.initialized = true;
    return manga;
  }
  function volumeToSChapter(dto, mangaUrl) {
    const chapter = SChapter.create();
    chapter.url = `${mangaUrl}/volume/${dto.id}`;
    chapter.chapter_number = dto.number;
    chapter.name = `Vol. ${dto.number}` + (dto.name ? ` - ${dto.name}` : "");
    chapter.scanlator = `${dto.chapterCount} chapters`;
    return chapter;
  }
  var chapterRegex = /(?<=\b(?:ch(?:\.|apter)?|ep(?:\.|isode)?)\s?)\d+(?:\.\d+)?/i;
  function numberText(number) {
    return removeSuffix(String(number), ".0");
  }
  function chapterToSChapter(dto, mangaUrl, langCode) {
    const chapter = SChapter.create();
    const number = numberText(dto.number);
    chapter.url = `${mangaUrl}/${dto.id}-chapter-${number}-${langCode}`;
    if (!dto.name || dto.name.trim() === "") {
      chapter.chapter_number = dto.number;
      chapter.name = `Ch. ${number}`;
    } else {
      const match = chapterRegex.exec(dto.name)?.[0];
      const extracted = match !== void 0 ? parseFloat(match) : NaN;
      if (Number.isNaN(extracted)) {
        chapter.chapter_number = dto.number;
        chapter.name = `Ch. ${number} - ${dto.name}`;
      } else {
        chapter.chapter_number = extracted;
        chapter.name = dto.name;
      }
    }
    chapter.scanlator = dto.type ?? "Unknown";
    chapter.date_upload = dto.createdAt != null ? dto.createdAt * 1e3 : 0;
    return chapter;
  }

  // src/all/mangafire/filters.ts
  function isUriFilter(filter) {
    return typeof filter.addToUri === "function";
  }
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
        vals.map(([title, value]) => new UriMultiSelectOption(title, value))
      );
      this.param = param;
    }
    addToUri(builder) {
      this.state.filter((it) => it.state).forEach((it) => builder.addQueryParameter(this.param, it.value));
    }
  };
  var UriTriSelectOption = class extends TriState {
    constructor(name, value) {
      super(name);
      this.value = value;
    }
  };
  var UriTriSelectFilter = class extends Group {
    constructor(name, paramIn, paramEx, vals) {
      super(
        name,
        vals.map(([title, value]) => new UriTriSelectOption(title, value))
      );
      this.paramIn = paramIn;
      this.paramEx = paramEx;
    }
    addToUri(builder) {
      this.state.forEach((it) => {
        if (it.state === TriState.STATE_INCLUDE) builder.addQueryParameter(this.paramIn, it.value);
        else if (it.state === TriState.STATE_EXCLUDE) builder.addQueryParameter(this.paramEx, it.value);
      });
    }
  };
  var CONTENT_RATINGS = ["safe", "suggestive", "erotica", "pornographic"];
  var capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  var ContentRatingFilter = class extends UriMultiSelectFilter {
    constructor(defaultRatings) {
      super(
        "Content Rating",
        "content_rating[]",
        CONTENT_RATINGS.map((it) => [capitalize(it), it])
      );
      this.state.forEach((option) => {
        if (defaultRatings.has(option.value)) option.state = true;
      });
    }
  };
  var TypeFilter = class extends UriMultiSelectFilter {
    constructor() {
      super("Type", "types[]", TYPES);
    }
  };
  var GenreFilter = class extends UriTriSelectFilter {
    constructor() {
      super("Genres", "genres_in[]", "genres_ex[]", GENRES);
    }
  };
  var ThemeFilter = class extends UriMultiSelectFilter {
    constructor() {
      super("Themes", "theme_ids[]", THEMES);
    }
  };
  var GenreModeFilter = class extends Select {
    constructor() {
      super("Genre and theme match mode", ["AND", "OR"]);
    }
    addToUri(builder) {
      const mode = this.state === 0 ? "and" : "or";
      builder.addQueryParameter("genres_mode", mode);
      builder.addQueryParameter("theme_mode", mode);
    }
  };
  var StatusFilter = class extends UriMultiSelectFilter {
    constructor() {
      super("Status", "statuses[]", STATUSES);
    }
  };
  function toIntOrNull(text) {
    return /^[+-]?\d+$/.test(text) && Math.abs(Number(text)) <= 2147483647 ? Number(text) : null;
  }
  var MinChapterFilter = class extends Text {
    constructor() {
      super("Minimum chapters");
    }
    addToUri(builder) {
      const value = toIntOrNull(this.state);
      if (value !== null && value > 0) builder.addQueryParameter("min_chap", String(value));
    }
  };
  var YearFromFilter = class extends Text {
    constructor() {
      super("Release year (From)");
    }
    addToUri(builder) {
      const value = toIntOrNull(this.state);
      if (value !== null) builder.addQueryParameter("year_from", String(value));
    }
  };
  var YearToFilter = class extends Text {
    constructor() {
      super("Release year (To)");
    }
    addToUri(builder) {
      const value = toIntOrNull(this.state);
      if (value !== null) builder.addQueryParameter("year_to", String(value));
    }
  };
  var AuthorFilter = class extends Text {
    constructor() {
      super("Author / Artist");
    }
  };
  var SORT_KEYS = [
    "chapter_updated_at:desc",
    "relevance:desc",
    "created_at:desc",
    "title:asc",
    "title:desc",
    "year:desc",
    "year:asc",
    "score:desc",
    "views_7d:desc",
    "views_30d:desc",
    "views_total:desc",
    "follows_total:desc"
  ];
  var SortFilter = class extends Select {
    constructor() {
      super(
        "Sort by",
        [
          "Latest update",
          "Best match",
          "Recently added",
          "Title (A–Z)",
          "Title (Z–A)",
          "Year (newest)",
          "Year (oldest)",
          "Highest rated",
          "Most viewed · 7 days",
          "Most viewed · 30 days",
          "Most viewed · all time",
          "Most followed"
        ],
        1
      );
    }
    addToUri(builder) {
      const sortKey = SORT_KEYS[this.state] ?? "chapter_updated_at:desc";
      const parts = sortKey.split(":");
      builder.addQueryParameter(`order[${parts[0]}]`, parts[1]);
    }
  };
  var TYPES = [
    ["Manga", "manga"],
    ["Manhwa", "manhwa"],
    ["Manhua", "manhua"],
    ["Other", "other"]
  ];
  var GENRES = [
    ["Action", "1"],
    ["Adult", "268929"],
    ["Adventure", "78"],
    ["Avant Garde", "3"],
    ["Boys Love", "4"],
    ["Comedy", "5"],
    ["Crime", "268921"],
    ["Demons", "77"],
    ["Drama", "6"],
    ["Ecchi", "7"],
    ["Fantasy", "79"],
    ["Girls Love", "9"],
    ["Gourmet", "10"],
    ["Harem", "11"],
    ["Hentai", "268930"],
    ["Historical", "268922"],
    ["Horror", "530"],
    ["Isekai", "13"],
    ["Iyashikei", "531"],
    ["Josei", "15"],
    ["Kids", "532"],
    ["Magic", "539"],
    ["Magical Girls", "268923"],
    ["Mahou Shoujo", "533"],
    ["Martial Arts", "534"],
    ["Mature", "268931"],
    ["Mecha", "19"],
    ["Medical", "268924"],
    ["Military", "535"],
    ["Music", "21"],
    ["Mystery", "22"],
    ["Parody", "23"],
    ["Philosophical", "268925"],
    ["Psychological", "536"],
    ["Reverse Harem", "25"],
    ["Romance", "26"],
    ["School", "73"],
    ["Sci-Fi", "28"],
    ["Seinen", "537"],
    ["Shoujo", "30"],
    ["Shounen", "31"],
    ["Slice of Life", "538"],
    ["Smut", "268932"],
    ["Space", "33"],
    ["Sports", "34"],
    ["Super Power", "75"],
    ["Superhero", "268926"],
    ["Supernatural", "76"],
    ["Suspense", "37"],
    ["Thriller", "38"],
    ["Tragedy", "268927"],
    ["Vampire", "39"],
    ["Wuxia", "268928"]
  ];
  var THEMES = [
    ["Aliens", "268933"],
    ["Animals", "268934"],
    ["Cooking", "268935"],
    ["Crossdressing", "268936"],
    ["Delinquents", "268937"],
    ["Demons", "268938"],
    ["Genderswap", "268939"],
    ["Ghosts", "268940"],
    ["Gyaru", "268941"],
    ["Harem", "268942"],
    ["Incest", "268943"],
    ["Loli", "268944"],
    ["Mafia", "268945"],
    ["Magic", "268946"],
    ["Martial Arts", "268947"],
    ["Military", "268948"],
    ["Monster Girls", "268949"],
    ["Monsters", "268950"],
    ["Music", "268951"],
    ["Ninja", "268952"],
    ["Office Workers", "268953"],
    ["Police", "268954"],
    ["Post-Apocalyptic", "268955"],
    ["Reincarnation", "268956"],
    ["Reverse Harem", "268957"],
    ["Samurai", "268958"],
    ["School Life", "268959"],
    ["Shota", "268960"],
    ["Supernatural", "268961"],
    ["Survival", "268962"],
    ["Time Travel", "268963"],
    ["Traditional Games", "268964"],
    ["Vampires", "268965"],
    ["Video Games", "268966"],
    ["Villainess", "268967"],
    ["Virtual Reality", "268968"],
    ["Zombies", "268969"]
  ];
  var STATUSES = [
    ["Releasing", "releasing"],
    ["Finished", "finished"],
    ["On Hiatus", "on_hiatus"],
    ["Discontinued", "discontinued"],
    ["Not Yet Released", "not_yet_released"]
  ];

  // src/all/mangafire/solver.ts
  var OPENCV_URL = "https://docs.opencv.org/5.0/opencv.js";
  var SOLVER_SCRIPT = '\n        const SCALE_FACTOR = 1.5;\n        const ANGULAR_BINS = 72;\n        const RADIAL_BINS = 24;\n        const MIN_HOLE_AREA_RATIO = 0.03;\n\n        function contourCenter(c) {\n          const m = cv.moments(c, false);\n\n          if (Math.abs(m.m00) > 1e-8) {\n            return {\n              x: m.m10 / m.m00,\n              y: m.m01 / m.m00\n            };\n          }\n\n          const r = cv.boundingRect(c);\n\n          return {\n            x: r.x + r.width / 2,\n            y: r.y + r.height / 2\n          };\n        }\n\n        function releaseShape(shape) {\n          shape.outer.delete();\n\n          for (const h of shape.holes) {\n            h.delete();\n          }\n        }\n\n        function contourDepth(index, hierarchyData) {\n          let depth = 0;\n          let p = hierarchyData[index * 4 + 3];\n\n          while (p >= 0) {\n            depth++;\n            p = hierarchyData[p * 4 + 3];\n          }\n\n          return depth;\n        }\n\n        function shapeFeatures(shape) {\n          const outerArea = Math.abs(cv.contourArea(shape.outer, false));\n\n          let holeArea = 0;\n          const holeRatios = [];\n\n          for (const h of shape.holes) {\n            const a = Math.abs(cv.contourArea(h, false));\n\n            holeArea += a;\n            holeRatios.push(\n              outerArea > 0 ? a / outerArea : 0\n            );\n          }\n\n          holeRatios.sort((a, b) => b - a);\n\n          const perimeter = cv.arcLength(shape.outer, true);\n\n          const circularity = perimeter > 0 ? (4 * Math.PI * outerArea) / (perimeter * perimeter) : 0;\n\n          const hull = new cv.Mat();\n          cv.convexHull(shape.outer, hull, false, true);\n\n          const hullArea = Math.abs(cv.contourArea(hull, false));\n\n          hull.delete();\n\n          const solidity = hullArea > 0 ? outerArea / hullArea : 0;\n\n          const rr = cv.minAreaRect(shape.outer);\n          const rw = rr.size.width;\n          const rh = rr.size.height;\n\n          const aspect = Math.max(rw, rh) > 0 ? Math.min(rw, rh) / Math.max(rw, rh) : 0;\n\n          return {\n            outerArea,\n            netArea: Math.max(0, outerArea - holeArea),\n            holeArea,\n            holeAreaRatio: outerArea > 0 ? holeArea / outerArea : 0,\n            holeCount: shape.holes.length,\n            holeRatios,\n            circularity,\n            solidity,\n            aspect\n          };\n        }\n\n        function extractHierarchyShapes(binary) {\n          const input = binary.clone();\n\n          const contours = new cv.MatVector();\n          const hierarchy = new cv.Mat();\n\n          cv.findContours(\n            input,\n            contours,\n            hierarchy,\n            cv.RETR_TREE,\n            cv.CHAIN_APPROX_NONE\n          );\n\n          input.delete();\n\n          if (hierarchy.empty()) {\n            contours.delete();\n            hierarchy.delete();\n            return [];\n          }\n\n          const hd = hierarchy.data32S;\n          const result = [];\n\n          for (let i = 0; i < contours.size(); i++) {\n            if ((contourDepth(i, hd) & 1) !== 0) {\n              continue;\n            }\n\n            const outerSrc = contours.get(i);\n\n            const outerArea = Math.abs(cv.contourArea(outerSrc, false));\n\n            if (outerArea < 1) {\n              outerSrc.delete();\n              continue;\n            }\n\n            const outer = outerSrc.clone();\n            outerSrc.delete();\n\n            const holes = [];\n\n            let child = hd[i * 4 + 2];\n\n            while (child >= 0) {\n              const holeSrc = contours.get(child);\n\n              const holeArea = Math.abs(cv.contourArea(holeSrc, false));\n\n              if (holeArea >= Math.max(2, outerArea * MIN_HOLE_AREA_RATIO)) {\n                holes.push(holeSrc.clone());\n              }\n\n              holeSrc.delete();\n\n              child = hd[child * 4];\n            }\n\n            const shape = {\n              outer,\n              holes,\n              center: contourCenter(outer),\n              box: cv.boundingRect(outer)\n            };\n\n            shape.features = shapeFeatures(shape);\n\n            result.push(shape);\n          }\n\n          contours.delete();\n          hierarchy.delete();\n\n          return result;\n        }\n\n        function polarSignature(shape) {\n          const center = shape.center;\n\n          let maxRadius = 0;\n\n          const d = shape.outer.data32S;\n\n          for (let i = 0; i + 1 < d.length; i += 2) {\n            const dx = d[i] - center.x;\n            const dy = d[i + 1] - center.y;\n\n            maxRadius = Math.max(maxRadius, Math.sqrt(dx * dx + dy * dy));\n          }\n\n          if (maxRadius < 1e-6) {\n            return new Float32Array(ANGULAR_BINS * RADIAL_BINS);\n          }\n\n          const raw = new Float32Array(ANGULAR_BINS * RADIAL_BINS);\n\n          for (let a = 0; a < ANGULAR_BINS; a++) {\n            const angle = (a * Math.PI * 2) / ANGULAR_BINS;\n\n            const cos = Math.cos(angle);\n            const sin = Math.sin(angle);\n\n            for (let r = 0; r < RADIAL_BINS; r++) {\n              const radius = ((r + 0.5) / RADIAL_BINS) * maxRadius;\n\n              const p = new cv.Point(\n                center.x + cos * radius,\n                center.y + sin * radius\n              );\n\n              let inside = cv.pointPolygonTest(shape.outer, p, false) >= 0;\n\n              if (inside) {\n                for (const hole of shape.holes) {\n                  if (cv.pointPolygonTest(hole, p, false) >= 0) {\n                    inside = false;\n                    break;\n                  }\n                }\n              }\n\n              raw[a * RADIAL_BINS + r] = inside ? 1 : 0;\n            }\n          }\n\n          const smooth = new Float32Array(raw.length);\n\n          function value(a, r) {\n            a = (a + ANGULAR_BINS) % ANGULAR_BINS;\n\n            if (r < 0 || r >= RADIAL_BINS) {\n              return 0;\n            }\n\n            return raw[a * RADIAL_BINS + r];\n          }\n\n          for (let a = 0; a < ANGULAR_BINS; a++) {\n            for (let r = 0; r < RADIAL_BINS; r++) {\n              let sum = 4 * value(a, r);\n\n              let weight = 4;\n\n              sum += value(a - 1, r);\n              sum += value(a + 1, r);\n              weight += 2;\n\n              sum += value(a, r - 1);\n              sum += value(a, r + 1);\n              weight += 2;\n\n              smooth[a * RADIAL_BINS + r] = sum / weight;\n            }\n          }\n\n          return smooth;\n        }\n\n        function polarDistance(a, b) {\n          let best = Infinity;\n\n          for (let shift = 0; shift < ANGULAR_BINS; shift++) {\n            let sum = 0;\n\n            for (let angle = 0; angle < ANGULAR_BINS; angle++) {\n              const otherAngle = (angle + shift) % ANGULAR_BINS;\n\n              const baseA = angle * RADIAL_BINS;\n\n              const baseB = otherAngle * RADIAL_BINS;\n\n              for (let r = 0; r < RADIAL_BINS;r++) {\n                const d = a[baseA + r] - b[baseB + r];\n\n                sum += d * d;\n              }\n            }\n\n            const rms = Math.sqrt(sum / (ANGULAR_BINS * RADIAL_BINS));\n\n            if (rms < best) {\n              best = rms;\n            }\n          }\n\n          return best;\n        }\n\n        function prepareShape(shape) {\n          shape.signature = polarSignature(shape);\n\n          if (!shape.features) {\n            shape.features = shapeFeatures(shape);\n          }\n\n          return shape;\n        }\n\n        function referenceForeground(src) {\n          const mask = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);\n\n          const channels = src.channels();\n\n          if (channels === 4) {\n            const planes = new cv.MatVector();\n\n            cv.split(src, planes);\n\n            const alpha = planes.get(3);\n            const alphaMask = new cv.Mat();\n\n            cv.threshold(alpha, alphaMask, 20, 255, cv.THRESH_BINARY);\n\n            const foregroundPixels = cv.countNonZero(alphaMask);\n\n            const useAlpha = foregroundPixels < src.rows * src.cols * 0.98;\n\n            if (useAlpha) {\n              alphaMask.copyTo(mask);\n            }\n\n            alpha.delete();\n            alphaMask.delete();\n            planes.delete();\n\n            if (useAlpha) {\n              return mask;\n            }\n          }\n\n          const data = src.data;\n          const ch = channels;\n\n          const corners = [\n            [0, 0],\n            [src.cols - 1, 0],\n            [0, src.rows - 1],\n            [src.cols - 1, src.rows - 1]\n          ];\n\n          const bg = [0, 0, 0];\n\n          function pixel(x, y, k) {\n            return data[(y * src.cols + x) * ch +k];\n          }\n\n          if (ch === 1) {\n            for (const [x, y] of corners) {\n              bg[0] += pixel(x, y, 0);\n            }\n\n            bg[0] /= corners.length;\n          } else {\n            for (let k = 0; k < 3; ++k) {\n              for (\n                const [x, y] of corners\n              ) {\n                bg[k] += pixel(x, y, k);\n              }\n\n              bg[k] /= corners.length;\n            }\n          }\n\n          const out = mask.data;\n\n          for (let y = 0; y < src.rows; y++) {\n            for (let x = 0; x < src.cols; x++) {\n              const p = (y * src.cols + x) * ch;\n\n              let dist2 = 0;\n\n              if (ch === 1) {\n                const d = data[p] - bg[0];\n\n                dist2 = d * d;\n              } else {\n                for (let k = 0; k < 3;k++) {\n                  const d = data[p + k] - bg[k];\n\n                  dist2 += d * d;\n                }\n              }\n\n              out[y * src.cols + x] = dist2 > 20 * 20 ? 255 : 0;\n            }\n          }\n\n          return mask;\n        }\n\n        function getReferenceShapes(src, count) {\n          const foreground = referenceForeground(src);\n\n          let result = null;\n\n          const maxKernel = Math.max(3, Math.min(15, Math.floor(Math.min(src.rows, src.cols) / 4) | 1));\n\n          for (let k = 3; k <= maxKernel; k += 2) {\n            const opened = new cv.Mat();\n\n            const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(k, k));\n\n            cv.morphologyEx(foreground, opened, cv.MORPH_OPEN, kernel);\n\n            kernel.delete();\n\n            let shapes = extractHierarchyShapes(opened);\n\n            opened.delete();\n\n            shapes = shapes.filter(s => {\n              const b = s.box;\n\n              const valid = s.features.outerArea >= 8 && b.width >= 4 && b.height >= 4;\n\n              if (!valid) {\n                releaseShape(s);\n              }\n\n              return valid;\n            });\n\n            shapes.sort((a, b) => b.features.outerArea - a.features.outerArea);\n\n            if (shapes.length >= count) {\n              result = shapes.slice(0, count);\n\n              for (let i = count; i < shapes.length; i++) {\n                releaseShape(shapes[i]);\n              }\n\n              break;\n            }\n\n            for (const s of shapes) {\n              releaseShape(s);\n            }\n          }\n\n          foreground.delete();\n\n          if (!result || result.length !== count) {\n            if (result) {\n              for (const s of result) {\n                releaseShape(s);\n              }\n            }\n\n            throw new Error(`Could not separate ${count} reference shapes.`);\n          }\n\n          result.sort((a, b) => {\n            const dx = a.center.x - b.center.x;\n\n            if (Math.abs(dx) > 1) {\n              return dx;\n            }\n\n            return a.center.y - b.center.y;\n          });\n\n          for (const s of result) {\n            prepareShape(s);\n          }\n\n          return result;\n        }\n\n        function getSceneCandidates(src, refs) {\n          const channels = new cv.MatVector();\n\n          cv.split(src, channels);\n\n          const edges = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);\n\n          const n = src.channels() === 1 ? 1 : Math.min(3, src.channels());\n\n          for (let i = 0; i < n; ++i) {\n            const channel = channels.get(i);\n\n            const e = new cv.Mat();\n\n            cv.Canny(channel, e, 20, 60, 3, false);\n\n            cv.bitwise_or(edges, e, edges);\n\n            channel.delete();\n            e.delete();\n          }\n\n          channels.delete();\n\n          const k3 = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));\n\n          cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, k3);\n\n          cv.dilate(edges, edges, k3);\n\n          k3.delete();\n\n          const regions = new cv.Mat();\n\n          cv.bitwise_not(edges, regions);\n\n          edges.delete();\n\n          let candidates = extractHierarchyShapes(regions);\n\n          regions.delete();\n\n          let minOuterArea = Infinity;\n          let maxOuterArea = 0;\n\n          let minSide = Infinity;\n          let maxSide = 0;\n\n          for (const ref of refs) {\n            minOuterArea = Math.min(minOuterArea, ref.features.outerArea);\n\n            maxOuterArea = Math.max(maxOuterArea, ref.features.outerArea);\n\n            minSide = Math.min(minSide, ref.box.width, ref.box.height);\n\n            maxSide = Math.max(maxSide, ref.box.width, ref.box.height);\n          }\n\n          const scaleArea = SCALE_FACTOR * SCALE_FACTOR;\n\n          const minAllowedArea = minOuterArea * scaleArea * 0.18;\n\n          const maxAllowedArea = maxOuterArea * scaleArea * 5.0;\n\n          const minAllowedSide = minSide * SCALE_FACTOR * 0.30;\n\n          const maxAllowedSide = maxSide * SCALE_FACTOR * 3.0;\n\n          candidates = candidates.filter(s => {\n            const f = s.features;\n            const b = s.box;\n\n            const ok =\n                  f.outerArea >= minAllowedArea &&\n                  f.outerArea <= maxAllowedArea &&\n                  b.width >= minAllowedSide &&\n                  b.height >= minAllowedSide &&\n                  b.width <= maxAllowedSide &&\n                  b.height <= maxAllowedSide;\n\n            if (!ok) {\n              releaseShape(s);\n            }\n\n            return ok;\n          });\n\n          for (const s of candidates) {\n            prepareShape(s);\n          }\n\n          return candidates;\n        }\n\n        function shapeCost(ref, cand) {\n          const polar = polarDistance(ref.signature, cand.signature);\n\n          const holeAreaPenalty = Math.abs(ref.features.holeAreaRatio - cand.features.holeAreaRatio);\n\n          const holeCountPenalty = Math.min(3, Math.abs(ref.features.holeCount - cand.features.holeCount));\n\n          let holeSizePenalty = 0;\n\n          for (let i = 0; i < 3; ++i) {\n            const a = ref.features.holeRatios[i] || 0;\n\n            const b = cand.features.holeRatios[i] || 0;\n\n            holeSizePenalty += Math.abs(a - b);\n          }\n\n          const dc = (ref.features.circularity - cand.features.circularity) / 0.4;\n\n          const ds = (ref.features.solidity - cand.features.solidity) / 0.3;\n\n          const da = (ref.features.aspect - cand.features.aspect) / 0.3;\n\n          const outerPenalty = Math.sqrt(dc * dc + ds * ds + da * da);\n\n          const measuredScale = Math.sqrt(cand.features.outerArea / Math.max(ref.features.outerArea, 1e-6));\n\n          const scalePenalty = Math.abs(Math.log(Math.max(measuredScale, 1e-6) / SCALE_FACTOR));\n\n          return polar + 0.30 * holeAreaPenalty + 0.07 * holeCountPenalty + 0.12 * holeSizePenalty + 0.08 * outerPenalty + 0.03 * scalePenalty;\n        }\n\n        function groupCandidates(candidates) {\n          const sorted = candidates.slice().sort((a, b) => b.features.outerArea - a.features.outerArea);\n\n          const groups = [];\n\n          for (const candidate of sorted) {\n            let matchedGroup = null;\n\n            for (const group of groups) {\n              const anchor = group.members[0];\n\n              const dx = anchor.center.x - candidate.center.x;\n\n              const dy = anchor.center.y - candidate.center.y;\n\n              const dist = Math.sqrt(dx * dx + dy * dy);\n\n              const size = Math.max(\n                anchor.box.width,\n                anchor.box.height,\n                candidate.box.width,\n                candidate.box.height\n              );\n\n              if (dist > size * 0.25) {\n                continue;\n              }\n\n              const candidateInAnchor = cv.pointPolygonTest(\n                anchor.outer,\n                new cv.Point(candidate.center.x, candidate.center.y),\n                false\n              ) >= 0;\n\n              const anchorInCandidate = cv.pointPolygonTest(\n                candidate.outer,\n                new cv.Point(anchor.center.x, anchor.center.y),\n                false\n              ) >= 0;\n\n              if (candidateInAnchor || anchorInCandidate) {\n                matchedGroup = group;\n                break;\n              }\n            }\n\n            if (matchedGroup) {\n              matchedGroup.members.push(candidate);\n            } else {\n              groups.push({\n                members: [candidate]\n              });\n            }\n          }\n\n          return groups;\n        }\n\n        function hungarian(cost) {\n          const n = cost.length;\n          const m = cost[0].length;\n\n          const u = new Array(n + 1).fill(0);\n\n          const v = new Array(m + 1).fill(0);\n\n          const p = new Array(m + 1).fill(0);\n\n          const way = new Array(m + 1).fill(0);\n\n          for (let i = 1; i <= n; ++i) {\n            p[0] = i;\n\n            let j0 = 0;\n\n            const minv = new Array(m + 1).fill(Infinity);\n\n            const used = new Array(m + 1).fill(false);\n\n            do {\n              used[j0] = true;\n\n              const i0 = p[j0];\n\n              let delta = Infinity;\n              let j1 = 0;\n\n              for (let j = 1; j <= m;j++) {\n                if (used[j]) {\n                  continue;\n                }\n\n                const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];\n\n                if (cur < minv[j]) {\n                  minv[j] = cur;\n                  way[j] = j0;\n                }\n\n                if (minv[j] < delta) {\n                  delta = minv[j];\n                  j1 = j;\n                }\n              }\n\n              for (let j = 0; j <= m; j++) {\n                if (used[j]) {\n                  u[p[j]] += delta;\n                  v[j] -= delta;\n                } else {\n                  minv[j] -= delta;\n                }\n              }\n\n              j0 = j1;\n            } while (p[j0] !== 0);\n\n            do {\n              const j1 = way[j0];\n\n              p[j0] = p[j1];\n              j0 = j1;\n            } while (j0 !== 0);\n          }\n\n          const assignment = new Array(n).fill(-1);\n\n          for (let j = 1; j <= m; j++) {\n            if (p[j] > 0 && p[j] <= n) {\n              assignment[p[j] - 1] = j - 1;\n            }\n          }\n\n          return assignment;\n        }\n\n        function findShapes(referenceMat, sceneMat, count) {\n          const refs = getReferenceShapes(referenceMat, count);\n\n          const candidates = getSceneCandidates(sceneMat, refs);\n\n          try {\n            if (candidates.length < count) {\n              throw new Error(`Only ${candidates.length} scene candidates found; ${count} are required.`);\n            }\n\n            let groups = groupCandidates(candidates);\n\n            if (groups.length < count) {\n              groups = candidates.map(c => ({\n                members: [c]\n              }));\n            }\n\n            const costs = [];\n\n            const bestMember = [];\n\n            for (let r = 0; r < refs.length; r++) {\n              const row = [];\n              const memberRow = [];\n\n              for (let g = 0; g < groups.length; g++) {\n                let bestCost = Infinity;\n                let bestIndex = -1;\n\n                for (let k = 0; k < groups[g].members.length; k++) {\n                  const score = shapeCost(refs[r], groups[g].members[k]);\n\n                  if (score < bestCost) {\n                    bestCost = score;\n                    bestIndex = k;\n                  }\n                }\n\n                row.push(bestCost);\n                memberRow.push(bestIndex);\n              }\n\n              costs.push(row);\n              bestMember.push(memberRow);\n            }\n\n            const assignment = hungarian(costs);\n\n            const dots = assignment.flatMap((groupIndex, refIndex) => {\n              if (groupIndex < 0) {\n                throw new Error(\n                  "Could not assign all reference shapes."\n                );\n              }\n\n              const memberIndex = bestMember[refIndex][groupIndex];\n\n              const shape = groups[groupIndex].members[memberIndex];\n\n              return [Math.round(shape.center.x), Math.round(shape.center.y)];\n            });\n\n            return dots;\n          } finally {\n            for (const r of refs) {\n              releaseShape(r);\n            }\n\n            for (const c of candidates) {\n              releaseShape(c);\n            }\n          }\n        }\n\n        function read(url) {\n          return new Promise((resolve, reject) => Object.assign(new Image(), {\n            onload() {\n              const canvas = Object.assign(document.createElement("canvas"), {\n                width: this.width,\n                height: this.height\n              });\n              const ctx = canvas.getContext("2d");\n              ctx.drawImage(this, 0, 0);\n              resolve(cv.imread(canvas));\n              canvas.remove();\n            },\n            onerror: reject,\n            src: url\n          }));\n        }\n\n        function toCanvas(mat) {\n          const canvas = Object.assign(document.createElement("canvas"), {\n            width: mat.rows,\n            height: mat.cols\n          });\n          cv.imshow(canvas, mat);\n          return canvas;\n        }\n\n        async function generate() {\n          const response = await fetch("generate");\n          return response.json();\n        }\n\n        async function verify(captcha_id, dots) {\n          const response = await fetch("verify", {\n            method: "POST",\n            body: JSON.stringify({\n              captcha_id,\n              dots: dots.join(",")\n            })\n          });\n          return response.json();\n        }\n\n        let complete = false;\n\n        function setComplete() {\n          complete = true;\n          return true;\n        }\n\n        function abortIfDone() {\n          if (complete) {\n            throw "Aborted";\n          }\n        }\n\n        async function solve() {\n          abortIfDone();\n\n          const {captcha_id, count, image_base64, thumb_base64} = await generate();\n\n          if (count > 2) {\n            throw "Too many shapes, skipping due to low success rate";\n          }\n\n          abortIfDone();\n\n          const [thumb_mat, image_mat] = await Promise.all([read(thumb_base64), read(image_base64)]);\n\n          try {\n            abortIfDone();\n\n            const dots = findShapes(thumb_mat, image_mat, count);\n\n            const {success} = await verify(captcha_id, dots);\n\n            if (!success) {\n              throw "Failed";\n            }\n          } finally {\n            thumb_mat.delete();\n            image_mat.delete();\n          }\n        }\n\n        (async () => {\n          try {\n            for (let i = 0; i < 10; i++) {\n              if (await Promise.any(Array.from({length: 10}, solve)).then(setComplete, () => false)) {\n                return;\n              }\n            }\n          } finally {\n            bridge.postMessage(`${complete}`);\n          }\n        })();\n    ';

  // src/all/mangafire/vrf.ts
  var TABLE_1 = "yINlmUNho8VYJT+ibTIP+9ESiULpVEtMOoD6U6lRE0R/xwXo/Xp9NrUgC4cw/Lmo33vUyjUE40kUoEWIr/fxfNNcq2s79ShQ5NhNrFnJ4hXPwOu/SuXzIbuTQKGFvfm08E9jvCfqAtoDqvQq3dVWPQFmJjgvkISBeXY3BgANR+yVnjGbcxZ47d6kLNfZPIayTq3/YGySb1KuVZodWp/WGNAO5pfMcpaK53Hhs0allBszaMaxuouOwdxbwgxIw6YunSsXjI05Yi0j9j4eHKfSXR8Ifo/Od+8iamRfCXTyvm7NGRGYdcQ0ywcK/u6RXhrbcCm4t2eCtrDgQVecJGkQ+A==";
  var KEY_1 = "0Ec58JOY3uBzJK9m3zqIOpdlF7UFiax9DmA=";
  var TABLE_2 = "IUFltCxD3Oc2cwCgkJffthaOg9cgPUb0LgW6H/VtfcF0kc5F25t+aWj6JH9VOhOaY0rAFdUxlDnl5BLNvwEJvQtP5qcw7vdb/K+chnbwnspSHT8mz5lqwz41TezG0hkO06FTjJZhsyNuFLDpD2ZZxQj/QIRcF90zpmQ7Byu483WsQqUE0C342HL+JXngRB6fRzxRyVTaKu83h7UYTJ0QMt6ixFh6S3F8gqkKwrGTL3jHNBsD45UnifK8+RGtishQV2K3rujLKEkiZxpr2dYcudFW4oFsDKhad3CLBvuyTqsCo4B7mL5IKQ1vXo/MOOvq1I1d8ar9X6Ttu5KF4fZgiA==";
  var KEY_2 = "AAdjb1iPY8CiDmq9H34tKTBF8a3oDQ==";
  var TABLE_3 = "NQHlu1/wVO5EmkwQymF810qqY2xG1k2obcas4Z9mCsPEIFl9pRIjFxbJ7ybMHbBckT5Ton85E0FOeHezbh/mjlEYpmpnlXOS8dgrqeq2KfxImTh1YK9y0PeMNhzA1OQzSY9brYOJq/l2QnE/hwOeZIhPixVSKIUlDb5vLcH6RWKxkIEMuP0bDwIqQ71AJJaEaMJL7A6YtyIwoRT+L5v4aZzodN/0+3nOGsfblFjgxSfPzVDjNFeNl5P26+kEC/8AHgdrpAbt3hHz3HrRN1Y6e+JHgF7ncFWnoF0y3THL1S71WgWGCa6KtSzTCCG58n68nTyj2T3Sshk7utqCtMi/ZQ==";
  var KEY_3 = "DELOJgPsVaCcblDtTGMdHzM=";
  var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var URL_SAFE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  function base64ToBytes(text) {
    const bytes = [];
    let buffer = 0;
    let bits = 0;
    for (const char of text) {
      const value = ALPHABET.indexOf(char);
      if (value < 0) continue;
      buffer = buffer << 6 | value;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes.push(buffer >> bits & 255);
      }
    }
    return bytes;
  }
  function bytesToBase64UrlNoPadding(bytes) {
    let out = "";
    for (let i = 0; i < bytes.length; i += 3) {
      const chunk = bytes[i] << 16 | (bytes[i + 1] ?? 0) << 8 | (bytes[i + 2] ?? 0);
      const count = Math.min(3, bytes.length - i) + 1;
      for (let j = 0; j < count; j++) out += URL_SAFE_ALPHABET[chunk >> 18 - 6 * j & 63];
    }
    return out;
  }
  function utf8Bytes(text) {
    const bytes = [];
    for (const char of text) {
      const code = char.codePointAt(0);
      if (code < 128) bytes.push(code);
      else if (code < 2048) bytes.push(192 | code >> 6, 128 | code & 63);
      else if (code < 65536) bytes.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63);
      else {
        bytes.push(240 | code >> 18, 128 | code >> 12 & 63, 128 | code >> 6 & 63, 128 | code & 63);
      }
    }
    return bytes;
  }
  var stages = null;
  function getStages() {
    stages ?? (stages = [
      [base64ToBytes(TABLE_1), base64ToBytes(KEY_1), 90],
      [base64ToBytes(TABLE_2), base64ToBytes(KEY_2), 53],
      [base64ToBytes(TABLE_3), base64ToBytes(KEY_3), 186]
    ]);
    return stages;
  }
  function encryptStage(data, table, key, iv) {
    const out = new Array(data.length);
    let prev = iv;
    const keySize = key.length;
    for (let i = 0; i < data.length; i++) {
      prev = table[(data[i] ^ key[i % keySize] ^ prev) & 255] & 255;
      out[i] = prev;
    }
    return out;
  }
  function sign(path) {
    let data = utf8Bytes(path);
    for (const [table, key, iv] of getStages()) {
      data = encryptStage(data, table, key, iv);
    }
    return bytesToBase64UrlNoPadding(data);
  }
  function decodeQueryComponent(text) {
    const spaced = text.replace(/\+/g, " ");
    try {
      return decodeURIComponent(spaced);
    } catch {
      return spaced;
    }
  }
  function queryPairs(url) {
    const query = url.encodedQuery;
    if (query === null || query === "") return [];
    const raw = query.split("&").map((part) => {
      const index = part.indexOf("=");
      return index < 0 ? [decodeQueryComponent(part), null] : [decodeQueryComponent(part.slice(0, index)), decodeQueryComponent(part.slice(index + 1))];
    });
    const names = [];
    for (const [name] of raw) if (!names.includes(name)) names.push(name);
    return names.flatMap((name) => raw.filter(([key]) => key === name));
  }
  function signUrl(url) {
    if (!url.encodedPath.startsWith("/api/")) return url;
    const params = queryPairs(url).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    let sortedQueryUrl = url.encodedPath.startsWith("/api") ? url.encodedPath.slice(4) : url.encodedPath;
    if (params.length > 0) {
      let lastKey = "";
      let index = 0;
      sortedQueryUrl += "?" + params.map(([key, value]) => {
        let newKey = key;
        if (key.endsWith("[]")) {
          if (lastKey !== key) index = 0;
          lastKey = key;
          newKey = key.replace("[]", `[${index++}]`);
        }
        return `${newKey}=${value}`;
      }).join("&");
    }
    const port = url.port === null ? "" : `:${url.port}`;
    const builder = toHttpUrl(`${url.scheme}://${url.host}${port}${url.encodedPath}`).newBuilder();
    params.forEach(([key, value]) => builder.addQueryParameter(key, value));
    builder.addQueryParameter("vrf", sign(sortedQueryUrl));
    return builder.build();
  }

  // src/all/mangafire/index.ts
  var CONTENT_RATING_PREF = "pref_content_rating";
  var PREF_SHOW_AS_VOLUMES = "show_as_volumes";
  var PREF_MERGE_CHAPTERS = "merge_chapters";
  var PREF_PREFER_OFFICIAL = "prefer_official";
  var PREF_SOLVE_CAPTCHA = "solve_captcha";
  var SUMMARY_MSG = "Requires Chapter List Refresh to Apply";
  var CAPTCHA_DETECTED = "Shape-selecting captcha detected. Open in WebView to solve manually or turn on the setting to solve automatically.";
  var CAPTCHA_FAILED = "Failed to solve shape-selecting captcha. Open in WebView to solve manually.";
  var capitalize2 = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  var solving = null;
  function solverPageScript() {
    return `(function () {
  if (window.top !== window || window.__mfSolverStarted) return;
  window.__mfSolverStarted = true;
  window.bridge = { postMessage: function (message) { __tachiyomi.post(String(message)); __tachiyomi.done(); } };
  var ready = function () {
    return new Promise(function (resolve, reject) {
      var deadline = Date.now() + 60000;
      (function check() {
        try {
          if (typeof cv !== "undefined") {
            if (cv.Mat) return resolve();
            if (typeof cv.then === "function") {
              cv.then(function (module) { window.cv = module; delete module.then; resolve(); });
              return;
            }
          }
        } catch (e) {}
        if (Date.now() > deadline) return reject(new Error("OpenCV.js did not load"));
        setTimeout(check, 200);
      })();
    });
  };
  var start = function () {
    var script = document.createElement("script");
    script.src = ${JSON.stringify(OPENCV_URL)};
    script.onload = function () {
      ready().then(function () { (0, eval)(${JSON.stringify(SOLVER_SCRIPT)}); }, function () { bridge.postMessage("false"); });
    };
    script.onerror = function () { bridge.postMessage("false"); };
    (document.head || document.documentElement).appendChild(script);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();`;
  }
  var MangaFire = class _MangaFire extends KeiSource {
    constructor(lang) {
      super();
      this.lang = lang;
      this.name = "MangaFire";
      this.baseUrl = "https://mangafire.to";
      // ============================== Search ===============================
      this.authorIdCache = /* @__PURE__ */ new Map();
    }
    get langCode() {
      switch (this.lang) {
        case "es-419":
          return "es-la";
        case "pt-BR":
          return "pt-br";
        default:
          return this.lang;
      }
    }
    configureClient(builder) {
      builder.rateLimit(2);
    }
    configureHeaders(headers) {
      headers["Accept"] = "application/json";
      return headers;
    }
    // ============================== Requests =============================
    /** `client.get(url, Fetch.XHR)` through upstream's VrfSigner and ChallengeSolverInterceptor. */
    async apiGet(url) {
      const signed = signUrl(typeof url === "string" ? toHttpUrl(url) : url);
      const response = await this.client.get(signed, { fetch: Fetch.XHR, ensureSuccess: false });
      if (!_MangaFire.isCaptcha(response)) return _MangaFire.ensureSuccess(response);
      if (!this.solveCaptcha) throw new Error(CAPTCHA_DETECTED);
      const solved = await this.solveChallenge();
      if (!solved) throw new Error(CAPTCHA_FAILED);
      return _MangaFire.ensureSuccess(await this.client.get(signed, { fetch: Fetch.XHR, ensureSuccess: false }));
    }
    static isCaptcha(response) {
      if (response.code !== 403) return false;
      try {
        return (response.parseAs()?.error ?? null) === "captcha_required";
      } catch {
        return false;
      }
    }
    static ensureSuccess(response) {
      if (!response.isSuccessful) throw new Error(`HTTP error ${response.code}`);
      return response;
    }
    solveChallenge() {
      if (solving) return solving;
      const run = (async () => {
        try {
          const result = await runWebView({
            url: `https://${toHttpUrl(this.baseUrl).host}/@waf/solver`,
            script: solverPageScript(),
            timeoutMs: 12e4
          });
          return result.payloads.includes("true");
        } catch {
          return false;
        }
      })();
      solving = run;
      void run.finally(() => {
        if (solving === run) solving = null;
      });
      return run;
    }
    // ============================== Popular ==============================
    async getPopularManga(page) {
      const builder = toHttpUrl(`${this.baseUrl}/api/titles`).newBuilder();
      builder.addQueryParameter("order[views_30d]", "desc");
      builder.addQueryParameter("languages[]", this.langCode);
      builder.addQueryParameter("page", String(page));
      builder.addQueryParameter("limit", "50");
      new ContentRatingFilter(this.contentRating).addToUri(builder);
      return this.parseMangaList(await this.apiGet(builder.build()));
    }
    // ============================== Latest ===============================
    async getLatestUpdates(page) {
      const builder = toHttpUrl(`${this.baseUrl}/api/titles`).newBuilder();
      builder.addQueryParameter("order[chapter_updated_at]", "desc");
      builder.addQueryParameter("languages[]", this.langCode);
      builder.addQueryParameter("page", String(page));
      builder.addQueryParameter("limit", "50");
      new ContentRatingFilter(this.contentRating).addToUri(builder);
      return this.parseMangaList(await this.apiGet(builder.build()));
    }
    parseMangaList(response) {
      const data = response.parseAs();
      const mangas = (data.items ?? []).map(mangaToSManga);
      return new MangasPage(mangas, data.meta?.hasNext ?? false);
    }
    async getSearchMangaList(page, query, filters) {
      const authorQuery = (filters.find((it) => it instanceof AuthorFilter)?.state ?? "").trim();
      let authorId = null;
      if (authorQuery !== "") {
        authorId = this.authorIdCache.get(authorQuery) ?? null;
        if (authorId === null) {
          const tagUrl = toHttpUrl(`${this.baseUrl}/api/tags`).newBuilder().addQueryParameter("keyword", authorQuery).build();
          const tags = (await this.apiGet(tagUrl)).parseAs();
          const id = (tags.data ?? []).find((it) => it.type === "author" || it.type === "artist")?.id;
          authorId = id != null ? String(id) : null;
          if (authorId !== null) {
            this.authorIdCache.set(authorQuery, authorId);
            if (this.authorIdCache.size > 20) this.authorIdCache.delete(this.authorIdCache.keys().next().value);
          }
        }
        if (authorId === null) return new MangasPage([], false);
      }
      const builder = toHttpUrl(`${this.baseUrl}/api/titles`).newBuilder();
      if (query.trim() !== "") builder.addQueryParameter("keyword", query.trim());
      builder.addQueryParameter("languages[]", this.langCode);
      builder.addQueryParameter("page", String(page));
      builder.addQueryParameter("limit", "50");
      if (authorId !== null) builder.addQueryParameter("authors[]", authorId);
      for (const filter of filters) if (isUriFilter(filter)) filter.addToUri(builder);
      return this.parseMangaList(await this.apiGet(builder.build()));
    }
    // ============================== Details ==============================
    async getMangaByUrl(url) {
      if (url.host !== toHttpUrl(this.baseUrl).host || url.pathSegments.length < 2) return null;
      return this.fetchMangaDetails(this.getHid(url.pathSegments[1]));
    }
    async fetchMangaUpdate(manga, chapters, fetchDetails, fetchChapters) {
      const hid = this.getHid(manga.url);
      const [details, chapterList] = await Promise.all([
        fetchDetails ? this.fetchMangaDetails(hid) : Promise.resolve(manga),
        fetchChapters ? this.fetchChapters(manga) : Promise.resolve(chapters)
      ]);
      return new SMangaUpdate(details, chapterList);
    }
    async fetchMangaDetails(hid) {
      return detailsToSManga((await this.apiGet(`${this.baseUrl}/api/titles/${hid}`)).parseAs().data);
    }
    async fetchChapters(manga) {
      let displayVolumes = this.showAsVolumes;
      let chapters = [];
      const hid = this.getHid(manga.url);
      if (displayVolumes) {
        const volumes = (await this.apiGet(`${this.baseUrl}/api/titles/${hid}/volumes`)).parseAs().items ?? [];
        if (volumes.length > 0) {
          volumes.filter((it) => it.language === this.langCode).forEach((it) => chapters.push(volumeToSChapter(it, manga.url)));
        } else {
          displayVolumes = false;
        }
      }
      if (!displayVolumes) {
        chapters.push(...(await this.fetchAllChapters(hid)).map((it) => chapterToSChapter(it, manga.url, this.langCode)));
      }
      if (!displayVolumes && this.mergeChapters) {
        const preferOfficial = this.preferOfficial;
        const key = (chapter) => {
          const isOfficial = (chapter.scanlator ?? "").toLowerCase() === "official";
          return (preferOfficial ? !isOfficial : isOfficial) ? 1 : 0;
        };
        const seen = /* @__PURE__ */ new Set();
        chapters = [...chapters].sort((a, b) => key(a) - key(b)).filter((it) => seen.has(it.chapter_number) ? false : (seen.add(it.chapter_number), true)).sort((a, b) => b.chapter_number - a.chapter_number);
      }
      return chapters;
    }
    chaptersUrl(hid, page) {
      return toHttpUrl(`${this.baseUrl}/api/titles/${hid}/chapters`).newBuilder().addQueryParameter("language", this.langCode).addQueryParameter("sort", "number").addQueryParameter("order", "desc").addQueryParameter("page", String(page)).addQueryParameter("limit", "200").build();
    }
    async fetchAllChapters(hid) {
      const firstData = (await this.apiGet(this.chaptersUrl(hid, 1))).parseAs();
      const lastPage = firstData.meta?.lastPage ?? 1;
      const allItems = [...firstData.items ?? []];
      if (lastPage > 1) {
        const pages = Array.from({ length: lastPage - 1 }, (_, index) => index + 2);
        const rest = await Promise.all(
          pages.map(async (page) => (await this.apiGet(this.chaptersUrl(hid, page))).parseAs().items ?? [])
        );
        rest.forEach((items) => allItems.push(...items));
      }
      return allItems;
    }
    // =============================== Pages ===============================
    async getPageList(chapter) {
      const segments = toHttpUrl(this.baseUrl + chapter.url).pathSegments;
      const last = segments[segments.length - 1];
      let url;
      if (segments.includes("volume")) {
        url = `${this.baseUrl}/api/volumes/${last}`;
      } else {
        const chapterId = substringBefore(last, "-");
        if (!/^-?\d+$/.test(chapterId)) throw new Error("Refresh manga");
        url = `${this.baseUrl}/api/chapters/${chapterId}`;
      }
      const data = (await this.apiGet(url)).parseAs();
      return data.data.pages.map((page, index) => new Page(index, "", page.url));
    }
    // ============================== Filters ==============================
    getFilterList() {
      return [
        new ContentRatingFilter(this.contentRating),
        new Separator(),
        new TypeFilter(),
        new Separator(),
        new GenreModeFilter(),
        new GenreFilter(),
        new Separator(),
        new ThemeFilter(),
        new Separator(),
        new StatusFilter(),
        new Separator(),
        new AuthorFilter(),
        new YearFromFilter(),
        new YearToFilter(),
        new MinChapterFilter(),
        new Separator(),
        new SortFilter()
      ];
    }
    // ============================= Utilities =============================
    getHid(url) {
      const lastPart = substringAfterLast(removeSuffix(url, "/"), "/");
      if (lastPart.includes(".")) return substringAfterLast(lastPart, ".");
      if (lastPart.includes("-")) return substringBefore(lastPart, "-");
      return lastPart;
    }
    // ========================= Preferences =========================
    get contentRating() {
      return this.preferences.getStringSet(CONTENT_RATING_PREF, []);
    }
    get showAsVolumes() {
      return this.preferences.getBoolean(PREF_SHOW_AS_VOLUMES, false);
    }
    get mergeChapters() {
      return this.preferences.getBoolean(PREF_MERGE_CHAPTERS, false);
    }
    get preferOfficial() {
      return this.preferences.getBoolean(PREF_PREFER_OFFICIAL, true);
    }
    get solveCaptcha() {
      return this.preferences.getBoolean(PREF_SOLVE_CAPTCHA, false);
    }
    setupPreferenceScreen(screen) {
      screen.addPreference(
        new MultiSelectListPreference({
          key: CONTENT_RATING_PREF,
          title: "Content Rating (All by default)",
          entries: CONTENT_RATINGS.map(capitalize2),
          entryValues: CONTENT_RATINGS,
          summary: [...this.contentRating].map(capitalize2).join(", "),
          defaultValue: []
        })
      );
      screen.addPreference(
        new SwitchPreferenceCompat({ key: PREF_SHOW_AS_VOLUMES, title: "Prefer Volume Release", summary: SUMMARY_MSG, defaultValue: false })
      );
      screen.addPreference(
        new SwitchPreferenceCompat({ key: PREF_MERGE_CHAPTERS, title: "Merge duplicate chapters", summary: SUMMARY_MSG, defaultValue: false })
      );
      screen.addPreference(
        new SwitchPreferenceCompat({
          key: PREF_PREFER_OFFICIAL,
          title: "Prefer official chapters",
          summary: 'Used when "Merge duplicate chapters" is on',
          defaultValue: true
        })
      );
      screen.addPreference(
        new SwitchPreferenceCompat({
          key: PREF_SOLVE_CAPTCHA,
          title: "Automatically solve shape-selecting captcha",
          defaultValue: false
        })
      );
    }
  };
  var index_default = defineExtension(["en", "es", "es-419", "fr", "ja", "pt", "pt-BR"].map((lang) => new MangaFire(lang)));
  return __toCommonJS(index_exports);
})();
