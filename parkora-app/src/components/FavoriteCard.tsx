import { useEffect, useState } from "react";
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
import { useRef } from "react";

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
  const heartScale = useRef(new Animated.Value(1)).current;

  const heroUri = heroImage
    ? `${BACKEND_URL}/assets/images/entrance/${heroImage}`
    : null;

  useEffect(() => {
    fetch(`${BACKEND_URL}/spots-summary/${lotId}`)
      .then((r) => r.json())
      .then((data: Summary) => setSummary(data))
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
        {/* Nom + cœur */}
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

        {/* Places libres — texte simple coloré, sans barre */}
        {summary ? (
          <View style={styles.statsRow}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={[styles.spotsCount, { color: accent }]}>
              {summary.free === 0 ? "Complet" : `${summary.free}`}
            </Text>
            {summary.free > 0 && (
              <Text style={styles.spotsLabel}> libres / {totalSpots}</Text>
            )}
          </View>
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
    height: 110,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  heroWrap: { width: 110, height: 110 },
  heroImage: { width: 110, height: 110 },
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
  heartBtn: { paddingTop: 1 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  spotsCount: { fontSize: 13, fontWeight: "800" },
  spotsLabel: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
});
