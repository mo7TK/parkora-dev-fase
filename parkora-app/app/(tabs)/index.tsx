import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import ParkingPin from "@/src/components/ParkingPin";
import ParkingCard from "@/src/components/ParkingCard";
import { PARKING_LOT } from "@/src/constants/config";

// ── Constants ─────────────────────────────────────────────────────────────────
const SHEET_HEIGHT = 160;
// Start the sheet this far below its resting position.
// Using 35% of screen height guarantees it's fully off-screen on any device.
const SLIDE_START = Dimensions.get("window").height * 0.35;
// ─────────────────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // true → map is currently centred on user → show dot inside locate button
  const [isCentred, setIsCentred] = useState(false);

  // Sheet starts off-screen and slides up on mount
  const slideAnim = useRef(new Animated.Value(SLIDE_START)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, []);

  async function goToMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationError("Location permission denied");
      return;
    }
    const location = await Location.getCurrentPositionAsync({});
    mapRef.current?.animateToRegion(
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      800,
    );
    setIsCentred(true); // dot appears
  }

  // User dragged the map → no longer centred → dot disappears
  function handleRegionChange() {
    if (isCentred) setIsCentred(false);
  }

  return (
    <View style={styles.container}>
      {/* ── Fullscreen map ──────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: PARKING_LOT.latitude,
          longitude: PARKING_LOT.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        showsUserLocation
        showsMyLocationButton={false} // removes the native duplicate button
        onRegionChangeComplete={handleRegionChange}
      >
        <Marker
          coordinate={{
            latitude: PARKING_LOT.latitude,
            longitude: PARKING_LOT.longitude,
          }}
          onPress={() => router.push("/parking/details")}
        >
          <ParkingPin />
        </Marker>
      </MapView>

      {/* ── Location error banner ────────────────────────────────────────────── */}
      {locationError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}

      {/* ── Locate button — right side, just above the sheet ────────────────── */}
      <TouchableOpacity style={styles.locationButton} onPress={goToMyLocation}>
        <Ionicons name="locate" size={22} color="#1a73e8" />
        {isCentred && <View style={styles.locateDot} />}
      </TouchableOpacity>

      {/* ── Animated bottom sheet ────────────────────────────────────────────── */}
      <Animated.View
        style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Nearby Parking</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
        >
          <ParkingCard
            name={PARKING_LOT.name}
            totalSpots={PARKING_LOT.totalSpots}
            onPress={() => router.push("/parking/details")}
          />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },

  // ── Locate button ──────────────────────────────────────────────────────────
  locationButton: {
    position: "absolute",
    bottom: SHEET_HEIGHT + 12,
    right: 16,
    backgroundColor: "#fff",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  // Dot appears in the centre of the icon ring when map is locked to user
  locateDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1a73e8",
    // centre it inside the 44x44 button
    top: 18,
    left: 18,
  },

  // ── Error banner ───────────────────────────────────────────────────────────
  errorBanner: {
    position: "absolute",
    top: 110,
    alignSelf: "center",
    backgroundColor: "#e74c3c",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  errorText: {
    color: "#fff",
    fontSize: 13,
  },

  // ── Bottom sheet ───────────────────────────────────────────────────────────
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 12,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 8,
  },
});
