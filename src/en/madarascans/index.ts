// Port of src/en/madarascans @ d9420cd1 (theme: sdk/themes/mangathemesia). Method names follow the original.
import { defineExtension, type PreferenceScreen } from "@sdk";
import { MangaThemesia, MangaThemesiaPaidChapterHelper } from "@sdk/themes/mangathemesia";

class MadaraScans extends MangaThemesia {
  readonly name = "Madara Scans";
  readonly lang = "en";
  readonly baseUrl = "https://madarascans.net";

  protected override get mangaUrlDirectory() {
    return "/series";
  }

  private readonly paidChapterHelper = new MangaThemesiaPaidChapterHelper();

  protected override chapterListSelector(): string {
    return this.paidChapterHelper.getChapterListSelectorBasedOnHidePaidChaptersPref(super.chapterListSelector(), this.preferences);
  }

  override setupPreferenceScreen(screen: PreferenceScreen): void {
    this.paidChapterHelper.addHidePaidChaptersPreferenceToScreen(screen, this.intl);
  }
}

export default defineExtension([new MadaraScans()]);
