import { useCallback, useEffect, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useAuth } from "@/src/context/AuthContext";
import { BACKEND_URL } from "@/src/constants/config";

type Summary = {
  total: number;
  free: number;
  occupied: number;
};

type ParkingLot = {
  hero_image: string;
  minimap_image: string;
};

export default function Details() {
  const { lotId, name, totalSpots, latitude, longitude } =
    useLocalSearchParams<{
      lotId: string;
      name: string;
      totalSpots: string;
      latitude: string;
      longitude: string;
    }>();

  const { token } = useAuth();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [lotDetails, setLotDetails] = useState<ParkingLot | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  useEffect(() => {
    if (!lotId) return;
    fetch(`${BACKEND_URL}/parking-lots/${lotId}`)
      .then((res) => res.json())
      .then((data) => setLotDetails(data))
      .catch(() => setLotDetails(null));
  }, [lotId]);

  useEffect(() => {
    if (!lotId) return;
    fetch(`${BACKEND_URL}/spots-summary/${lotId}`)
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch(() => setSummary(null));
  }, [lotId]);

  // Vérifie si ce lot est en favori à chaque fois que l'écran est affiché
  useFocusEffect(
    useCallback(() => {
      if (!lotId || !token) return;
      fetch(`${BACKEND_URL}/favorites/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data: { id: string }[]) => {
          setIsFavorite(data.some((lot) => lot.id === lotId));
        })
        .catch(() => {});
    }, [lotId, token]),
  );

  async function toggleFavorite() {
    if (!token || !lotId || favLoading) return;
    setFavLoading(true);
    const method = isFavorite ? "DELETE" : "POST";
    try {
      await fetch(`${BACKEND_URL}/favorites/${lotId}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsFavorite((v) => !v);
    } catch {
    } finally {
      setFavLoading(false);
    }
  }

  function handleNavigate() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url);
  }

  function handleViewLayout() {
    router.push({
      pathname: "/(parking)/minimap",
      params: { lotId, minimapImage: lotDetails?.minimap_image ?? "" },
    });
  }

  const heroImageUri = lotDetails?.hero_image
    ? `${BACKEND_URL}/assets/images/entrance/${lotDetails.hero_image}`
    : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Hero image */}
      <View style={styles.hero}>
        {heroImageUri ? (
          <Image
            source={{ uri: heroImageUri }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]} />
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.72)"]}
          style={styles.heroGradient}
        >
          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroSubtitle}>
            Tap navigate to get directions to the entrance
          </Text>
        </LinearGradient>

        {/* ── Floating heart button ── */}
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={toggleFavorite}
          activeOpacity={0.8}
          disabled={favLoading}
        >
          {favLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={30}
              color={isFavorite ? "#ef4444" : "#fff"}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Stats card */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalSpots}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.divider} />
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

      {/* Availability bar */}
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

      {/* Action buttons */}
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
  screen: { flex: 1, backgroundColor: "#f4f4f4" },
  content: { paddingBottom: 40 },

  hero: { width: "100%", height: 260 },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: { backgroundColor: "#ccc" },
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
  heroName: { fontSize: 26, fontWeight: "700", color: "#fff", marginBottom: 4 },
  heroSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.78)" },

  // Cœur flottant
  heartBtn: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 30,
    backgroundColor: "rgba(0, 0, 0, 0)",
    justifyContent: "center",
    alignItems: "center",
  },

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
  cardRow: { flexDirection: "row", justifyContent: "space-between" },
  statItem: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 32, fontWeight: "700", color: "#2e1a1a" },
  statFree: { color: "#2ecc71" },
  statOccupied: { color: "#bc1300" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  divider: { width: 1, backgroundColor: "#eee", marginVertical: 4 },

  barWrap: { marginHorizontal: 16, marginBottom: 20, gap: 6 },
  barTrack: {
    height: 8,
    backgroundColor: "#eee",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: "#2ecc71", borderRadius: 4 },
  barLabel: { fontSize: 12, color: "#888" },

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
  buttonTextWhite: { fontSize: 16, fontWeight: "600", color: "#fff" },
  buttonTextDark: { fontSize: 16, fontWeight: "600", color: "#1a1a2e" },
});
