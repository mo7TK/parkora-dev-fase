import { useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
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
import AntDesign from "@expo/vector-icons/AntDesign";

import ParkingPin from "@/src/components/ParkingPin";
import ParkingCard from "@/src/components/ParkingCard";
import SearchBar from "@/src/components/SearchBar";
import { BACKEND_URL } from "@/src/constants/config";

type ParkingLot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  total_spots: number;
  type: "paid" | "free";
};

const SHEET_HEIGHT = 180;
const DRAG_THRESHOLD = 60;

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(true);
  const [pinFreeSpots, setPinFreeSpots] = useState<Record<string, number>>({});

  // ── Fetch all parking lots ─────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${BACKEND_URL}/parking-lots`)
      .then((res) => res.json())
      .then((data) => setLots(data))
      .catch(() => setLots([]));
  }, []);

  // ── Fetch free spots count per lot (for pins) ──────────────────────────────
  useEffect(() => {
    lots.forEach((lot) => {
      fetch(`${BACKEND_URL}/spots-summary/${lot.id}`)
        .then((res) => res.json())
        .then((data) => {
          setPinFreeSpots((prev) => ({ ...prev, [lot.id]: data.free }));
        });
    });
  }, [lots]);

  // ── Sheet animation ────────────────────────────────────────────────────────
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, []);

  function showSheet() {
    setSheetVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }

  function hideSheet() {
    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setSheetVisible(false));
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderMove: (_, g) => {
        translateY.setValue(Math.max(0, g.dy));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DRAG_THRESHOLD) {
          hideSheet();
        } else {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  async function goToMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationError("Location permission denied");
      return;
    }
    setLocationError(null);
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

  function openDetails(lot: ParkingLot) {
    router.push({
      pathname: "/(parking)/details",
      params: {
        lotId: lot.id,
        name: lot.name,
        totalSpots: lot.total_spots,
        latitude: lot.latitude,
        longitude: lot.longitude,
        type: lot.type,
      },
    });
  }

  function handleSearchSelect(lot: ParkingLot) {
    mapRef.current?.animateToRegion(
      {
        latitude: lot.latitude,
        longitude: lot.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      700,
    );
    setTimeout(() => openDetails(lot), 750);
  }

  const initialRegion =
    lots.length > 0
      ? {
          latitude: lots[0].latitude,
          longitude: lots[0].longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }
      : {
          latitude: 36.75,
          longitude: 5.039,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        };

  return (
    <View style={styles.container}>
      {/* ── Map ─────────────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {lots.map((lot) => (
          <Marker
            key={lot.id}
            coordinate={{ latitude: lot.latitude, longitude: lot.longitude }}
            onPress={() => openDetails(lot)}
          >
            <ParkingPin freeSpots={pinFreeSpots[lot.id]} type={lot.type} />
          </Marker>
        ))}
      </MapView>

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <SearchBar lots={lots} onSelectLot={handleSearchSelect} />

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {locationError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}

      {/* ── Legend — independent, freely positionable ────────────────────────── */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: "#1a73e8" }]} />
          <Text style={styles.legendText}>Payant</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: "#02a31d" }]} />
          <Text style={styles.legendText}>Gratuit</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: "#c0392b" }]} />
          <Text style={styles.legendText}>Complet</Text>
        </View>
      </View>

      {/* ── Locate button — independent, freely positionable ────────────────── */}
      <TouchableOpacity
        style={styles.locationButton}
        onPress={goToMyLocation}
        activeOpacity={0.8}
      >
        <AntDesign name="aim" size={22} color="#1a73e8" />
      </TouchableOpacity>

      {/* ── Re-open sheet button ─────────────────────────────────────────────── */}
      {!sheetVisible && (
        <TouchableOpacity style={styles.reopenButton} onPress={showSheet}>
          <Ionicons name="chevron-up" size={20} color="#1a73e8" />
        </TouchableOpacity>
      )}

      {/* ── Bottom sheet ─────────────────────────────────────────────────────── */}
      <Animated.View
        style={[styles.bottomSheet, { transform: [{ translateY }] }]}
      >
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={styles.sheetHandle} />
        </View>

        <Text style={styles.sheetTitle}>
          Parkings à proximité
          {lots.length > 0 && (
            <Text style={styles.sheetCount}> · {lots.length}</Text>
          )}
        </Text>

        {lots.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>Connexion au backend…</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsRow}
          >
            {lots.map((lot) => (
              <ParkingCard
                key={lot.id}
                lotId={lot.id}
                name={lot.name}
                totalSpots={lot.total_spots}
                type={lot.type}
                onPress={() => openDetails(lot)}
              />
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // ── Legend — position it freely here ────────────────────────────────────
  legend: {
    position: "absolute",
    right: 16,
    bottom: SHEET_HEIGHT + 70, // ← change this to move the legend up/down
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: "#333",
    fontWeight: "500",
  },

  // ── Locate button — position it freely here ──────────────────────────────
  locationButton: {
    position: "absolute",
    right: 16,
    bottom: SHEET_HEIGHT + 14, // ← change this to move the button up/down
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

  reopenButton: {
    position: "absolute",
    bottom: 16,
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

  errorBanner: {
    position: "absolute",
    top: 110,
    alignSelf: "center",
    backgroundColor: "#e74c3c",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  errorText: { color: "#fff", fontSize: 13 },

  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 10,
  },
  dragArea: { alignItems: "center", paddingTop: 12, paddingBottom: 10 },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 12,
  },
  sheetCount: { fontWeight: "400", color: "#aaa" },
  cardsRow: { flexDirection: "row", gap: 12, paddingRight: 8 },
  emptyRow: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 13, color: "#bbb" },
});
