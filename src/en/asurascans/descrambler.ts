// Port of src/en/asurascans/.../AsuraScans.kt (scrambledImageInterceptor) @ d9420cd1, as tile moves for getImageTransform.
import type { ImageTile, ImageTransform } from "@sdk";
import type { PageData } from "./dto";

/**
 * Tile `w` of the download (row-major, `tileCols` × `tileRows` tiles of `width / tileCols` ×
 * `height / tileRows`) is drawn at position `tiles[w]` of an output trimmed to whole tiles.
 */
export function descrambleTransform(pageData: PageData, width: number, height: number): ImageTransform {
  const tileW = Math.trunc(width / pageData.tileCols);
  const tileH = Math.trunc(height / pageData.tileRows);

  const tiles: ImageTile[] = pageData.tiles.map((j, w) => {
    const srcCol = w % pageData.tileCols;
    const srcRow = Math.trunc(w / pageData.tileCols);
    const dstCol = j % pageData.tileCols;
    const dstRow = Math.trunc(j / pageData.tileCols);

    return {
      sx: srcCol * tileW,
      sy: srcRow * tileH,
      sw: tileW,
      sh: tileH,
      dx: dstCol * tileW,
      dy: dstRow * tileH,
    };
  });

  return { width: tileW * pageData.tileCols, height: tileH * pageData.tileRows, tiles };
}
