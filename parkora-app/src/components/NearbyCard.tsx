/**
 * src/components/NearbyCard.tsx
 */

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BACKEND_URL } from "@/src/constants/config";
import { formatDistance } from "@/src/utils/distance";

type Props = {
  lotId: string;
  name: string;
  totalSpots: number;
  type: "paid" | "free";
  distanceKm?: number;
  onPress: () => void;
};

type Summary = { free: number; occupied: number; total: number };

function availColor(free: number, total: number): string {
  if (total === 0 || free === 0) return "#ef4444";
  if (free / total < 0.3) return "#f97316";
  return "#22c55e";
}

export default function NearbyCard({
  lotId,
  name,
  totalSpots,
  type,
  distanceKm,
  onPress,
}: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/spots-summary/${lotId}`)
      .then((r) => r.json())
      .then((data: Summary) => setSummary(data))
      .catch(() => setSummary(null));
  }, [lotId]);

  const isFull = summary !== null && summary.free === 0;
  const accent = summary ? availColor(summary.free, summary.total) : "#1a73e8";
  const isPaid = type === "paid";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Accent bar gauche */}
      <View style={[styles.accent, { backgroundColor: accent }]} />

      {/* Icône P */}
      <View style={[styles.icon, { backgroundColor: accent + "22" }]}>
        <Text style={[styles.iconLetter, { color: accent }]}>P</Text>
      </View>

      {/* Contenu */}
      <View style={styles.body}>
        {/* Nom + badge type */}
        <View style={styles.row1}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: isPaid ? "#e8f0fe" : "#dcfce7" },
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                { color: isPaid ? "#1a73e8" : "#16a34a" },
              ]}
            >
              {isPaid ? "Payant" : "Gratuit"}
            </Text>
          </View>
        </View>

        {/* Distance + places libres — texte simple, sans fond */}
        <View style={styles.row2}>
          {distanceKm !== undefined && (
            <View style={styles.distRow}>
              <Ionicons name="location-outline" size={11} color="#94a3b8" />
              <Text style={styles.distText}>{formatDistance(distanceKm)}</Text>
            </View>
          )}

          {summary ? (
            <Text style={[styles.spotsText, { color: accent }]}>
              {isFull ? "Complet" : `${summary.free} / ${totalSpots} libres`}
            </Text>
          ) : (
            <ActivityIndicator size="small" color="#94a3b8" />
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
    paddingRight: 12,
    minHeight: 68,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  accent: { width: 4, alignSelf: "stretch" },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
  },
  iconLetter: { fontSize: 17, fontWeight: "800" },
  body: { flex: 1, paddingVertical: 12, gap: 6 },
  row1: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 9, fontWeight: "700" },
  row2: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  distRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  distText: { fontSize: 11, color: "#94a3b8", fontWeight: "500" },
  // Texte simple, coloré, sans fond
  spotsText: { fontSize: 12, fontWeight: "700" },
});
