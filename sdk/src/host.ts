/**
 * The functions the app defines as `__host` before an extension runs (host API level 1).
 * Implemented in the app by `ExtensionContext.installHostAPI()`. Source code should not use
 * these directly; the SDK wraps them.
 */
export interface HostElement {
  select(css: string): HostElement[];
  selectFirst(css: string): HostElement | null;
  text(): string;
  ownText(): string;
  wholeText(): string;
  html(): string;
  outerHtml(): string;
  attr(name: string): string;
  hasAttr(name: string): boolean;
  absUrl(name: string): string;
  tagName(): string;
  id(): string;
  hasClass(name: string): boolean;
  data(): string;
  val(): string;
  parent(): HostElement | null;
  children(): HostElement[];
  nextElementSibling(): HostElement | null;
  previousElementSibling(): HostElement | null;
  location(): string;
}

export interface Host {
  readonly apiLevel: number;
  /** Sends a request. `callback(error, responseJSON)` runs exactly once. */
  http(payloadJSON: string, callback: (error: string | null, response: string | null) => void): void;
  parseHtml(html: string, baseUri: string): HostElement;
  /** JSON of the stored value, or null when unset. */
  prefGet(source: number, key: string): string | null;
  prefSet(source: number, key: string, valueJSON: string): void;
  /** Evaluates a site's script in a separate, empty context (QuickJS upstream). */
  evaluate(script: string): string | null;
  md5(text: string): string;
  sha256(text: string): string;
  base64Encode(text: string): string;
  base64Decode(text: string): string | null;
  log(level: "debug" | "warn" | "error", message: string): void;
}

declare const __host: Host;

/** The host, or a clear error when the code runs outside the app (for example in Node tests). */
export function host(): Host {
  if (typeof __host === "undefined") {
    throw new Error("The tachiyomi-ios host API is not available here");
  }
  return __host;
}
