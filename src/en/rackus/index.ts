// Port of src/en/rackus @ d9420cd1 (theme: sdk/themes/mangathemesia). Method names follow the original.
import { defineExtension } from "@sdk";
import { MangaThemesia } from "@sdk/themes/mangathemesia";

class Rackus extends MangaThemesia {
  readonly name = "Rackus";
  readonly lang = "en";
  readonly baseUrl = "https://rackusreads.com";
  override readonly versionId = 3;
}

export default defineExtension([new Rackus()]);
