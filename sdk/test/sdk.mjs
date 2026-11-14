// Bundles the SDK (or a theme) to an ES module in memory, so tests can import the TypeScript.
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function importTs(entry = "sdk/src/index.ts") {
  const result = await esbuild.build({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    format: "esm",
    platform: "neutral",
    write: false,
    absWorkingDir: root,
    tsconfig: path.join(root, "tsconfig.json"),
    logLevel: "silent",
  });
  const code = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}
