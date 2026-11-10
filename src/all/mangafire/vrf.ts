// Port of VrfSigner.kt @ d9420cd1. The interceptor becomes `signUrl`, applied to every request
// whose path starts with /api/ (the SDK has no interceptors).
import { type HttpUrl, toHttpUrl } from "@sdk";

const TABLE_1 =
  "yINlmUNho8VYJT+ibTIP+9ESiULpVEtMOoD6U6lRE0R/xwXo/Xp9NrUgC4cw/Lmo33vUyjUE40kUoEWIr/fxfNNcq2s79ShQ5NhNrFnJ4hXPwOu/SuXzIbuTQKGFvfm08E9jvCfqAtoDqvQq3dVWPQFmJjgvkISBeXY3BgANR+yVnjGbcxZ47d6kLNfZPIayTq3/YGySb1KuVZodWp/WGNAO5pfMcpaK53Hhs0allBszaMaxuouOwdxbwgxIw6YunSsXjI05Yi0j9j4eHKfSXR8Ifo/Od+8iamRfCXTyvm7NGRGYdcQ0ywcK/u6RXhrbcCm4t2eCtrDgQVecJGkQ+A==";
const KEY_1 = "0Ec58JOY3uBzJK9m3zqIOpdlF7UFiax9DmA=";
const TABLE_2 =
  "IUFltCxD3Oc2cwCgkJffthaOg9cgPUb0LgW6H/VtfcF0kc5F25t+aWj6JH9VOhOaY0rAFdUxlDnl5BLNvwEJvQtP5qcw7vdb/K+chnbwnspSHT8mz5lqwz41TezG0hkO06FTjJZhsyNuFLDpD2ZZxQj/QIRcF90zpmQ7Byu483WsQqUE0C342HL+JXngRB6fRzxRyVTaKu83h7UYTJ0QMt6ixFh6S3F8gqkKwrGTL3jHNBsD45UnifK8+RGtishQV2K3rujLKEkiZxpr2dYcudFW4oFsDKhad3CLBvuyTqsCo4B7mL5IKQ1vXo/MOOvq1I1d8ar9X6Ttu5KF4fZgiA==";
const KEY_2 = "AAdjb1iPY8CiDmq9H34tKTBF8a3oDQ==";
const TABLE_3 =
  "NQHlu1/wVO5EmkwQymF810qqY2xG1k2obcas4Z9mCsPEIFl9pRIjFxbJ7ybMHbBckT5Ton85E0FOeHezbh/mjlEYpmpnlXOS8dgrqeq2KfxImTh1YK9y0PeMNhzA1OQzSY9brYOJq/l2QnE/hwOeZIhPixVSKIUlDb5vLcH6RWKxkIEMuP0bDwIqQ71AJJaEaMJL7A6YtyIwoRT+L5v4aZzodN/0+3nOGsfblFjgxSfPzVDjNFeNl5P26+kEC/8AHgdrpAbt3hHz3HrRN1Y6e+JHgF7ncFWnoF0y3THL1S71WgWGCa6KtSzTCCG58n68nTyj2T3Sshk7utqCtMi/ZQ==";
const KEY_3 = "DELOJgPsVaCcblDtTGMdHzM=";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const URL_SAFE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** `Base64.decode(text, Base64.DEFAULT)` to bytes. */
export function base64ToBytes(text: string): number[] {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of text) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

/** `Base64.encodeToString(bytes, URL_SAFE or NO_PADDING or NO_WRAP)`. */
export function bytesToBase64UrlNoPadding(bytes: number[]): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const chunk = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const count = Math.min(3, bytes.length - i) + 1;
    for (let j = 0; j < count; j++) out += URL_SAFE_ALPHABET[(chunk >> (18 - 6 * j)) & 0x3f];
  }
  return out;
}

/** `String.toByteArray(Charsets.UTF_8)`. */
export function utf8Bytes(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else {
      bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
}

type Stage = [table: number[], key: number[], iv: number];

let stages: Stage[] | null = null;

function getStages(): Stage[] {
  stages ??= [
    [base64ToBytes(TABLE_1), base64ToBytes(KEY_1), 0x5a],
    [base64ToBytes(TABLE_2), base64ToBytes(KEY_2), 0x35],
    [base64ToBytes(TABLE_3), base64ToBytes(KEY_3), 0xba],
  ];
  return stages;
}

function encryptStage(data: number[], table: number[], key: number[], iv: number): number[] {
  const out = new Array<number>(data.length);
  let prev = iv;
  const keySize = key.length;
  for (let i = 0; i < data.length; i++) {
    prev = table[(data[i] ^ key[i % keySize] ^ prev) & 0xff] & 0xff;
    out[i] = prev;
  }
  return out;
}

export function sign(path: string): string {
  let data = utf8Bytes(path);
  for (const [table, key, iv] of getStages()) {
    data = encryptStage(data, table, key, iv);
  }
  return bytesToBase64UrlNoPadding(data);
}

/** OkHttp's `percentDecode(plusIsSpace = true)`, as `queryParameterNames`/`Values` use. */
function decodeQueryComponent(text: string): string {
  const spaced = text.replace(/\+/g, " ");
  try {
    return decodeURIComponent(spaced);
  } catch {
    return spaced;
  }
}

/** Query pairs as `queryParameterNames.flatMap { queryParameterValues(it) }`: grouped by first occurrence. */
function queryPairs(url: HttpUrl): [string, string | null][] {
  const query = url.encodedQuery;
  if (query === null || query === "") return [];
  const raw = query.split("&").map((part): [string, string | null] => {
    const index = part.indexOf("=");
    return index < 0
      ? [decodeQueryComponent(part), null]
      : [decodeQueryComponent(part.slice(0, index)), decodeQueryComponent(part.slice(index + 1))];
  });
  const names: string[] = [];
  for (const [name] of raw) if (!names.includes(name)) names.push(name);
  return names.flatMap((name) => raw.filter(([key]) => key === name));
}

/** The interceptor: sorts the query, adds `vrf`. URLs outside /api/ are returned unchanged. */
export function signUrl(url: HttpUrl): HttpUrl {
  if (!url.encodedPath.startsWith("/api/")) return url;

  // Kotlin's sortedBy is stable, as Array.prototype.sort is.
  const params = queryPairs(url).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  let sortedQueryUrl = url.encodedPath.startsWith("/api") ? url.encodedPath.slice(4) : url.encodedPath;
  if (params.length > 0) {
    let lastKey = "";
    let index = 0;
    sortedQueryUrl +=
      "?" +
      params
        .map(([key, value]) => {
          let newKey = key;
          if (key.endsWith("[]")) {
            if (lastKey !== key) index = 0;
            lastKey = key;
            newKey = key.replace("[]", `[${index++}]`);
          }
          return `${newKey}=${value}`;
        })
        .join("&");
  }

  const port = url.port === null ? "" : `:${url.port}`;
  const builder = toHttpUrl(`${url.scheme}://${url.host}${port}${url.encodedPath}`).newBuilder();
  params.forEach(([key, value]) => builder.addQueryParameter(key, value));
  builder.addQueryParameter("vrf", sign(sortedQueryUrl));
  return builder.build();
}
