import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import ParkingCard from "@/src/components/ParkingCard";
import { useAuth } from "@/src/context/AuthContext";
import { BACKEND_URL } from "@/src/constants/config";
import { router } from "expo-router";

type ParkingLot = {
  id: string;
  name: string;
  total_spots: number;
  latitude: number;
  longitude: number;
};

export default function Favorites() {
  const { token } = useAuth();
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchFavorites() {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/favorites/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLots(Array.isArray(data) ? data : []);
    } catch {
      setLots([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Recharge à chaque fois que l'onglet devient visible
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchFavorites();
    }, [token]),
  );

  function openDetails(lot: ParkingLot) {
    router.push({
      pathname: "/(parking)/details",
      params: {
        lotId: lot.id,
        name: lot.name,
        totalSpots: lot.total_spots,
        latitude: lot.latitude,
        longitude: lot.longitude,
      },
    });
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchFavorites();
          }}
          tintColor="#1a73e8"
        />
      }
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Favorites</Text>
        <Text style={s.sub}>Your saved parking lots</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#1a73e8"
          style={{ marginTop: 60 }}
        />
      ) : lots.length === 0 ? (
        /* Empty state */
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Ionicons name="heart-outline" size={48} color="#cbd5e1" />
          </View>
          <Text style={s.emptyTitle}>No favorites yet</Text>
          <Text style={s.emptySub}>
            Tap the heart icon on any parking lot to save it here.
          </Text>
        </View>
      ) : (
        /* Cards — même ParkingCard que la map */
        <View style={s.cards}>
          {lots.map((lot) => (
            <ParkingCard
              key={lot.id}
              lotId={lot.id}
              name={lot.name}
              totalSpots={lot.total_spots}
              onPress={() => openDetails(lot)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f0f4f8" },
  content: { paddingBottom: 40 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  title: { fontSize: 28, fontWeight: "800", color: "#1a1a2e" },
  sub: { fontSize: 13, color: "#94a3b8", marginTop: 4 },

  cards: {
    padding: 16,
    gap: 12,
  },

  empty: {
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  emptySub: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
  },
});
