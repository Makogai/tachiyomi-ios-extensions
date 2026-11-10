import assert from "node:assert/strict";
import { test } from "node:test";
import { generateId } from "../../scripts/source-id.mjs";

// IDs hard-coded in keiyoushi/extensions-source build.gradle.kts files (d9420cd1), so produced by
// Kotlin's generateId. The app's Swift implementation is tested against the same values.
const fixtures = [
  ["YuriNeko", "vi", 1, "4413681066613655890"],
  ["Desu", "ru", 1, "6684416167758830305"],
  ["小黄书", "zh-Hans", 1, "170542391855030753"],
  ["Mundo Hentai", "pt-BR", 2, "141171756957474060"],
  ["Flame Comics", "en", 2, "8531542650987673943"],
  ["Arc-Relight", "en", 3, "6809555026902049727"],
];

for (const [name, lang, versionId, expected] of fixtures) {
  test(`generateId matches Kotlin for ${name} (${lang}) v${versionId}`, () => {
    assert.equal(generateId(name, lang, versionId), expected);
  });
}
