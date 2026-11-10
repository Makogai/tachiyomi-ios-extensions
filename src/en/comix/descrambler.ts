// Port of Descrambler.kt @ d9420cd1, grid part only. Upstream decodes the image and redraws the
// 5x5 tiles with a Canvas; here the same tile moves are returned for the app to draw
// (`getImageTransform`). The byte-level XOR decoding (`x-enc-seed`) cannot be expressed as tile
// moves and is not ported.
import type { ImageTile, ImageTransform } from "@sdk";

const GRID_COLS = 5;
const GRID_ROWS = 5;
const NUM_TILES = GRID_COLS * GRID_ROWS;

const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT = 1013904223;

export interface ScrambleInfo {
  seed: string | null;
  grid: string | null;
  algo: string | null;
  hash: string | null;
}

/** Kotlin's `String.toLongOrNull()?.toInt()`. */
function toInt32(text: string | null): number | null {
  if (text === null || !/^[+-]?\d+$/.test(text.trim())) return null;
  return Number(BigInt.asIntN(32, BigInt(text.trim())));
}

export function decodeScrambleHash(hash: string | null): number {
  switch (hash?.trim()) {
    case "03632":
      return 58414;
    case "02900":
      return 117532;
    default:
      return 0;
  }
}

/** The seed to descramble with, or null when upstream's interceptor would leave the image alone. */
export function scrambleSeed(info: ScrambleInfo): number | null {
  const seed = toInt32(info.seed);
  const shouldDescrambleGrid =
    info.grid === "5x5" &&
    (info.algo === null || info.algo === "1" || info.algo === "2" || info.algo === "3") &&
    seed !== null &&
    seed !== 0;
  return shouldDescrambleGrid ? seed ^ decodeScrambleHash(info.hash) : null;
}

function inverse(arr: number[]): number[] {
  const result = new Array<number>(arr.length);
  arr.forEach((value, index) => {
    result[value] = index;
  });
  return result;
}

export function buildOrder(seed: number, n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  let state = seed | 1;
  for (let i = n - 1; i >= 1; i--) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const j = (state >>> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return inverse(arr);
}

export function buildOrderLcg(seed: number, n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  let state = seed | 0;
  for (let i = n - 1; i >= 1; i--) {
    state = (Math.imul(state, LCG_MULTIPLIER) + LCG_INCREMENT) | 0;
    const j = (state >>> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return inverse(arr);
}

/** `descramble(bitmap, seed, algo)` as tile moves: the whole image first, then the 25 tiles. */
export function descrambleTransform(width: number, height: number, seed: number, algo: string | null): ImageTransform {
  const tileW = Math.floor(width / GRID_COLS);
  const tileH = Math.floor(height / GRID_ROWS);
  const order = algo === "3" ? buildOrder(seed, NUM_TILES) : buildOrderLcg(seed, NUM_TILES);
  // canvas.drawBitmap(bitmap, 0f, 0f, null) keeps the edges the grid does not cover
  const tiles: ImageTile[] = [{ sx: 0, sy: 0, sw: width, sh: height, dx: 0, dy: 0 }];
  for (let dstIdx = 0; dstIdx < NUM_TILES; dstIdx++) {
    const srcIdx = order[dstIdx];
    tiles.push({
      sx: (srcIdx % GRID_COLS) * tileW,
      sy: Math.floor(srcIdx / GRID_COLS) * tileH,
      sw: tileW,
      sh: tileH,
      dx: (dstIdx % GRID_COLS) * tileW,
      dy: Math.floor(dstIdx / GRID_COLS) * tileH,
    });
  }
  return { width, height, tiles };
}
