import { host } from "./host.js";

/**
 * Kotlin standard-library helpers that ported code uses constantly, with the same semantics
 * (for example `substringAfter` returns the whole string when the delimiter is missing).
 */

export function substringAfter(text: string, delimiter: string, missing = text): string {
  const index = text.indexOf(delimiter);
  return index < 0 ? missing : text.slice(index + delimiter.length);
}

export function substringBefore(text: string, delimiter: string, missing = text): string {
  const index = text.indexOf(delimiter);
  return index < 0 ? missing : text.slice(0, index);
}

export function substringAfterLast(text: string, delimiter: string, missing = text): string {
  const index = text.lastIndexOf(delimiter);
  return index < 0 ? missing : text.slice(index + delimiter.length);
}

export function substringBeforeLast(text: string, delimiter: string, missing = text): string {
  const index = text.lastIndexOf(delimiter);
  return index < 0 ? missing : text.slice(0, index);
}

export function removePrefix(text: string, prefix: string): string {
  return text.startsWith(prefix) ? text.slice(prefix.length) : text;
}

export function removeSuffix(text: string, suffix: string): string {
  return text.endsWith(suffix) ? text.slice(0, text.length - suffix.length) : text;
}

/** Evaluates a site's script in a separate, empty JavaScript context. Replaces QuickJS. */
export function evaluateIsolated(script: string): string | null {
  return host().evaluate(script);
}

export function md5(text: string): string {
  return host().md5(text);
}

export function sha256(text: string): string {
  return host().sha256(text);
}

export function base64Encode(text: string): string {
  return host().base64Encode(text);
}

export function base64Decode(text: string): string | null {
  return host().base64Decode(text);
}

export const log = {
  debug: (message: string) => host().log("debug", message),
  warn: (message: string) => host().log("warn", message),
  error: (message: string) => host().log("error", message),
};

// Dates

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * Parses `text` with a `SimpleDateFormat`/`DateTimeFormatter`-style pattern, in English and in
 * the device's time zone (as upstream with `Locale.ENGLISH`). Supports `yyyy yy MMMM MMM MM M
 * dd d HH H hh h mm ss SSS a`, quoted literals, and any other character as a literal.
 * Returns milliseconds since 1970, or 0 when the text does not match (keiyoushi's `tryParseDate`).
 */
export function parseDate(text: string, pattern: string): number {
  const tokens = pattern.match(/'[^']*'|yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|hh|h|mm|ss|SSS|a|./g) ?? [];
  const parts = { year: 1970, month: 0, day: 1, hour: 0, minute: 0, second: 0, ms: 0, pm: null as boolean | null };
  let rest = text.trim();
  for (const token of tokens) {
    const take = (regex: RegExp): string | null => {
      const match = regex.exec(rest);
      if (!match) return null;
      rest = rest.slice(match[0].length);
      return match[0];
    };
    let value: string | null;
    switch (token) {
      case "yyyy":
        value = take(/^\d{4}/);
        if (value) parts.year = Number(value);
        break;
      case "yy":
        value = take(/^\d{2}/);
        if (value) parts.year = 2000 + Number(value);
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

/** ISO 8601 (`2024-01-02T03:04:05.678Z`, `…+00:00`) to milliseconds, or 0. Mirrors `Instant.parseOrNull`. */
export function parseIsoDate(text: string): number {
  const time = Date.parse(text);
  return Number.isNaN(time) ? 0 : time;
}

/** Midnight today in the device's time zone, minus `daysAgo` days. */
export function startOfDay(daysAgo = 0, now: Date = new Date()): number {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
  return date.getTime();
}

/** Durations, as Kotlin's `2.seconds`. */
export const seconds = (value: number) => value * 1000;
export const minutes = (value: number) => value * 60_000;
