// Port of src/en/manhuaplus @ d9420cd1 (theme: sdk/themes/madara). Method names follow the original.
// Upstream's getImageRequest swaps in the system User-Agent for *.wordpress.com images; the apps
// already send a real browser's headers, so it is not needed here.
import { defineExtension } from "@sdk";
import { Madara } from "@sdk/themes/madara";

class ManhuaPlus extends Madara {
  readonly name = "Manhua Plus";
  readonly lang = "en";
  readonly baseUrl = "https://manhuaplus.com";

  protected override get filterNonMangaItems() {
    return false;
  }

  protected override get pageListParseSelector() {
    return ".read-container img";
  }
}

export default defineExtension([new ManhuaPlus()]);
