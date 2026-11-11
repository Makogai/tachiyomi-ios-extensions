// Comick (Unoriginal) 1 for tachiyomi-ios. Ported from keiyoushi/extensions-source (Apache-2.0).
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

  // src/all/comicklive/index.ts
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

  // src/all/comicklive/dto.ts
  function browseComicToSManga(comic) {
    const manga = SManga.create();
    manga.url = comic.slug;
    manga.title = comic.title;
    manga.thumbnail_url = comic.default_thumbnail;
    return manga;
  }
  function comicTitles(data) {
    const titles = data.md_titles;
    return Array.isArray(titles) ? titles : Object.values(titles ?? {});
  }

  // src/all/comicklive/filters.ts
  var SelectFilter = class extends Select {
    constructor(name, options) {
      super(
        name,
        options.map((option) => option[0])
      );
      this.options = options;
    }
    get selected() {
      const value = this.options[this.state]?.[1] ?? "";
      return value !== "" ? value : null;
    }
  };
  var CheckBoxFilter = class extends CheckBox {
    constructor(name, value) {
      super(name);
      this.value = value;
    }
  };
  var CheckBoxGroup = class extends Group {
    constructor(name, options) {
      super(
        name,
        options.map(([title, value]) => new CheckBoxFilter(title, value))
      );
    }
    get checked() {
      return this.state.filter((it) => it.state).map((it) => it.value);
    }
  };
  var TriStateFilter = class extends TriState {
    constructor(name, slug) {
      super(name);
      this.slug = slug;
    }
  };
  var TriStateGroupFilter = class extends Group {
    constructor(name, options) {
      super(
        name,
        options.map(([title, slug]) => new TriStateFilter(title, slug))
      );
    }
    get included() {
      return this.state.filter((it) => it.isIncluded()).map((it) => it.slug);
    }
    get excluded() {
      return this.state.filter((it) => it.isExcluded()).map((it) => it.slug);
    }
  };
  var getSortsList = [
    ["Latest", "created_at"],
    ["Popular", "user_follow_count"],
    ["Highest Rating", "rating"],
    ["Last Uploaded", "uploaded"]
  ];
  var SortFilter = class extends Sort {
    constructor() {
      super(
        "Sort",
        getSortsList.map((it) => it[0]),
        { index: 0, ascending: false }
      );
    }
    get selected() {
      const value = this.state !== null ? getSortsList[this.state.index]?.[1] : void 0;
      return value !== void 0 && value !== "" ? value : null;
    }
  };
  var byName = (a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  var GenreFilter = class extends TriStateGroupFilter {
    constructor(genres) {
      super(
        "Genre",
        [...genres].sort(byName).map((it) => [it.name, it.slug])
      );
    }
  };
  var TagFilter = class extends TriStateGroupFilter {
    constructor(letter, tags) {
      super(
        letter,
        [...tags].sort(byName).map((it) => [it.name, it.slug])
      );
    }
  };
  var TagFilters = class extends Group {
    constructor(tags) {
      const groups = /* @__PURE__ */ new Map();
      for (const tag of [...tags].sort(byName)) {
        const c = tag.name.charAt(0).toUpperCase();
        const key = c === "" || c < "A" || c > "Z" ? "#" : c;
        const list = groups.get(key) ?? [];
        list.push(tag);
        groups.set(key, list);
      }
      super(
        "Tags",
        [...groups].map(([letter, tagsChunk]) => new TagFilter(letter, tagsChunk))
      );
    }
  };
  var TagFilterText = class extends Text {
    constructor() {
      super("Tags");
    }
  };
  var DemographicFilter = class extends CheckBoxGroup {
    constructor() {
      super("Demographic", [
        ["Shounen", "1"],
        ["Josei", "2"],
        ["Seinen", "3"],
        ["Shoujo", "4"],
        ["None", "0"]
      ]);
    }
  };
  var CreatedAtFilter = class extends SelectFilter {
    constructor() {
      super("Created At", [
        ["", ""],
        ["3 days ago", "3"],
        ["7 days ago", "7"],
        ["30 days ago", "30"],
        ["3 months ago", "90"],
        ["6 months ago", "180"],
        ["1 year ago", "365"],
        ["2 years ago", "730"]
      ]);
    }
  };
  var TypeFilter = class extends CheckBoxGroup {
    constructor() {
      super("Type", [
        ["Manga", "jp"],
        ["Manhwa", "kr"],
        ["Manhua", "cn"],
        ["Others", "others"]
      ]);
    }
  };
  var MinimumChaptersFilter = class extends Text {
    constructor() {
      super("Minimum Chapters");
    }
  };
  var StatusFilter = class extends SelectFilter {
    constructor() {
      super("Status", [
        ["", ""],
        ["Ongoing", "1"],
        ["Completed", "2"],
        ["Cancelled", "3"],
        ["Hiatus", "4"]
      ]);
    }
  };
  var ContentRatingFilter = class extends SelectFilter {
    constructor() {
      super("Content Rating", [
        ["", ""],
        ["Safe", "safe"],
        ["Suggestive", "suggestive"],
        ["Erotica", "erotica"]
      ]);
    }
  };
  function releaseYears() {
    const options = [["", ""]];
    for (let year = (/* @__PURE__ */ new Date()).getFullYear(); year >= 1990; year--) options.push([`${year}`, `${year}`]);
    options.push(["Before 1990", "0"]);
    return options;
  }
  var ReleaseFrom = class extends SelectFilter {
    constructor() {
      super("Release From", releaseYears());
    }
  };
  var ReleaseTo = class extends SelectFilter {
    constructor() {
      super("Release To", releaseYears());
    }
  };

  // src/all/comicklive/index.ts
  var MIRRORS = ["https://comick.live", "https://comick.art"];
  var PREF_MIRROR = "preferred_mirror";
  var LANGUAGE_WHITELIST = "language_whitelist";
  var LANGUAGES = [
    ["English", "en"],
    ["Russian", "ru"],
    ["Vietnamese", "vi"],
    ["French", "fr"],
    ["Polish", "pl"],
    ["Indonesian", "id"],
    ["Turkish", "tr"],
    ["Italian", "it"],
    ["Spanish", "es"],
    ["Ukrainian", "uk"],
    ["German", "de"],
    ["Korean", "ko"],
    ["Thai", "th"],
    ["Romanian", "ro"],
    ["Malay", "ms"],
    ["Japanese", "ja"],
    ["Swedish", "sv"],
    ["Norwegian", "no"]
  ];
  var FILTER_DATA_KEY = "filter_data_cache";
  function firstInstance(filters, type) {
    const found = firstInstanceOrNull(filters, type);
    if (found === null) throw new Error(`No filter of type ${type.name}`);
    return found;
  }
  function firstInstanceOrNull(filters, type) {
    return filters.find((filter) => filter instanceof type) ?? null;
  }
  var Comick = class extends KeiSource {
    constructor() {
      super(...arguments);
      this.name = "Comick (Unoriginal)";
      this.lang = "all";
      this.id = "4972933717624256217";
      this.latestNextCursor = null;
      this.searchNextCursor = null;
      this.spaceSlashRegex = /[ /]/g;
      this.filterFetchStarted = false;
    }
    get baseUrl() {
      const index = Number.parseInt(this.preferences.getString(PREF_MIRROR, "0"), 10);
      return MIRRORS[Number.isNaN(index) ? 0 : Math.min(Math.max(index, 0), MIRRORS.length - 1)];
    }
    configureClient(builder) {
      builder.rateLimit(2, 1e3, (url) => !url.pathSegments.includes("covers"));
    }
    /**
     * `client.get` with upstream's interceptor: on HTTP 429, retry up to 10 times. Upstream sleeps
     * 500 ms between tries; scripts have no timers, so the retries go through the rate limit instead.
     */
    async get(url, fetch) {
      let response = await this.client.get(url, { fetch, ensureSuccess: false });
      let retries = 0;
      while (response.code === 429 && retries++ < 10) {
        response = await this.client.get(url, { fetch, ensureSuccess: false });
      }
      if (!response.isSuccessful) throw new HttpError(`HTTP error ${response.code}`);
      return response;
    }
    async getPopularManga(page) {
      const days = page === 1 || page === 4 ? 7 : page === 2 || page === 5 ? 30 : page === 3 || page === 6 ? 90 : null;
      const type = page >= 1 && page <= 3 ? "follow" : page >= 4 && page <= 6 ? "most_follow_new" : null;
      if (days === null || type === null) throw new Error("UnsupportedOperationException");
      const url = toHttpUrl(`${this.baseUrl}/api/comics/top`).newBuilder().addQueryParameter("day", String(days)).addQueryParameter("type", type).build();
      const [, response] = await Promise.all([this.ensureFilterData(), this.get(url, Fetch.XHR)]);
      const data = response.parseAs();
      return new MangasPage(data.data.map(browseComicToSManga), page < 6);
    }
    async getLatestUpdates(page) {
      if (page === 1) this.latestNextCursor = null;
      const url = toHttpUrl(`${this.baseUrl}/api/chapters/latest`).newBuilder();
      url.addQueryParameter("order", "new");
      url.addQueryParameter("page", String(page));
      if (page > 1) url.addQueryParameter("cursor", this.latestNextCursor);
      const [, response] = await Promise.all([this.ensureFilterData(), this.get(url.build(), Fetch.XHR)]);
      const data = response.parseAs();
      this.latestNextCursor = data.next_cursor ?? null;
      return new MangasPage(data.data.map(browseComicToSManga), data.next_cursor != null);
    }
    async getMangaByUrl(url) {
      return this.parseDetails(await this.get(url, Fetch.DOCUMENT));
    }
    async getSearchMangaList(page, query, filters) {
      if (page === 1) this.searchNextCursor = null;
      const url = toHttpUrl(`${this.baseUrl}/api/search`).newBuilder();
      const sort = firstInstance(filters, SortFilter);
      url.addQueryParameter("order_by", sort.selected);
      url.addQueryParameter("order_direction", sort.state.ascending ? "asc" : "desc");
      const genre = firstInstanceOrNull(filters, GenreFilter);
      if (genre !== null) {
        for (const it of genre.included) url.addQueryParameter("genres", it);
        for (const it of genre.excluded) url.addQueryParameter("excludes", it);
      }
      const text = firstInstanceOrNull(filters, TagFilterText);
      if (text !== null) {
        for (const it of text.state.split(",").filter((s) => s.trim() !== "")) {
          const value = it.trim().toLowerCase().replace(this.spaceSlashRegex, "-");
          url.addQueryParameter(value.startsWith("-") ? "excluded_tags" : "tags", value.replace("-", ""));
        }
      }
      const tags = firstInstanceOrNull(filters, TagFilters);
      if (tags !== null) {
        for (const letter of tags.state) {
          for (const it of letter.included) url.addQueryParameter("tags", it);
          for (const it of letter.excluded) url.addQueryParameter("excluded_tags", it);
        }
      }
      for (const it of firstInstance(filters, DemographicFilter).checked) url.addQueryParameter("demographic", it);
      const time = firstInstance(filters, CreatedAtFilter).selected;
      if (time !== null) url.addQueryParameter("time", time);
      for (const it of firstInstance(filters, TypeFilter).checked) url.addQueryParameter("country", it);
      const minimum = firstInstance(filters, MinimumChaptersFilter).state;
      if (minimum.trim() !== "") {
        if (!/^[+-]?\d+$/.test(minimum) || Math.abs(Number(minimum)) > 2147483647) {
          throw new Error(`Invalid minimum chapters value: ${minimum}`);
        }
        url.addQueryParameter("minimum", minimum);
      }
      const status = firstInstance(filters, StatusFilter).selected;
      if (status !== null) url.addQueryParameter("status", status);
      const from = firstInstance(filters, ReleaseFrom).selected;
      if (from !== null) url.addQueryParameter("from", from);
      const to = firstInstance(filters, ReleaseTo).selected;
      if (to !== null) url.addQueryParameter("to", to);
      const contentRating = firstInstance(filters, ContentRatingFilter).selected;
      if (contentRating !== null) url.addQueryParameter("content_rating", contentRating);
      url.addQueryParameter("showAll", "false");
      url.addQueryParameter("exclude_mylist", "false");
      if (query.trim() !== "") {
        if (query.trim().length < 3) {
          throw new Error("Query must be at least 3 characters");
        }
        url.addQueryParameter("q", query.trim());
      }
      url.addQueryParameter("type", "comic");
      if (page > 1) {
        url.addQueryParameter("cursor", this.searchNextCursor);
      }
      const data = (await this.get(url.build(), Fetch.XHR)).parseAs();
      this.searchNextCursor = data.next_cursor ?? null;
      return new MangasPage(data.data.map(browseComicToSManga), data.next_cursor != null);
    }
    getMangaUrl(manga) {
      return `${this.baseUrl}/comic/${manga.url}`;
    }
    async fetchMangaUpdate(manga, chapters, fetchDetails, fetchChapters) {
      const [details, chapterList] = await Promise.all([
        fetchDetails ? this.get(this.getMangaUrl(manga), Fetch.DOCUMENT).then((r) => this.parseDetails(r)) : manga,
        fetchChapters ? this.getChapterList(manga) : chapters
      ]);
      return new SMangaUpdate(details, chapterList);
    }
    parseDetails(response) {
      const data = JSON.parse(response.asJsoup().selectFirst("#comic-data").data());
      const manga = SManga.create();
      manga.title = data.title;
      manga.url = data.slug;
      manga.thumbnail_url = data.default_thumbnail;
      switch (data.status) {
        case 1:
          manga.status = SManga.ONGOING;
          break;
        case 2:
          manga.status = data.translation_completed ? SManga.COMPLETED : SManga.PUBLISHING_FINISHED;
          break;
        case 3:
          manga.status = SManga.CANCELLED;
          break;
        case 4:
          manga.status = SManga.ON_HIATUS;
          break;
        default:
          manga.status = SManga.UNKNOWN;
      }
      manga.author = data.authors.map((it) => it.name).join(", ");
      manga.artist = data.artists.map((it) => it.name).join(", ");
      let description = (parseHtml(`<body>${data.desc}</body>`).selectFirst("body")?.wholeText() ?? "").replace(/\s+/g, " ").replace(/(?<=[^.]{12})(?<!\bMr|\bMs|\bMrs|\bDr|\bProf|\bSr|\bJr|\bVol|\bCh)\.\s+/g, ".\n\n").replace(/(?<=[^:]{12})(?<!\b[a-zA-Z]{1,10}):\s+/g, ":\n\n").trim();
      const titles = comicTitles(data);
      if (titles.length > 0) {
        description += "\n\n Alternative Titles: \n";
        for (const it of titles) description += `- ${it.title.trim()}
`;
      }
      manga.description = description.trim();
      const genres = [];
      switch (data.country) {
        case "jp":
          genres.push("Manga");
          break;
        case "cn":
          genres.push("Manhua");
          break;
        case "ko":
          genres.push("Manhwa");
          break;
      }
      switch (data.content_rating) {
        case "suggestive":
          genres.push("Content Rating: Suggestive");
          break;
        case "erotica":
          genres.push("Content Rating: Erotica");
          break;
      }
      genres.push(...data.md_comic_md_genres.map((it) => it.md_genres.name));
      manga.genre = genres.join(", ");
      return manga;
    }
    async getChapterList(manga) {
      const whitelist = this.languageWhitelist;
      const langParam = whitelist.size === 1 ? `?lang=${[...whitelist][0]}` : "";
      const url = `${this.baseUrl}/api/comics/${manga.url}/chapter-list${langParam}`;
      const data = (await this.get(url, Fetch.XHR)).parseAs();
      const chapters = [...data.data];
      const pages = [];
      for (let page = 2; page <= data.pagination.last_page; page++) {
        const pageUrl = toHttpUrl(url).newBuilder().addQueryParameter("page", String(page)).build();
        pages.push(this.get(pageUrl, Fetch.XHR).then((response) => response.parseAs().data));
      }
      for (const pageData of await Promise.all(pages)) chapters.push(...pageData);
      return chapters.filter((it) => whitelist.size === 0 || whitelist.has(it.lang)).map((it) => {
        const chapter = SChapter.create();
        chapter.url = `/comic/${manga.url}/${it.hid}-chapter-${it.chap}-${it.lang}`;
        let name = "";
        if (it.vol != null && it.vol.trim() !== "") name += `Vol. ${it.vol} `;
        name += `Ch. ${it.chap}`;
        if (it.title != null && it.title.trim() !== "") name += `: ${it.title}`;
        chapter.name = name;
        chapter.date_upload = parseIsoDate(it.created_at);
        chapter.scanlator = it.group_name.join(", ");
        return chapter;
      });
    }
    async getPageList(chapter) {
      const document = (await this.get(this.getChapterUrl(chapter), Fetch.DOCUMENT)).asJsoup();
      const data = JSON.parse(document.selectFirst("#sv-data").data());
      return data.chapter.images.map((image, index) => new Page(index, "", image.url));
    }
    // Filters
    async fetchFilterData() {
      const metadata = (await this.get(`${this.baseUrl}/api/metadata`, Fetch.XHR)).parseAs();
      const names = (list) => (list ?? []).map(({ name, slug }) => ({ name, slug }));
      return { genres: names(metadata.genres), tags: names(metadata.tags) };
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
      const filters = [new SortFilter(), new DemographicFilter(), new TypeFilter()];
      const metadata = this.filterData;
      if (metadata?.genres && metadata.genres.length > 0) filters.push(new GenreFilter(metadata.genres));
      if (metadata?.tags && metadata.tags.length > 0) filters.push(new TagFilters(metadata.tags));
      filters.push(
        new Separator(),
        new Header("Separate tags with commas (,)"),
        new Header("Prepend with dash (-) to exclude"),
        new TagFilterText(),
        new Separator(),
        new CreatedAtFilter(),
        new MinimumChaptersFilter(),
        new StatusFilter(),
        new ContentRatingFilter(),
        new ReleaseFrom(),
        new ReleaseTo()
      );
      return filters;
    }
    // Settings
    get languageWhitelist() {
      return this.preferences.getStringSet(LANGUAGE_WHITELIST, ["en"]);
    }
    setupPreferenceScreen(screen) {
      screen.addPreference(
        new ListPreference({
          key: PREF_MIRROR,
          title: "Preferred Mirror",
          entries: MIRRORS.map((url) => toHttpUrl(url).host),
          entryValues: MIRRORS.map((_, index) => String(index)),
          defaultValue: "0"
        })
      );
      screen.addPreference(
        new MultiSelectListPreference({
          key: LANGUAGE_WHITELIST,
          title: "Chapter Languages",
          summary: "Leave empty for All",
          entries: LANGUAGES.map((it) => it[0]),
          entryValues: LANGUAGES.map((it) => it[1]),
          defaultValue: ["en"]
        })
      );
    }
  };
  var index_default = defineExtension([new Comick()]);
  return __toCommonJS(index_exports);
})();
