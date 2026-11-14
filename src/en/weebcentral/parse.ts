// Port of src/en/weebcentral/.../WeebCentral.kt @ d9420cd1: the site's HTML → SManga, SChapter and Page.
import { type Document, type Element, MangasPage, Page, parseIsoDate, SChapter, SManga } from "@sdk";

const seasonRegex = /(Season|S)\s*\d+/i;

const BRACKET_REGEX = /(\([^()]*\)|\[[^[\]]*])\s*$/;

// Browse and search

export function searchMangaParse(document: Document): MangasPage {
  const mangas = document.select("article > section > a").map((element) => {
    const manga = SManga.create();
    manga.thumbnail_url = sourceImg(element);
    manga.title = element.selectFirst("div:not([class]):last-child")!.text();
    manga.setUrlWithoutDomain(element.attr("abs:href"));
    return manga;
  });
  const hasNextPage = document.selectFirst("button") !== null;
  return new MangasPage([...mangas], hasNextPage);
}

// Details

/** The series page. `cleanTitle` is the setting that strips a trailing "(…)" or "[…]". */
export function mangaDetailsParse(document: Document, cleanTitle: boolean): SManga {
  const sections = document.select("section[x-data] > section");
  const result = SManga.create();

  {
    const section = sections[0];
    if (!section) throw new Error("Series page has no details section");
    result.thumbnail_url = sourceImg(section);
    result.author = section
      .select("ul > li:has(strong:contains(Author)) > span > a")
      .map((element) => element.text())
      .join(", ");
    result.genre = section
      .select("ul > li:has(strong:contains(Tag),strong:contains(Type)) a")
      .map((element) => element.text())
      .join(", ");
    result.status = parseStatus(section.selectFirst("ul > li:has(strong:contains(Status)) > a"));
  }

  {
    const section = sections[1];
    if (!section) throw new Error("Series page has no title section");
    result.title = cleanTitleIfNeeded(section.selectFirst("h1")!.text(), cleanTitle);

    let description = "";
    const synopsis = section.selectFirst("li:has(strong:contains(Description)) > p")?.text();
    if (synopsis !== undefined) {
      description += synopsis.replaceAll("NOTE: ", "\n\nNOTE: ");
    }

    const relatedSeries = section.select("li:has(strong:contains(Related Series)) li");
    if (relatedSeries.isNotEmpty()) {
      description += "\n\nRelated Series(s):";
      for (const series of relatedSeries) {
        const link = series.selectFirst("a")!;
        const relation = series.selectFirst("span")?.text() ?? "";
        description += `\n- [${link.text()}](${link.attr("abs:href")}) ${relation}`.trimEnd();
      }
    }

    const alternateTitles = section.select("li:has(strong:contains(Associated Name)) li");
    if (alternateTitles.isNotEmpty()) {
      description += "\n\nAssociated Name(s):";
      for (const title of alternateTitles) description += `\n- ${title.text()}`;
    }

    const trackers = document.select("li:has(strong:contains(Track)) span[data-tip] > a");
    if (trackers.isNotEmpty()) {
      description += "\n\nTracker(s):";
      for (const tracker of trackers) {
        const name = tracker.parent()!.attr("data-tip");
        description += `\n- [${name}](${tracker.attr("abs:href")})`;
      }
    }

    result.description = description;
  }

  result.setUrlWithoutDomain(document.location());
  return result;
}

function parseStatus(element: Element | null): number {
  switch (element?.text()?.toLowerCase()) {
    case "ongoing":
      return SManga.ONGOING;
    case "complete":
      return SManga.COMPLETED;
    case "hiatus":
      return SManga.ON_HIATUS;
    case "canceled":
      return SManga.CANCELLED;
    default:
      return SManga.UNKNOWN;
  }
}

function cleanTitleIfNeeded(title: string, cleanTitle: boolean): string {
  return cleanTitle ? title.replace(BRACKET_REGEX, "").trim() : title.trim();
}

function sourceImg(element: Element): string | null {
  const source = element.selectFirst("source");
  if (source) return source.attr("srcset").replaceAll("small", "normal");
  return element.selectFirst("img")?.attr("abs:src") ?? null;
}

// Chapters

/** The full chapter list, newest first. Seasonal names ("S2 …") are numbered by position. */
export function chapterListParse(document: Document): SChapter[] {
  // Descending
  const chapters = document.select("div[x-data] > a");

  let useIndexing = false;
  return chapters.map((element, index) => {
    const chapter = SChapter.create();
    chapter.name = element.selectFirst("span.flex > span")!.text();
    useIndexing = seasonRegex.test(chapter.name);
    chapter.setUrlWithoutDomain(element.attr("abs:href"));
    const time = element.selectFirst("time[datetime]");
    if (time) chapter.date_upload = parseIsoDate(time.attr("datetime"));
    if (useIndexing) chapter.chapter_number = chapters.length - index;

    const isOfficial = element.select("img").some((img) => img.attr("src").toLowerCase().includes("official"));
    chapter.scanlator = isOfficial ? "Official" : "Unknown";
    return chapter;
  });
}

// Pages

export function pageListParse(document: Document): Page[] {
  return document.select("section[x-data~=scroll] > img").map((element, index) => new Page(index, "", element.attr("abs:src")));
}
