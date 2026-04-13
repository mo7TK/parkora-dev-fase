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
      1: { x: 68, y: 61.9 },
      2: { x: 70, y: 56.9 },
      3: { x: 72, y: 51.7 },
      4: { x: 74, y: 46.5 },
      5: { x: 76, y: 41.3 },
      6: { x: 78, y: 36.1 },
      7: { x: 80, y: 30.8 },
      8: { x: 82, y: 25.6 },
      9: { x: 84, y: 20.4 },
      10: { x: 61.4, y: 9.6 },
      11: { x: 51.4, y: 8.2 },
      12: { x: 40.9, y: 6.8 },
      13: { x: 30.1, y: 5.3 },
      14: { x: 19.6, y: 4 },
    },
  },

  "69d9422ef052a357e475c52c": {
    // ✅ EPB Parking — adjust positions to match your map
    imageWidth: 735,
    imageHeight: 1305,
    positions: {
      1: { x: 68, y: 67.5 },
      2: { x: 68.2, y: 61.9 },
      3: { x: 68.4, y: 56.1 },
      4: { x: 68.6, y: 50.2 },
      5: { x: 68.8, y: 44.4 },
      6: { x: 69, y: 38.5 },
      7: { x: 69.2, y: 32.6 },
      8: { x: 69.4, y: 26.7 },
      9: { x: 69.6, y: 20.8 },
      10: { x: 25, y: 73.2 },
      11: { x: 25.2, y: 67.4 },
      12: { x: 25.4, y: 61.5 },
      13: { x: 25.6, y: 55.5 },
      14: { x: 25.8, y: 49.6 },
      15: { x: 26, y: 43.7 },
      16: { x: 26.2, y: 37.8 },
      17: { x: 26.4, y: 31.9 },
      18: { x: 26.6, y: 25.9 },
      19: { x: 21.8, y: 20.2 },
    },
  },
};
