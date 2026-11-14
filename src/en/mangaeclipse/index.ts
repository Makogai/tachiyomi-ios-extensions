// Port of src/en/mangaeclipse @ d9420cd1 (theme: sdk/themes/madara). Method names follow the original.
import { defineExtension } from "@sdk";
import { Madara } from "@sdk/themes/madara";

class MangaEclipse extends Madara {
  readonly name = "Manga Eclipse";
  readonly lang = "en";
  readonly baseUrl = "https://mangaeclipse.com";
}

export default defineExtension([new MangaEclipse()]);
