// The Node harness's HTML host must behave like SwiftSoup (Jsoup) for what ports use.
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkExpectations } from "../../scripts/lib/expect.mjs";
import { hostElement, parseDocument } from "../../scripts/lib/host/html.mjs";

const html = `<html><head><base href="/x/"><script>var a=function(p,a,c,k,e,d){}</script></head><body>
<div class="Box" id="m"><p>Hello <b>there</b>  now!</p><p>Status: Ongoing</p>
<ul><li><a href="c1">One</a></li><li><a href="c2" title="Next Page">Two</a></li><li>3</li></ul>
<section x-data="{scroll: 1}"><img src="i.jpg"></section><table><tr><td>x</td></tr></table></div></body></html>`;
const document = hostElement(parseDocument(html, "https://example.org/a/b"));
const texts = (css) => document.select(css).map((element) => element.text());

test("Jsoup text pseudos: :contains is case-insensitive, :containsOwn, :containsData, :matches", () => {
  assert.deepEqual(texts("p:contains(STATUS)"), ["Status: Ongoing"]);
  assert.deepEqual(texts("p:containsOwn(hello now)"), ["Hello there now!"]);
  assert.equal(document.select("script:containsData(function(p,a,c,k,e,d))").length, 1);
  assert.deepEqual(texts("p:matches((?i)status)"), ["Status: Ongoing"]);
  assert.equal(document.select("div:has(> p:matches(\\d|Ongoing))").length, 1);
});

test("Jsoup index pseudos count siblings, not results", () => {
  assert.deepEqual(texts("li:eq(1)"), ["Two"]);
  assert.deepEqual(texts("li:lt(2)"), ["One", "Two"]);
  assert.deepEqual(texts("li:gt(0)"), ["Two", "3"]);
});

test("Jsoup attribute queries: regex ~=, !=, [^prefix], case-insensitive values", () => {
  assert.equal(document.select("section[x-data~=scroll] > img").length, 1);
  assert.deepEqual(texts("a[title=next page]"), ["Two"]);
  assert.deepEqual(texts("a[href!=c1]"), ["Two"]);
  assert.equal(document.select("[^x-]").length, 1);
});

test("select includes the element itself and stops at it", () => {
  const div = document.selectFirst("div#m");
  assert.equal(div.select("div").length, 1);
  assert.equal(div.select("> p").length, 2);
  assert.equal(div.select("body div").length, 0);
  assert.equal(document.select("table > tbody > tr").length, 1, "HTML5 tree building adds tbody");
});

test("text, ownText, data and abs: URLs follow Jsoup", () => {
  const div = document.selectFirst("div#m");
  assert.equal(div.text(), "Hello there now! Status: Ongoing One Two 3 x");
  assert.equal(document.selectFirst("p").ownText(), "Hello now!");
  assert.equal(document.selectFirst("script").data(), "var a=function(p,a,c,k,e,d){}");
  assert.equal(document.selectFirst("a").attr("abs:href"), "https://example.org/x/c1", "<base href> is the base URI");
  assert.equal(document.selectFirst("a").absUrl("missing"), "");
  assert.equal(document.location(), "https://example.org/a/b");
});

test("expectations follow the app's semantics", () => {
  const result = { mangas: [{ title: "A", status: 1, author: null }], hasNextPage: true };
  assert.deepEqual(checkExpectations(result, { "mangas.length": 1, "mangas.0.title": { contains: "A" }, hasNextPage: 1 }), []);
  assert.equal(checkExpectations(result, { "mangas.0.author": null }).length, 1, "a null field never matches");
  assert.deepEqual(checkExpectations(null, { "": null }), []);
  assert.equal(checkExpectations(result, { "mangas.0.status": { gte: 1 } }).length, 1);
});
