/**
 * app/(parking)/reservation-spot.tsx
 * ─────────────────────────────────────
 * Écran de sélection d'emplacement pour une réservation.
 *
 * Distinct de minimap.tsx :
 *  - Pas de WebSocket / pas de temps-réel
 *  - Couleurs des dots :
 *      Gris   → disponible (cliquable)
 *      Rouge  → déjà réservé sur le créneau demandé (non-cliquable, icône 🔒)
 *      Bleu   → sélectionné par l'utilisateur (animation pulse)
 *  - Les couleurs ne changent QUE pendant l'interaction de sélection
 *  - Barre fixe en bas : "Continuer avec la place N°X"
 */

import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";

import { BACKEND_URL } from "@/src/constants/config";
import { SPOT_CONFIGS } from "@/src/constants/spotPositions";

const DOT_SIZE     = 30;
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function ReservationSpot() {
  const { lotId, name, minimapImage, pricePerHour } = useLocalSearchParams<{
    lotId:        string;
    name:         string;
    minimapImage: string;
    pricePerHour: string;
  }>();

  const lotConfig = lotId ? SPOT_CONFIGS[lotId] : null;

  const imageDisplayWidth  = SCREEN_WIDTH;
  const imageDisplayHeight = lotConfig
    ? (lotConfig.imageHeight / lotConfig.imageWidth) * imageDisplayWidth
    : 800;

  const mapImageUri = lotId && minimapImage
    ? `${BACKEND_URL}/assets/images/minimaps/${minimapImage}`
    : null;

  const [takenSpots, setTakenSpots] = useState<number[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Pulse animation shared value for selected dot
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (!lotId) return;
    // Fetch currently active reservations (right now) to mark taken spots
    fetch(`${BACKEND_URL}/reservations/active/${lotId}`)
      .then((r) => r.json())
      .then((data: { spot_id: number }[]) => {
        setTakenSpots(data.map((r) => r.spot_id));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lotId]);

  function selectSpot(spotId: number) {
    if (takenSpots.includes(spotId)) return;
    setSelectedSpot(spotId);
    // Trigger pulse animation
    pulseScale.value = withSequence(
      withTiming(1.35, { duration: 150 }),
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500 }),
          withTiming(1.0, { duration: 500 }),
        ),
        -1,
        true,
      ),
    );
  }

  // ── Pinch & Pan gestures ────────────────────────────────────────────────────
  const scale         = useSharedValue(1);
  const savedScale    = useSharedValue(1);
  const translateX    = useSharedValue(0);
  const translateY    = useSharedValue(0);
  const savedTX       = useSharedValue(0);
  const savedTY       = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => { scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), 4); })
    .onEnd(() => { savedScale.value = scale.value; });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTX.value + e.translationX;
      translateY.value = savedTY.value + e.translationY;
    })
    .onEnd(() => {
      savedTX.value = translateX.value;
      savedTY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const mapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const selectedDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  function handleContinue() {
    if (!selectedSpot) return;
    router.push({
      pathname: "/(parking)/reservation-form",
      params: {
        lotId,
        name,
        spotId:       selectedSpot,
        pricePerHour,
      },
    });
  }

  if (!lotConfig || !mapImageUri) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Plan non configuré</Text>
        <Text style={styles.errorBody}>
          Aucune image ou position de spots trouvée pour ce parking.
        </Text>
      </View>
    );
  }

  // Total number of spots from config
  const totalSpots = Object.keys(lotConfig.positions).length;

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* ── Instructions pill ───────────────────────────────────────────────── */}
      <View style={styles.topOverlay}>
        <Text style={styles.topText}>
          Appuyez sur un emplacement{" "}
          <Text style={{ color: "#94a3b8" }}>gris</Text> pour le sélectionner
        </Text>
      </View>

      {/* ── Map + dots ──────────────────────────────────────────────────────── */}
      <GestureDetector gesture={composed}>
        <Animated.View
          style={[{ width: imageDisplayWidth, height: imageDisplayHeight }, mapStyle]}
        >
          <Image
            source={{ uri: mapImageUri }}
            style={{ width: imageDisplayWidth, height: imageDisplayHeight }}
            resizeMode="cover"
          />

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#1a73e8" />
            </View>
          )}

          {!loading &&
            Array.from({ length: totalSpots }, (_, i) => i + 1).map((spotId) => {
              const pos = lotConfig.positions[spotId];
              if (!pos) return null;

              const left = (pos.x / 100) * imageDisplayWidth - DOT_SIZE / 2;
              const top  = (pos.y / 100) * imageDisplayHeight - DOT_SIZE / 2;

              const isTaken   = takenSpots.includes(spotId);
              const isSelected = selectedSpot === spotId;

              let bgColor = "#94a3b8"; // grey = available
              if (isTaken)    bgColor = "#ef4444"; // red = taken
              if (isSelected) bgColor = "#1a73e8"; // blue = selected

              const dotContent = isTaken ? (
                <Text style={styles.dotLock}>🔒</Text>
              ) : (
                <Text style={styles.dotText}>{spotId}</Text>
              );

              if (isSelected) {
                return (
                  <Animated.View
                    key={spotId}
                    style={[
                      styles.dot,
                      { left, top, backgroundColor: bgColor, borderColor: "#fff" },
                      selectedDotStyle,
                    ]}
                  >
                    <Text style={styles.dotCheck}>✓</Text>
                  </Animated.View>
                );
              }

              return (
                <TouchableOpacity
                  key={spotId}
                  style={[
                    styles.dot,
                    {
                      left,
                      top,
                      backgroundColor: bgColor,
                      borderColor: isTaken ? "#c0392b" : "#fff",
                      opacity: isTaken ? 0.75 : 1,
                    },
                  ]}
                  onPress={() => selectSpot(spotId)}
                  activeOpacity={isTaken ? 1 : 0.7}
                  disabled={isTaken}
                >
                  {dotContent}
                </TouchableOpacity>
              );
            })}
        </Animated.View>
      </GestureDetector>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <View style={styles.legend}>
        <LegendItem color="#94a3b8" label="Disponible" />
        <LegendItem color="#ef4444" label="Réservé" icon="🔒" />
        <LegendItem color="#1a73e8" label="Sélectionné" />
      </View>

      {/* ── Bottom CTA bar ──────────────────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        {selectedSpot ? (
          <>
            <View>
              <Text style={styles.selectedLabel}>Place sélectionnée</Text>
              <Text style={styles.selectedNumber}>Emplacement N°{selectedSpot}</Text>
            </View>
            <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
              <Text style={styles.continueBtnText}>Continuer  →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.noSelectionText}>
            Sélectionnez un emplacement pour continuer
          </Text>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

function LegendItem({ color, label, icon }: { color: string; label: string; icon?: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]}>
        {icon && <Text style={{ fontSize: 8 }}>{icon}</Text>}
      </View>
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  topOverlay: {
    position: "absolute",
    top: 30,
    alignSelf: "center",
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  topText: { fontSize: 13, color: "#fff", fontWeight: "500" },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  dot: {
    position: "absolute",
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 6,
  },
  dotText:  { color: "#fff", fontSize: 11, fontWeight: "700" },
  dotCheck: { color: "#fff", fontSize: 14, fontWeight: "900" },
  dotLock:  { fontSize: 11 },

  legend: {
    position: "absolute",
    bottom: 110,
    alignSelf: "center",
    flexDirection: "row",
    gap: 14,
    backgroundColor: "rgba(0,0,0,0.50)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot:  { width: 14, height: 14, borderRadius: 7, justifyContent: "center", alignItems: "center" },
  legendLabel:{ fontSize: 12, color: "#fff", fontWeight: "500" },

  bottomBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: 90,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  selectedLabel:  { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  selectedNumber: { fontSize: 18, fontWeight: "800", color: "#1a1a2e" },
  continueBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  continueBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  noSelectionText: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "500",
  },

  errorContainer: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: "#f4f4f4", padding: 32,
  },
  errorTitle: { fontSize: 20, fontWeight: "700", color: "#1a1a2e", marginBottom: 12 },
  errorBody:  { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 22 },
});
