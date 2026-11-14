// Port of src/en/manhuahot @ d9420cd1 (theme: sdk/themes/madara). Method names follow the original.
import { defineExtension } from "@sdk";
import { Madara } from "@sdk/themes/madara";

class ManhuaHot extends Madara {
  readonly name = "ManhuaHot";
  readonly lang = "en";
  readonly baseUrl = "https://manhuahot.com";
}

export default defineExtension([new ManhuaHot()]);
