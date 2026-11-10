/**
 * A small OkHttp `HttpUrl`, so ported URL building produces the same strings as upstream.
 * JavaScriptCore has no `URL` class, and its encoding rules differ from OkHttp's anyway.
 */

// Encode sets from OkHttp's HttpUrl.
const QUERY_COMPONENT_ENCODE_SET = " !\"#$&'(),/:;<=>?@[]\\^`{|}~";
const QUERY_COMPONENT_REENCODE_SET = " \"'<>#&=";
const PATH_SEGMENT_ENCODE_SET = " \"<>^`{}|/\\?#";
const FRAGMENT_ENCODE_SET = "";

function hex(byte: number): string {
  return "%" + byte.toString(16).toUpperCase().padStart(2, "0");
}

function utf8(codePoint: number): number[] {
  if (codePoint < 0x80) return [codePoint];
  if (codePoint < 0x800) return [0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f)];
  if (codePoint < 0x10000) {
    return [0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f)];
  }
  return [
    0xf0 | (codePoint >> 18),
    0x80 | ((codePoint >> 12) & 0x3f),
    0x80 | ((codePoint >> 6) & 0x3f),
    0x80 | (codePoint & 0x3f),
  ];
}

/** OkHttp's `canonicalize`. */
export function canonicalize(
  input: string,
  encodeSet: string,
  options: { alreadyEncoded?: boolean; plusIsSpace?: boolean } = {},
): string {
  const { alreadyEncoded = false, plusIsSpace = false } = options;
  let out = "";
  for (let i = 0; i < input.length; ) {
    const codePoint = input.codePointAt(i)!;
    const char = String.fromCodePoint(codePoint);
    i += char.length;
    if (alreadyEncoded && (codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0c || codePoint === 0x0d)) {
      continue;
    }
    if (codePoint === 0x2b && plusIsSpace) {
      out += alreadyEncoded ? "+" : "%2B";
    } else if (
      codePoint < 0x20 ||
      codePoint === 0x7f ||
      codePoint >= 0x80 ||
      encodeSet.includes(char) ||
      (codePoint === 0x25 && (!alreadyEncoded || !/^%[0-9a-fA-F]{2}/.test(input.slice(i - 1, i + 2))))
    ) {
      out += utf8(codePoint).map(hex).join("");
    } else {
      out += char;
    }
  }
  return out;
}

function percentDecode(input: string): string {
  try {
    return decodeURIComponent(input.replace(/\+/g, "%2B"));
  } catch {
    return input;
  }
}

/** [name, value] with both already encoded; a null value means `name` without `=`. */
type QueryPair = [string, string | null];

export class HttpUrl {
  private constructor(
    readonly scheme: string,
    readonly host: string,
    readonly port: number | null,
    /** Encoded segments; an empty path is `[""]`, as in OkHttp. */
    private readonly encodedSegments: string[],
    private readonly query: QueryPair[] | null,
    readonly fragment: string | null,
  ) {}

  /** Parses an absolute http(s) URL, or returns null. */
  static parse(url: string): HttpUrl | null {
    const match = /^(https?):\/\/([^/?#:]+)(?::(\d+))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/i.exec(url.trim());
    if (!match) return null;
    const [, scheme, host, port, path, query, fragment] = match;
    const segments = (path || "/").replace(/^\//, "").split("/");
    const pairs: QueryPair[] | null =
      query === undefined
        ? null
        : query === ""
          ? []
          : query.split("&").map((part): QueryPair => {
              const index = part.indexOf("=");
              return index < 0 ? [part, null] : [part.slice(0, index), part.slice(index + 1)];
            });
    return new HttpUrl(
      scheme.toLowerCase(),
      host.toLowerCase(),
      port ? Number(port) : null,
      segments,
      pairs,
      fragment === undefined ? null : percentDecode(fragment),
    );
  }

  static get(url: string): HttpUrl {
    const parsed = HttpUrl.parse(url);
    if (!parsed) throw new Error(`Invalid URL: ${url}`);
    return parsed;
  }

  get encodedPath(): string {
    return "/" + this.encodedSegments.join("/");
  }

  get pathSegments(): string[] {
    return this.encodedSegments.map(percentDecode);
  }

  get encodedQuery(): string | null {
    if (this.query === null) return null;
    return this.query.map(([name, value]) => (value === null ? name : `${name}=${value}`)).join("&");
  }

  queryParameter(name: string): string | null {
    const pair = this.query?.find(([key]) => percentDecode(key) === name);
    return pair?.[1] == null ? null : percentDecode(pair[1]);
  }

  newBuilder(): HttpUrlBuilder {
    return new HttpUrlBuilder(
      this.scheme,
      this.host,
      this.port,
      [...this.encodedSegments],
      this.query ? this.query.map(([name, value]): QueryPair => [name, value]) : null,
      this.fragment,
    );
  }

  /** Resolves `link` against this URL, as a browser does for an `href`. */
  resolve(link: string): HttpUrl | null {
    if (/^[a-z][a-z0-9+.-]*:/i.test(link)) return HttpUrl.parse(link);
    if (link.startsWith("//")) return HttpUrl.parse(`${this.scheme}:${link}`);
    const origin = `${this.scheme}://${this.host}${this.port ? `:${this.port}` : ""}`;
    if (link.startsWith("/")) return HttpUrl.parse(origin + link);
    if (link.startsWith("?")) return HttpUrl.parse(origin + this.encodedPath + link);
    const base = this.encodedPath.replace(/[^/]*$/, "");
    return HttpUrl.parse(origin + base + link);
  }

  toString(): string {
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

  toJSON(): string {
    return this.toString();
  }
}

export class HttpUrlBuilder {
  constructor(
    private scheme: string,
    private host: string,
    private port: number | null,
    private segments: string[],
    private query: QueryPair[] | null,
    private fragmentValue: string | null,
  ) {}

  addQueryParameter(name: string, value: string | null): this {
    (this.query ??= []).push([
      canonicalize(name, QUERY_COMPONENT_ENCODE_SET, { plusIsSpace: true }),
      value === null ? null : canonicalize(value, QUERY_COMPONENT_ENCODE_SET, { plusIsSpace: true }),
    ]);
    return this;
  }

  addEncodedQueryParameter(name: string, value: string | null): this {
    (this.query ??= []).push([
      canonicalize(name, QUERY_COMPONENT_REENCODE_SET, { alreadyEncoded: true, plusIsSpace: true }),
      value === null
        ? null
        : canonicalize(value, QUERY_COMPONENT_REENCODE_SET, { alreadyEncoded: true, plusIsSpace: true }),
    ]);
    return this;
  }

  setQueryParameter(name: string, value: string | null): this {
    this.removeAllQueryParameters(name);
    return this.addQueryParameter(name, value);
  }

  removeAllQueryParameters(name: string): this {
    const encoded = canonicalize(name, QUERY_COMPONENT_ENCODE_SET, { plusIsSpace: true });
    if (this.query) this.query = this.query.filter(([key]) => key !== encoded);
    return this;
  }

  addPathSegment(segment: string): this {
    return this.pushSegment(canonicalize(segment, PATH_SEGMENT_ENCODE_SET));
  }

  /** Adds `/`-separated segments, encoding each. */
  addPathSegments(segments: string): this {
    for (const segment of segments.split("/")) this.addPathSegment(segment);
    return this;
  }

  private pushSegment(encoded: string): this {
    if (this.segments.length === 1 && this.segments[0] === "") {
      this.segments[0] = encoded;
    } else if (this.segments[this.segments.length - 1] === "") {
      this.segments[this.segments.length - 1] = encoded;
    } else {
      this.segments.push(encoded);
    }
    return this;
  }

  fragment(fragment: string | null): this {
    this.fragmentValue = fragment;
    return this;
  }

  build(): HttpUrl {
    const port = this.port === null ? "" : `:${this.port}`;
    const query = this.query === null ? "" : "?" + this.query.map(([n, v]) => (v === null ? n : `${n}=${v}`)).join("&");
    const fragment = this.fragmentValue === null ? "" : `#${this.fragmentValue}`;
    return HttpUrl.get(`${this.scheme}://${this.host}${port}/${this.segments.join("/")}${query}${fragment}`);
  }
}

/** `"…".toHttpUrl()` */
export function toHttpUrl(url: string): HttpUrl {
  return HttpUrl.get(url);
}

/** `"…".toHttpUrlOrNull()` */
export function toHttpUrlOrNull(url: string): HttpUrl | null {
  return HttpUrl.parse(url);
}
