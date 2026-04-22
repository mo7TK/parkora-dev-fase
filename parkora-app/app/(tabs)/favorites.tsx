import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import FavoriteCard from "@/src/components/FavoriteCard";
import { useAuth } from "@/src/context/AuthContext";
import { BACKEND_URL } from "@/src/constants/config";

type ParkingLot = {
  id: string;
  name: string;
  total_spots: number;
  latitude: number;
  longitude: number;
  hero_image?: string;
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

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchFavorites();
    }, [token]),
  );

  async function removeFavorite(lotId: string) {
    if (!token) return;
    setLots((prev) => prev.filter((l) => l.id !== lotId));
    try {
      await fetch(`${BACKEND_URL}/favorites/${lotId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      fetchFavorites();
    }
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
          colors={["#1a73e8"]} // Android
        />
      }
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <LinearGradient colors={["#1a73e8", "#4da3ff"]} style={s.header}>
        <Text style={s.title}>Favoris</Text>
        <Text style={s.sub}>Vos parkings enregistrés</Text>
      </LinearGradient>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#1a73e8"
          style={{ marginTop: 60 }}
        />
      ) : lots.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Ionicons name="heart-outline" size={48} color="#cbd5e1" />
          </View>
          <Text style={s.emptyTitle}>Aucun favori</Text>
          <Text style={s.emptySub}>
            Appuyez sur le cœur d'un parking pour l'enregistrer ici.
          </Text>
        </View>
      ) : (
        <View style={s.cards}>
          {lots.map((lot) => (
            <FavoriteCard
              key={lot.id}
              lotId={lot.id}
              name={lot.name}
              totalSpots={lot.total_spots}
              heroImage={lot.hero_image}
              isFavorite={true}
              onPress={() => openDetails(lot)}
              onToggleFavorite={() => removeFavorite(lot.id)}
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
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
  },
  title: { fontSize: 28, fontWeight: "800", color: "#fff" },
  sub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },

  cards: {
    padding: 16,
    gap: 14,
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
