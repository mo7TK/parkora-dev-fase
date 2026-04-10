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
  "69d66286fb20ec39630cff9b": {
    imageWidth:  735,
    imageHeight: 1305,
    positions: {
      1:  { x: 68,   y: 61.9 },
      2:  { x: 70,   y: 56.9 },
      3:  { x: 72,   y: 51.7 },
      4:  { x: 74,   y: 46.5 },
      5:  { x: 76,   y: 41.3 },
      6:  { x: 78,   y: 36.1 },
      7:  { x: 80,   y: 30.8 },
      8:  { x: 82,   y: 25.6 },
      9:  { x: 84,   y: 20.4 },
      10: { x: 61.4, y: 9.6  },
      11: { x: 51.4, y: 8.2  },
      12: { x: 40.9, y: 6.8  },
      13: { x: 30.1, y: 5.3  },
      14: { x: 19.6, y: 4    },
    },
  },

  // ── Template for the next lot ──────────────────────────────────────────────
  // "507f1f77bcf86cd799439011": {
  //   imageWidth:  800,
  //   imageHeight: 1200,
  //   positions: {
  //     1: { x: 20, y: 30 },
  //     2: { x: 40, y: 30 },
  //     // …
  //   },
  // },
};
