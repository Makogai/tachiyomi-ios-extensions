// Builds every extension under src/<lang>/<name>/ into dist/<pkg>.js, copies its icon.png to
// dist/icon/<pkg>.png (as keiyoushi publishes icons) and writes dist/index.json.
//
// Usage: node scripts/build.mjs [pkg ...]   (no arguments builds everything)
import { build } from "./lib/build.mjs";

try {
  await build(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
