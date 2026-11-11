import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../src");
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Every extension ships an icon.png (keiyoushi's res/mipmap-xxxhdpi/ic_launcher.png), which the
// build publishes as icon/<pkg>.png and lists in index.json.
test("every extension has a PNG icon", async () => {
  for (const lang of await readdir(srcDir)) {
    const langDir = path.join(srcDir, lang);
    if (!(await stat(langDir)).isDirectory()) continue;
    for (const name of await readdir(langDir)) {
      const dir = path.join(langDir, name);
      try {
        await stat(path.join(dir, "extension.json"));
      } catch {
        continue;
      }
      const icon = await readFile(path.join(dir, "icon.png"));
      assert.ok(icon.subarray(0, 8).equals(pngSignature), `${lang}.${name}/icon.png is not a PNG`);
    }
  }
});
