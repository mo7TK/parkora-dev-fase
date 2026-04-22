import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
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
  heroImage?: string;
  isFavorite?: boolean;
  onPress: () => void;
  onToggleFavorite?: () => void;
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

export default function FavoriteCard({
  lotId,
  name,
  totalSpots,
  heroImage,
  isFavorite = true,
  onPress,
  onToggleFavorite,
}: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const barAnim = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  const heroUri = heroImage
    ? `${BACKEND_URL}/assets/images/entrance/${heroImage}`
    : null;

  useEffect(() => {
    fetch(`${BACKEND_URL}/spots-summary/${lotId}`)
      .then((r) => r.json())
      .then((data: Summary) => {
        setSummary(data);
        Animated.timing(barAnim, {
          toValue: data.total > 0 ? data.free / data.total : 0,
          duration: 700,
          useNativeDriver: false,
        }).start();
      })
      .catch(() => setSummary(null));
  }, [lotId]);

  function handleHeartPress() {
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.35,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    onToggleFavorite?.();
  }

  const accent = summary ? getAccent(summary.free, summary.total) : "#1a73e8";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* ── Hero image ─────────────────────────────────────────────────── */}
      <View style={styles.heroWrap}>
        {heroUri ? (
          <Image
            source={{ uri: heroUri }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroPlaceholderText}>P</Text>
          </View>
        )}
      </View>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <View style={styles.body}>
        {/* Top row: name + heart */}
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>

          <TouchableOpacity
            onPress={handleHeartPress}
            hitSlop={10}
            style={styles.heartBtn}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={22}
                color={isFavorite ? "#ef4444" : "#cbd5e1"}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        {summary ? (
          <>
            <View style={styles.statsRow}>
              {/* Libres */}
              <View style={styles.statChip}>
                <View style={[styles.chipDot, { backgroundColor: accent }]} />
                <Text style={[styles.chipCount, { color: accent }]}>
                  {summary.free}
                </Text>
                <Text style={styles.chipLabel}> libres</Text>
              </View>

              {/* Occupées */}
              <View style={styles.statChip}>
                <View
                  style={[styles.chipDot, { backgroundColor: "#94a3b8" }]}
                />
                <Text style={[styles.chipCount, { color: "#64748b" }]}>
                  {summary.occupied}
                </Text>
                <Text style={styles.chipLabel}> occupées</Text>
              </View>

              {/* Total */}
              <View style={styles.statChip}>
                <Text style={styles.chipLabel}>{totalSpots} total</Text>
              </View>
            </View>

            {/* Barre de disponibilité */}
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
            style={{ alignSelf: "flex-start", marginTop: 8 }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    height: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },

  // ── Hero ──────────────────────────────────────────────────────────────
  heroWrap: {
    width: 110,
    height: 120,
  },
  heroImage: {
    width: 110,
    height: 120,
  },
  heroPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1a73e8",
    justifyContent: "center",
    alignItems: "center",
  },
  heroPlaceholderText: {
    fontSize: 40,
    fontWeight: "900",
    color: "rgba(255,255,255,0.3)",
  },

  // ── Body ──────────────────────────────────────────────────────────────
  body: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: "space-between",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },

  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 20,
    letterSpacing: -0.2,
  },

  heartBtn: {
    paddingTop: 1,
  },

  // ── Stats ─────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },

  statChip: {
    flexDirection: "row",
    alignItems: "center",
  },

  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 4,
  },

  chipCount: {
    fontSize: 13,
    fontWeight: "800",
  },

  chipLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },

  // ── Bar ───────────────────────────────────────────────────────────────
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#f1f5f9",
    flexDirection: "row",
    overflow: "hidden",
    marginTop: 10,
  },

  barFill: {
    borderRadius: 2,
  },
});
