import { useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import ParkingPin from "@/src/components/ParkingPin";
import ParkingCard from "@/src/components/ParkingCard";
import { PARKING_LOT } from "@/src/constants/config";

// ─────────────────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

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
  }

  return (
    <View style={styles.container}>
      {/* Fullscreen map */}
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
      >
        <Marker
          coordinate={{
            latitude: PARKING_LOT.latitude,
            longitude: PARKING_LOT.longitude,
          }}
          onPress={() => router.push("/details")}
        >
          <ParkingPin />
        </Marker>
      </MapView>

      {/* My location button */}
      <TouchableOpacity style={styles.locationButton} onPress={goToMyLocation}>
        <Ionicons name="locate" size={22} color="#1a73e8" />
      </TouchableOpacity>

      {/* Location error message */}
      {locationError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}

      {/* Bottom sheet with parking cards */}
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Nearby Parking</Text>
        <ParkingCard
          name={PARKING_LOT.name}
          onPress={() => router.push("/details")}
        />
      </View>
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

  // ── Location button ───────────────────────────────────────────────────────
  locationButton: {
    position: "absolute",
    top: 56,
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

  // ── Error banner ──────────────────────────────────────────────────────────
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

  // ── Bottom sheet ──────────────────────────────────────────────────────────
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
});
