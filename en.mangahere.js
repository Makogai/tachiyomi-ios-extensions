// Mangahere 1 for tachiyomi-ios. Ported from keiyoushi/extensions-source (Apache-2.0).
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

  // src/en/mangahere/index.ts
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
  function removePrefix(text, prefix) {
    return text.startsWith(prefix) ? text.slice(prefix.length) : text;
  }
  function evaluateIsolated(script) {
    return host().evaluate(script);
  }
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
  function startOfDay(daysAgo = 0, now = /* @__PURE__ */ new Date()) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    return date.getTime();
  }
  var seconds = (value) => value * 1e3;

  // src/en/mangahere/filters.ts
  var Genre = class extends TriState {
    constructor(name, id) {
      super(name);
      this.id = id;
    }
  };
  var TypeList = class extends Select {
    constructor(types2) {
      super("Type", types2, 1);
    }
  };
  var CompletionList = class extends Select {
    constructor(completions2) {
      super("Completed series", completions2, 0);
    }
  };
  var RatingList = class extends Select {
    constructor(ratings2) {
      super("Minimum rating", ratings2, 0);
    }
  };
  var GenreList = class extends Group {
    constructor(genres2) {
      super("Genres", genres2);
    }
  };
  var ArtistFilter = class extends Text {
  };
  var AuthorFilter = class extends Text {
  };
  var YearFilter = class extends Text {
  };
  var types = {
    "Japanese Manga": 1,
    "Korean Manhwa": 2,
    "Chinese Manhua": 3,
    "European Manga": 4,
    "American Manga": 5,
    "Hong Kong Manga": 6,
    "Other Manga": 7,
    Any: 0
  };
  var completions = ["Either", "No", "Yes"];
  var ratings = ["No Stars", "1 Star", "2 Stars", "3 Stars", "4 Stars", "5 Stars"];
  var genres = () => [
    new Genre("Action", 1),
    new Genre("Adventure", 2),
    new Genre("Comedy", 3),
    new Genre("Fantasy", 4),
    new Genre("Historical", 5),
    new Genre("Horror", 6),
    new Genre("Martial Arts", 7),
    new Genre("Mystery", 8),
    new Genre("Romance", 9),
    new Genre("Shounen Ai", 10),
    new Genre("Supernatural", 11),
    new Genre("Drama", 12),
    new Genre("Shounen", 13),
    new Genre("School Life", 14),
    new Genre("Shoujo", 15),
    new Genre("Gender Bender", 16),
    new Genre("Josei", 17),
    new Genre("Psychological", 18),
    new Genre("Seinen", 19),
    new Genre("Slice of Life", 20),
    new Genre("Sci-fi", 21),
    new Genre("Ecchi", 22),
    new Genre("Harem", 23),
    new Genre("Shoujo Ai", 24),
    new Genre("Yuri", 25),
    new Genre("Mature", 26),
    new Genre("Tragedy", 27),
    new Genre("Yaoi", 28),
    new Genre("Doujinshi", 29),
    new Genre("Sports", 30),
    new Genre("Adult", 31),
    new Genre("One Shot", 32),
    new Genre("Smut", 33),
    new Genre("Mecha", 34),
    new Genre("Shotacon", 35),
    new Genre("Lolicon", 36),
    new Genre("Webtoons", 37)
  ];

  // src/en/mangahere/index.ts
  var Mangahere = class extends KeiSource {
    constructor() {
      super(...arguments);
      this.name = "Mangahere";
      this.lang = "en";
      this.baseUrl = "https://www.mangahere.cc";
      this.id = "2";
      this.popularMangaSelector = () => ".manga-list-1-list li";
      this.popularMangaNextPageSelector = () => "div.pager-list-left a:last-child";
      this.latestUpdatesSelector = () => ".manga-list-1-list li";
      this.latestUpdatesNextPageSelector = () => "div.pager-list-left a:last-child";
      this.searchMangaSelector = () => ".manga-list-4-list > li";
      this.searchMangaNextPageSelector = () => "div.pager-list-left a:last-child";
      // Chapters
      this.chapterListSelector = () => "ul.detail-main-list > li";
    }
    configureClient(builder) {
      builder.addCookie(toHttpUrl(this.baseUrl).host, [["isAdult", "1"]]);
      builder.rateLimit(
        1,
        seconds(2),
        (url) => url.host === toHttpUrl(this.baseUrl).host && !url.encodedPath.endsWith("/chapterfun.ashx")
      );
    }
    // Popular Manga
    async getPopularManga(page) {
      const document = (await this.client.get(`${this.baseUrl}/directory/${page}.htm`, Fetch.DOCUMENT)).asJsoup();
      const mangas = document.select(this.popularMangaSelector()).map((element) => this.popularMangaFromElement(element));
      const hasNextPage = document.selectFirst(this.popularMangaNextPageSelector()) !== null;
      return new MangasPage([...mangas], hasNextPage);
    }
    popularMangaFromElement(element) {
      const manga = SManga.create();
      const titleElement = element.selectFirst("a");
      manga.title = titleElement.attr("title");
      manga.setUrlWithoutDomain(titleElement.absUrl("href"));
      manga.thumbnail_url = element.selectFirst("img.manga-list-1-cover")?.absUrl("src") ?? null;
      return manga;
    }
    // Latest Updates
    async getLatestUpdates(page) {
      const document = (await this.client.get(`${this.baseUrl}/directory/${page}.htm?latest`, Fetch.DOCUMENT)).asJsoup();
      const mangas = document.select(this.latestUpdatesSelector()).map((element) => this.popularMangaFromElement(element));
      const hasNextPage = document.selectFirst(this.latestUpdatesNextPageSelector()) !== null;
      return new MangasPage([...mangas], hasNextPage);
    }
    // Search
    async getSearchMangaList(page, query, filters) {
      const url = toHttpUrl(`${this.baseUrl}/search`).newBuilder();
      for (const filter of filters) {
        if (filter instanceof TypeList) {
          url.addEncodedQueryParameter("type", String(types[filter.values[filter.state]]));
        } else if (filter instanceof CompletionList) {
          url.addEncodedQueryParameter("st", String(filter.state));
        } else if (filter instanceof RatingList) {
          url.addEncodedQueryParameter("rating_method", "gt");
          url.addEncodedQueryParameter("rating", String(filter.state));
        } else if (filter instanceof GenreList) {
          const includeGenres = /* @__PURE__ */ new Set();
          const excludeGenres = /* @__PURE__ */ new Set();
          for (const genre of filter.state) {
            if (genre.isIncluded()) includeGenres.add(genre.id);
            if (genre.isExcluded()) excludeGenres.add(genre.id);
          }
          url.addEncodedQueryParameter("genres", [...includeGenres].join(","));
          url.addEncodedQueryParameter("nogenres", [...excludeGenres].join(","));
        } else if (filter instanceof ArtistFilter) {
          url.addEncodedQueryParameter("artist_method", "cw");
          url.addEncodedQueryParameter("artist", filter.state);
        } else if (filter instanceof AuthorFilter) {
          url.addEncodedQueryParameter("author_method", "cw");
          url.addEncodedQueryParameter("author", filter.state);
        } else if (filter instanceof YearFilter) {
          url.addEncodedQueryParameter("released_method", "eq");
          url.addEncodedQueryParameter("released", filter.state);
        }
      }
      url.addEncodedQueryParameter("page", String(page));
      url.addEncodedQueryParameter("title", query);
      url.addEncodedQueryParameter("sort", null);
      url.addEncodedQueryParameter("stype", "1");
      url.addEncodedQueryParameter("name", null);
      const document = (await this.client.get(url.build(), Fetch.DOCUMENT)).asJsoup();
      const mangas = document.select(this.searchMangaSelector()).map((element) => this.searchMangaFromElement(element));
      const hasNextPage = document.selectFirst(this.searchMangaNextPageSelector()) !== null;
      return new MangasPage([...mangas], hasNextPage);
    }
    searchMangaFromElement(element) {
      const manga = SManga.create();
      const titleEl = element.selectFirst(".manga-list-4-item-title > a");
      manga.setUrlWithoutDomain(titleEl?.absUrl("href") ?? "");
      manga.title = titleEl?.attr("title") ?? "";
      manga.thumbnail_url = element.selectFirst("img.manga-list-4-cover")?.absUrl("src") ?? null;
      return manga;
    }
    // Manga Details
    async fetchMangaUpdate(manga) {
      const document = (await this.client.get(this.getMangaUrl(manga), Fetch.DOCUMENT)).asJsoup();
      const updatedManga = this.mangaDetailsFromDocument(document);
      const updatedChapters = this.chapterListFromDocument(document);
      if (updatedChapters.length > 0) {
        const aChapterUrl = this.getChapterUrl(updatedChapters[0]);
        const aChapterDocument = (await this.client.get(aChapterUrl, Fetch.DOCUMENT)).asJsoup();
        if (aChapterDocument.select("p.detail-block-content").hasText()) updatedManga.status = SManga.LICENSED;
      }
      return new SMangaUpdate(updatedManga, updatedChapters);
    }
    mangaDetailsFromDocument(document) {
      const manga = SManga.create();
      manga.author = document.selectFirst(".detail-info-right-say > a")?.text() ?? null;
      manga.genre = document.select(".detail-info-right-tag-list > a").map((element) => element.text()).join(", ");
      manga.description = document.selectFirst(".fullcontent")?.text() ?? null;
      manga.thumbnail_url = document.selectFirst("img.detail-info-cover-img")?.absUrl("src") ?? null;
      const statusText = document.selectFirst("span.detail-info-right-title-tip")?.text();
      if (statusText !== void 0) {
        const lower = statusText.toLowerCase();
        if (lower.includes("ongoing")) manga.status = SManga.ONGOING;
        else if (lower.includes("completed")) manga.status = SManga.COMPLETED;
        else manga.status = SManga.UNKNOWN;
      }
      return manga;
    }
    chapterFromElement(element) {
      const chapter = SChapter.create();
      chapter.setUrlWithoutDomain(element.selectFirst("a").absUrl("href"));
      chapter.name = element.selectFirst("a p.title3").text();
      const date = element.selectFirst("a p.title2")?.text();
      chapter.date_upload = date !== void 0 ? this.parseChapterDate(date) : 0;
      return chapter;
    }
    chapterListFromDocument(document) {
      return [...document.select(this.chapterListSelector()).map((element) => this.chapterFromElement(element))];
    }
    parseChapterDate(date) {
      if (date.includes("Today") || date.includes(" ago")) return startOfDay(0);
      if (date.includes("Yesterday")) return startOfDay(1);
      return parseDate(date, "MMM dd,yyyy");
    }
    // Pages
    async getPageList(chapter) {
      const document = (await this.client.get(this.getChapterUrl(chapter), Fetch.DOCUMENT)).asJsoup();
      const bar = document.select("script[src*=chapter_bar]");
      let pages;
      if (bar.isNotEmpty()) {
        const script = removePrefix(document.select("script:containsData(function(p,a,c,k,e,d))").html(), "eval");
        const deobfuscatedScript = evaluateIsolated(script) ?? "";
        const urls = substringBefore(substringAfter(deobfuscatedScript, "newImgs=['"), "'];").split("','");
        pages = urls.map((s, index) => new Page(index, "", `https:${s}`));
      } else {
        const html = document.html();
        const link = document.location();
        const secretKey = this.extractSecretKey(html);
        const chapterIdStartLoc = html.indexOf("chapterid");
        const chapterId = html.substring(chapterIdStartLoc + 11, html.indexOf(";", chapterIdStartLoc)).trim();
        const chapterPagesElement = document.selectFirst(".pager-list-left > span");
        const pagesLinksElements = chapterPagesElement.select("a");
        const pagesNumber = Number(pagesLinksElements[pagesLinksElements.length - 2].attr("data-page"));
        const pageBase = link.substring(0, link.lastIndexOf("/"));
        pages = [];
        for (let page = 1; page <= pagesNumber; page++) {
          const pageUrl = toHttpUrl(`${pageBase}/chapterfun.ashx`).newBuilder().addQueryParameter("cid", chapterId).addQueryParameter("page", String(page)).addQueryParameter("key", secretKey).fragment(link).build();
          pages.push(new Page(page - 1, pageUrl.toString()));
        }
      }
      return this.dropLastIfBroken(pages);
    }
    /*
        function to drop last imageUrl if it's broken/unneccesary, working imageUrls are incremental (e.g. t001, t002, etc); if the difference between
        the last two isn't 1 or doesn't have an Int at the end of the last imageUrl's filename, drop last Page
     */
    async dropLastIfBroken(pages) {
      if (pages.length < 2) return pages;
      const lastIndex = pages.length - 1;
      const resolvedPages = [];
      for (const [index, page] of pages.entries()) {
        if (index < lastIndex - 1 || page.imageUrl !== null) {
          resolvedPages.push(page);
        } else {
          page.imageUrl = await this.getImageUrl(page);
          resolvedPages.push(page);
        }
      }
      const pageNumbers = [];
      for (const page of resolvedPages.slice(-2)) {
        const name = page.imageUrl?.substring(0, page.imageUrl.lastIndexOf(".")) ?? null;
        const number = name === null ? NaN : Number.parseInt(name.substring(name.lastIndexOf("/") + 1).slice(-2), 10);
        if (Number.isNaN(number)) return resolvedPages.slice(0, -1);
        pageNumbers.push(number);
      }
      return pageNumbers[1] - pageNumbers[0] === 1 || pageNumbers[0] === 0 && pageNumbers[1] === 99 ? resolvedPages : resolvedPages.slice(0, -1);
    }
    async getImageUrl(page) {
      const pageUrl = toHttpUrl(page.url);
      const referer = pageUrl.fragment;
      if (referer === null) throw new Error("Missing chapter referer");
      const requestUrl = pageUrl.newBuilder().fragment(null).build();
      const pageHeaders = {
        ...this.headers,
        Referer: referer,
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest"
      };
      for (let attempt = 0; attempt <= 2; attempt++) {
        const url = attempt === 0 ? requestUrl : requestUrl.newBuilder().setQueryParameter("key", "").build();
        const responseText = (await this.client.get(url, { headers: pageHeaders, fetch: Fetch.XHR })).body;
        if (responseText.length > 0) {
          return this.parseImageUrl(responseText);
        }
      }
      throw new Error("Empty image response");
    }
    parseImageUrl(responseText) {
      const deobfuscatedScript = evaluateIsolated(removePrefix(responseText, "eval")) ?? "";
      const pixIndex = deobfuscatedScript.indexOf("pix=");
      if (pixIndex < 0) throw new Error("Missing image host");
      const baseLinkStart = pixIndex + 5;
      const semicolon = deobfuscatedScript.indexOf(";", baseLinkStart);
      if (semicolon <= baseLinkStart) throw new Error("Invalid image host");
      const baseLink = deobfuscatedScript.substring(baseLinkStart, semicolon - 1);
      const pvalueIndex = deobfuscatedScript.indexOf("pvalue=");
      if (pvalueIndex < 0) throw new Error("Missing image path");
      const imageLinkStart = pvalueIndex + 9;
      const imageLinkEnd = deobfuscatedScript.indexOf('"', imageLinkStart);
      if (imageLinkEnd <= imageLinkStart) throw new Error("Invalid image path");
      const imageLink = deobfuscatedScript.substring(imageLinkStart, imageLinkEnd);
      return `https:${baseLink}${imageLink}`;
    }
    extractSecretKey(html) {
      const secretKeyScriptLocation = html.indexOf("eval(function(p,a,c,k,e,d)");
      const secretKeyScriptEndLocation = html.indexOf("</script>", secretKeyScriptLocation);
      const secretKeyScript = removePrefix(html.substring(secretKeyScriptLocation, secretKeyScriptEndLocation), "eval");
      const secretKeyDeobfuscatedScript = evaluateIsolated(secretKeyScript) ?? "";
      const secretKeyStartLoc = secretKeyDeobfuscatedScript.indexOf("'");
      const secretKeyEndLoc = secretKeyDeobfuscatedScript.indexOf(";");
      const secretKeyResultScript = secretKeyDeobfuscatedScript.substring(secretKeyStartLoc, secretKeyEndLoc);
      return evaluateIsolated(secretKeyResultScript) ?? "";
    }
    getFilterList() {
      return [
        new TypeList(Object.keys(types).sort()),
        new ArtistFilter("Artist"),
        new AuthorFilter("Author"),
        new GenreList(genres()),
        new RatingList(ratings),
        new YearFilter("Year released"),
        new CompletionList(completions)
      ];
    }
  };
  var index_default = defineExtension([new Mangahere()]);
  return __toCommonJS(index_exports);
})();
