// Unit cases for what tests.json cannot express: source IDs, filter states, settings and the
// MD@Home refresh. Runs the built bundle through the Node host, as tests.json cases do.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "../../../scripts/lib/build.mjs";
import { createHost } from "../../../scripts/lib/host/fake-host.mjs";
import { LoadedExtension } from "../../../scripts/lib/runner.mjs";
import { generateId } from "../../../scripts/source-id.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(path.join(dir, "fixtures", name), "utf8");
const EMPTY_PAGE = JSON.stringify({ result: "ok", response: "collection", data: [], limit: 20, offset: 0, total: 0 });

const ALL = 0;
const EN = 18;
const ES = 52;

before(async () => {
  await build(["all.mangadex"], { quiet: true });
});

/** The extension with stored settings (`{ "<source>:<key>": value }`) and answers by URL prefix. */
function load({ preferences = {}, answers = [] } = {}) {
  const requests = [];
  const prefs = new Map(Object.entries(preferences).map(([key, value]) => [key, JSON.stringify(value)]));
  const transport = async (payload) => {
    requests.push(payload);
    const answer = answers.find(([prefix]) => payload.url.startsWith(prefix));
    return answer
      ? { status: 200, url: payload.url, headers: { "content-type": "application/json" }, body: answer[1] }
      : { status: 200, url: payload.url, headers: { "content-type": "application/json" }, body: EMPTY_PAGE };
  };
  const extension = new LoadedExtension("all.mangadex", createHost({ transport, preferences: prefs }));
  return { extension, requests, invoke: (source, method, args) => extension.invoke(source, method, args) };
}

const query = (url) => decodeURIComponent(new URL(url).search.slice(1)).split("&");

test("source IDs equal keiyoushi's MangaDex IDs (keiyoushi/extensions index.json)", () => {
  // The IDs index.json gets: describe()'s fixed id, else generateId(name, lang, versionId).
  const { extension } = load();
  const sources = extension.sources.map((source) => ({ ...source, id: source.id ?? generateId(source.name, source.lang, source.versionId) }));
  const ids = Object.fromEntries(sources.map((source) => [source.lang, source.id]));
  assert.equal(sources.length, 62);
  assert.equal(ids.en, "2499283573021220255");
  assert.equal(ids.all, "6404943692147160087");
  assert.equal(ids["es-419"], "4938773340256184018");
  assert.equal(ids["pt-BR"], "2655149515337070132");
  assert.equal(ids["zh-Hans"], "5148895169070562838");
  assert.equal(ids["zh-Hant"], "1493666528525752601");
  assert.equal(ids.ja, "1411768577036936240");
  assert.equal(ids.fil, "8578871918181236609");
  assert.equal(sources[EN].lang, "en");
  assert.equal(sources[ES].lang, "es");
});

test("every filter reaches the search URL", async () => {
  const { invoke, requests } = load();
  const filters = await invoke(EN, "getFilterList", []);
  assert.deepEqual(
    filters.map((filter) => filter.type),
    ["checkbox", "group", "group", "group", "group", "sort", "select", "group", "group", "group", "group", "group"],
  );
  filters[0].state = true; // has available chapters
  filters[1].state[1].state = true; // original language: Chinese
  filters[2].state[0].state = false; // content rating: no safe…
  filters[2].state[2].state = true; // …but erotica
  filters[3].state[3].state = true; // demographic: seinen
  filters[4].state[1].state = true; // status: completed
  filters[5].state = { index: 2, ascending: true }; // sort: follows, ascending
  filters[6].state = 2; // created within a week
  filters[7].state[0].state = 1; // included tags: OR
  filters[7].state[1].state = 0; // excluded tags: AND
  filters[8].state[0].state = 2; // content: exclude Gore
  filters[10].state[0].state = 1; // genre: include Action
  filters[10].state.find((tag) => tag.name === "Romance").state = 2; // genre: exclude Romance
  await invoke(EN, "getSearchManga", [1, "one  piece", filters]);

  const params = query(requests[0].url);
  const since = params.find((param) => param.startsWith("createdAtSince="));
  assert.match(since, /^createdAtSince=\d{4}-\d\d-\d\dT\d\d:00:00$/);
  const expectedSince = new Date(Date.now() - 7 * 86_400_000);
  assert.equal(since.slice(15, 28), expectedSince.toISOString().slice(0, 13));
  assert.deepEqual(
    params.filter((param) => param !== since),
    [
      "limit=20",
      "offset=0",
      "includes[]=cover_art",
      "title=one  piece",
      "hasAvailableChapters=true",
      "availableTranslatedLanguage[]=en",
      "originalLanguage[]=zh-hk",
      "originalLanguage[]=zh",
      "contentRating[]=suggestive",
      "contentRating[]=erotica",
      "publicationDemographic[]=seinen",
      "status[]=completed",
      "order[followedCount]=asc",
      "includedTagsMode=OR",
      "excludedTagsMode=AND",
      "excludedTags[]=b29d6a3d-1569-4e7a-8caf-7557bc92cd5d",
      "includedTags[]=391b0423-d847-456f-aff0-8b0cfc03066b",
      "excludedTags[]=423e2eae-a7a2-4a8b-ac03-a8351462d71d",
    ],
  );
});

test("search prefixes: grp:, author:, usr:, list:, ch: and an invalid id", async () => {
  const { invoke, requests } = load({
    answers: [
      ["https://api.mangadex.org/chapter/77fc6e02", JSON.stringify({ result: "ok", data: { id: "77fc6e02-a381-411d-ace6-4c00deacadb4", type: "chapter", relationships: [{ id: "a77742b1-befd-49a4-bff5-1ad4e6b0ef7b", type: "manga" }] } })],
      ["https://api.mangadex.org/list/", JSON.stringify({ result: "ok", data: { id: "x", type: "custom_list", relationships: [{ id: "a77742b1-befd-49a4-bff5-1ad4e6b0ef7b", type: "manga" }] } })],
    ],
  });
  const uuid = "f8cc4f8a-e596-4618-ab05-ef6572980bbf";
  await invoke(EN, "getSearchManga", [1, `grp:${uuid}`, []]);
  await invoke(EN, "getSearchManga", [1, `author:${uuid}`, []]);
  await invoke(EN, "getSearchManga", [2, `usr:${uuid}`, []]);
  await invoke(EN, "getSearchManga", [1, `list:${uuid}`, []]);
  await invoke(EN, "getSearchManga", [1, "https://mangadex.org/chapter/77fc6e02-a381-411d-ace6-4c00deacadb4/1", []]);
  const urls = requests.map((request) => decodeURIComponent(request.url));
  assert.ok(urls[0].includes(`&group=${uuid}&`));
  assert.ok(urls[1].includes(`&authorOrArtist=${uuid}&`));
  assert.ok(urls[2].startsWith("https://api.mangadex.org/chapter?offset=100&limit=100&translatedLanguage[]=en"));
  assert.ok(urls[2].includes(`&uploader=${uuid}&`));
  assert.equal(urls[3], `https://api.mangadex.org/list/${uuid}`);
  assert.ok(urls[4].includes("ids[]=a77742b1-befd-49a4-bff5-1ad4e6b0ef7b"));
  assert.equal(urls[5], "https://api.mangadex.org/chapter/77fc6e02-a381-411d-ace6-4c00deacadb4");
  assert.ok(urls[6].includes("ids[]=a77742b1-befd-49a4-bff5-1ad4e6b0ef7b"));
  await assert.rejects(invoke(EN, "getSearchManga", [1, "id:nope", []]), /Not a valid manga ID/);
});

test("settings: content ratings, original languages, cover quality, blocked groups and uploaders", async () => {
  const group = "11111111-1111-4111-8111-111111111111";
  const uploader = "22222222-2222-4222-8222-222222222222";
  const { invoke, requests } = load({
    preferences: {
      [`${EN}:contentRating_en`]: ["safe"],
      [`${EN}:originalLanguage_en`]: ["zh", "ko"],
      [`${EN}:thumbnailQuality_en`]: ".256.jpg",
      [`${EN}:blockedGroups_en`]: ` ${group} , not-a-uuid,`,
      [`${EN}:blockedUploader_en`]: uploader,
    },
    answers: [
      ["https://api.mangadex.org/manga?order", fixture("popular.json")],
      ["https://api.mangadex.org/chapter?", fixture("latest_chapters.json")],
      ["https://api.mangadex.org/manga?includes", fixture("latest_mangas.json")],
    ],
  });

  const popular = await invoke(EN, "getPopularManga", [1]);
  assert.ok(popular.mangas[0].thumbnail_url.endsWith(".jpg.256.jpg"));
  let params = query(requests[0].url);
  assert.deepEqual(params.filter((param) => param.startsWith("contentRating")), ["contentRating[]=safe"]);
  assert.deepEqual(params.filter((param) => param.startsWith("originalLanguage")), ["originalLanguage[]=zh", "originalLanguage[]=ko", "originalLanguage[]=zh-hk"]);

  // The filters start from the settings.
  const filters = await invoke(EN, "getFilterList", []);
  assert.deepEqual(filters[1].state.map((box) => box.state), [false, true, true]);
  assert.deepEqual(filters[2].state.map((box) => box.state), [true, false, false, false]);

  await invoke(EN, "getLatestUpdates", [1]);
  params = query(requests[1].url);
  const excluded = params.filter((param) => param.startsWith("excludedGroups[]=")).map((param) => param.slice(17));
  assert.equal(excluded.length, 7, "upstream's six publishers plus the valid UUID");
  assert.ok(excluded.includes(group));
  assert.deepEqual(params.filter((param) => param.startsWith("excludedUploaders")), [`excludedUploaders[]=${uploader}`]);

  await invoke(EN, "getMangaUpdate", [{ url: "/manga/a77742b1-befd-49a4-bff5-1ad4e6b0ef7b", title: "x" }, [], false, true]);
  params = query(requests.at(-1).url);
  assert.deepEqual(params.filter((param) => param.startsWith("excludedGroups")), [`excludedGroups[]=${group}`], "the feed blocks only the user's groups");
  assert.ok(params.includes("includeUnavailable=0"));
});

test("settings: alternative titles in, final chapter out of the description", async () => {
  const { invoke } = load({
    preferences: { [`${ALL}:altTitlesInDesc_all`]: true, [`${ALL}:finalChapterInDesc_all`]: false, [`${EN}:altTitlesInDesc_en`]: true },
    answers: [["https://api.mangadex.org/manga/a77742b1-befd-49a4-bff5-1ad4e6b0ef7b?", fixture("manga.json")]],
  });
  const manga = { url: "/manga/a77742b1-befd-49a4-bff5-1ad4e6b0ef7b", title: "Chainsaw Man" };
  const all = (await invoke(ALL, "getMangaUpdate", [manga, [], true, false])).manga;
  assert.match(all.description, /\n\nAlternative titles:\n• \[uk\] Людина-бензопила\n/);
  assert.doesNotMatch(all.description, /Final chapter/);
  assert.equal(all.status, 4, "no aggregate: publishing finished, not known to be complete");
  const en = (await invoke(EN, "getMangaUpdate", [manga, [], true, false])).manga;
  assert.match(en.description, /Alternative titles:\n• /);
  assert.doesNotMatch(en.description, /\[uk\]/);
  assert.match(en.description, /\n\nFinal chapter:\nCh\.232$/);
});

test("pages: data saver and the standard HTTPS port", async () => {
  const { invoke, requests } = load({
    preferences: { [`${EN}:dataSaverV5_en`]: true, [`${EN}:usePort443_en`]: true },
    answers: [["https://api.mangadex.org/at-home/server/", fixture("athome.json")]],
  });
  const pages = await invoke(EN, "getPageList", [{ url: "/chapter/77fc6e02-a381-411d-ace6-4c00deacadb4", name: "" }]);
  assert.equal(requests[0].url, "https://api.mangadex.org/at-home/server/77fc6e02-a381-411d-ace6-4c00deacadb4?forcePort443=true");
  assert.equal(pages.length, 23);
  assert.ok(pages[0].imageUrl.startsWith("/data-saver/554b6d5bcece279f439171f5a7d428c3/1-"));
});

test("image requests use the page's server, and a fresh one after five minutes", async () => {
  const { invoke, requests } = load({
    answers: [["https://api.mangadex.org/at-home/server/", JSON.stringify({ result: "ok", baseUrl: "https://fresh.mangadex.network", chapter: { hash: "h", data: [], dataSaver: [] } })]],
  });
  const tokenUrl = "https://api.mangadex.org/at-home/server/77fc6e02-a381-411d-ace6-4c00deacadb4";
  const page = (time) => ({ index: 0, url: `https://old.mangadex.network,${tokenUrl},${time}`, imageUrl: "/data/h/1.png" });

  const fresh = await invoke(EN, "getImageRequest", [page(Date.now())]);
  assert.equal(fresh.url, "https://old.mangadex.network/data/h/1.png");
  assert.equal(fresh.headers["User-Agent"], "Tachiyomi (tachiyomi-ios-extensions)");
  assert.equal(requests.length, 0);

  const stale = await invoke(EN, "getImageRequest", [page(Date.now() - 6 * 60_000)]);
  assert.equal(stale.url, "https://fresh.mangadex.network/data/h/1.png");
  await invoke(EN, "getImageRequest", [{ ...page(Date.now() - 6 * 60_000), index: 1 }]);
  assert.equal(requests.length, 1, "the refreshed server is reused for five minutes");
});

test("settings screen has upstream's preferences, in its order", () => {
  const { extension } = load();
  assert.deepEqual(
    extension.sources[EN].preferences.map((preference) => preference.key),
    [
      "thumbnailQuality_en",
      "tryUsingFirstVolumeCover_en",
      "dataSaverV5_en",
      "usePort443_en",
      "altTitlesInDesc_en",
      "preferExtensionLangTitle_en",
      "finalChapterInDesc_en",
      "includeUnavailable_en",
      "contentRating_en",
      "originalLanguage_en",
      "blockedGroups_en",
      "blockedUploader_en",
    ],
  );
  assert.equal(extension.sources[ES].preferences[0].title, "Calidad de la portada");
});
