import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";

import { BACKEND_URL, PARKING_LOT } from "@/src/constants/config";

// ── Types ─────────────────────────────────────────────────────────────────────
type Summary = {
  total: number;
  free: number;
  occupied: number;
};
// ─────────────────────────────────────────────────────────────────────────────

export default function Details() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    // One GET request when the screen loads — no WebSocket needed here
    fetch(`${BACKEND_URL}/spots-summary`)
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch(() => setSummary(null));
  }, []);

  function handleNavigate() {
    // Opens Google Maps (or Apple Maps on iOS) with the parking coordinates
    const url = `https://www.google.com/maps/dir/?api=1&destination=${PARKING_LOT.latitude},${PARKING_LOT.longitude}`;
    Linking.openURL(url);
  }

  function handleViewLayout() {
    router.push("/minimap");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{PARKING_LOT.name}</Text>
      <Text style={styles.subtitle}>
        Tap navigate to get directions to the entrance
      </Text>

      {/* Stats card */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{PARKING_LOT.totalSpots}</Text>
            <Text style={styles.statLabel}>Total spots</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            {summary ? (
              <Text style={[styles.statNumber, styles.statNumberFree]}>
                {summary.free}
              </Text>
            ) : (
              <ActivityIndicator size="large" style={{ marginBottom: 8 }} />
            )}
            <Text style={styles.statLabel}>Available</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            {summary ? (
              <Text style={[styles.statNumber, styles.statNumberOccupied]}>
                {summary.occupied}
              </Text>
            ) : (
              <ActivityIndicator size="large" style={{ marginBottom: 8 }} />
            )}
            <Text style={styles.statLabel}>Occupied</Text>
          </View>
        </View>
      </View>

      {/* Navigate button */}
      <TouchableOpacity style={styles.buttonNavigate} onPress={handleNavigate}>
        <Text style={styles.buttonTextWhite}>Navigate to Parking</Text>
      </TouchableOpacity>

      {/* View layout button */}
      <TouchableOpacity style={styles.buttonLayout} onPress={handleViewLayout}>
        <Text style={styles.buttonTextDark}>View Parking Layout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f4",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 24,
  },

  // ── Stats card ────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
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
  statNumberFree: {
    color: "#2ecc71",
  },
  statNumberOccupied: {
    color: "#bc1300",
  },
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

  // ── Buttons ───────────────────────────────────────────────────────────────
  buttonNavigate: {
    backgroundColor: "#1a73e8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonLayout: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
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

  // ── Loading / error ───────────────────────────────────────────────────────
  loadingText: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    marginTop: 8,
  },
});
