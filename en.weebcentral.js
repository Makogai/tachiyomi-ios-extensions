// Weeb Central 1 for tachiyomi-ios. Ported from keiyoushi/extensions-source (Apache-2.0).
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

  // src/en/weebcentral/index.ts
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
  function toHttpUrlOrNull(url) {
    return HttpUrl.parse(url);
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
  function parseIsoDate(text) {
    const time = Date.parse(text);
    return Number.isNaN(time) ? 0 : time;
  }
  var seconds = (value) => value * 1e3;

  // src/en/weebcentral/filters.ts
  function isUriFilter(filter) {
    return typeof filter.addToUri === "function";
  }
  var UriPartFilter = class extends Select {
    constructor(name, param, vals, defaultValue = "") {
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
      builder.addQueryParameter(this.param, this.vals[this.state][1]);
    }
  };
  var UriMultiSelectOption = class extends CheckBox {
    constructor(name, value) {
      super(name);
      this.value = value;
    }
  };
  var UriMultiSelectFilter = class extends Group {
    constructor(name, param, options) {
      super(
        name,
        options.map(([title, value]) => new UriMultiSelectOption(title, value))
      );
      this.param = param;
    }
    addToUri(builder) {
      for (const option of this.state) {
        if (option.state) builder.addQueryParameter(this.param, option.value);
      }
    }
  };
  var UriMultiTriSelectOption = class extends TriState {
    constructor(name, value) {
      super(name);
      this.value = value;
    }
  };
  var UriMultiTriSelectFilter = class extends Group {
    constructor(name, includeUrlParameter, excludeUrlParameter, options) {
      super(
        name,
        options.map(([title, value]) => new UriMultiTriSelectOption(title, value))
      );
      this.includeUrlParameter = includeUrlParameter;
      this.excludeUrlParameter = excludeUrlParameter;
    }
    addToUri(builder) {
      for (const option of this.state) {
        if (option.isIncluded()) builder.addQueryParameter(this.includeUrlParameter, option.value);
        if (option.isExcluded()) builder.addQueryParameter(this.excludeUrlParameter, option.value);
      }
    }
  };
  var same = (values) => values.map((value) => [value, value]);
  var SortFilter = class extends UriPartFilter {
    constructor(defaultValue = "") {
      super(
        "Sort",
        "sort",
        same(["Best Match", "Alphabet", "Popularity", "Subscribers", "Recently Added", "Latest Updates"]),
        defaultValue
      );
    }
  };
  var SortOrderFilter = class extends UriPartFilter {
    constructor() {
      super("Sort Order", "order", same(["Descending", "Ascending"]));
    }
  };
  var OfficialTranslationFilter = class extends UriPartFilter {
    constructor() {
      super("Official Translation", "official", same(["Any", "True", "False"]));
    }
  };
  var AnimeAdaptationFilter = class extends UriPartFilter {
    constructor() {
      super("Anime Adaptation", "anime", same(["Any", "True", "False"]));
    }
  };
  var AdultContentFilter = class extends UriPartFilter {
    constructor() {
      super("Adult Content", "adult", same(["Any", "True", "False"]));
    }
  };
  var AuthorFilter = class extends Text {
    constructor() {
      super("Author (Case-sensitive)");
    }
    addToUri(builder) {
      if (this.state.length > 0) builder.addQueryParameter("author", this.state);
    }
  };
  var StatusFilter = class extends UriMultiSelectFilter {
    constructor() {
      super("Series Status", "included_status", same(["Ongoing", "Complete", "Hiatus", "Canceled"]));
    }
  };
  var TypeFilter = class extends UriMultiSelectFilter {
    constructor() {
      super("Series Type", "included_type", same(["Manga", "Manhwa", "Manhua", "OEL"]));
    }
  };
  var TagFilter = class extends UriMultiTriSelectFilter {
    constructor() {
      super(
        "Tags",
        "included_tag",
        "excluded_tag",
        same([
          "Action",
          "Adult",
          "Adventure",
          "Comedy",
          "Doujinshi",
          "Drama",
          "Ecchi",
          "Fantasy",
          "Gender Bender",
          "Harem",
          "Hentai",
          "Historical",
          "Horror",
          "Isekai",
          "Josei",
          "Lolicon",
          "Martial Arts",
          "Mature",
          "Mecha",
          "Mystery",
          "Psychological",
          "Romance",
          "School Life",
          "Sci-fi",
          "Seinen",
          "Shotacon",
          "Shoujo",
          "Shoujo Ai",
          "Shounen",
          "Shounen Ai",
          "Slice of Life",
          "Smut",
          "Sports",
          "Supernatural",
          "Tragedy",
          "Yaoi",
          "Yuri",
          "Other"
        ])
      );
    }
  };

  // src/en/weebcentral/index.ts
  var FETCH_LIMIT = 32;
  var excludedSearchCharacters = /[!#:(),-]/g;
  var seasonRegex = /(Season|S)\s*\d+/i;
  var BRACKET_REGEX = /(\([^()]*\)|\[[^[\]]*])\s*$/;
  var PREF_CLEAN_TITLE = "pref_clean_title";
  var PREF_CLEAN_TITLE_DEFAULT = false;
  var WeebCentral = class extends KeiSource {
    constructor() {
      super(...arguments);
      this.name = "Weeb Central";
      this.lang = "en";
      this.baseUrl = "https://weebcentral.com";
    }
    get baseUrlHost() {
      return toHttpUrl(this.baseUrl).host;
    }
    configureClient(builder) {
      builder.rateLimit(1, seconds(2), (url) => url.host === this.baseUrlHost);
    }
    // ============================== Popular ===============================
    getPopularManga(page) {
      return this.getSearchMangaList(page, "", this.defaultFilterList(new SortFilter("Popularity")));
    }
    // =============================== Latest ===============================
    getLatestUpdates(page) {
      return this.getSearchMangaList(page, "", this.defaultFilterList(new SortFilter("Latest Updates")));
    }
    // =============================== Search ===============================
    async getSearchMangaList(page, query, filters) {
      const filterList = filters.length > 0 ? filters : this.getFilterList();
      const builder = toHttpUrl(`${this.baseUrl}/search/data`).newBuilder();
      builder.addQueryParameter("text", query.replace(excludedSearchCharacters, " ").trim());
      for (const filter of filterList) {
        if (isUriFilter(filter)) filter.addToUri(builder);
      }
      builder.addQueryParameter("limit", String(FETCH_LIMIT));
      builder.addQueryParameter("offset", String((page - 1) * FETCH_LIMIT));
      builder.addQueryParameter("display_mode", "Full Display");
      const url = builder.build();
      const document = (await this.client.get(url, Fetch.DOCUMENT)).asJsoup();
      const mangas = document.select("article > section > a").map((element) => {
        const manga = SManga.create();
        manga.thumbnail_url = this.sourceImg(element);
        manga.title = element.selectFirst("div:not([class]):last-child").text();
        manga.setUrlWithoutDomain(element.attr("abs:href"));
        return manga;
      });
      const hasNextPage = document.selectFirst("button") !== null;
      return new MangasPage([...mangas], hasNextPage);
    }
    async getMangaByUrl(url) {
      if (url.host !== this.baseUrlHost || url.pathSegments.length < 3) {
        return null;
      }
      const manga = SManga.create();
      manga.url = `/series/${url.pathSegments[1]}/${url.pathSegments[2]}`;
      const updated = (await this.fetchMangaUpdate(manga, [], true, false)).manga;
      updated.initialized = true;
      return updated;
    }
    // =============================== Filters ==============================
    getFilterList() {
      return this.defaultFilterList(new SortFilter());
    }
    // =========================== Manga Updates ============================
    async fetchMangaUpdate(manga, chapters, fetchDetails, fetchChapters) {
      const [updatedManga, updatedChapters] = await Promise.all([
        fetchDetails ? this.getMangaDetails(manga) : Promise.resolve(manga),
        fetchChapters ? this.getChapterList(manga) : Promise.resolve(chapters)
      ]);
      return new SMangaUpdate(updatedManga, updatedChapters);
    }
    async getMangaDetails(manga) {
      const document = (await this.client.get(this.baseUrl + manga.url, Fetch.DOCUMENT)).asJsoup();
      const sections = document.select("section[x-data] > section");
      const result = SManga.create();
      {
        const section = sections[0];
        if (!section) throw new Error("Series page has no details section");
        result.thumbnail_url = this.sourceImg(section);
        result.author = section.select("ul > li:has(strong:contains(Author)) > span > a").map((element) => element.text()).join(", ");
        result.genre = section.select("ul > li:has(strong:contains(Tag),strong:contains(Type)) a").map((element) => element.text()).join(", ");
        result.status = this.parseStatus(section.selectFirst("ul > li:has(strong:contains(Status)) > a"));
      }
      {
        const section = sections[1];
        if (!section) throw new Error("Series page has no title section");
        result.title = this.cleanTitleIfNeeded(section.selectFirst("h1").text());
        let description = "";
        const synopsis = section.selectFirst("li:has(strong:contains(Description)) > p")?.text();
        if (synopsis !== void 0) {
          description += synopsis.replaceAll("NOTE: ", "\n\nNOTE: ");
        }
        const relatedSeries = section.select("li:has(strong:contains(Related Series)) li");
        if (relatedSeries.isNotEmpty()) {
          description += "\n\nRelated Series(s):";
          for (const series of relatedSeries) {
            const link = series.selectFirst("a");
            const relation = series.selectFirst("span")?.text() ?? "";
            description += `
- [${link.text()}](${link.attr("abs:href")}) ${relation}`.trimEnd();
          }
        }
        const alternateTitles = section.select("li:has(strong:contains(Associated Name)) li");
        if (alternateTitles.isNotEmpty()) {
          description += "\n\nAssociated Name(s):";
          for (const title of alternateTitles) description += `
- ${title.text()}`;
        }
        const trackers = document.select("li:has(strong:contains(Track)) span[data-tip] > a");
        if (trackers.isNotEmpty()) {
          description += "\n\nTracker(s):";
          for (const tracker of trackers) {
            const name = tracker.parent().attr("data-tip");
            description += `
- [${name}](${tracker.attr("abs:href")})`;
          }
        }
        result.description = description;
      }
      result.setUrlWithoutDomain(document.location());
      return result;
    }
    // Related manga (`fetchRelatedMangaList`) is not ported: the host API has no related-manga call.
    parseStatus(element) {
      switch (element?.text()?.toLowerCase()) {
        case "ongoing":
          return SManga.ONGOING;
        case "complete":
          return SManga.COMPLETED;
        case "hiatus":
          return SManga.ON_HIATUS;
        case "canceled":
          return SManga.CANCELLED;
        default:
          return SManga.UNKNOWN;
      }
    }
    async getChapterList(manga) {
      const seriesId = toHttpUrl(this.baseUrl + manga.url).pathSegments[1];
      const url = `${this.baseUrl}/series/${seriesId}/full-chapter-list`;
      const document = (await this.client.get(url, Fetch.DOCUMENT)).asJsoup();
      const chapters = document.select("div[x-data] > a");
      let useIndexing = false;
      return chapters.map((element, index) => {
        const chapter = SChapter.create();
        chapter.name = element.selectFirst("span.flex > span").text();
        useIndexing = seasonRegex.test(chapter.name);
        chapter.setUrlWithoutDomain(element.attr("abs:href"));
        const time = element.selectFirst("time[datetime]");
        if (time) chapter.date_upload = parseIsoDate(time.attr("datetime"));
        if (useIndexing) chapter.chapter_number = chapters.length - index;
        const isOfficial = element.select("img").some((img) => img.attr("src").toLowerCase().includes("official"));
        chapter.scanlator = isOfficial ? "Official" : "Unknown";
        return chapter;
      });
    }
    // =============================== Pages ================================
    async getPageList(chapter) {
      const newUrl = toHttpUrlOrNull(this.baseUrl + chapter.url)?.newBuilder().addPathSegment("images").addQueryParameter("is_prev", "False").addQueryParameter("reading_style", "long_strip").build().toString() ?? this.baseUrl + chapter.url;
      const document = (await this.client.get(newUrl, Fetch.DOCUMENT)).asJsoup();
      return document.select("section[x-data~=scroll] > img").map((element, index) => new Page(index, "", element.attr("abs:src")));
    }
    // Upstream's getImageRequest only adds `Host: <image host>`, which every request carries
    // already; the default request (with the Referer header) is the same.
    setupPreferenceScreen(screen) {
      screen.addPreference(
        new SwitchPreferenceCompat({
          key: PREF_CLEAN_TITLE,
          title: "Clean title",
          summary: "Removes extra brackets or parentheses in title",
          defaultValue: PREF_CLEAN_TITLE_DEFAULT
        })
      );
    }
    // ============================= Utilities ==============================
    get cleanTitle() {
      try {
        return this.preferences.getBoolean(PREF_CLEAN_TITLE, PREF_CLEAN_TITLE_DEFAULT);
      } catch {
        return PREF_CLEAN_TITLE_DEFAULT;
      }
    }
    cleanTitleIfNeeded(title) {
      return this.cleanTitle ? title.replace(BRACKET_REGEX, "").trim() : title.trim();
    }
    sourceImg(element) {
      const source = element.selectFirst("source");
      if (source) return source.attr("srcset").replaceAll("small", "normal");
      return element.selectFirst("img")?.attr("abs:src") ?? null;
    }
    defaultFilterList(sortFilter) {
      return [
        sortFilter,
        new SortOrderFilter(),
        new OfficialTranslationFilter(),
        new AnimeAdaptationFilter(),
        new AdultContentFilter(),
        new AuthorFilter(),
        new StatusFilter(),
        new TypeFilter(),
        new TagFilter()
      ];
    }
  };
  var index_default = defineExtension([new WeebCentral()]);
  return __toCommonJS(index_exports);
})();
