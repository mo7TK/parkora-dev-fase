/**
 * src/utils/distance.ts
 * ──────────────────────
 * Calcul de distance Haversine entre deux coordonnées GPS.
 * Retourne la distance en kilomètres.
 */

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Formate une distance en string lisible : "320 m" ou "2.4 km" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/**
 * Score de pertinence pour le tri (plus bas = plus pertinent).
 * Pondère distance + disponibilité + type.
 *
 * Formule :
 *   score = distance_km * 1.0
 *           - (free / total) * 1.5   ← bonus disponibilité
 *           + (isPaid ? 0.3 : 0)     ← léger malus payant (les gratuits remontent)
 */
export function relevanceScore(
  distanceKm: number,
  free: number,
  total: number,
  isPaid: boolean,
): number {
  const availRatio = total > 0 ? free / total : 0;
  return distanceKm - availRatio * 1.5 + (isPaid ? 0.3 : 0);
}
