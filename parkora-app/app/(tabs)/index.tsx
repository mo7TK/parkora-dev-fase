/**
 * app/(tabs)/index.tsx
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  RefreshControl,
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
import NearbyCard from "@/src/components/NearbyCard";
import SearchBar from "@/src/components/SearchBar";
import { BACKEND_URL } from "@/src/constants/config";
import { haversineKm, relevanceScore } from "@/src/utils/distance";

// ── Types ─────────────────────────────────────────────────────────────────────

type ParkingLot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  total_spots: number;
  type: "paid" | "free";
};

type SortedLot = ParkingLot & { distanceKm?: number };

// ── Constantes ────────────────────────────────────────────────────────────────

const SHEET_COLLAPSED = 72;
const SHEET_EXPANDED = 420;
const DRAG_THRESHOLD = 60;
const NEARBY_RADIUS_KM = 3; // rayon de recherche 3 km
const AUTO_REFRESH_MS = 15000; // actualisation auto toutes les 15 secondes

// ─────────────────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);

  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [sortedLots, setSortedLots] = useState<SortedLot[]>([]);
  const [pinFreeSpots, setPinFreeSpots] = useState<Record<string, number>>({});
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Animation panneau ─────────────────────────────────────────────────────
  const sheetHeight = useRef(new Animated.Value(SHEET_COLLAPSED)).current;
  const currentHeight = useRef(SHEET_COLLAPSED);
  sheetHeight.addListener(({ value }) => {
    currentHeight.current = value;
  });

  function expandSheet() {
    setSheetExpanded(true);
    setSheetVisible(true);
    Animated.spring(sheetHeight, {
      toValue: SHEET_EXPANDED,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  }
  function collapseSheet() {
    setSheetExpanded(false);
    Animated.spring(sheetHeight, {
      toValue: SHEET_COLLAPSED,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  }
  function showSheet() {
    setSheetVisible(true);
    Animated.spring(sheetHeight, {
      toValue: SHEET_COLLAPSED,
      useNativeDriver: false,
    }).start();
  }

  // ── PanResponder ──────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
      onPanResponderMove: (_, g) => {
        const next = currentHeight.current - g.dy;
        sheetHeight.setValue(
          Math.min(SHEET_EXPANDED, Math.max(SHEET_COLLAPSED, next)),
        );
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -DRAG_THRESHOLD) {
          expandSheet();
        } else if (g.dy > DRAG_THRESHOLD) {
          collapseSheet();
        } else {
          currentHeight.current > (SHEET_COLLAPSED + SHEET_EXPANDED) / 2
            ? expandSheet()
            : collapseSheet();
        }
      },
    }),
  ).current;

  // ── Fetch données ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      // Fetch parkings
      const res = await fetch(`${BACKEND_URL}/parking-lots`);
      const data = await res.json();
      const lotsData: ParkingLot[] = Array.isArray(data) ? data : [];
      setLots(lotsData);

      // Fetch spots summary pour tous les parkings en parallèle
      const results: Record<string, number> = {};
      await Promise.all(
        lotsData.map((lot) =>
          fetch(`${BACKEND_URL}/spots-summary/${lot.id}`)
            .then((r) => r.json())
            .then((d) => {
              results[lot.id] = d.free;
            })
            .catch(() => {}),
        ),
      );
      setPinFreeSpots(results);
    } catch {
      if (!silent) setLots([]);
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  // Chargement initial
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Actualisation automatique toutes les 15 secondes (silencieuse)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true); // silent = pas de spinner
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Géolocalisation ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Géolocalisation refusée");
        setLocationLoading(false);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        mapRef.current?.animateToRegion(
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.018,
            longitudeDelta: 0.018,
          },
          800,
        );
      } catch {
        setLocationError("Impossible d'obtenir la position");
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  // ── Tri par pertinence ────────────────────────────────────────────────────
  const sortLots = useCallback(() => {
    if (lots.length === 0) return;
    if (!userLocation) {
      setSortedLots(lots.map((l) => ({ ...l, distanceKm: undefined })));
      return;
    }
    const scored = lots.map((lot) => {
      const distanceKm = haversineKm(
        userLocation.latitude,
        userLocation.longitude,
        lot.latitude,
        lot.longitude,
      );
      const free = pinFreeSpots[lot.id] ?? 0;
      return {
        ...lot,
        distanceKm,
        _score: relevanceScore(
          distanceKm,
          free,
          lot.total_spots,
          lot.type === "paid",
        ),
      };
    });
    scored.sort((a, b) => a._score - b._score);
    setSortedLots(scored);
  }, [lots, userLocation, pinFreeSpots]);

  useEffect(() => {
    sortLots();
  }, [sortLots]);

  // Parkings dans le rayon de 3 km
  const nearbyLots = userLocation
    ? sortedLots.filter(
        (l) => l.distanceKm === undefined || l.distanceKm <= NEARBY_RADIUS_KM,
      )
    : sortedLots;

  // ── Navigation ────────────────────────────────────────────────────────────
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

  async function goToMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationError("Permission refusée");
      return;
    }
    setLocationError(null);
    const location = await Location.getCurrentPositionAsync({});
    setUserLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
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
    setTimeout(() => openDetails(lot as ParkingLot), 750);
  }

  function handleCardPress(lot: SortedLot) {
    mapRef.current?.animateToRegion(
      {
        latitude: lot.latitude,
        longitude: lot.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      500,
    );
    collapseSheet();
    setTimeout(() => openDetails(lot), 550);
  }

  const initialRegion =
    lots.length > 0
      ? {
          latitude: lots[0].latitude,
          longitude: lots[0].longitude,
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        }
      : {
          latitude: 36.75,
          longitude: 5.039,
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        };

  // ── Contenu du panneau ────────────────────────────────────────────────────
  function renderSheetContent() {
    if (locationLoading) {
      return (
        <View style={s.sheetCenter}>
          <ActivityIndicator size="small" color="#1a73e8" />
          <Text style={s.sheetHint}>Localisation en cours…</Text>
        </View>
      );
    }
    if (nearbyLots.length === 0) {
      return (
        <View style={s.sheetCenter}>
          <Ionicons name="location-outline" size={32} color="#cbd5e1" />
          <Text style={s.emptyTitle}>Aucun parking à proximité</Text>
          <Text style={s.emptyHint}>
            Aucun parking trouvé dans un rayon de {NEARBY_RADIUS_KM} km.
          </Text>
        </View>
      );
    }
    return (
      <ScrollView
        style={s.listScroll}
        contentContainerStyle={s.listContent}
        scrollEnabled={sheetExpanded}
        nestedScrollEnabled
        refreshControl={
          sheetExpanded ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(false)}
              colors={["#1a73e8"]}
              tintColor="#1a73e8"
            />
          ) : undefined
        }
      >
        {!userLocation && locationError && (
          <View style={s.noLocBanner}>
            <Ionicons name="warning-outline" size={14} color="#f97316" />
            <Text style={s.noLocText}>
              on ne sait pas où vous êtes. Activez la localisation
            </Text>
          </View>
        )}
        {nearbyLots.map((lot) => (
          <NearbyCard
            key={lot.id}
            lotId={lot.id}
            name={lot.name}
            totalSpots={lot.total_spots}
            type={lot.type}
            distanceKm={lot.distanceKm}
            onPress={() => handleCardPress(lot)}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={s.container}>
      {/* ── Carte ────────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={s.map}
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

      {/* ── Barre de recherche ───────────────────────────────────────────── */}
      <SearchBar lots={lots} onSelectLot={handleSearchSelect} />

      {/* ── Bannière erreur localisation ─────────────────────────────────── */}
      {locationError && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>{locationError}</Text>
        </View>
      )}

      {/* ── Légende ──────────────────────────────────────────────────────── */}
      <View style={s.legend}>
        <View style={s.legendRow}>
          <View style={[s.legendDot, { backgroundColor: "#1a73e8" }]} />
          <Text style={s.legendText}>Payant</Text>
        </View>
        <View style={s.legendRow}>
          <View style={[s.legendDot, { backgroundColor: "#02a31d" }]} />
          <Text style={s.legendText}>Gratuit</Text>
        </View>
        <View style={s.legendRow}>
          <View style={[s.legendDot, { backgroundColor: "#c0392b" }]} />
          <Text style={s.legendText}>Complet</Text>
        </View>
      </View>

      {/* ── Bouton localisation ──────────────────────────────────────────── */}
      <TouchableOpacity
        style={s.locationButton}
        onPress={goToMyLocation}
        activeOpacity={0.8}
      >
        <AntDesign name="aim" size={22} color="#1a73e8" />
      </TouchableOpacity>

      {/* ── Bouton ré-ouvrir panneau ─────────────────────────────────────── */}
      {!sheetVisible && (
        <TouchableOpacity style={s.reopenButton} onPress={showSheet}>
          <Ionicons name="chevron-up" size={20} color="#1a73e8" />
        </TouchableOpacity>
      )}

      {/* ── Panneau coulissant ───────────────────────────────────────────── */}
      {sheetVisible && (
        <Animated.View style={[s.bottomSheet, { height: sheetHeight }]}>
          <View {...panResponder.panHandlers} style={s.dragArea}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>
                  Parkings à proximité
                  {nearbyLots.length > 0 && (
                    <Text style={s.sheetCount}> · {nearbyLots.length}</Text>
                  )}
                </Text>
                {userLocation && (
                  <Text style={s.sheetSubtitle}>
                    Dans un rayon de {NEARBY_RADIUS_KM} km
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={s.chevronBtn}
                onPress={sheetExpanded ? collapseSheet : expandSheet}
              >
                <Ionicons
                  name={sheetExpanded ? "chevron-down" : "chevron-up"}
                  size={18}
                  color="#1a73e8"
                />
              </TouchableOpacity>
            </View>
          </View>

          {renderSheetContent()}
        </Animated.View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  legend: {
    position: "absolute",
    right: 16,
    bottom: SHEET_COLLAPSED + 68,
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
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: "#333", fontWeight: "500" },

  locationButton: {
    position: "absolute",
    right: 16,
    bottom: SHEET_COLLAPSED + 14,
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
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 12,
    overflow: "hidden",
  },
  dragArea: {
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#dde2ea",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a2e" },
  sheetCount: { fontWeight: "400", color: "#94a3b8" },
  sheetSubtitle: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  chevronBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e8f0fe",
    justifyContent: "center",
    alignItems: "center",
  },

  listScroll: { flex: 1 },
  listContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 20 },

  sheetCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingBottom: 20,
  },
  sheetHint: { fontSize: 13, color: "#94a3b8" },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a2e" },
  emptyHint: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 20,
  },

  noLocBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff7ed",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  noLocText: { fontSize: 12, color: "#c2410c", flex: 1 },
});
