/**
 * spotPositions.ts
 *
 * Each parking lot has its own map image with its own dimensions and its own
 * spot dot positions.  All x/y values are PERCENTAGES of the image dimensions
 * (0 = top-left, 100 = bottom-right) so they scale correctly on any screen.
 *
 * HOW TO ADD A NEW LOT
 * ─────────────────────
 * 1. Measure your new map image's natural width and height in pixels.
 * 2. Open the image in any viewer and note roughly where each spot number
 *    should appear as a percentage of width (x) and height (y).
 * 3. Add a new entry below using your lot's MongoDB id as the key.
 */

export type SpotPosition = { x: number; y: number };

export type LotMapConfig = {
  /** Natural pixel width of the parking_map image for this lot */
  imageWidth: number;
  /** Natural pixel height of the parking_map image for this lot */
  imageHeight: number;
  /** spot id → {x%, y%} overlay position */
  positions: Record<number, SpotPosition>;
};

export const SPOT_CONFIGS: Record<string, LotMapConfig> = {
  "69d9422ef052a357e475c52b": {
    imageWidth: 735,
    imageHeight: 1305,
    positions: {
      1: { x: 68, y: 60.9 },
      2: { x: 70, y: 56.5 },
      3: { x: 72, y: 51.6 },
      4: { x: 74, y: 46.7 },
      5: { x: 76, y: 41.8 },
      6: { x: 78, y: 36.8 },
      7: { x: 80, y: 31.9 },
      8: { x: 82, y: 27.1 },
      9: { x: 84, y: 22.2 },
      10: { x: 61.4, y: 12 },
      11: { x: 51.4, y: 10.5 },
      12: { x: 40.9, y: 9.1 },
      13: { x: 30.1, y: 7.6 },
      14: { x: 19.6, y: 6.2 },
      15: { x: 18, y: 19.8 },
      16: { x: 20.5, y: 24.7 },
      17: { x: 23, y: 29.3 },
      18: { x: 25.5, y: 33.7 },
      19: { x: 28.2, y: 38 },
      20: { x: 31.1, y: 42.5 },
      21: { x: 34.1, y: 47.3 },
      22: { x: 37.2, y: 52 },
    },
  },

  "69d9422ef052a357e475c52c": {
    // ✅ EPB Parking — adjust positions to match your map
    imageWidth: 735,
    imageHeight: 1305,
    positions: {
      1: { x: 68, y: 66.4 },
      2: { x: 68.2, y: 61.1 },
      3: { x: 68.4, y: 55.7 },
      4: { x: 68.6, y: 50.2 },
      5: { x: 68.8, y: 44.7 },
      6: { x: 69, y: 39.1 },
      7: { x: 69.2, y: 33.6 },
      8: { x: 69.4, y: 28.1 },
      9: { x: 69.6, y: 22.7 },
      10: { x: 25, y: 71.8 },
      11: { x: 25.2, y: 66.1 },
      12: { x: 25.4, y: 60.6 },
      13: { x: 25.6, y: 55.1 },
      14: { x: 25.8, y: 49.6 },
      15: { x: 26, y: 44.1 },
      16: { x: 26.2, y: 38.6 },
      17: { x: 26.4, y: 33 },
      18: { x: 26.6, y: 27.5 },
      19: { x: 26.9, y: 21.9 },
    },
  },
};
