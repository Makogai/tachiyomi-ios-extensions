// A Node implementation of `__host` (sdk/src/host.ts, host API level 2) for tests and debugging.
// HTTP goes to a pluggable transport (fixtures or the network); everything else mirrors the app's
// ExtensionContext.installHostAPI().
import { createHash } from "node:crypto";
import vm from "node:vm";
import { hostElement, parseDocument } from "./html.mjs";

export const HOST_API_LEVEL = 2;

/**
 * @param {object} options
 * @param {(payload: object) => Promise<{status:number,url:string,headers:Record<string,string>,body:Buffer|string}>} options.transport
 * @param {(event: object) => void} [options.observer]  receives request/response/select/log events
 * @param {Map<string, string>} [options.preferences]  "<source>:<key>" → JSON
 */
export function createHost({ transport, observer = () => {}, preferences = new Map() }) {
  const selectObserver = {
    onSelect: (selector, count, location) => observer({ type: "select", selector, count, location }),
  };
  return {
    apiLevel: HOST_API_LEVEL,

    http(payloadJSON, callback) {
      let payload;
      try {
        payload = JSON.parse(payloadJSON);
      } catch (error) {
        callback(`Invalid HTTP request: ${error.message}`, null);
        return;
      }
      observer({ type: "request", payload });
      const started = Date.now();
      Promise.resolve()
        .then(() => transport(payload))
        .then(
          (response) => {
            const bytes = Buffer.isBuffer(response.body) ? response.body : Buffer.from(response.body ?? "", "utf8");
            observer({ type: "response", payload, response: { ...response, body: bytes }, ms: Date.now() - started });
            if (payload.ensureSuccess && (response.status < 200 || response.status > 299)) {
              callback(`HTTP ${response.status} from ${hostOf(response.url || payload.url)}`, null);
              return;
            }
            const body = payload.responseType === "base64" ? bytes.toString("base64") : bytes.toString("utf8");
            callback(null, JSON.stringify({ status: response.status, url: response.url || payload.url, headers: lowerKeys(response.headers), body }));
          },
          (error) => {
            observer({ type: "error", payload, error });
            callback(error instanceof Error ? error.message : String(error), null);
          },
        );
    },

    parseHtml(html, baseUri) {
      return hostElement(parseDocument(html, baseUri), selectObserver);
    },

    prefGet(source, key) {
      return preferences.get(`${source}:${key}`) ?? null;
    },

    prefSet(source, key, valueJSON) {
      if (valueJSON === "null") preferences.delete(`${source}:${key}`);
      else preferences.set(`${source}:${key}`, valueJSON);
    },

    // A fresh, empty context per call, like the app's JavaScriptEvaluator.evaluate.
    evaluate(script) {
      const value = vm.runInNewContext(script, Object.create(null), { timeout: 5000 });
      return value === undefined || value === null ? null : String(value);
    },

    md5: (text) => createHash("md5").update(text, "utf8").digest("hex"),
    sha256: (text) => createHash("sha256").update(text, "utf8").digest("hex"),
    base64Encode: (text) => Buffer.from(text, "utf8").toString("base64"),
    base64Decode(text) {
      const bytes = Buffer.from(text.replace(/[^A-Za-z0-9+/=]/g, ""), "base64");
      const decoded = new TextDecoder("utf-8", { fatal: true });
      try {
        return decoded.decode(bytes);
      } catch {
        return null;
      }
    },

    log(level, message) {
      observer({ type: "log", level, message });
    },

    webview(_payloadJSON, callback) {
      // The app runs a real WKWebView; Node has none. Sources that need it are checked in the app.
      Promise.resolve().then(() => callback("The Node harness has no WebView; check this call in the app.", null));
    },
  };
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function lowerKeys(headers = {}) {
  return Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), String(value)]));
}
