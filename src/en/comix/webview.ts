// Port of src/en/comix/.../Comix.kt (runInWebView) and assets/*.js @ d9420cd1: the scripts the hidden WebView runs.
// The host WebView has no request interception, so captcha handling and chapter-list pacing
// happen inside the page (see index.ts for what differs from upstream).
import type { WebViewResult } from "@sdk";
import { CHAPTER_PAGES, HARVEST_BROWSE, HARVEST_CHAPTERS, SOLVE_CAPTCHA } from "./assets";
import type { PageMessage } from "./dto";

const CAPTCHA_DISABLED = 'Open in WebView to solve the captcha, or turn on "Solve captchas" in extension settings';

/**
 * Upstream's bootstrap (ad-overlay flag, reject bridge) plus the captcha handling it did with
 * request interception: the solver runs inside the site's /@waf/challenge frame, or the run
 * fails with the "Open in WebView" message when solving is off.
 */
export function bootstrapScript(solveCaptchas: boolean, flow: string): string {
  return `(function () {
  if (window.top !== window || window.__cxStarted) return;
  window.__cxStarted = true;
  try { localStorage.setItem("__pu1", "[" + Date.now() + "]"); } catch (e) {}
  var finished = false;
  var send = function (value) { if (!finished) __tachiyomi.post(typeof value === "string" ? value : JSON.stringify(value)); };
  var finish = function (value) { if (finished) return; send(value); finished = true; __tachiyomi.done(); };
  var fail = function (message) { finish({ type: "error", message: String(message && message.message || message) }); };
  window.__cxReject = fail;
  var solving = false;
  var runSolver = function (frameWindow) {
    if (solving) return;
    solving = true;
    try {
      frameWindow.eval("(" + ${JSON.stringify(SOLVE_CAPTCHA)} + "\\n)(function (message) { top.__cxReject(message); })");
    } catch (e) {
      fail("Couldn't solve the site's captcha (" + e.message + "), open in WebView to solve it");
    }
  };
  var checkCaptcha = function () {
    if (finished) return;
    if (location.pathname === "/@waf/challenge") {
      if (!${solveCaptchas}) return fail(${JSON.stringify(CAPTCHA_DISABLED)});
      if (document.readyState === "complete") runSolver(window);
      return;
    }
    var frames = document.querySelectorAll("iframe");
    for (var i = 0; i < frames.length; i++) {
      if ((frames[i].getAttribute("src") || "").indexOf("/@waf/challenge") < 0) continue;
      if (!${solveCaptchas}) return fail(${JSON.stringify(CAPTCHA_DISABLED)});
      try {
        var frameWindow = frames[i].contentWindow;
        if (frameWindow && frameWindow.location.pathname === "/@waf/challenge" && frameWindow.document.readyState === "complete") runSolver(frameWindow);
      } catch (e) {}
    }
  };
  setInterval(checkCaptcha, 500);
  var whenReady = function (start) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
  };
  ${flow}
})();`;
}

export function browseFlow(): string {
  return `whenReady(function () {
    window.__comixHarvestOptions = { timeoutMs: 60000, settleMs: 4000 };
    ${HARVEST_BROWSE}
    window.__comixHarvestPromise.then(function (result) {
      var items = (result.items || []).map(function (item) {
        return { hid: item.hid, title: item.title || "", url: item.url, poster: item.cover ? { small: item.cover, medium: item.cover, large: item.cover } : null };
      });
      var page = (result.listParams && result.listParams.page) || 1;
      var perPage = result.perPage || (result.listParams && result.listParams.limit) || 28;
      var hasNext = items.length > 0 && items.length >= perPage;
      if (result.error && !items.length) return fail(result.error);
      finish({ type: "result", result: { items: items, meta: { page: page, lastPage: hasNext ? page + 1 : page, hasNext: hasNext } } });
    }).catch(fail);
  });`;
}

export function chaptersFlow(mangaId: string, knownIds: number[]): string {
  return `var titlePath = ${JSON.stringify(`/title/${mangaId}`)};
  // Comix blocks chapter-list paging that is too fast or evenly spaced (upstream's RequestPacer)
  var nextAt = 0;
  var paceDelay = function () {
    var now = Date.now();
    var start = Math.max(now, nextAt);
    nextAt = start + 2500 + Math.floor(Math.random() * 2500);
    return start - now;
  };
  var isChapterList = function (url) {
    try {
      var segments = new URL(String(url), location.href).pathname.split("/").slice(1);
      return segments.length === 5 && segments[0] === "api" && segments[1] === "v1" && segments[2] === "manga" && segments[4] === "chapters";
    } catch (e) { return false; }
  };
  var xhrOpen = XMLHttpRequest.prototype.open;
  var xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) { this.__cxUrl = url; return xhrOpen.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    var xhr = this, args = arguments;
    if (isChapterList(xhr.__cxUrl)) {
      var delay = paceDelay();
      if (delay > 0) { setTimeout(function () { xhrSend.apply(xhr, args); }, delay); return; }
    }
    return xhrSend.apply(this, arguments);
  };
  var pageFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || String(input);
    if (isChapterList(url)) {
      var delay = paceDelay();
      if (delay > 0) return new Promise(function (resolve) { setTimeout(resolve, delay); }).then(function () { return pageFetch.call(window, input, init); });
    }
    return pageFetch.apply(window, arguments);
  };
  whenReady(function () {
    // Only on the requested title's page
    if (location.pathname !== titlePath && location.pathname.indexOf(titlePath + "-") !== 0) return;
    window.__comixHarvestOptions = { timeoutMs: 60000, settleMs: 6000, maxRounds: 1000, stopAtIds: ${JSON.stringify(knownIds)} };
    ${HARVEST_CHAPTERS}
    var dateOf = function (text) {
      var m = /(\\d+)\\s*(s|m|h|d|w|mo|mos|y|yr|yrs|min|mins|sec|secs|hr|hrs|day|days|week|weeks|month|months|year|years)\\s+ago/i.exec(text || "");
      return m ? m[1] + " " + m[2] + " ago" : "";
    };
    window.__comixHarvestPromise.then(function (result) {
      var queries = null;
      try {
        var raw = document.querySelector("script#initial-data");
        if (raw && raw.textContent) queries = JSON.parse(raw.textContent).queries || null;
      } catch (e) {}
      finish({ type: "result", result: {
        chapters: (result.chapters || []).map(function (ch) {
          return { id: ch.id, url: ch.url, number: ch.number, name: ch.name, votes: ch.votes, createdAtFormatted: dateOf(ch.text), group: ch.group, isOfficial: false };
        }),
        complete: !!result.complete,
        error: result.error || null,
        queries: queries
      } });
    }).catch(function (e) {
      finish({ type: "result", result: { chapters: [], complete: false, error: String(e), queries: null } });
    });
  });`;
}

/** Upstream's chapter_pages.js walk; with `onlyIndex`, ends as soon as that page's URL is in. */
export function readerFlow(seek: number, onlyIndex: number): string {
  return `window.__cxSeek = [${seek}, 0];
  var onlyIndex = ${onlyIndex};
  (${CHAPTER_PAGES}
  )(function (payload) {
    var message = JSON.parse(payload);
    if (message.type === "done") return finish(payload);
    send(payload);
    if (onlyIndex >= 0 && message.type === "page" && message.index === onlyIndex) finish({ type: "done" });
  }, fail, "__cxSeek", []);`;
}

export const INITIAL_DATA_POLL = `(function () {
  // script#initial-data is partial while the document is still parsing
  if (document.readyState === "loading") return "";
  var raw = document.querySelector("script#initial-data");
  return raw && raw.textContent ? raw.textContent : "";
})()`;

export function messagesOf(result: WebViewResult): PageMessage[] {
  return result.payloads.flatMap((payload) => {
    try {
      return [JSON.parse(payload) as PageMessage];
    } catch {
      return [];
    }
  });
}

/** The run's data, or its error, as upstream's runInWebView resolves or rejects. */
export function resultOf<T>(result: WebViewResult, timeoutMessage = "Timed out waiting for WebView"): T {
  const messages = messagesOf(result);
  const error = messages.find((it) => it.type === "error");
  if (error) throw new Error(error.message ?? "WebView failed");
  const data = messages.find((it) => it.type === "result");
  if (!data) throw new Error(timeoutMessage);
  return data.result as T;
}
