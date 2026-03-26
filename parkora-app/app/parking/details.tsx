import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";

import { styles } from "@/src/styles/details.styles";
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
    router.push("/parking/details");
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
