import { createHash } from "node:crypto";

/**
 * Source ID exactly as Kotlin's `HttpSource.generateId`: the first 8 bytes of
 * MD5("${name.lowercase()}/$lang/$versionId") read big-endian, with the sign bit cleared.
 * Returned as a decimal string, because it does not fit in a JavaScript number.
 */
export function generateId(name, lang, versionId = 1) {
  const digest = createHash("md5").update(`${name.toLowerCase()}/${lang}/${versionId}`, "utf8").digest();
  return (digest.readBigUInt64BE(0) & 0x7fffffffffffffffn).toString();
}
