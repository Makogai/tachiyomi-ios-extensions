// Port of src/en/mangasushi @ d9420cd1 (theme: sdk/themes/madara). Method names follow the original.
import { defineExtension } from "@sdk";
import { ChapterMode, Madara } from "@sdk/themes/madara";

// Common overrides: chapterMode (ChapterMode.MangaAjax, AdminAjax, …), mangaSubString, chapterDateFormat, selectors such as mangaDetailsSelectorDescription.
class Mangasushi extends Madara {
  readonly name = "Mangasushi";
  readonly lang = "en";
  readonly baseUrl = "https://mangasushi.org";

  protected override get chapterMode() {
    return ChapterMode.MangaAjax;
  }
}

export default defineExtension([new Mangasushi()]);
