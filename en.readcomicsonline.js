// Read Comics Online 1 for tachiyomi-ios. Ported from keiyoushi/extensions-source (Apache-2.0).
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

  // src/en/readcomicsonline/index.ts
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
  function substringAfterLast(text, delimiter, missing = text) {
    const index = text.lastIndexOf(delimiter);
    return index < 0 ? missing : text.slice(index + delimiter.length);
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

  // src/en/readcomicsonline/filters.ts
  function isUriFilter(filter) {
    return typeof filter.addToUri === "function";
  }
  var TextFilter = class extends Text {
    constructor(name, param) {
      super(name);
      this.param = param;
    }
    addToUri(builder) {
      builder.addQueryParameter(this.param, this.state);
    }
  };
  var UriPartFilter = class extends Select {
    constructor(name, param, vals, firstIsUnspecified = true, defaultValue = 0) {
      super(
        name,
        vals.map(([title]) => title),
        defaultValue
      );
      this.param = param;
      this.vals = vals;
      this.firstIsUnspecified = firstIsUnspecified;
    }
    addToUri(builder) {
      if (this.state === 0 && this.firstIsUnspecified) {
        return;
      }
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
    constructor(name, param, vals) {
      super(
        name,
        vals.map(([title, value]) => new UriMultiSelectOption(title, value))
      );
      this.param = param;
    }
    addToUri(builder) {
      const checked = this.state.filter((option) => option.state);
      if (checked.length === 0) {
        return;
      }
      for (const option of checked) builder.addQueryParameter(this.param, option.value);
    }
  };
  var SortFilter = class extends Sort {
    constructor(intl, sortables, selection = { index: 0, ascending: true }) {
      super(
        intl.get("sort_by_filter_title"),
        sortables.map(([title]) => title),
        selection
      );
      this.sortables = sortables;
    }
    addToUri(builder) {
      const state = this.state;
      if (!state) return;
      builder.addQueryParameter("sortBy", this.sortables[state.index][1]);
      builder.addQueryParameter("asc", String(state.ascending));
    }
  };

  // src/en/readcomicsonline/intl.ts
  var messages = {
    en: {
      filter_warning: "Ignored if using text search",
      filter_missing_warning: "Press 'Reset' to attempt to show filters",
      category_filter_title: "Category",
      status_filter_title: "Status",
      type_filter_title: "Type",
      year_filter_title: "Year of release",
      author_filter_title: "Author",
      tag_filter_title: "Tag",
      title_begins_with_filter_title: "Title begins with",
      sort_by_filter_title: "Sort by"
    },
    es: {
      filter_warning: "Ignorados si se realiza una búsqueda textual",
      filter_missing_warning: "Presione 'Restablecer' para intentar mostrar los filtros",
      category_filter_title: "Categoría",
      status_filter_title: "Estado",
      type_filter_title: "Tipo",
      year_filter_title: "Año de lanzamiento",
      author_filter_title: "Autor",
      tag_filter_title: "Etiqueta",
      title_begins_with_filter_title: "El título comienza con",
      sort_by_filter_title: "Ordenar por"
    }
  };
  var Intl = class {
    constructor(language, baseLanguage = "en") {
      this.language = language;
      this.baseLanguage = baseLanguage;
    }
    get(key) {
      return messages[this.language]?.[key] ?? messages[this.baseLanguage]?.[key] ?? key;
    }
  };

  // src/en/readcomicsonline/mmrcms.ts
  var MMRCMS = class extends KeiSource {
    constructor() {
      super(...arguments);
      this.searchTokenRegex = /['"]_token['"]\s*:\s*['"]([0-9A-Za-z]+)['"]/;
      this.detailAuthor = /* @__PURE__ */ new Set(["author(s)", "autor(es)", "auteur(s)", "著作", "yazar(lar)", "mangaka(lar)", "pengarang/penulis", "pengarang", "penulis", "autor", "المؤلف", "перевод", "autor/autorzy"]);
      this.detailArtist = /* @__PURE__ */ new Set(["artist(s)", "artiste(s)", "sanatçi(lar)", "artista(s)", "artist(s)/ilustrator", "الرسام", "seniman", "rysownik/rysownicy", "artista"]);
      this.detailGenre = /* @__PURE__ */ new Set(["categories", "categorías", "catégories", "ジャンル", "kategoriler", "categorias", "kategorie", "التصنيفات", "жанр", "kategori", "tagi", "género"]);
      this.detailStatus = /* @__PURE__ */ new Set(["status", "statut", "estado", "状態", "durum", "الحالة", "статус"]);
      this.detailStatusComplete = /* @__PURE__ */ new Set(["complete", "مكتملة", "complet", "completo", "zakończone", "concluído", "finalizado"]);
      this.detailStatusOngoing = /* @__PURE__ */ new Set(["ongoing", "مستمرة", "en cours", "em lançamento", "prace w toku", "ativo", "em andamento", "activo", "publicándose", "publicandose"]);
      this.detailStatusDropped = /* @__PURE__ */ new Set(["dropped"]);
    }
    /** A `parseDate` pattern (upstream: `DateTimeFormatter.ofPattern("d MMM. yyyy", Locale.US)`). */
    get dateFormat() {
      return "d MMM. yyyy";
    }
    get itemPath() {
      return "manga";
    }
    get fetchFilterOptions() {
      return true;
    }
    get supportsAdvancedSearch() {
      return true;
    }
    get detailsTitleSelector() {
      return ".listmanga-header, .widget-title";
    }
    get chapterNamePrefix() {
      return "";
    }
    get chapterString() {
      switch (this.lang) {
        case "es":
          return "Capítulo";
        case "fr":
          return "Chapitre";
        default:
          return "Chapter";
      }
    }
    get intl() {
      return new Intl(this.lang);
    }
    popularMangaUrl(page) {
      return `${this.baseUrl}/filterList?page=${page}&sortBy=views&asc=false`;
    }
    async getPopularManga(page) {
      return this.popularMangaParse((await this.client.get(this.popularMangaUrl(page), Fetch.DOCUMENT)).asJsoup());
    }
    popularMangaParse(document) {
      const mangas = document.select(this.popularMangaSelector()).map((element) => this.popularMangaFromElement(element));
      const nextPageSelector = this.popularMangaNextPageSelector();
      const hasNextPage = nextPageSelector !== null ? document.selectFirst(nextPageSelector) !== null : false;
      return new MangasPage([...mangas], hasNextPage);
    }
    popularMangaSelector() {
      return this.searchMangaSelector();
    }
    popularMangaFromElement(element) {
      return this.searchMangaFromElement(element);
    }
    popularMangaNextPageSelector() {
      return this.searchMangaNextPageSelector();
    }
    latestUpdatesUrl(page) {
      return `${this.baseUrl}/latest-release?page=${page}`;
    }
    async getLatestUpdates(page) {
      return this.latestUpdatesParse(await this.client.get(this.latestUpdatesUrl(page), Fetch.DOCUMENT));
    }
    latestUpdatesParse(response) {
      const document = response.asJsoup();
      const seen = /* @__PURE__ */ new Set();
      const manga = document.select(this.latestUpdatesSelector()).map((element) => this.latestUpdatesFromElement(element)).filter((item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      });
      const nextPageSelector = this.latestUpdatesNextPageSelector();
      const hasNextPage = nextPageSelector !== null ? document.selectFirst(nextPageSelector) !== null : false;
      return new MangasPage(manga, hasNextPage);
    }
    latestUpdatesSelector() {
      return "div.mangalist div.manga-item";
    }
    latestUpdatesFromElement(element) {
      return this.popularMangaFromElement(element);
    }
    latestUpdatesNextPageSelector() {
      return this.popularMangaNextPageSelector();
    }
    async getSearchMangaList(page, query, filters) {
      if (query.length === 0 && this.supportsAdvancedSearch) {
        const document = (await this.client.get(`${this.baseUrl}/advanced-search`, Fetch.DOCUMENT)).asJsoup();
        const paramsBuilder = toHttpUrl(this.baseUrl).newBuilder();
        for (const filter of filters) {
          if (isUriFilter(filter)) filter.addToUri(paramsBuilder);
        }
        const params = paramsBuilder.build().encodedQuery ?? "";
        const body = new FormBody();
        body.add("params", params);
        body.add("page", String(page));
        const script = document.selectFirst("script:containsData(_token)")?.data();
        if (script !== void 0) {
          const token = this.searchTokenRegex.exec(script)?.[1];
          if (token !== void 0) body.add("_token", token);
        }
        const resDoc = (await this.client.post(`${this.baseUrl}/advSearchFilter`, body.build(), Fetch.DOCUMENT)).asJsoup();
        const mangas = resDoc.select(this.searchMangaSelector()).map((element) => this.searchMangaFromElement(element));
        const nextPageSelector = this.searchMangaNextPageSelector();
        const hasNextPage = nextPageSelector !== null ? resDoc.selectFirst(nextPageSelector) !== null : false;
        return new MangasPage([...mangas], hasNextPage);
      }
      const url = this.searchMangaUrl(page, query, filters);
      return this.searchMangaParse(await this.client.get(url, Fetch.DOCUMENT), page, url);
    }
    searchMangaUrl(page, query, filters) {
      const builder = toHttpUrl(this.baseUrl).newBuilder();
      if (query.length > 0) {
        builder.addPathSegment("search");
        builder.addQueryParameter("query", query);
      } else {
        builder.addPathSegment("filterList");
        builder.addQueryParameter("page", String(page));
        for (const filter of filters) {
          if (isUriFilter(filter)) filter.addToUri(builder);
        }
      }
      return builder.build().toString();
    }
    /** `requestUrl` stands in for upstream's `response.request.url`. */
    searchMangaParse(response, page, requestUrl) {
      const segments = toHttpUrl(requestUrl).pathSegments;
      const searchType = segments[segments.length - 1];
      if (searchType === "filterList") {
        const document = response.asJsoup();
        const mangas = document.select(this.searchMangaSelector()).map((element) => this.searchMangaFromElement(element));
        const nextPageSelector = this.searchMangaNextPageSelector();
        const hasNextPage = nextPageSelector !== null ? document.selectFirst(nextPageSelector) !== null : false;
        return new MangasPage([...mangas], hasNextPage);
      }
      return this.parseSearchDirectory(response.parseAs().suggestions, page);
    }
    searchMangaSelector() {
      return "div.media";
    }
    searchMangaFromElement(element) {
      const manga = SManga.create();
      const anchor = element.selectFirst(".media-heading a, .manga-heading a");
      manga.setUrlWithoutDomain(anchor.absUrl("href"));
      manga.title = anchor.text();
      manga.thumbnail_url = this.guessCover(manga.url, this.imgAttrOrNull(element.selectFirst("img")));
      return manga;
    }
    searchMangaNextPageSelector() {
      return ".pagination a[rel=next]";
    }
    parseSearchDirectory(searchDirectory, page) {
      const manga = searchDirectory.slice((page - 1) * 24, Math.min(page * 24, searchDirectory.length)).map((it) => {
        const item = SManga.create();
        item.url = `/${this.itemPath}/${it.data}`;
        item.title = it.value;
        item.thumbnail_url = this.guessCover(item.url, null);
        return item;
      });
      const hasNextPage = (page + 1) * 24 <= searchDirectory.length;
      return new MangasPage(manga, hasNextPage);
    }
    async getMangaByUrl(url) {
      if (url.host !== toHttpUrl(this.baseUrl).host || url.pathSegments.length < 2 || url.pathSegments[0] !== this.itemPath) {
        return null;
      }
      const manga = this.mangaDetailsParse((await this.client.get(url, Fetch.DOCUMENT)).asJsoup());
      manga.setUrlWithoutDomain(url.toString());
      return manga;
    }
    // Details and chapters come from the same page
    async fetchMangaUpdate(manga) {
      const document = (await this.client.get(this.getMangaUrl(manga), Fetch.DOCUMENT)).asJsoup();
      return new SMangaUpdate(this.mangaDetailsParse(document), await this.chapterListParse(document));
    }
    parseDetailStatus(text) {
      const status = text.toLowerCase();
      if (this.detailStatusComplete.has(status)) return SManga.COMPLETED;
      if (this.detailStatusOngoing.has(status)) return SManga.ONGOING;
      if (this.detailStatusDropped.has(status)) return SManga.CANCELLED;
      return SManga.UNKNOWN;
    }
    mangaDetailsParse(document) {
      const manga = SManga.create();
      manga.title = document.selectFirst(this.detailsTitleSelector).text();
      manga.thumbnail_url = this.guessCover(
        document.location(),
        this.imgAttrOrNull(document.selectFirst(".row img.img-responsive"))
      );
      manga.description = this.textWithNewlines(document.select(".row .well"), ["h5"]);
      for (const element of document.select(".row .dl-horizontal dt")) {
        let key = element.text().toLowerCase();
        if (key.endsWith(":")) key = key.slice(0, -1);
        if (this.detailAuthor.has(key)) {
          manga.author = element.nextElementSibling().text();
        } else if (this.detailArtist.has(key)) {
          manga.artist = element.nextElementSibling().text();
        } else if (this.detailGenre.has(key)) {
          manga.genre = element.nextElementSibling().select("a").map((it) => it.text()).join(", ");
        } else if (this.detailStatus.has(key)) {
          manga.status = this.parseDetailStatus(element.nextElementSibling().text());
        }
      }
      return manga;
    }
    async chapterListParse(document) {
      const title = document.selectFirst(this.detailsTitleSelector).text();
      return [...document.select(this.chapterListSelector()).map((element) => this.chapterFromElement(element, title))];
    }
    chapterListSelector() {
      return "ul.chapters > li:not(.btn)";
    }
    chapterFromElement(element, mangaTitle) {
      const chapter = SChapter.create();
      const titleWrapper = element.selectFirst(".chapter-title-rtl");
      const anchor = titleWrapper.selectFirst("a");
      chapter.setUrlWithoutDomain(anchor.absUrl("href"));
      chapter.name = this.cleanChapterName(mangaTitle, titleWrapper.text());
      const dateStr = element.selectFirst(".date-chapter-title-rtl")?.text();
      chapter.date_upload = this.tryParseDate(dateStr);
      return chapter;
    }
    /** Upstream's `DateTimeFormatter.tryParseDate`: 0 for null or unparseable text. */
    tryParseDate(text) {
      return text == null ? 0 : parseDate(text, this.dateFormat);
    }
    /**
     * Function to clean up chapter names. Mostly useful for sites that
     * don't know what a chapter title is and do "One Piece 1234 : Chapter 1234".
     */
    cleanChapterName(mangaTitle, name) {
      const initialName = name.replace(this.chapterNamePrefix + mangaTitle, () => this.chapterString);
      const colon = initialName.indexOf(":");
      const splits = (colon < 0 ? [initialName] : [initialName.slice(0, colon), initialName.slice(colon + 1)]).map(
        (it) => it.trim()
      );
      return splits.length < 2 || splits[0] === splits[1] ? splits[0] : `${splits[0]}: ${splits[1]}`;
    }
    async getPageList(chapter) {
      return this.pageListParse((await this.client.get(this.getChapterUrl(chapter), Fetch.DOCUMENT)).asJsoup());
    }
    pageListParse(document) {
      return document.select("#all > img.img-responsive").map((it, i) => new Page(i, "", this.imgAttr(it)));
    }
    // Upstream fetches filter options (fetchFilterData) when fetchFilterOptions is true; the SDK has
    // no filter-data call, so getFilterList always gets no data, as upstream does before a fetch.
    getFilterList(data = null) {
      const categories = data?.categories ?? [];
      const statuses = data?.statuses ?? [];
      const tags = data?.tags ?? [];
      const sortOptions = data?.sortOptions ?? [];
      const intl = this.intl;
      const filters = [];
      filters.push(new Header(intl.get("filter_warning")));
      filters.push(new Separator());
      if (this.supportsAdvancedSearch) {
        if (categories.length > 0) {
          filters.push(new UriMultiSelectFilter(intl.get("category_filter_title"), "categories[]", categories));
        }
        if (statuses.length > 0) {
          filters.push(new UriMultiSelectFilter(intl.get("status_filter_title"), "status[]", statuses));
        }
        if (tags.length > 0) {
          filters.push(new UriMultiSelectFilter(intl.get("type_filter_title"), "types[]", tags));
        }
        filters.push(new TextFilter(intl.get("year_filter_title"), "release"));
        filters.push(new TextFilter(intl.get("author_filter_title"), "author"));
      } else {
        if (categories.length > 0) {
          filters.push(new UriPartFilter(intl.get("category_filter_title"), "cat", [["Any", ""], ...categories]));
        }
        filters.push(new UriPartFilter(intl.get("title_begins_with_filter_title"), "alpha", this.alphaOptions));
        if (tags.length > 0) {
          filters.push(new UriPartFilter(intl.get("tag_filter_title"), "tag", [["Any", ""], ...tags]));
        }
        if (sortOptions.length > 0) {
          filters.push(new SortFilter(intl, sortOptions));
        }
      }
      return filters;
    }
    get alphaOptions() {
      return [["Any", ""], ...[..."#ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((it) => [it, it])];
    }
    guessCover(mangaUrl, url) {
      if (url == null || url.endsWith("no-image.png")) {
        return `${this.baseUrl}/uploads/manga/${substringAfterLast(mangaUrl, "/")}/cover/cover_250x350.jpg`;
      }
      return url;
    }
    imgAttr(element) {
      if (element.hasAttr("data-background-image")) return element.absUrl("data-background-image");
      if (element.hasAttr("data-cfsrc")) return element.absUrl("data-cfsrc");
      if (element.hasAttr("data-lazy-src")) return element.absUrl("data-lazy-src");
      if (element.hasAttr("data-src")) return element.absUrl("data-src");
      return element.absUrl("src");
    }
    imgAttrOrNull(element) {
      return element ? this.imgAttr(element) : null;
    }
    /**
     * Upstream removes `removeSelectors` and prepends a "\n" marker to every `p` and `br` in place,
     * then takes the text. The SDK's elements are read-only, so this does the same on the HTML.
     */
    textWithNewlines(elements, removeSelectors = []) {
      const html = elements.map((element) => {
        let markup = element.outerHtml();
        for (const tag of removeSelectors) {
          markup = markup.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "gi"), "");
        }
        return markup.replace(/<p\b([^>]*)>/gi, "<p$1>\\n").replace(/<br\b[^>]*>/gi, "\\n<br>");
      }).join("");
      return parseHtml(html).select("body > *").text().replaceAll("\\n", "\n").replaceAll("\n ", "\n");
    }
  };

  // src/en/readcomicsonline/index.ts
  var ReadComicsOnline = class extends MMRCMS {
    constructor() {
      super(...arguments);
      this.name = "Read Comics Online";
      this.lang = "en";
      this.baseUrl = "https://readcomicsonline.ru";
    }
    get itemPath() {
      return "comic";
    }
    get chapterString() {
      return "";
    }
    get fetchFilterOptions() {
      return false;
    }
    get detailsTitleSelector() {
      return "h1.text-2xl";
    }
    /** Upstream: `DateTimeFormatter.ofPattern("d MMM yyyy", Locale.US)`. */
    get dateFormat() {
      return "d MMM yyyy";
    }
    popularMangaUrl(page) {
      return `${this.baseUrl}/comic-list?sort=views&page=${page}`;
    }
    popularMangaSelector() {
      return "div.comic-list-layout .grid > .group";
    }
    popularMangaFromElement(element) {
      const manga = SManga.create();
      const anchor = element.selectFirst("a.block.text-sm.font-semibold");
      manga.setUrlWithoutDomain(anchor.absUrl("href"));
      manga.title = anchor.text();
      manga.thumbnail_url = this.guessCover(manga.url, element.selectFirst("img")?.attr("src"));
      return manga;
    }
    popularMangaNextPageSelector() {
      return "nav a[rel=next]";
    }
    latestUpdatesUrl(page) {
      return `${this.baseUrl}/comic-list?sort=latest&page=${page}`;
    }
    latestUpdatesSelector() {
      return this.popularMangaSelector();
    }
    searchMangaSelector() {
      return "div a:has(img)";
    }
    async getSearchMangaList(page, query, filters) {
      const resDoc = (await this.client.get(this.searchMangaUrl(page, query, filters), Fetch.DOCUMENT)).asJsoup();
      const mangas = resDoc.select(this.searchMangaSelector()).map((element) => {
        const manga = SManga.create();
        manga.setUrlWithoutDomain(element.absUrl("href"));
        manga.title = element.selectFirst("p").text();
        manga.thumbnail_url = element.selectFirst("img").absUrl("src");
        return manga;
      });
      const hasNextPage = resDoc.selectFirst("span a[rel=next]") !== null;
      return new MangasPage([...mangas], hasNextPage);
    }
    searchMangaUrl(page, query, filters) {
      const builder = toHttpUrl(this.baseUrl).newBuilder();
      builder.addPathSegment("advanced-search");
      builder.addQueryParameter("name", query);
      builder.addQueryParameter("page", String(page));
      for (const filter of filters) {
        if (isUriFilter(filter)) filter.addToUri(builder);
      }
      return builder.build().toString();
    }
    mangaDetailsParse(document) {
      const manga = SManga.create();
      manga.title = document.selectFirst("h1.text-2xl")?.text() ?? "";
      manga.thumbnail_url = this.guessCover(
        document.location(),
        this.imgAttrOrNull(document.selectFirst("img.w-full.rounded-xl"))
      );
      manga.description = document.selectFirst("div:has(> div > h3:contains(Synopsis)) > div > p")?.text() ?? null;
      const status = document.selectFirst("div.flex.flex-wrap.gap-2 span.rounded-full");
      if (status) manga.status = this.parseDetailStatus(status.text());
      manga.genre = document.select("dl div:contains(Genres:) a").map((it) => it.text()).join(", ");
      manga.author = document.select("div:has(span:contains(Author:)) > a").map((it) => it.text()).join(", ");
      return manga;
    }
    chapterListSelector() {
      return ".overflow-hidden.border-ink-600 > a";
    }
    chapterFromElement(element, mangaTitle) {
      const chapter = SChapter.create();
      chapter.setUrlWithoutDomain(element.absUrl("href"));
      const chapterName = element.selectFirst(".text-brand-400")?.text() ?? element.text();
      chapter.name = this.cleanChapterName(mangaTitle, chapterName);
      chapter.date_upload = this.tryParseDate(element.selectFirst(".text-slate-500")?.text());
      return chapter;
    }
    pageListParse(document) {
      return document.select("#reader-all img").map((img, i) => new Page(i, "", this.imgAttr(img)));
    }
  };
  var index_default = defineExtension([new ReadComicsOnline()]);
  return __toCommonJS(index_exports);
})();
