/**
 * src/hooks/useMapDimensions.ts
 * ──────────────────────────────
 * Hook partagé entre minimap.tsx et reservation-spot.tsx.
 *
 * Garantit que les deux écrans utilisent EXACTEMENT les mêmes
 * dimensions d'affichage pour l'image de plan, ce qui assure que
 * les dots de spotPositions.ts tombent au même pixel dans les deux vues.
 *
 * Règle unique :
 *   - L'image occupe toute la largeur de l'écran (imageDisplayWidth = SCREEN_WIDTH)
 *   - La hauteur est calculée en conservant le ratio naturel de l'image
 *     (imageDisplayHeight = SCREEN_WIDTH * imageHeight / imageWidth)
 *   - resizeMode doit être "contain" dans les deux écrans
 *
 * Les positions x/y dans spotPositions.ts sont des % de ces dimensions.
 * Tant que les deux écrans respectent ces dimensions, les dots sont cohérents.
 */

import { Dimensions } from "react-native";
import { LotMapConfig } from "@/src/constants/spotPositions";

export const SCREEN_WIDTH = Dimensions.get("window").width;

export function useMapDimensions(lotConfig: LotMapConfig | null) {
  if (!lotConfig) {
    return {
      imageDisplayWidth: SCREEN_WIDTH,
      imageDisplayHeight: SCREEN_WIDTH, // fallback carré
    };
  }

  const imageDisplayWidth  = SCREEN_WIDTH;
  const imageDisplayHeight = (lotConfig.imageHeight / lotConfig.imageWidth) * SCREEN_WIDTH;

  return { imageDisplayWidth, imageDisplayHeight };
}

/** Calcule la position pixel d'un dot à partir de ses coordonnées en % */
export function dotPosition(
  xPct: number,
  yPct: number,
  imageDisplayWidth: number,
  imageDisplayHeight: number,
  dotSize: number,
) {
  return {
    left: (xPct / 100) * imageDisplayWidth  - dotSize / 2,
    top:  (yPct / 100) * imageDisplayHeight - dotSize / 2,
  };
}
