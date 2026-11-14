// Mangasushi 1 for tachiyomi-ios. Ported from keiyoushi/extensions-source (Apache-2.0).
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

  // src/en/mangasushi/index.ts
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default
  });

  // sdk/src/crypto.ts
  function utf8Encode(text) {
    const bytes = [];
    for (const char of text) {
      const code = char.codePointAt(0);
      if (code < 128) bytes.push(code);
      else if (code < 2048) bytes.push(192 | code >> 6, 128 | code & 63);
      else if (code < 65536) bytes.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63);
      else bytes.push(240 | code >> 18, 128 | code >> 12 & 63, 128 | code >> 6 & 63, 128 | code & 63);
    }
    return Uint8Array.from(bytes);
  }
  function utf8Decode(bytes) {
    let out = "";
    for (let i = 0; i < bytes.length; ) {
      const byte = bytes[i];
      let code;
      let length;
      if (byte < 128) [code, length] = [byte, 1];
      else if (byte >= 240) [code, length] = [byte & 7, 4];
      else if (byte >= 224) [code, length] = [byte & 15, 3];
      else if (byte >= 192) [code, length] = [byte & 31, 2];
      else [code, length] = [65533, 1];
      for (let j = 1; j < length; j++) code = code << 6 | (bytes[i + j] ?? 0) & 63;
      out += String.fromCodePoint(code > 1114111 ? 65533 : code);
      i += length;
    }
    return out;
  }
  var BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  function base64ToBytes(text) {
    const clean = text.replace(/[^A-Za-z0-9+/\-_]/g, "").replace(/-/g, "+").replace(/_/g, "/");
    const out = [];
    let buffer = 0;
    let bits = 0;
    for (const char of clean) {
      buffer = buffer << 6 | BASE64.indexOf(char);
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out.push(buffer >> bits & 255);
      }
    }
    return Uint8Array.from(out);
  }
  function hexToBytes(hex2) {
    const out = new Uint8Array(Math.floor(hex2.length / 2));
    for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex2.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  function concat(...parts) {
    const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }
  var MD5_SHIFTS = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  var MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
  function md5Bytes(input) {
    const length = input.length;
    const padded = new Uint8Array((length + 8 >> 6) + 1 << 6);
    padded.set(input);
    padded[length] = 128;
    const bitLength = length * 8;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, bitLength >>> 0, true);
    view.setUint32(padded.length - 4, Math.floor(bitLength / 2 ** 32), true);
    let [a0, b0, c0, d0] = [1732584193, 4023233417, 2562383102, 271733878];
    for (let chunk = 0; chunk < padded.length; chunk += 64) {
      let [a, b, c, d] = [a0, b0, c0, d0];
      for (let i = 0; i < 64; i++) {
        let f;
        let g;
        if (i < 16) [f, g] = [b & c | ~b & d, i];
        else if (i < 32) [f, g] = [d & b | ~d & c, (5 * i + 1) % 16];
        else if (i < 48) [f, g] = [b ^ c ^ d, (3 * i + 5) % 16];
        else [f, g] = [c ^ (b | ~d), 7 * i % 16];
        const sum = a + f + MD5_K[i] + view.getUint32(chunk + g * 4, true) >>> 0;
        const shift = MD5_SHIFTS[(i >> 4) * 4 + i % 4];
        a = d;
        d = c;
        c = b;
        b = b + (sum << shift | sum >>> 32 - shift) >>> 0;
      }
      a0 = a0 + a >>> 0;
      b0 = b0 + b >>> 0;
      c0 = c0 + c >>> 0;
      d0 = d0 + d >>> 0;
    }
    const out = new Uint8Array(16);
    const outView = new DataView(out.buffer);
    [a0, b0, c0, d0].forEach((word, index) => outView.setUint32(index * 4, word, true));
    return out;
  }
  function evpBytesToKey(password, salt, keyLength = 32, ivLength = 16) {
    let derived = new Uint8Array(0);
    let previous = new Uint8Array(0);
    while (derived.length < keyLength + ivLength) {
      previous = md5Bytes(concat(previous, password, salt));
      derived = concat(derived, previous);
    }
    return { key: derived.slice(0, keyLength), iv: derived.slice(keyLength, keyLength + ivLength) };
  }
  var SBOX = new Uint8Array(256);
  var INV_SBOX = new Uint8Array(256);
  (() => {
    let p = 1;
    let q = 1;
    do {
      p = p ^ p << 1 & 255 ^ (p & 128 ? 27 : 0);
      q ^= q << 1;
      q ^= q << 2;
      q ^= q << 4;
      q &= 255;
      if (q & 128) q ^= 9;
      const x = q ^ (q << 1 | q >> 7) ^ (q << 2 | q >> 6) ^ (q << 3 | q >> 5) ^ (q << 4 | q >> 4);
      SBOX[p] = (x ^ 99) & 255;
    } while (p !== 1);
    SBOX[0] = 99;
    for (let i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i;
  })();
  var xtime = (value) => (value << 1 ^ (value & 128 ? 27 : 0)) & 255;
  function multiply(a, b) {
    let result = 0;
    for (let x = a, y = b; y; y >>= 1, x = xtime(x)) if (y & 1) result ^= x;
    return result;
  }
  function expandKey(key) {
    const words = key.length / 4;
    const rounds = words + 6;
    const schedule = [];
    for (let i = 0; i < words; i++) schedule.push([key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]]);
    let rcon = 1;
    for (let i = words; i < 4 * (rounds + 1); i++) {
      let temp = [...schedule[i - 1]];
      if (i % words === 0) {
        temp = [SBOX[temp[1]] ^ rcon, SBOX[temp[2]], SBOX[temp[3]], SBOX[temp[0]]];
        rcon = xtime(rcon);
      } else if (words > 6 && i % words === 4) {
        temp = temp.map((byte) => SBOX[byte]);
      }
      schedule.push(schedule[i - words].map((byte, index) => byte ^ temp[index]));
    }
    const roundKeys = [];
    for (let round = 0; round <= rounds; round++) roundKeys.push(Uint8Array.from(schedule.slice(round * 4, round * 4 + 4).flat()));
    return roundKeys;
  }
  function decryptBlock(block, roundKeys) {
    const rounds = roundKeys.length - 1;
    const state = block.map((byte, index) => byte ^ roundKeys[rounds][index]);
    for (let round = rounds - 1; round >= 0; round--) {
      const shifted = new Uint8Array(16);
      for (let column = 0; column < 4; column++) {
        for (let row = 0; row < 4; row++) shifted[(column + row) % 4 * 4 + row] = INV_SBOX[state[column * 4 + row]];
      }
      for (let i = 0; i < 16; i++) state[i] = shifted[i] ^ roundKeys[round][i];
      if (round > 0) {
        for (let column = 0; column < 4; column++) {
          const [a, b, c, d] = state.slice(column * 4, column * 4 + 4);
          state[column * 4] = multiply(a, 14) ^ multiply(b, 11) ^ multiply(c, 13) ^ multiply(d, 9);
          state[column * 4 + 1] = multiply(a, 9) ^ multiply(b, 14) ^ multiply(c, 11) ^ multiply(d, 13);
          state[column * 4 + 2] = multiply(a, 13) ^ multiply(b, 9) ^ multiply(c, 14) ^ multiply(d, 11);
          state[column * 4 + 3] = multiply(a, 11) ^ multiply(b, 13) ^ multiply(c, 9) ^ multiply(d, 14);
        }
      }
    }
    return state;
  }
  function aesCbcDecrypt(ciphertext, key, iv) {
    if (![16, 24, 32].includes(key.length)) throw new Error(`AES key must be 16, 24 or 32 bytes, not ${key.length}`);
    if (ciphertext.length % 16 !== 0) throw new Error("AES ciphertext is not a whole number of blocks");
    const roundKeys = expandKey(key);
    const out = new Uint8Array(ciphertext.length);
    let previous = iv;
    for (let offset = 0; offset < ciphertext.length; offset += 16) {
      const block = ciphertext.slice(offset, offset + 16);
      const plain = decryptBlock(block, roundKeys);
      for (let i = 0; i < 16; i++) out[offset + i] = plain[i] ^ previous[i];
      previous = block;
    }
    const padding = out[out.length - 1];
    if (padding < 1 || padding > 16) throw new Error("Bad AES padding (wrong key?)");
    return out.slice(0, out.length - padding);
  }
  function cryptoJsDecrypt(ciphertextBase64, passphrase, saltHex) {
    const { key, iv } = evpBytesToKey(utf8Encode(passphrase), hexToBytes(saltHex));
    return utf8Decode(aesCbcDecrypt(base64ToBytes(ciphertextBase64), key, iv));
  }

  // sdk/src/host.ts
  function host() {
    if (typeof __host === "undefined") {
      throw new Error("The tachiyomi-ios host API is not available here");
    }
    return __host;
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
  function substringAfterLast(text, delimiter, missing = text) {
    const index = text.lastIndexOf(delimiter);
    return index < 0 ? missing : text.slice(index + delimiter.length);
  }
  function substringBeforeLast(text, delimiter, missing = text) {
    const index = text.lastIndexOf(delimiter);
    return index < 0 ? missing : text.slice(0, index);
  }
  function base64Decode(text) {
    return host().base64Decode(text);
  }
  var log = {
    debug: (message) => host().log("debug", message),
    warn: (message) => host().log("warn", message),
    error: (message) => host().log("error", message)
  };
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

  // sdk/src/filterCache.ts
  var FILTER_DATA = "filter_data";
  var MAX_AGE_MS = 3 * 24 * 60 * 60 * 1e3;
  var FilterDataCache = class {
    constructor(source, fetchFilterData) {
      this.source = source;
      this.fetchFilterData = fetchFilterData;
      this.inFlight = false;
    }
    /** The stored data, or null. Starts a background fetch when it is missing or stale. */
    read() {
      let stored = null;
      try {
        const json = this.source.preferences.getString(FILTER_DATA, "");
        if (json !== "") stored = JSON.parse(json);
      } catch {
        stored = null;
      }
      if (stored === null || Date.now() - stored.fetchedAt > MAX_AGE_MS) this.triggerBackgroundFetch();
      return stored?.data ?? null;
    }
    triggerBackgroundFetch() {
      if (this.inFlight) return;
      this.inFlight = true;
      Promise.resolve().then(() => this.fetchFilterData()).then((data) => {
        this.source.preferences.edit().putString(FILTER_DATA, JSON.stringify({ fetchedAt: Date.now(), data })).apply();
      }).catch((error) => {
        try {
          log.warn(`${this.source.name}: failed to fetch filter data: ${String(error)}`);
        } catch {
        }
      }).finally(() => {
        this.inFlight = false;
      });
    }
  };

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
  function applyFilterStates(filters, json) {
    filters.forEach((filter, index) => {
      const state = json[index];
      if (state && state.type === filter.toJSON().type) filter.applyJSON(state);
    });
    return filters;
  }
  var ValueSelect = class extends Select {
    constructor(name, options, defaultValue) {
      super(
        name,
        options.map(([label]) => label),
        Math.max(0, options.findIndex(([, value]) => value === defaultValue))
      );
      this.options = options;
    }
    selectedValue() {
      return this.options[this.state]?.[1] ?? "";
    }
  };
  var ValueCheckBox = class extends CheckBox {
    constructor(name, value, state = false) {
      super(name, state);
      this.value = value;
    }
  };

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
    /** Replaces the path segment at `index`. */
    setPathSegment(index, segment) {
      if (index < 0 || index >= this.segments.length) throw new RangeError(`No path segment ${index} in /${this.segments.join("/")}`);
      this.segments[index] = canonicalize(segment, PATH_SEGMENT_ENCODE_SET);
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
    /**
     * The first match, or an error naming the selector and page. Mirrors Jsoup's `expectFirst`;
     * use it where upstream writes `selectFirst(css)!!`, so a layout change says what broke.
     */
    expectFirst(css) {
      const found = this.selectFirst(css);
      if (!found) throw new SelectorError(css, this.native.location());
      return found;
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
      if (name.toLowerCase().startsWith("abs:")) return this.absUrl(name.slice(4));
      return this.native.attr(name);
    }
    hasAttr(name) {
      return this.native.hasAttr(name);
    }
    /**
     * The attribute as an absolute URL, or "" when absent. Jsoup ignores surrounding whitespace
     * (`data-src="\n  https://…"` is common); SwiftSoup's Foundation URLs do not, so the SDK
     * retries with the trimmed value.
     */
    absUrl(name) {
      const resolved = this.native.absUrl(name);
      if (resolved !== "") return resolved;
      const raw = this.native.attr(name).replace(/[\t\n\r]/g, "").trim();
      if (raw === "") return "";
      const absolute = HttpUrl.parse(raw);
      if (absolute) return absolute.toString();
      return HttpUrl.parse(this.native.location())?.resolve(raw)?.toString() ?? "";
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
  var SelectorError = class extends Error {
    constructor(selector, location) {
      super(`Selector '${selector}' matched 0 nodes on ${location || "the parsed HTML"}`);
      this.selector = selector;
      this.location = location;
      this.name = "SelectorError";
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
    /** The first element, or an error naming the selector that found nothing. */
    expectFirst(css = "(selection)") {
      const found = this[0];
      if (!found) throw new SelectorError(css, "");
      return found;
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

  // sdk/src/i18n.ts
  var Intl = class {
    constructor(language, messages2, baseLanguage = "en") {
      this.language = language;
      this.messages = messages2;
      this.baseLanguage = baseLanguage;
    }
    lookup(key) {
      const primary = this.language.split("-")[0];
      return this.messages[this.language]?.[key] ?? this.messages[primary]?.[key] ?? this.messages[this.baseLanguage]?.[key];
    }
    /** `intl["key"]` upstream. */
    get(key) {
      return this.lookup(key) ?? key;
    }
    /** `intl.format("key", args…)`: replaces `%s`, `%d` and `%1$s`-style placeholders in order. */
    format(key, ...args) {
      let next = 0;
      return this.get(key).replace(
        /%(?:(\d+)\$)?[sd]/g,
        (_, position) => String(args[position ? Number(position) - 1 : next++] ?? "")
      );
    }
  };

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
    /** Parses the body as JSON. A failure names the URL and shows the start of the body. */
    parseAs() {
      try {
        return JSON.parse(this.body);
      } catch (error) {
        const preview = this.body.slice(0, 200).replace(/\s+/g, " ");
        throw new Error(`JSON parse failed at ${this.url} (HTTP ${this.code}): ${error.message}; body starts: ${preview}`);
      }
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
            reject(new HttpError(`${error ?? "No response"} (${method} ${target})`));
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
  function failure(source, method, error) {
    const message = `${source.toString()} ${method} failed: ${describeError(error)}`;
    try {
      host().log("error", message);
    } catch {
    }
    return message;
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
          (error) => callback(failure(source, method, error), null)
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

  // sdk/themes/madara/filters.ts
  var TextFilter = class extends Text {
    constructor(name, taxonomy) {
      super(name);
      this.taxonomy = taxonomy;
    }
  };
  var StatusTag = class extends ValueCheckBox {
  };
  var StatusFilter = class extends Group {
    constructor(name, options) {
      super(
        name,
        options.map(([label, slug]) => new StatusTag(label, slug))
      );
    }
  };
  var SortFilter = class extends ValueSelect {
    key() {
      return this.selectedValue();
    }
  };
  var AdultFilter = class extends ValueSelect {
  };
  var GenreConditionFilter = class extends ValueSelect {
  };
  var GenreCheckBox = class extends ValueCheckBox {
  };
  var GenreList = class extends Group {
    constructor(name, genres) {
      super(
        name,
        genres.map((genre) => new GenreCheckBox(genre.name, genre.slug))
      );
    }
  };

  // sdk/themes/madara/intl.ts
  var intlFor = (lang) => new Intl(lang, messages);
  var messages = {
    "en": {
      author_filter_title: "Author",
      artist_filter_title: "Artist",
      year_filter_title: "Year of Released",
      status_filter_title: "Status",
      status_filter_completed: "Completed",
      status_filter_ongoing: "Ongoing",
      status_filter_canceled: "Canceled",
      status_filter_on_hold: "On Hold",
      order_by_filter_title: "Order By",
      order_by_filter_relevance: "Relevance",
      order_by_filter_latest: "Latest",
      order_by_filter_az: "A-Z",
      order_by_filter_rating: "Rating",
      order_by_filter_trending: "Trending",
      order_by_filter_views: "Most Views",
      order_by_filter_new: "New",
      genre_condition_filter_title: "Genre condition",
      genre_condition_filter_or: "OR",
      genre_condition_filter_and: "AND",
      adult_content_filter_title: "Adult Content",
      adult_content_filter_all: "All",
      adult_content_filter_none: "None",
      adult_content_filter_only: "Only",
      genre_filter_header: "Genres filter may not work for all sources",
      genre_filter_title: "Genres",
      genre_missing_warning: "Press 'Reset' to attempt to show the genres",
      alt_names_heading: "Alternative Names:"
    },
    "es": {
      author_filter_title: "Autor",
      artist_filter_title: "Artista",
      year_filter_title: "Año de lanzamiento",
      status_filter_title: "Estado",
      status_filter_completed: "Completado",
      status_filter_ongoing: "En curso",
      status_filter_canceled: "Cancelado",
      status_filter_on_hold: "En pausa",
      order_by_filter_title: "Ordenar por",
      order_by_filter_relevance: "Relevancia",
      order_by_filter_latest: "Reciente",
      order_by_filter_rating: "Valoración",
      order_by_filter_trending: "Tendencia",
      order_by_filter_views: "Vistas",
      order_by_filter_new: "Nuevos",
      genre_condition_filter_title: "Condición de género",
      genre_condition_filter_or: "O",
      genre_condition_filter_and: "Y",
      adult_content_filter_title: "Contenido adulto",
      adult_content_filter_all: "Todos",
      adult_content_filter_none: "Ninguno",
      adult_content_filter_only: "Solo",
      genre_filter_header: "Es posible que el filtro de géneros no funcione correctamente",
      genre_filter_title: "Géneros",
      genre_missing_warning: "Presione 'Restablecer' para intentar mostrar los géneros",
      alt_names_heading: "Nombres Alternativos:"
    },
    "pt-BR": {
      author_filter_title: "Autor",
      artist_filter_title: "Artista",
      year_filter_title: "Ano de lançamento",
      status_filter_title: "Estado",
      status_filter_completed: "Completo",
      status_filter_ongoing: "Em andamento",
      status_filter_canceled: "Cancelado",
      status_filter_on_hold: "Pausado",
      order_by_filter_title: "Ordenar por",
      order_by_filter_relevance: "Relevância",
      order_by_filter_latest: "Recentes",
      order_by_filter_rating: "Avaliação",
      order_by_filter_trending: "Tendência",
      order_by_filter_views: "Visualizações",
      order_by_filter_new: "Novos",
      genre_condition_filter_title: "Operador dos gêneros",
      genre_condition_filter_or: "OU",
      genre_condition_filter_and: "E",
      adult_content_filter_title: "Conteúdo adulto",
      adult_content_filter_all: "Indiferente",
      adult_content_filter_none: "Nenhum",
      adult_content_filter_only: "Somente",
      genre_filter_header: "O filtro de gêneros pode não funcionar",
      genre_filter_title: "Gêneros",
      genre_missing_warning: "Aperte 'Redefinir' para tentar mostrar os gêneros",
      alt_names_heading: "Nomes alternativos:"
    },
    "uk": {
      author_filter_title: "Автор",
      artist_filter_title: "Художник",
      year_filter_title: "Рік випуску",
      status_filter_title: "Статус",
      status_filter_completed: "Завершено",
      status_filter_ongoing: "Триває",
      status_filter_canceled: "Скасовано",
      status_filter_on_hold: "Призупинено",
      order_by_filter_title: "Сортування",
      order_by_filter_relevance: "За релевантністю",
      order_by_filter_latest: "Останні",
      order_by_filter_az: "За назвою А-Я",
      order_by_filter_rating: "За рейтингом",
      order_by_filter_trending: "Популярні",
      order_by_filter_views: "За переглядами",
      order_by_filter_new: "Нові",
      genre_condition_filter_title: "Умова жанрів",
      genre_condition_filter_or: "АБО",
      genre_condition_filter_and: "І",
      adult_content_filter_title: "Контент для дорослих",
      adult_content_filter_all: "Усі",
      adult_content_filter_none: "Жодного",
      adult_content_filter_only: "Лише",
      genre_filter_header: "Фільтр жанрів може працювати не для всіх джерел",
      genre_filter_title: "Жанри",
      genre_missing_warning: "Натисніть «Скинути», щоб спробувати показати жанри",
      alt_names_heading: "Альтернативні назви:"
    }
  };

  // sdk/themes/madara/madara-base.ts
  var GENERIC_URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/;
  var IMAGE_DESCRIPTOR_REGEX = /^(\d+|\d+\.\d+)[wx]$/;
  var wordRegex = (...words) => new RegExp(`(?<!\\p{L})(?:${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "u");
  var YEAR_WORDS = wordRegex("year", "año", "ano", "năm", "yıl", "سنة", "سنوات");
  var MONTH_WORDS = wordRegex("month", "mes", "tháng", "ay", "شهر", "أشهر", "شهور");
  var WEEK_WORDS = wordRegex("week", "semana", "tuần", "hafta", "أسبوع", "أسابيع");
  var DAY_WORDS = wordRegex("day", "día", "dia", "jour", "hari", "gün", "ngày", "giorni", "أيام", "天");
  var HOUR_WORDS = wordRegex("hour", "hora", "heure", "jam", "saat", "giờ", "ore", "ساعة", "ساعات", "小时");
  var MINUTE_WORDS = wordRegex("minute", "minuto", "min", "menit", "dakika", "phút", "دقيقة", "دقائق");
  var SECOND_WORDS = wordRegex("second", "segundo", "sec", "detik", "giây", "ثانية", "ثوان");
  var ARABIC_DUALS = [
    ["ثانيتين", "2 ثوان"],
    ["دقيقتين", "2 دقائق"],
    ["ساعتين", "2 ساعات"],
    ["يومين", "2 أيام"],
    ["أسبوعين", "2 أسابيع"],
    ["شهرين", "2 أشهر"],
    ["سنتين", "2 سنوات"]
  ];
  var isDigits = (text) => /^\d+$/.test(text);
  var lastPathSegment = (path) => substringAfterLast(path.replace(/\/+$/, ""), "/");
  function utcMidnight(millis) {
    if (millis === 0) return 0;
    const date = new Date(millis);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  }
  var MadaraBase = class extends KeiSource {
    constructor() {
      super(...arguments);
      this.intlCache = null;
      // Filter data (genres), fetched in the background and kept in settings.
      this.filterData = new FilterDataCache(this, () => this.fetchFilterData());
    }
    // Options a site overrides.
    get supportsPostId() {
      return true;
    }
    get chapterMode() {
      return "MangaPage" /* MangaPage */;
    }
    get mangaSubString() {
      return "manga";
    }
    get genreDirectory() {
      return "manga-genre";
    }
    get filterNonMangaItems() {
      return true;
    }
    get sendViewCount() {
      return true;
    }
    get intl() {
      this.intlCache ?? (this.intlCache = intlFor(this.lang));
      return this.intlCache;
    }
    get statusFilterOptions() {
      return [
        [this.intl.get("status_filter_completed"), "end"],
        [this.intl.get("status_filter_ongoing"), "on-going"],
        [this.intl.get("status_filter_canceled"), "canceled"],
        [this.intl.get("status_filter_on_hold"), "on-hold"]
      ];
    }
    get orderByFilterOptions() {
      return [
        [this.intl.get("order_by_filter_relevance"), ""],
        [this.intl.get("order_by_filter_latest"), "latest"],
        [this.intl.get("order_by_filter_az"), "alphabet"],
        [this.intl.get("order_by_filter_rating"), "rating"],
        [this.intl.get("order_by_filter_trending"), "trending"],
        [this.intl.get("order_by_filter_views"), "views"],
        [this.intl.get("order_by_filter_new"), "new-manga"]
      ];
    }
    get genreConditionFilterOptions() {
      return [
        [this.intl.get("genre_condition_filter_or"), ""],
        [this.intl.get("genre_condition_filter_and"), "1"]
      ];
    }
    get adultFilterOptions() {
      return [
        [this.intl.get("adult_content_filter_all"), ""],
        [this.intl.get("adult_content_filter_none"), "0"],
        [this.intl.get("adult_content_filter_only"), "1"]
      ];
    }
    get xhrHeaders() {
      return { ...this.headers, "X-Requested-With": "XMLHttpRequest" };
    }
    // Selectors a site overrides.
    archiveSelector() {
      return "div.page-item-detail, .manga__item, .c-tabs-item__content";
    }
    searchCardSelector() {
      return ".c-tabs-item__content";
    }
    get archiveTitleSelector() {
      return null;
    }
    get archiveUrlSelector() {
      return ".post-title a";
    }
    get mangaDetailsSelectorTitle() {
      return "div.post-title h3, div.post-title h1, #manga-title > h1";
    }
    get mangaDetailsSelectorAuthor() {
      return "div.author-content > a, div.manga-authors > a";
    }
    get mangaDetailsSelectorArtist() {
      return "div.artist-content > a";
    }
    get mangaDetailsSelectorStatus() {
      return "div.summary-content, div.summary-heading:contains(Status) + div";
    }
    get mangaDetailsSelectorDescription() {
      return "div.description-summary div.summary__content, div.summary_content div.post-content_item > h5 + div, div.summary_content div.manga-excerpt";
    }
    get mangaDetailsSelectorThumbnail() {
      return "div.summary_image img";
    }
    get mangaDetailsSelectorGenre() {
      return "div.genres-content a";
    }
    get mangaDetailsSelectorTag() {
      return "div.tags-content a";
    }
    get seriesTypeSelector() {
      return ".post-content_item:contains(Type) .summary-content";
    }
    get altNameSelector() {
      return ".post-content_item:contains(Alt) .summary-content";
    }
    get updatingRegex() {
      return /Updating|Atualizando/i;
    }
    chapterListSelector() {
      return "li.wp-manga-chapter";
    }
    get chapterNameSelector() {
      return null;
    }
    get chapterUrlSelector() {
      return "a";
    }
    get chapterDateSelector() {
      return "span.chapter-release-date";
    }
    get pageListParseSelector() {
      return "div.page-break, li.blocks-gallery-item, .reading-content .text-left:not(:has(.blocks-gallery-item))";
    }
    get filterGenresSelector() {
      return "div.genres";
    }
    /** A `parseDate` pattern (upstream: `DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH)`). */
    get chapterDateFormat() {
      return "MMMM d, yyyy";
    }
    async fetchFilterData() {
      const document = (await this.client.get(`${this.baseUrl}/${this.mangaSubString}/`, Fetch.DOCUMENT)).asJsoup();
      const seen = /* @__PURE__ */ new Set();
      const routes = [];
      for (const element of document.select(this.filterGenresSelector).select(`a[href*='/${this.genreDirectory}/']`)) {
        const href = element.attr("abs:href");
        const name = element.text();
        if (!href || !name) continue;
        const path = toHttpUrl(href).encodedPath;
        const slug = lastPathSegment(path);
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        routes.push({ name, slug, path });
      }
      return routes;
    }
    getFilterList() {
      return this.getFilterListFromData(this.filterData.read() ?? []);
    }
    // Manga
    async getMangaByUrl(url) {
      if (url.host !== toHttpUrl(this.baseUrl).host) return null;
      const document = (await this.client.get(url, Fetch.DOCUMENT)).asJsoup();
      const manga = this.parseDetails(document);
      manga.initialized = true;
      return manga;
    }
    getMangaUrl(manga) {
      return isDigits(manga.url) ? `${this.baseUrl}/?p=${manga.url}` : toHttpUrl(this.baseUrl).resolve(manga.url)?.toString() ?? this.baseUrl + manga.url;
    }
    async fetchMangaUpdate(manga, chapters, _fetchDetails, fetchChapters) {
      const document = (await this.client.get(this.getMangaUrl(manga), Fetch.DOCUMENT)).asJsoup();
      this.enqueueViewCount(document);
      const mangaPath = toHttpUrl(document.location()).encodedPath;
      const updated = this.parseDetails(document);
      const updatedChapters = fetchChapters ? await this.fetchChapters(mangaPath, document) : chapters;
      return new SMangaUpdate(updated, updatedChapters);
    }
    parseDetails(document) {
      const manga = SManga.create();
      manga.url = urlWithoutDomain(document.location());
      manga.title = document.expectFirst(this.mangaDetailsSelectorTitle).ownText();
      const people = (selector) => document.select(selector).eachText().filter((name) => !this.isUpdating(name)).join(", ") || null;
      manga.author = people(this.mangaDetailsSelectorAuthor);
      manga.artist = people(this.mangaDetailsSelectorArtist);
      const descriptionElement = document.selectFirst(this.mangaDetailsSelectorDescription);
      if (descriptionElement) {
        const paragraphs = descriptionElement.select("p");
        manga.description = paragraphs.isNotEmpty() ? paragraphs.map((p) => p.text()).join("\n\n") : descriptionElement.text();
      }
      const alternative = document.selectFirst(this.altNameSelector)?.ownText();
      if (alternative && !this.isUpdating(alternative)) {
        manga.description = [manga.description, `${this.intl.get("alt_names_heading")} ${alternative}`].filter((part) => part !== null).join("\n\n");
      }
      const thumbnail = document.selectFirst(this.mangaDetailsSelectorThumbnail);
      manga.thumbnail_url = thumbnail ? this.processThumbnail(this.imageFromElement(thumbnail)) : null;
      manga.status = this.toStatus(document.select(this.mangaDetailsSelectorStatus).last()?.text() ?? "");
      const genres = [
        ...document.select(this.mangaDetailsSelectorGenre).map((element) => element.text()),
        ...document.select(this.mangaDetailsSelectorTag).eachText()
      ];
      const type = document.selectFirst(this.seriesTypeSelector)?.text();
      if (type) genres.push(type);
      const seen = /* @__PURE__ */ new Set();
      manga.genre = genres.filter((genre) => !seen.has(genre.toLowerCase()) && seen.add(genre.toLowerCase())).join(", ") || null;
      return manga;
    }
    // Chapters
    async fetchChapters(mangaPath, mangaPage) {
      switch (this.chapterMode) {
        case "MangaPage" /* MangaPage */:
          return this.parseChapterList(mangaPage);
        case "AdminAjax" /* AdminAjax */: {
          const id = this.mangaId(mangaPage);
          if (!id) throw new Error(`No Madara post ID on ${mangaPage.location()}`);
          const body = new FormBody().add("action", "manga_get_chapters").add("manga", id).build();
          const response = await this.client.post(`${this.baseUrl}/wp-admin/admin-ajax.php`, body, {
            headers: this.xhrHeaders,
            fetch: Fetch.XHR.from(this.baseUrl + mangaPath)
          });
          return this.parseChapterList(response.asJsoup());
        }
        case "MangaAjax" /* MangaAjax */: {
          const response = await this.client.post(this.chapterAjaxUrl(mangaPath), new FormBody().build(), {
            headers: this.xhrHeaders,
            fetch: Fetch.XHR.from(this.baseUrl + mangaPath)
          });
          return this.parseChapterList(response.asJsoup());
        }
        case "MangaAjaxPaginated" /* MangaAjaxPaginated */:
          return this.fetchPaginatedChapters(mangaPath);
        case "MangaAjaxQuery" /* MangaAjaxQuery */: {
          const body = new FormBody().add("manga-core", lastPathSegment(mangaPath)).add("manga_ajax", "1").add("maction", "get_chapters").build();
          const response = await this.client.post(`${this.baseUrl}/index.php`, body, {
            headers: this.xhrHeaders,
            fetch: Fetch.XHR.from(this.baseUrl + mangaPath)
          });
          return this.parseChapterList(response.asJsoup());
        }
      }
    }
    async fetchPaginatedChapters(mangaPath) {
      const result = [];
      let lastUrl = null;
      for (let page = 1; ; page++) {
        const response = await this.client.post(`${this.chapterAjaxUrl(mangaPath)}?t=${page}`, new FormBody().build(), {
          headers: this.xhrHeaders,
          fetch: Fetch.XHR.from(this.baseUrl + mangaPath),
          ensureSuccess: false
        });
        if (response.code === 404) return result;
        if (!response.isSuccessful) throw new Error(`HTTP ${response.code} from ${response.url}`);
        const chapters = this.parseChapterList(response.asJsoup());
        if (chapters.length === 0 || chapters[chapters.length - 1].url === lastUrl) break;
        result.push(...chapters);
        lastUrl = chapters[chapters.length - 1].url;
      }
      return result;
    }
    chapterAjaxUrl(mangaPath) {
      return `${this.baseUrl}${mangaPath.replace(/\/+$/, "")}/ajax/chapters/`;
    }
    parseChapterList(document) {
      return document.select(this.chapterListSelector()).map((element) => this.chapterFromElement(element)).filter((chapter) => chapter !== null);
    }
    chapterFromElement(element) {
      const link = element.selectFirst(this.chapterUrlSelector);
      const href = link?.attr("abs:href");
      if (!link || !href) return null;
      const chapter = SChapter.create();
      chapter.url = toHttpUrl(href).encodedPath;
      const nameSelector = this.chapterNameSelector;
      chapter.name = (nameSelector ? element.selectFirst(nameSelector)?.text() : null) ?? link.text();
      chapter.date_upload = this.parseChapterDate(
        element.selectFirst("img:not(.thumb)")?.attr("alt") || element.selectFirst("span a")?.attr("title") || element.selectFirst(this.chapterDateSelector)?.text() || null
      );
      return chapter;
    }
    getChapterUrl(chapter) {
      if (!chapter.url.startsWith("/") && !/^https?:/.test(chapter.url)) throw new Error("Refresh the chapter list.");
      return toHttpUrl(this.baseUrl).resolve(chapter.url)?.toString() ?? this.baseUrl + chapter.url;
    }
    // Pages
    async getPageList(chapter) {
      const chapterUrl = this.getChapterUrl(chapter);
      const first = await this.fetchChapterDocument(chapterUrl);
      const document = first.selectFirst("#single-pager") !== null ? (await this.client.get(toHttpUrl(chapterUrl).newBuilder().addQueryParameter("style", "list").build(), Fetch.DOCUMENT)).asJsoup() : first;
      this.enqueueViewCount(document);
      return this.parsePages(document);
    }
    async fetchChapterDocument(chapterUrl) {
      return (await this.client.get(chapterUrl, Fetch.DOCUMENT)).asJsoup();
    }
    parsePages(document) {
      const protector = document.selectFirst("#chapter-protector-data");
      if (!protector) {
        const pages = [];
        document.select(this.pageListParseSelector).forEach((element, index) => {
          const img = element.selectFirst("img");
          const url = img ? this.imageFromElement(img) : null;
          if (url) pages.push(new Page(index, document.location(), url));
        });
        return pages;
      }
      const src = protector.attr("src");
      const script = src.startsWith("data:text/javascript;base64,") ? base64Decode(substringAfter(src, ",")) ?? "" : protector.html();
      const password = substringBefore(substringAfter(script, "wpmangaprotectornonce='"), "';");
      const encrypted = substringBefore(substringAfter(script, "chapter_data='"), "';").replace(/\\\//g, "/");
      const data = JSON.parse(encrypted);
      const raw = cryptoJsDecrypt(data.ct, password, data.s);
      const images = JSON.parse(JSON.parse(raw));
      return images.map((image, index) => new Page(index, document.location(), image));
    }
    getImageRequest(page) {
      const request = super.getImageRequest(page);
      return { ...request, headers: { ...request.headers, Referer: page.url } };
    }
    /** Tells the site about the view, as upstream does; never fails the call. */
    enqueueViewCount(document) {
      if (!this.sendViewCount) return;
      let data;
      try {
        const script = document.selectFirst("script#wp-manga-js-extra")?.data() ?? "";
        const json = substringBeforeLast(substringAfter(script, "var manga = ", ""), ";");
        if (!json.trim()) return;
        data = JSON.parse(json);
      } catch {
        return;
      }
      if (String(data.enable_manga_view) !== "1") return;
      const mangaId = data.manga_id ? String(data.manga_id) : "";
      if (!mangaId) return;
      const body = new FormBody().add("action", "manga_views").add("manga", mangaId);
      if (data.chapter_slug) body.add("chapter", String(data.chapter_slug));
      if (data.nonce) body.add("nonce", String(data.nonce));
      this.client.post(`${this.baseUrl}/wp-admin/admin-ajax.php`, body.build(), {
        headers: { ...this.headers, Referer: document.location() },
        fetch: Fetch.XHR
      }).catch((error) => {
        try {
          log.debug(`${this.name}: view count not sent: ${String(error)}`);
        } catch {
        }
      });
    }
    // Archive cards
    postId(element) {
      return element.selectFirst("[data-post-id]")?.attr("data-post-id") ?? null;
    }
    parseArchive(document) {
      return document.select(this.archiveSelector()).map((element) => this.archiveManga(element)).filter((manga) => manga !== null);
    }
    archiveManga(element) {
      const link = element.selectFirst(this.archiveUrlSelector);
      const href = link?.attr("abs:href");
      if (!link || !href) return null;
      const manga = SManga.create();
      manga.url = toHttpUrl(href).encodedPath;
      const titleSelector = this.archiveTitleSelector;
      manga.title = (titleSelector ? element.selectFirst(titleSelector)?.text() : null) ?? link.text();
      const img = element.selectFirst("img");
      manga.thumbnail_url = img ? this.processThumbnail(this.imageFromElement(img), true) : null;
      return manga;
    }
    parseSearchCards(document) {
      const cards = [];
      for (const element of document.select(this.searchCardSelector())) {
        const link = element.selectFirst(this.archiveUrlSelector);
        const href = link?.attr("abs:href");
        if (!link || !href) continue;
        const titleSelector = this.archiveTitleSelector;
        const img = element.selectFirst("img");
        cards.push({
          title: (titleSelector ? element.selectFirst(titleSelector)?.text() : null) ?? link.text(),
          path: toHttpUrl(href).encodedPath,
          thumbnail: img ? this.processThumbnail(this.imageFromElement(img), true) : null
        });
      }
      return cards;
    }
    imageFromElement(element) {
      if (element.hasAttr("data-src")) return element.attr("abs:data-src");
      if (element.hasAttr("data-lazy-src")) return element.attr("abs:data-lazy-src");
      if (element.hasAttr("data-lzl-src")) return element.attr("abs:data-lzl-src");
      if (element.hasAttr("data-cfsrc")) return element.attr("abs:data-cfsrc");
      if (element.hasAttr("data-manga-src")) return element.attr("abs:data-manga-src");
      if (element.hasAttr("srcset")) return this.getSrcSetImage(element.attr("abs:srcset"));
      return element.attr("abs:src");
    }
    processThumbnail(url, _fromSearch = false) {
      return url;
    }
    getSrcSetImage(srcset) {
      const images = srcset.split(",").map((candidate) => candidate.trim().split(/\s+/, 2)).filter((candidate) => candidate.length > 0 && GENERIC_URL_REGEX.test(candidate[0]));
      let best = null;
      for (const candidate of images) {
        const match = candidate[1] ? IMAGE_DESCRIPTOR_REGEX.exec(candidate[1]) : null;
        const size = match ? Number.parseFloat(match[1]) : Number.NaN;
        if (!Number.isNaN(size) && (best === null || size > best[1])) best = [candidate[0], size];
      }
      if (best) return best[0];
      return images.map((candidate) => candidate[0]).sort().at(-1) ?? null;
    }
    mangaId(document) {
      const nonBlank = (value) => value && value.trim() ? value : null;
      return nonBlank(document.selectFirst("[id^=manga-chapters-holder]")?.attr("data-id")) ?? nonBlank(document.selectFirst("input.rating-post-id")?.attr("value")) ?? nonBlank(document.selectFirst("a[data-post]")?.attr("data-post")) ?? (() => {
        const href = document.selectFirst("link[rel=shortlink]")?.attr("href") ?? "";
        return href.includes("?p=") ? nonBlank(substringBefore(substringAfter(href, "?p="), "&")) : null;
      })();
    }
    // Status and dates
    get completedStatus() {
      return ["completed", "completo", "completado", "concluído", "concluido", "finalizado", "achevé", "terminé", "hoàn thành", "مكتملة", "مكتمل", "已完结", "tamamlandı", "đã hoàn thành", "завершено", "tamamlanan", "complété"];
    }
    get ongoingStatus() {
      return [
        "ongoing",
        "on going",
        "updating",
        "продолжается",
        "em lançamento",
        "em andamento",
        "en cours",
        "ativo",
        "lançando",
        "đang tiến hành",
        "còn nữa",
        "devam ediyor",
        "in corso",
        "in arrivo",
        "مستمرة",
        "مستمر",
        "en curso",
        "emision",
        "curso",
        "en marcha",
        "publicandose",
        "publicándose",
        "en emision",
        "连载中",
        "đang làm",
        "em postagem",
        "devam eden",
        "em progresso",
        "atualizações semanais",
        "виходить",
        "đang ra"
      ];
    }
    get hiatusStatus() {
      return ["on hold", "hiatus", "pausado", "en espera", "durduruldu", "beklemede", "đang chờ", "متوقف", "en pause", "заморожено", "en attente", "tạm dừng"];
    }
    get cancelledStatus() {
      return ["canceled", "cancelled", "cancelado", "iptal edildi", "đã hủy", "ملغي", "abandonné", "заброшено", "annulé"];
    }
    toStatus(text) {
      const lower = text.toLowerCase();
      const has = (words) => words.some((word) => lower.includes(word.toLowerCase()));
      if (has(this.completedStatus)) return SManga.COMPLETED;
      if (has(this.ongoingStatus)) return SManga.ONGOING;
      if (has(this.hiatusStatus)) return SManga.ON_HIATUS;
      if (has(this.cancelledStatus)) return SManga.CANCELLED;
      return SManga.UNKNOWN;
    }
    parseChapterDate(date) {
      if (date === null) return 0;
      let value = date;
      for (const [dual, replacement] of ARABIC_DUALS) value = value.replace(dual, replacement);
      const normalized = value.toLowerCase();
      const now = /* @__PURE__ */ new Date();
      const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      if (["today", "hoje", "hoy"].some((word) => normalized.startsWith(word))) return todayUtc;
      if (["yesterday", "ontem", "ayer", "يوم واحد"].some((word) => normalized.startsWith(word))) return todayUtc - 864e5;
      const amount = /\d+/.exec(normalized)?.[0];
      if (amount !== void 0) {
        const n = Number(amount);
        const ago = new Date(now.getTime());
        if (YEAR_WORDS.test(normalized)) return ago.setUTCFullYear(ago.getUTCFullYear() - n);
        if (MONTH_WORDS.test(normalized)) return ago.setUTCMonth(ago.getUTCMonth() - n);
        if (WEEK_WORDS.test(normalized)) return now.getTime() - n * 7 * 864e5;
        if (DAY_WORDS.test(normalized)) return now.getTime() - n * 864e5;
        if (HOUR_WORDS.test(normalized)) return now.getTime() - n * 36e5;
        if (MINUTE_WORDS.test(normalized)) return now.getTime() - n * 6e4;
        if (SECOND_WORDS.test(normalized)) return now.getTime() - n * 1e3;
      }
      return utcMidnight(parseDate(value, this.chapterDateFormat));
    }
    isUpdating(value) {
      return this.updatingRegex.test(value);
    }
  };

  // sdk/themes/madara/madara.ts
  var Madara = class extends MadaraBase {
    get pageSize() {
      return 25;
    }
    get ajaxTemplate() {
      return "madara-core/content/content-archive";
    }
    getPopularManga(page) {
      return this.ajaxList(page, "popular");
    }
    getLatestUpdates(page) {
      return this.ajaxList(page, "latest");
    }
    getSearchMangaList(page, query, filters) {
      return this.ajaxList(page, "search", query, filters);
    }
    getFilterListFromData(genres) {
      const filters = [
        new TextFilter(this.intl.get("author_filter_title"), "wp-manga-author"),
        new TextFilter(this.intl.get("artist_filter_title"), "wp-manga-artist"),
        new TextFilter(this.intl.get("year_filter_title"), "wp-manga-release"),
        new StatusFilter(this.intl.get("status_filter_title"), this.statusFilterOptions),
        new SortFilter(this.intl.get("order_by_filter_title"), this.orderByFilterOptions),
        new AdultFilter(this.intl.get("adult_content_filter_title"), this.adultFilterOptions)
      ];
      if (genres.length > 0) {
        filters.push(
          new Separator(),
          new Header(this.intl.get("genre_filter_header")),
          new GenreConditionFilter(this.intl.get("genre_condition_filter_title"), this.genreConditionFilterOptions),
          new GenreList(this.intl.get("genre_filter_title"), genres)
        );
      }
      return filters;
    }
    async ajaxList(page, mode, query = "", filters = []) {
      const body = new FormBody().add("action", "madara_load_more").add("page", String(page - 1)).add("template", this.ajaxTemplate).add("vars[paged]", "1").add("vars[template]", "archive").add("vars[posts_per_page]", String(this.pageSize)).add("vars[post_type]", "wp-manga").add("vars[post_status]", "publish").add("vars[manga_archives_item_layout]", "big_thumbnail");
      if (this.filterNonMangaItems) {
        body.add("vars[meta_query][0][key]", "_wp_manga_chapter_type");
        body.add("vars[meta_query][0][value]", "manga");
      }
      if (mode === "popular") sort(body, "_wp_manga_views");
      else if (mode === "latest") sort(body, "_latest_update");
      else this.addFilters(body, query, filters, this.filterNonMangaItems ? 1 : 0);
      const response = await this.client.post(`${this.baseUrl}/wp-admin/admin-ajax.php`, body.build(), {
        headers: this.xhrHeaders,
        fetch: Fetch.XHR
      });
      const mangas = this.parseArchive(response.asJsoup());
      return new MangasPage(mangas, mangas.length === this.pageSize);
    }
    addFilters(body, query, filters, initialMetaQueryIndex) {
      if (query.trim()) body.add("vars[s]", query);
      let metaQueryIndex = initialMetaQueryIndex;
      let taxonomyQueryIndex = 0;
      const genreList = filters.find((filter) => filter instanceof GenreList);
      const genres = genreList ? genreList.state.filter((box) => box.state).map((box) => box.value) : [];
      for (const filter of filters) {
        if (filter instanceof TextFilter) {
          if (filter.state.trim()) {
            body.add(`vars[tax_query][${taxonomyQueryIndex}][taxonomy]`, filter.taxonomy);
            body.add(`vars[tax_query][${taxonomyQueryIndex}][field]`, "name");
            body.add(`vars[tax_query][${taxonomyQueryIndex}][terms]`, filter.state);
            taxonomyQueryIndex++;
          }
        } else if (filter instanceof StatusFilter) {
          const states = filter.state.filter((tag) => tag.state).map((tag) => tag.value);
          if (states.length > 0) {
            body.add(`vars[meta_query][${metaQueryIndex}][key]`, "_wp_manga_status");
            body.add(`vars[meta_query][${metaQueryIndex}][compare]`, "IN");
            states.forEach((state, i) => body.add(`vars[meta_query][${metaQueryIndex}][value][${i}]`, state));
            metaQueryIndex++;
          }
        } else if (filter instanceof SortFilter) {
          switch (filter.key()) {
            case "latest":
              sort(body, "_latest_update");
              break;
            case "alphabet":
              body.add("vars[orderby]", "post_title").add("vars[order]", "ASC");
              break;
            case "rating":
              body.add("vars[meta_query][query_average_reviews][key]", "_manga_avarage_reviews").add("vars[meta_query][query_average_reviews][compare]", "EXISTS").add("vars[meta_query][query_total_reviews][key]", "_manga_total_votes").add("vars[meta_query][query_total_reviews][compare]", "EXISTS").add("vars[orderby][query_average_reviews]", "DESC").add("vars[orderby][query_total_reviews]", "DESC");
              break;
            case "trending":
              sort(body, "_wp_manga_week_views_value");
              break;
            case "views":
              sort(body, "_wp_manga_views");
              break;
            case "new-manga":
              body.add("vars[orderby]", "date").add("vars[order]", "DESC");
              break;
          }
        } else if (filter instanceof AdultFilter) {
          if (filter.state !== 0) {
            body.add(`vars[meta_query][${metaQueryIndex}][key]`, "manga_adult_content");
            body.add(`vars[meta_query][${metaQueryIndex}][compare]`, filter.state === 1 ? "not exists" : "exists");
            metaQueryIndex++;
          }
        } else if (filter instanceof GenreConditionFilter) {
          if (filter.state === 1 && genres.length > 0) body.add(`vars[tax_query][${taxonomyQueryIndex}][operation]`, "AND");
        } else if (filter instanceof GenreList) {
          if (genres.length > 0) {
            body.add(`vars[tax_query][${taxonomyQueryIndex}][taxonomy]`, "wp-manga-genre");
            body.add(`vars[tax_query][${taxonomyQueryIndex}][field]`, "slug");
            genres.forEach((slug, i) => body.add(`vars[tax_query][${taxonomyQueryIndex}][terms][${i}]`, slug));
          }
        }
      }
    }
  };
  function sort(body, key) {
    body.add("vars[orderby]", "meta_value_num").add("vars[meta_key]", key).add("vars[order]", "DESC");
  }

  // src/en/mangasushi/index.ts
  var Mangasushi = class extends Madara {
    constructor() {
      super(...arguments);
      this.name = "Mangasushi";
      this.lang = "en";
      this.baseUrl = "https://mangasushi.org";
    }
    get chapterMode() {
      return "MangaAjax" /* MangaAjax */;
    }
  };
  var index_default = defineExtension([new Mangasushi()]);
  return __toCommonJS(index_exports);
})();
