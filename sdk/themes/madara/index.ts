// lib-multisrc/madara @ d9420cd1. A site on this theme:
//
//   class Mangasushi extends Madara {
//     readonly name = "Mangasushi";
//     readonly lang = "en";
//     readonly baseUrl = "https://mangasushi.org";
//     protected override get chapterMode() { return ChapterMode.MangaAjax; }
//   }
export * from "./filters";
export { Madara } from "./madara";
export { ChapterMode, MadaraBase, type SearchCard } from "./madara-base";
export { MadaraNoAjax } from "./madara-no-ajax";
