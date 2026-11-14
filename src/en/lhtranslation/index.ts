// Port of src/en/lhtranslation @ d9420cd1 (theme: sdk/themes/madara). Method names follow the original.
import { defineExtension } from "@sdk";
import { ChapterMode, Madara } from "@sdk/themes/madara";

class LHTranslation extends Madara {
  readonly name = "LHTranslation";
  readonly lang = "en";
  readonly baseUrl = "https://lhtranslation.net";
  override readonly versionId = 2;

  protected override get chapterMode() {
    return ChapterMode.MangaAjax;
  }
}

export default defineExtension([new LHTranslation()]);
