// src/all/mangadex/.../MangaDexHelper.kt @ d9420cd1 (the parts that do not need the client).
import { type Intl, parseIsoDate, SChapter, SManga } from "@sdk";
import {
  ALL_LANGUAGES,
  CDN_URL,
  LEGACY_NO_GROUP_ID,
  ORIGINAL_LANGUAGE_NAMES,
  romanizedLangCodes,
  TAG_ANTHOLOGY_UUID,
  TAG_GROUPS_ORDER,
  TAG_ONE_SHOT_UUID,
} from "./constants";
import {
  type AggregateVolume,
  ARTIST,
  AUTHOR,
  type AuthorArtistAttributesDto,
  type ChapterDataDto,
  COVER_ART,
  type CoverArtAttributesDto,
  localized,
  type MangaAttributesDto,
  type MangaDataDto,
  relationshipsOfType,
  SCANLATION_GROUP,
  type ScanlationGroupAttributes,
  USER,
  type UserAttributes,
} from "./dto";
import { compareNames, getTags } from "./filters";

/** Gets the UUID from the url */
export const getUUIDFromUrl = (url: string) => url.slice(url.lastIndexOf("/") + 1);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hearts: "♥", hellip: "…", mdash: "—",
  ndash: "–", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", copy: "©", reg: "®",
  trade: "™", deg: "°", times: "×", middot: "·", bull: "•", star: "☆", eacute: "é", egrave: "è", agrave: "à",
  aacute: "á", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", ccedil: "ç", uuml: "ü", ouml: "ö", auml: "ä",
  szlig: "ß", frac12: "½", sup2: "²", larr: "←", rarr: "→", uarr: "↑", darr: "↓", spades: "♠", clubs: "♣", diams: "♦",
};

/**
 * `Parser.unescapeEntities(text, false)`: numeric entities and the named ones MangaDex text
 * uses. Unknown names stay as written, as Jsoup leaves them.
 */
export function removeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (whole, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[entity] ?? NAMED_ENTITIES[entity.toLowerCase()] ?? whole;
  });
}

// Kotlin's `[^]]` is "not ]"; JavaScript needs it escaped.
const markdownLinksRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
const markdownItalicBoldRegex = /\*+\s*([^*]*)\s*\*+/g;
const markdownItalicRegex = /_+\s*([^_]*)\s*_+/g;
const titleSpecialCharactersRegex = /[^a-z0-9]+/g;
const trailingHyphenRegex = /-+$/;

/** Removes HTML entities and Markdown links, italics and bold from a description. */
export function removeEntitiesAndMarkdown(text: string): string {
  const entities = removeEntities(text);
  const index = entities.indexOf("\n---");
  return (index < 0 ? entities : entities.slice(0, index))
    .replace(markdownLinksRegex, "$1")
    .replace(markdownItalicBoldRegex, "$1")
    .replace(markdownItalicRegex, "$1")
    .trim();
}

function volumesOf(volumes: Record<string, AggregateVolume> | AggregateVolume[] | null | undefined): Record<string, AggregateVolume> {
  return volumes && !Array.isArray(volumes) ? volumes : {};
}

/** Maps MangaDex status to Tachiyomi status. Adapted from the MangaDex handler from TachiyomiSY. */
export function getPublicationStatus(attr: MangaAttributesDto, aggregate: Record<string, AggregateVolume> | AggregateVolume[] | null | undefined): number {
  const volumes = volumesOf(aggregate);
  const chaptersList = Object.values(volumes).flatMap((volume) => Object.values(volume.chapters ?? {}).map((chapter) => chapter.chapter));

  const tempStatus =
    attr.status === "ongoing"
      ? SManga.ONGOING
      : attr.status === "cancelled"
        ? SManga.CANCELLED
        : attr.status === "completed"
          ? SManga.PUBLISHING_FINISHED
          : attr.status === "hiatus"
            ? SManga.ON_HIATUS
            : SManga.UNKNOWN;

  const publishedOrCancelled = tempStatus === SManga.PUBLISHING_FINISHED || tempStatus === SManga.CANCELLED;
  const tags = attr.tags ?? [];
  const isOneShot = tags.some((tag) => tag.id === TAG_ONE_SHOT_UUID) && !tags.some((tag) => tag.id === TAG_ANTHOLOGY_UUID);

  if (attr.lastChapter != null && chaptersList.includes(attr.lastChapter) && publishedOrCancelled) return SManga.COMPLETED;
  if (isOneShot && volumes.none?.chapters?.none != null) return SManga.COMPLETED;
  return tempStatus;
}

/** `List<LocalizedString>.findTitleByLang`: the title of the first entry in `lang`. */
function findTitleByLang(altTitles: Record<string, string>[], lang: string): string | null {
  const entry = altTitles.find((title) => title[lang] != null);
  if (!entry) return null;
  const values = Object.values(entry);
  return values.length === 1 ? values[0] : null;
}

/** Create an [SManga] from the JSON element with only basic attributes filled. */
export function createBasicManga(mangaDataDto: MangaDataDto, coverFileName: string | null, coverSuffix: string | null, lang: string, preferExtensionLangTitle: boolean): SManga {
  const manga = SManga.create();
  manga.url = `/manga/${mangaDataDto.id}`;
  const attributes = mangaDataDto.attributes as MangaAttributesDto;
  const titleMap = localized(attributes.title);
  const altTitles = (attributes.altTitles ?? []).map(localized);
  let title: string | null = titleMap[lang] ?? null;
  if (title == null) {
    const mainTitle = Object.values(titleMap)[0] ?? null;
    const langTitle = findTitleByLang(altTitles, lang);
    const enTitle = findTitleByLang(altTitles, "en");
    title = (preferExtensionLangTitle ? [langTitle, mainTitle, enTitle] : [mainTitle, langTitle, enTitle]).find((value) => value != null) ?? null;
  }
  manga.title = title == null ? "" : removeEntities(title);
  if (coverFileName != null) {
    manga.thumbnail_url = coverSuffix ? `${CDN_URL}/covers/${mangaDataDto.id}/${coverFileName}${coverSuffix}` : `${CDN_URL}/covers/${mangaDataDto.id}/${coverFileName}`;
  }
  return manga;
}

function capitalize(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

const distinct = (values: string[]) => [...new Set(values)];

export interface CreateMangaOptions {
  lang: string;
  coverSuffix: string | null;
  altTitlesInDesc: boolean;
  preferExtensionLangTitle: boolean;
  finalChapterInDesc: boolean;
}

/** Create an [SManga] from the JSON element with all attributes filled. */
export function createManga(
  intl: Intl,
  mangaDataDto: MangaDataDto,
  chapters: Record<string, AggregateVolume> | AggregateVolume[] | null | undefined,
  firstVolumeCover: string | null,
  options: CreateMangaOptions,
): SManga {
  const attr = mangaDataDto.attributes as MangaAttributesDto;
  const { lang } = options;

  // Things that will go with the genre tags but aren't actually genre
  const nonGenres = [
    attr.publicationDemographic ? intl.get(`publication_demographic_${attr.publicationDemographic.toLowerCase()}`) : null,
    attr.contentRating && attr.contentRating !== "safe" ? intl.format("content_rating_genre", intl.get(`content_rating_${attr.contentRating.toLowerCase()}`)) : null,
    attr.originalLanguage ? capitalize(ORIGINAL_LANGUAGE_NAMES[attr.originalLanguage.toLowerCase()] ?? attr.originalLanguage) : null,
  ].filter((value): value is string => value != null);

  const authors = distinct(
    relationshipsOfType<AuthorArtistAttributesDto>(mangaDataDto, AUTHOR)
      .map((author) => author.attributes?.name)
      .filter((name): name is string => name != null),
  );
  const artists = distinct(
    relationshipsOfType<AuthorArtistAttributesDto>(mangaDataDto, ARTIST)
      .map((artist) => artist.attributes?.name)
      .filter((name): name is string => name != null),
  );

  const coverFileName = firstVolumeCover ?? relationshipsOfType<CoverArtAttributesDto>(mangaDataDto, COVER_ART)[0]?.attributes?.fileName ?? null;

  const tags = new Map(getTags(intl).map((tag) => [tag.id, tag.name]));
  const genresMap = new Map<string, string[]>();
  for (const tag of attr.tags ?? []) {
    const group = tag.attributes?.group ?? "";
    const name = tags.get(tag.id);
    const list = genresMap.get(group) ?? [];
    if (name != null) list.push(name);
    genresMap.set(group, list);
  }
  for (const list of genresMap.values()) list.sort(compareNames);
  const genreList = [...TAG_GROUPS_ORDER.flatMap((group) => genresMap.get(group) ?? []), ...nonGenres];

  // Build description
  const desc: string[] = [];
  const description = localized(attr.description);
  const text = description[lang] ?? description.en;
  if (text != null) desc.push(removeEntitiesAndMarkdown(text));

  if (options.altTitlesInDesc) {
    const romanizedOriginalLang = romanizedLangCodes[attr.originalLanguage ?? ""] ?? "";
    const allLanguages = lang === ALL_LANGUAGES;
    const altTitles = (attr.altTitles ?? [])
      .map(localized)
      .filter((title) => allLanguages || lang in title || romanizedOriginalLang in title)
      .map((title) => Object.entries(title))
      .filter((entries) => entries.length === 1)
      .map((entries) => entries[0])
      .filter(([, title]) => title.length > 0)
      .map(([code, title]) => (allLanguages ? `[${code}] ${title}` : title));
    if (altTitles.length > 0) {
      desc.push(removeEntities(`${intl.get("alternative_titles")}\n${altTitles.map((title) => `• ${title}`).join("\n")}`));
    }
  }

  if (options.finalChapterInDesc) {
    const finalChapter: string[] = [];
    if (attr.lastVolume) finalChapter.push(`Vol.${attr.lastVolume}`);
    if (attr.lastChapter) finalChapter.push(`Ch.${attr.lastChapter}`);
    if (finalChapter.length > 0) desc.push(removeEntities(`${intl.get("final_chapter")}\n${finalChapter.join(" ")}`));
  }

  const manga = createBasicManga(mangaDataDto, coverFileName, options.coverSuffix, lang, options.preferExtensionLangTitle);
  manga.description = desc.join("\n\n");
  manga.author = authors.join(", ");
  manga.artist = artists.join(", ");
  manga.status = getPublicationStatus(attr, chapters);
  manga.genre = genreList.filter((genre) => genre.length > 0).join(", ");
  return manga;
}

/** Create the [SChapter] from the JSON element. */
export function createChapter(intl: Intl, lang: string, chapterDataDto: ChapterDataDto): SChapter {
  const attr = chapterDataDto.attributes!;

  let groups = relationshipsOfType<ScanlationGroupAttributes>(chapterDataDto, SCANLATION_GROUP)
    .filter((group) => group.id !== LEGACY_NO_GROUP_ID) // 'no group' left over from MDv3
    .map((group) => group.attributes?.name)
    .filter((name): name is string => name != null)
    .join(" & ");
  if (!groups) {
    // Fallback to uploader name if no group is set.
    const users = relationshipsOfType<UserAttributes>(chapterDataDto, USER)
      .map((user) => user.attributes?.username)
      .filter((name): name is string => name != null);
    groups = users.length > 0 ? intl.format("uploaded_by", users.join(" & ")) : "";
  }
  if (!groups) groups = intl.get("no_group"); // "No Group" as final resort

  // Build chapter name
  const chapterName: string[] = [];
  if (attr.volume) chapterName.push(`Vol.${attr.volume}`);
  if (attr.chapter) chapterName.push(`Ch.${attr.chapter}`);
  if (attr.title) {
    if (chapterName.length > 0) chapterName.push("-");
    chapterName.push(attr.title);
  }
  // if volume, chapter and title is empty its a oneshot
  if (chapterName.length === 0) chapterName.push("Oneshot");

  const unavailablePrefix = attr.isUnavailable === true ? `${intl.get("chapter_unavailable_prefix")} - ` : "";
  const languagePrefix = lang === ALL_LANGUAGES ? `[${attr.translatedLanguage}] ` : "";

  const chapter = SChapter.create();
  chapter.url = `/chapter/${chapterDataDto.id}`;
  chapter.name = removeEntities(chapterName.join(" "));
  chapter.date_upload = parseIsoDate(attr.publishAt);
  chapter.scanlator = languagePrefix + unavailablePrefix + groups;
  return chapter;
}

export function titleToSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(titleSpecialCharactersRegex, "-")
    .replace(trailingHyphenRegex, "")
    .split("-")
    .reduce((accumulator, element) => {
      const currentSlug = `${accumulator}-${element}`;
      return currentSlug.length > 100 ? accumulator : currentSlug;
    });
}
