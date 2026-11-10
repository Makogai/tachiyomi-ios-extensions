import { host } from "./host.js";
import { type Document, parseHtml } from "./html.js";
import { canonicalize, HttpUrl } from "./url.js";

export type Headers = Record<string, string>;

/**
 * How a browser would make the request. The app adds that browser's headers (Safari's: `Accept`,
 * `Sec-Fetch-*`, `Priority`, …). Mirrors keiyoushi's `Fetch`.
 */
export class Fetch {
  private constructor(
    readonly kind: "document" | "xhr" | "image",
    readonly initiator: string | null,
  ) {}

  static readonly DOCUMENT = new Fetch("document", null);
  static readonly XHR = new Fetch("xhr", null);
  static readonly IMAGE = new Fetch("image", null);

  /** The same request, made from the page at `url`. */
  from(url: string | HttpUrl): Fetch {
    return new Fetch(this.kind, url.toString());
  }
}

/** `application/x-www-form-urlencoded` body, encoded as OkHttp's `FormBody`. */
export class FormBody {
  private readonly pairs: [string, string][] = [];

  add(name: string, value: string): this {
    this.pairs.push([name, value]);
    return this;
  }

  build(): RequestBody {
    const formSet = " \"':;<=>@[]^`{}|/\\?#&!$(),~";
    const encode = (text: string) =>
      canonicalize(text, formSet, { plusIsSpace: true }).replace(/%20/g, "+");
    return {
      content: this.pairs.map(([name, value]) => `${encode(name)}=${encode(value)}`).join("&"),
      contentType: "application/x-www-form-urlencoded",
    };
  }
}

export interface RequestBody {
  content: string;
  contentType: string;
}

export function jsonBody(value: unknown): RequestBody {
  return { content: JSON.stringify(value), contentType: "application/json; charset=utf-8" };
}

export interface RequestOptions {
  headers?: Headers;
  fetch?: Fetch;
  /** Throw on a status outside 200–299 (default `true`, as upstream). */
  ensureSuccess?: boolean;
  /** `"base64"` returns binary bodies as Base64 text. */
  responseType?: "text" | "base64";
}

export class Response {
  constructor(
    /** HTTP status code. */
    readonly code: number,
    /** Final URL, after redirects. */
    readonly url: string,
    private readonly headerMap: Headers,
    /** The body as text (or Base64 when requested). */
    readonly body: string,
  ) {}

  get isSuccessful(): boolean {
    return this.code >= 200 && this.code < 300;
  }

  header(name: string): string | null {
    return this.headerMap[name.toLowerCase()] ?? null;
  }

  /** Parses the body as HTML; relative links resolve against the final URL. */
  asJsoup(): Document {
    return parseHtml(this.body, this.url);
  }

  parseAs<T>(): T {
    return JSON.parse(this.body) as T;
  }
}

export class HttpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HttpError";
  }
}

/** What a source's client applies to each request; filled by `configureClient`. */
export interface RateLimitRule {
  permits: number;
  periodMs: number;
  intervalMs: number;
  shouldLimit: (url: HttpUrl) => boolean;
}

export interface CookieRule {
  domain: () => string;
  cookies: () => [string, string][];
}

/** Collects a source's client configuration. Mirrors `OkHttpClient.Builder` with keiyoushi's helpers. */
export class ClientBuilder {
  readonly rateLimits: RateLimitRule[] = [];
  readonly cookieRules: CookieRule[] = [];

  /**
   * At most `permits` requests per `periodMs`, at least `intervalMs` apart, for URLs where
   * `shouldLimit` is true. The first matching rule applies, so add specific rules first.
   */
  rateLimit(permits: number, periodMs = 1000, shouldLimit: (url: HttpUrl) => boolean = () => true, intervalMs = 0): this {
    this.rateLimits.push({ permits, periodMs, intervalMs, shouldLimit });
    return this;
  }

  /** Cookies sent with every request to `domain` (or its subdomains), overriding stored ones. */
  addCookie(domain: string | (() => string), cookies: [string, string][] | (() => [string, string][])): this {
    this.cookieRules.push({
      domain: typeof domain === "string" ? () => domain : domain,
      cookies: typeof cookies === "function" ? cookies : () => cookies,
    });
    return this;
  }

  rateLimitFor(url: string): number | null {
    const parsed = HttpUrl.parse(url);
    if (!parsed) return null;
    const index = this.rateLimits.findIndex((rule) => rule.shouldLimit(parsed));
    return index < 0 ? null : index;
  }

  cookiesFor(url: string): [string, string][] {
    const parsed = HttpUrl.parse(url);
    if (!parsed) return [];
    for (const rule of this.cookieRules) {
      const domain = rule.domain();
      if (parsed.host === domain || parsed.host.endsWith(`.${domain}`)) return rule.cookies();
    }
    return [];
  }
}

interface ResponsePayload {
  status: number;
  url: string;
  headers: Headers;
  body: string;
}

/** A source's HTTP client. Requests go through the app, which handles cookies and rate limits. */
export class HttpClient {
  constructor(
    private readonly sourceIndex: () => number,
    private readonly builder: ClientBuilder,
    private readonly defaultHeaders: () => Headers,
  ) {}

  get(url: string | HttpUrl, options?: RequestOptions | Fetch): Promise<Response> {
    return this.request("GET", url, null, options);
  }

  post(url: string | HttpUrl, body: RequestBody | null, options?: RequestOptions | Fetch): Promise<Response> {
    return this.request("POST", url, body, options);
  }

  request(
    method: string,
    url: string | HttpUrl,
    body: RequestBody | null,
    options: RequestOptions | Fetch = {},
  ): Promise<Response> {
    const opts: RequestOptions = options instanceof Fetch ? { fetch: options } : options;
    const target = url.toString();
    const headers: Headers = { ...this.defaultHeaders(), ...(opts.headers ?? {}) };
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
      responseType: opts.responseType ?? "text",
    };
    return new Promise((resolve, reject) => {
      host().http(JSON.stringify(payload), (error, json) => {
        if (error !== null || json === null) {
          reject(new HttpError(error ?? "No response"));
          return;
        }
        const response = JSON.parse(json) as ResponsePayload;
        resolve(new Response(response.status, response.url, response.headers, response.body));
      });
    });
  }
}
