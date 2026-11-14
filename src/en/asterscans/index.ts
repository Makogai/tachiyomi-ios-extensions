// Port of src/en/asterscans @ d9420cd1 (theme: sdk/themes/mangathemesia). Method names follow the original.
import { defineExtension } from "@sdk";
import { MangaThemesia } from "@sdk/themes/mangathemesia";

// Common overrides: mangaUrlDirectory, datePattern, hasProjectPage, pageSelector, seriesDescriptionSelector.
class AsterScans extends MangaThemesia {
  readonly name = "Aster Scans";
  readonly lang = "en";
  readonly baseUrl = "https://asterscans.com";
}

export default defineExtension([new AsterScans()]);
