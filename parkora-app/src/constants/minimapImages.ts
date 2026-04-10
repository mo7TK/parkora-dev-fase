/**
 * minimapImages.ts
 *
 * React Native's require() must be STATIC at build time — you cannot build a
 * dynamic path and pass it to require(). So we keep one explicit mapping of
 * lot_id → image here.
 *
 * HOW TO ADD A NEW LOT
 * ─────────────────────
 * 1. Drop the map image into  assets/images/maps/
 * 2. Add one line below:
 *      "your-new-lot-mongo-id": require("@/assets/images/maps/your_lot.png"),
 * 3. That's it — the minimap screen picks it up automatically.
 */

export const MINIMAP_IMAGES: Record<string, any> = {
  "69d66286fb20ec39630cff9b": require("@/assets/images/minimaps/parking_map.png"),
  "69d8d505ef2f35cdb14d59e1": require("@/assets/images/minimaps/parking_map_epb.png"),
  // "507f1f77bcf86cd799439011": require("@/assets/images/maps/lot_centre_ville.png"),
};
