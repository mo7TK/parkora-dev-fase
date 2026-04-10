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

// ── Types ─────────────────────────────────────────────────────────────────────
type Props = {
  lotId: string;
  name: string;
  totalSpots: number;
  onPress: () => void;
};

type Summary = {
  free: number;
  occupied: number;
  total: number;
};
// ─────────────────────────────────────────────────────────────────────────────

export default function ParkingCard({
  lotId,
  name,
  totalSpots,
  onPress,
}: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/spots-summary/${lotId}`)
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch(() => setSummary(null));
  }, [lotId]);

  const isNoSpotsAvailable = summary?.free === 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Left — P icon */}
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>P</Text>
      </View>

      {/* Middle — name + availability */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>

        {summary ? (
          <View style={styles.spotsRow}>
            <View
              style={[
                styles.dot,
                isNoSpotsAvailable ? styles.dotRed : styles.dotGreen,
              ]}
            />
            <Text style={styles.spotsText}>
              <Text
                style={[
                  styles.spotsCount,
                  isNoSpotsAvailable && styles.spotsCountRed,
                ]}
              >
                {summary.free}
              </Text>{" "}
              / {totalSpots} free
            </Text>
          </View>
        ) : (
          <ActivityIndicator
            size="small"
            color="#1a73e8"
            style={styles.loader}
          />
        )}
      </View>

      {/* Right — chevron */}
      <Ionicons name="chevron-forward" size={18} color="#bbb" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    width: 230,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 3,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1a73e8",
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  spotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: { backgroundColor: "#2ecc71" },
  dotRed: { backgroundColor: "#e74c3c" },
  spotsText: {
    fontSize: 12,
    color: "#888",
  },
  spotsCount: {
    fontWeight: "700",
    color: "#2ecc71",
  },
  spotsCountRed: {
    color: "#e74c3c",
  },
  loader: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
});
