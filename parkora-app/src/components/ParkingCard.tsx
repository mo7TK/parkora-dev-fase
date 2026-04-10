import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { BACKEND_URL } from "@/src/constants/config";

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

function getAccent(free: number, total: number) {
  if (free === 0) return "#ef4444";
  if (free / total < 0.3) return "#f97316";
  return "#22c55e";
}

export default function ParkingCard({
  lotId,
  name,
  totalSpots,
  onPress,
}: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetch(`${BACKEND_URL}/spots-summary/${lotId}`)
      .then((r) => r.json())
      .then((data: Summary) => {
        setSummary(data);
        Animated.timing(barAnim, {
          toValue: data.total > 0 ? data.free / data.total : 0,
          duration: 600,
          useNativeDriver: false,
        }).start();
      })
      .catch(() => setSummary(null));
  }, [lotId]);

  const accent = summary ? getAccent(summary.free, summary.total) : "#1a73e8";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: accent + "18" }]}>
        <Text style={[styles.iconLetter, { color: accent }]}>P</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>

        {summary ? (
          <>
            <View style={styles.row}>
              <Text style={[styles.freeCount, { color: accent }]}>
                {summary.free}
              </Text>
              <Text style={styles.totalCount}> / {totalSpots} free</Text>
            </View>
            <View style={styles.barTrack}>
              <Animated.View
                style={[
                  styles.barFill,
                  { backgroundColor: accent, flex: barAnim },
                ]}
              />
            </View>
          </>
        ) : (
          <ActivityIndicator
            size="small"
            color="#1a73e8"
            style={{ alignSelf: "flex-start" }}
          />
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    height: 100,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    paddingRight: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  iconLetter: {
    fontSize: 18,
    fontWeight: "800",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  freeCount: {
    fontSize: 13,
    fontWeight: "800",
  },
  totalCount: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  barTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "#f1f5f9",
    flexDirection: "row",
    overflow: "hidden",
  },
  barFill: {
    borderRadius: 2,
  },
});
