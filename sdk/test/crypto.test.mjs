import assert from "node:assert/strict";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { test } from "node:test";
import { importTs } from "./sdk.mjs";

const sdk = await importTs();

test("md5Bytes matches node:crypto", () => {
  for (const text of ["", "a", "abc", "x".repeat(55), "x".repeat(64), "ünïcödé 漢字 🙂".repeat(9)]) {
    const bytes = Buffer.from(text, "utf8");
    assert.equal(sdk.bytesToHex(sdk.md5Bytes(bytes)), createHash("md5").update(bytes).digest("hex"));
  }
});

test("base64 and UTF-8 round trip", () => {
  const bytes = randomBytes(257);
  assert.deepEqual(Buffer.from(sdk.base64ToBytes(bytes.toString("base64"))), bytes);
  assert.equal(sdk.bytesToBase64(bytes), bytes.toString("base64"));
  const text = "ünïcödé 漢字 🙂";
  assert.equal(sdk.utf8Decode(sdk.utf8Encode(text)), text);
});

for (const keyLength of [16, 24, 32]) {
  test(`aesCbcDecrypt reverses AES-${keyLength * 8}-CBC`, () => {
    const key = randomBytes(keyLength);
    const iv = randomBytes(16);
    const plain = Buffer.from("The quick brown fox jumps over the lazy dog, twice: ".repeat(3));
    const cipher = createCipheriv(`aes-${keyLength * 8}-cbc`, key, iv);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    assert.deepEqual(Buffer.from(sdk.aesCbcDecrypt(encrypted, key, iv)), plain);
  });
}

test("cryptoJsDecrypt reverses CryptoJS-style passphrase encryption", () => {
  const salt = randomBytes(8);
  const passphrase = "wpmangaprotectornonce";
  // EVP_BytesToKey with MD5, computed with node:crypto.
  let derived = Buffer.alloc(0);
  let previous = Buffer.alloc(0);
  while (derived.length < 48) {
    previous = createHash("md5").update(Buffer.concat([previous, Buffer.from(passphrase), salt])).digest();
    derived = Buffer.concat([derived, previous]);
  }
  const cipher = createCipheriv("aes-256-cbc", derived.subarray(0, 32), derived.subarray(32, 48));
  const plain = JSON.stringify(JSON.stringify(["https://example.org/1.jpg", "https://example.org/2.jpg"]));
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]).toString("base64");
  assert.equal(sdk.cryptoJsDecrypt(ciphertext, passphrase, salt.toString("hex")), plain);
});
