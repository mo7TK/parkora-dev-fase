/**
 * app/(parking)/minimap.tsx
 * FIX : arrière-plan blanc, image 100% largeur, resizeMode="contain"
 * cohérent avec reservation-spot.
 */

import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";

import { BACKEND_URL, WS_BASE_URL } from "@/src/constants/config";
import { SPOT_CONFIGS } from "@/src/constants/spotPositions";
import { useMapDimensions, dotPosition } from "@/src/hooks/useMapDimensions";

type SpotStatus = "free" | "occupied" | "reserved";
type Spot = { id: number; status: SpotStatus };
type ConnStatus = "connecting" | "connected" | "disconnected";

const DOT_SIZE = 28;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

const STATUS_COLOR: Record<SpotStatus, string> = {
  free: "#2ecc71",
  occupied: "#e74c3c",
  reserved: "#f97316",
};

export default function MiniMap() {
  const { lotId, minimapImage } = useLocalSearchParams<{
    lotId: string;
    minimapImage: string;
  }>();

  const mapImageUri =
    lotId && minimapImage
      ? `${BACKEND_URL}/assets/images/minimaps/${minimapImage}`
      : null;

  const lotConfig = lotId ? SPOT_CONFIGS[lotId] : null;
  const { imageDisplayWidth, imageDisplayHeight } = useMapDimensions(lotConfig);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [connStatus, setStatus] = useState<ConnStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);

  // ── Reanimated ────────────────────────────────────────────────────────────
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), 4);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  function resetView() {
    scale.value = withTiming(1);
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    savedScale.value = 1;
    savedTx.value = 0;
    savedTy.value = 0;
  }

  // ── WebSocket ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!lotId) return;
    function connect() {
      setStatus("connecting");
      const ws = new WebSocket(`${WS_BASE_URL}/${lotId}`);
      wsRef.current = ws;
      ws.onopen = () => setStatus("connected");
      ws.onmessage = (e) => setSpots(JSON.parse(e.data).spots);
      ws.onclose = () => {
        setStatus("disconnected");
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
    }
    connect();
    return () => wsRef.current?.close();
  }, [lotId]);

  const statusColor = {
    connecting: "#f0a500",
    connected: "#2ecc71",
    disconnected: "#e74c3c",
  }[connStatus];
  const statusLabel = {
    connecting: "Connexion…",
    connected: "Connecté",
    disconnected: "Déconnecté",
  }[connStatus];
  const freeCount = spots.filter((s) => s.status === "free").length;
  const occupiedCount = spots.filter((s) => s.status === "occupied").length;
  const reservedCount = spots.filter((s) => s.status === "reserved").length;

  if (!mapImageUri || !lotConfig) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Plan non disponible</Text>
        <Text style={styles.errorBody}>
          Aucune image ou configuration de spots trouvée pour ce parking.
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* ── Zone carte — fond blanc, pleine largeur ───────────────────────── */}
      <View style={styles.mapClip}>
        <GestureDetector gesture={composed}>
          <Animated.View
            style={[
              {
                width: imageDisplayWidth,
                height: imageDisplayHeight,
                backgroundColor: "#fff", // fond blanc derrière l'image
              },
              animStyle,
            ]}
          >
            <Image
              source={{ uri: mapImageUri }}
              style={{ width: imageDisplayWidth, height: imageDisplayHeight }}
              resizeMode="stretch"
            />

            {/* Dots */}
            {spots.map((spot) => {
              const pos = lotConfig.positions[spot.id];
              if (!pos) return null;
              const { left, top } = dotPosition(
                pos.x,
                pos.y,
                imageDisplayWidth,
                imageDisplayHeight,
                DOT_SIZE,
              );
              const color = STATUS_COLOR[spot.status] ?? STATUS_COLOR.free;
              return (
                <View
                  key={spot.id}
                  style={[
                    styles.spotDot,
                    { left, top, backgroundColor: color },
                  ]}
                >
                  {spot.status === "reserved" ? (
                    <Text style={styles.spotLock}>🔒</Text>
                  ) : (
                    <Text style={styles.spotDotText}>{spot.id}</Text>
                  )}
                </View>
              );
            })}
          </Animated.View>
        </GestureDetector>
      </View>

      {/* ── Status pill ──────────────────────────────────────────────────── */}
      <View style={styles.topOverlay}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
        {spots.length > 0 && (
          <>
            <View style={styles.separator} />
            <SummaryItem color="#2ecc71" label={`Libres: ${freeCount}`} />
            <SummaryItem color="#e74c3c" label={`Occupés: ${occupiedCount}`} />
            {reservedCount > 0 && (
              <SummaryItem
                color="#f97316"
                label={`Réservés: ${reservedCount}`}
              />
            )}
          </>
        )}
      </View>

      {/* ── Attente ──────────────────────────────────────────────────────── */}
      {spots.length === 0 && (
        <View style={styles.waiting}>
          <Text style={styles.waitingText}>
            En attente des données…{"\n"}Assurez-vous que detect.py tourne.
          </Text>
        </View>
      )}

      {/* ── Reset ────────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.resetButton} onPress={resetView}>
        <Text style={styles.resetButtonText}>⊙ Réinitialiser</Text>
      </TouchableOpacity>
    </GestureHandlerRootView>
  );
}

function SummaryItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.summaryItem}>
      <View style={[styles.summaryDot, { backgroundColor: color }]} />
      <Text style={styles.summaryText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // fond blanc sur tout l'écran
  container: { flex: 1, backgroundColor: "#fff" },

  // clip pleine largeur + hauteur écran, overflow hidden pour le zoom
  mapClip: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    overflow: "hidden",
    backgroundColor: "#fff",
  },

  spotDot: {
    position: "absolute",
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 6,
  },
  spotDotText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  spotLock: { fontSize: 12 },

  topOverlay: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 11, color: "#fff", fontWeight: "500" },
  separator: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  summaryDot: { width: 7, height: 7, borderRadius: 2 },
  summaryText: { fontSize: 11, color: "#fff", fontWeight: "500" },

  reservedLegend: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    backgroundColor: "rgba(249,115,22,0.85)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  reservedLegendText: { fontSize: 12, color: "#fff", fontWeight: "600" },

  waiting: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  waitingText: {
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
    lineHeight: 22,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },

  resetButton: {
    position: "absolute",
    bottom: 45,
    alignSelf: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  resetButtonText: { fontSize: 14, fontWeight: "600", color: "#1a73e8" },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f4f4",
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 12,
  },
  errorBody: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
  },
});
