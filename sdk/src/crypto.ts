/**
 * Byte-level crypto in plain JavaScript, for sites that encrypt their page lists (CryptoJS-style
 * AES with an OpenSSL key derivation, as Madara's chapter protector). The host's `md5`/`sha256`
 * only hash UTF-8 text to hex; these work on bytes and need nothing from the host.
 */

export function utf8Encode(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
  }
  return Uint8Array.from(bytes);
}

export function utf8Decode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const byte = bytes[i];
    let code: number;
    let length: number;
    if (byte < 0x80) [code, length] = [byte, 1];
    else if (byte >= 0xf0) [code, length] = [byte & 0x07, 4];
    else if (byte >= 0xe0) [code, length] = [byte & 0x0f, 3];
    else if (byte >= 0xc0) [code, length] = [byte & 0x1f, 2];
    else [code, length] = [0xfffd, 1];
    for (let j = 1; j < length; j++) code = (code << 6) | ((bytes[i + j] ?? 0) & 0x3f);
    out += String.fromCodePoint(code > 0x10ffff ? 0xfffd : code);
    i += length;
  }
  return out;
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Base64 (standard or URL-safe, padding optional, whitespace ignored) to bytes. */
export function base64ToBytes(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9+/\-_]/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    buffer = (buffer << 6) | BASE64.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b = 0, c = 0] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const triple = (a << 16) | (b << 8) | c;
    out += BASE64[(triple >> 18) & 63] + BASE64[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64[(triple >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? BASE64[triple & 63] : "=";
  }
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

// MD5 (RFC 1321)

const MD5_SHIFTS = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
const MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

/** MD5 of bytes, as bytes. */
export function md5Bytes(input: Uint8Array): Uint8Array {
  const length = input.length;
  const padded = new Uint8Array((((length + 8) >> 6) + 1) << 6);
  padded.set(input);
  padded[length] = 0x80;
  const bitLength = length * 8;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLength >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bitLength / 2 ** 32), true);
  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    let [a, b, c, d] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) [f, g] = [(b & c) | (~b & d), i];
      else if (i < 32) [f, g] = [(d & b) | (~d & c), (5 * i + 1) % 16];
      else if (i < 48) [f, g] = [b ^ c ^ d, (3 * i + 5) % 16];
      else [f, g] = [c ^ (b | ~d), (7 * i) % 16];
      const sum = (a + f + MD5_K[i] + view.getUint32(chunk + g * 4, true)) >>> 0;
      const shift = MD5_SHIFTS[(i >> 4) * 4 + (i % 4)];
      a = d;
      d = c;
      c = b;
      b = (b + ((sum << shift) | (sum >>> (32 - shift)))) >>> 0;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }
  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((word, index) => outView.setUint32(index * 4, word, true));
  return out;
}

/** OpenSSL's EVP_BytesToKey with MD5 (what CryptoJS uses for a passphrase): key and IV bytes. */
export function evpBytesToKey(password: Uint8Array, salt: Uint8Array, keyLength = 32, ivLength = 16) {
  let derived: Uint8Array = new Uint8Array(0);
  let previous: Uint8Array = new Uint8Array(0);
  while (derived.length < keyLength + ivLength) {
    previous = md5Bytes(concat(previous, password, salt));
    derived = concat(derived, previous);
  }
  return { key: derived.slice(0, keyLength), iv: derived.slice(keyLength, keyLength + ivLength) };
}

// AES (FIPS 197), decryption only

const SBOX = new Uint8Array(256);
const INV_SBOX = new Uint8Array(256);
(() => {
  let p = 1;
  let q = 1;
  do {
    p = p ^ ((p << 1) & 0xff) ^ (p & 0x80 ? 0x1b : 0);
    q ^= q << 1;
    q ^= q << 2;
    q ^= q << 4;
    q &= 0xff;
    if (q & 0x80) q ^= 0x09;
    const x = q ^ ((q << 1) | (q >> 7)) ^ ((q << 2) | (q >> 6)) ^ ((q << 3) | (q >> 5)) ^ ((q << 4) | (q >> 4));
    SBOX[p] = (x ^ 0x63) & 0xff;
  } while (p !== 1);
  SBOX[0] = 0x63;
  for (let i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i;
})();

const xtime = (value: number) => ((value << 1) ^ (value & 0x80 ? 0x1b : 0)) & 0xff;
function multiply(a: number, b: number): number {
  let result = 0;
  for (let x = a, y = b; y; y >>= 1, x = xtime(x)) if (y & 1) result ^= x;
  return result;
}

function expandKey(key: Uint8Array): Uint8Array[] {
  const words = key.length / 4;
  const rounds = words + 6;
  const schedule: number[][] = [];
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
  const roundKeys: Uint8Array[] = [];
  for (let round = 0; round <= rounds; round++) roundKeys.push(Uint8Array.from(schedule.slice(round * 4, round * 4 + 4).flat()));
  return roundKeys;
}

function decryptBlock(block: Uint8Array, roundKeys: Uint8Array[]): Uint8Array {
  const rounds = roundKeys.length - 1;
  const state = block.map((byte, index) => byte ^ roundKeys[rounds][index]);
  for (let round = rounds - 1; round >= 0; round--) {
    // Inverse ShiftRows (column-major state) and SubBytes.
    const shifted = new Uint8Array(16);
    for (let column = 0; column < 4; column++) {
      for (let row = 0; row < 4; row++) shifted[((column + row) % 4) * 4 + row] = INV_SBOX[state[column * 4 + row]];
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

/** AES-CBC decryption with PKCS#7 padding (`Cipher.getInstance("AES/CBC/PKCS7Padding")`). */
export function aesCbcDecrypt(ciphertext: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
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

/**
 * CryptoJS `AES.decrypt(ciphertextBase64, passphrase)` with an explicit salt (hex), as sites
 * often send `{ct, s}` JSON: EVP_BytesToKey(MD5) → AES-256-CBC. Returns the UTF-8 plaintext.
 */
export function cryptoJsDecrypt(ciphertextBase64: string, passphrase: string, saltHex: string): string {
  const { key, iv } = evpBytesToKey(utf8Encode(passphrase), hexToBytes(saltHex));
  return utf8Decode(aesCbcDecrypt(base64ToBytes(ciphertextBase64), key, iv));
}
