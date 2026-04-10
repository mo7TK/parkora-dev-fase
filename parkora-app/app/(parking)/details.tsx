import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";

import { BACKEND_URL } from "@/src/constants/config";

// ── Types ─────────────────────────────────────────────────────────────────────
type Summary = {
  total: number;
  free: number;
  occupied: number;
};
// ─────────────────────────────────────────────────────────────────────────────

export default function Details() {
  // Route params passed by the map screen when a marker or card is tapped.
  // Using string type because Expo Router passes all params as strings.
  const { lotId, name, totalSpots, latitude, longitude } =
    useLocalSearchParams<{
      lotId: string;
      name: string;
      totalSpots: string;
      latitude: string;
      longitude: string;
    }>();

  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (!lotId) return;
    fetch(`${BACKEND_URL}/spots-summary/${lotId}`)
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch(() => setSummary(null));
  }, [lotId]);

  function handleNavigate() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url);
  }

  function handleViewLayout() {
    // Forward the lotId so minimap knows which config and image to load.
    router.push({
      pathname: "/(parking)/minimap",
      params: { lotId },
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* ── Hero image ──────────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <Image
          source={require("@/assets/images/parking_entrance.jpg")}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.72)"]}
          style={styles.heroGradient}
        >
          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroSubtitle}>
            Tap navigate to get directions to the entrance
          </Text>
        </LinearGradient>
      </View>

      {/* ── Stats card ──────────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          {/* Total */}
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalSpots}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.divider} />

          {/* Free */}
          <View style={styles.statItem}>
            {summary ? (
              <Text style={[styles.statNumber, styles.statFree]}>
                {summary.free}
              </Text>
            ) : (
              <ActivityIndicator size="large" style={{ marginBottom: 8 }} />
            )}
            <Text style={styles.statLabel}>Available</Text>
          </View>

          <View style={styles.divider} />

          {/* Occupied */}
          <View style={styles.statItem}>
            {summary ? (
              <Text style={[styles.statNumber, styles.statOccupied]}>
                {summary.occupied}
              </Text>
            ) : (
              <ActivityIndicator size="large" style={{ marginBottom: 8 }} />
            )}
            <Text style={styles.statLabel}>Occupied</Text>
          </View>
        </View>
      </View>

      {/* ── Availability bar ─────────────────────────────────────────────────── */}
      {summary && Number(totalSpots) > 0 && (
        <View style={styles.barWrap}>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${(summary.free / Number(totalSpots)) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.barLabel}>
            {Math.round((summary.free / Number(totalSpots)) * 100)}% available
          </Text>
        </View>
      )}

      {/* ── Action buttons ───────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.buttonNavigate} onPress={handleNavigate}>
        <Text style={styles.buttonTextWhite}>Navigate to Parking</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonLayout} onPress={handleViewLayout}>
        <Text style={styles.buttonTextDark}>View Parking Layout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f4f4",
  },
  content: {
    paddingBottom: 40,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    width: "100%",
    height: 260,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.78)",
  },

  // ── Stats card ────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2e1a1a",
  },
  statFree: { color: "#2ecc71" },
  statOccupied: { color: "#bc1300" },
  statLabel: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: "#eee",
    marginVertical: 4,
  },

  // ── Availability bar ──────────────────────────────────────────────────────
  barWrap: {
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 6,
  },
  barTrack: {
    height: 8,
    backgroundColor: "#eee",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#2ecc71",
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 12,
    color: "#888",
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  buttonNavigate: {
    backgroundColor: "#1a73e8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  buttonLayout: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  buttonTextWhite: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  buttonTextDark: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a2e",
  },
});
