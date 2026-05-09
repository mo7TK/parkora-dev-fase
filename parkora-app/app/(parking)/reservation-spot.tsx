/**
 * app/(parking)/reservation-spot.tsx
 * ÉTAPE 2 du tunnel de réservation.
 */

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
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
import { router, useLocalSearchParams } from "expo-router";

import { BACKEND_URL } from "@/src/constants/config";
import { SPOT_CONFIGS } from "@/src/constants/spotPositions";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DOT_SIZE = 30;
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function ReservationSpot() {
  const {
    lotId,
    name,
    minimapImage,
    pricePerHour,
    date,
    startTime,
    endTime,
    duration,
    estPrice,
  } = useLocalSearchParams<{
    lotId: string;
    name: string;
    minimapImage: string;
    pricePerHour: string;
    date: string;
    startTime: string;
    endTime: string;
    duration: string;
    estPrice: string;
  }>();

  const insets = useSafeAreaInsets();

  const lotConfig = lotId ? SPOT_CONFIGS[lotId] : null;
  const imageDisplayWidth = SCREEN_WIDTH;
  const imageDisplayHeight = lotConfig
    ? (lotConfig.imageHeight / lotConfig.imageWidth) * imageDisplayWidth
    : 800;

  const mapImageUri =
    lotId && minimapImage
      ? `${BACKEND_URL}/assets/images/minimaps/${minimapImage}`
      : null;

  const [takenSpots, setTakenSpots] = useState<number[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lotId || !date || !startTime || !endTime) {
      setLoading(false);
      return;
    }
    const url = `${BACKEND_URL}/reservations/future/${lotId}?date=${date}&start=${encodeURIComponent(startTime)}&end=${encodeURIComponent(endTime)}`;
    fetch(url)
      .then((r) => r.json())
      .then((data: { taken_spots: number[] }) => {
        setTakenSpots(data.taken_spots ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lotId, date, startTime, endTime]);

  function selectSpot(spotId: number) {
    if (takenSpots.includes(spotId)) return;
    setSelectedSpot((prev) => (prev === spotId ? null : spotId));
  }

  // ── Gestures ──────────────────────────────────────────────────────────────
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

  const mapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  function handleContinue() {
    if (!selectedSpot) return;
    router.push({
      pathname: "/(parking)/reservation-payment",
      params: {
        lotId,
        name,
        spotId: selectedSpot,
        date,
        startTime,
        endTime,
        duration,
        totalPrice: estPrice,
        pricePerHour,
      },
    });
  }

  if (!lotConfig || !mapImageUri) {
    return (
      <View style={st.errorContainer}>
        <Text style={st.errorTitle}>Plan non configuré</Text>
        <Text style={st.errorBody}>
          Aucune image ou position de spots trouvée pour ce parking.
        </Text>
      </View>
    );
  }

  const totalSpots = Object.keys(lotConfig.positions).length;
  const available = totalSpots - takenSpots.length;

  return (
    <GestureHandlerRootView style={st.container}>
      {/* ── Zone carte ───────────────────────────────────────────────────── */}
      <ScrollView
        style={st.scrollArea}
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <GestureDetector gesture={composed}>
          <Animated.View
            style={[
              st.mapWrapper,
              { width: imageDisplayWidth, height: imageDisplayHeight },
              mapStyle,
            ]}
          >
            <Image
              source={{ uri: mapImageUri }}
              style={{ width: imageDisplayWidth, height: imageDisplayHeight }}
              resizeMode="contain"
            />

            {loading && (
              <View style={st.loadingOverlay}>
                <ActivityIndicator size="large" color="#7c3aed" />
                <Text style={st.loadingText}>Chargement…</Text>
              </View>
            )}

            {!loading &&
              Array.from({ length: totalSpots }, (_, i) => i + 1).map(
                (spotId) => {
                  const pos = lotConfig.positions[spotId];
                  if (!pos) return null;

                  const left = (pos.x / 100) * imageDisplayWidth - DOT_SIZE / 2;
                  const top = (pos.y / 100) * imageDisplayHeight - DOT_SIZE / 2;
                  const isTaken = takenSpots.includes(spotId);
                  const isSelected = selectedSpot === spotId;

                  let bgColor = "#64748b";
                  let borderColor = "#fff";
                  if (isTaken) {
                    bgColor = "#ef4444";
                    borderColor = "#c0392b";
                  }
                  if (isSelected) {
                    bgColor = "#7c3aed";
                    borderColor = "#5b21b6";
                  }

                  return (
                    <TouchableOpacity
                      key={spotId}
                      style={[
                        st.dot,
                        {
                          left,
                          top,
                          backgroundColor: bgColor,
                          borderColor,
                          opacity: isTaken ? 0.7 : 1,
                        },
                      ]}
                      onPress={() => selectSpot(spotId)}
                      activeOpacity={isTaken ? 1 : 0.75}
                      disabled={isTaken}
                    >
                      {isTaken ? (
                        <Text style={st.dotLock}>🔒</Text>
                      ) : isSelected ? (
                        <Text style={st.dotCheck}>✓</Text>
                      ) : (
                        <Text style={st.dotText}>{spotId}</Text>
                      )}
                    </TouchableOpacity>
                  );
                },
              )}
          </Animated.View>
        </GestureDetector>
      </ScrollView>

      {/* ── Info pill flottante (remplace la barre violette) ─────────────── */}
      {!loading && (
        <View style={st.infoPill}>
          <Text style={st.infoPillText}>
            {available} dispo · {date} · {startTime}–{endTime}
          </Text>
        </View>
      )}

      {/* ── Étapes + Légende ─────────────────────────────────────────────── */}
      <View style={st.midBar}>
        <View style={st.stepsRow}>
          <MiniStep num={1} label="Créneau" done />
          <View style={st.stepLine} />
          <MiniStep num={2} label="Place" active />
          <View style={st.stepLine} />
          <MiniStep num={3} label="Paiement" />
        </View>
        <View style={st.legend}>
          <LegendItem color="#64748b" label="Disponible" />
          <LegendItem color="#ef4444" label="Réservé" icon="🔒" />
          <LegendItem color="#7c3aed" label="Sélectionné" />
        </View>
      </View>

      {/* ── Barre du bas ─────────────────────────────────────────────────── */}
      <View style={[st.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        {selectedSpot ? (
          <>
            <View style={{ flex: 1 }}>
              <Text style={st.selectedLabel}>Emplacement sélectionné</Text>
              <Text style={st.selectedNumber}>Place N°{selectedSpot}</Text>
              <Text style={st.selectedCreno}>
                {startTime} → {endTime} · {duration}
              </Text>
            </View>
            <TouchableOpacity style={st.continueBtn} onPress={handleContinue}>
              <Text style={st.continueBtnText}>Payer →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={st.noSelectionText}>
            {loading
              ? "Chargement…"
              : "Appuyez sur un emplacement gris pour le sélectionner"}
          </Text>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MiniStep({
  num,
  label,
  active,
  done,
}: {
  num: number;
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  const bg = done ? "#16a34a" : active ? "#7c3aed" : "#e2e8f0";
  const color = done || active ? "#fff" : "#94a3b8";
  const lc = done ? "#16a34a" : active ? "#7c3aed" : "#94a3b8";
  return (
    <View style={{ alignItems: "center", gap: 3 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: "800", color }}>
          {done ? "✓" : num}
        </Text>
      </View>
      <Text style={{ fontSize: 9, fontWeight: "600", color: lc }}>{label}</Text>
    </View>
  );
}

function LegendItem({
  color,
  label,
  icon,
}: {
  color: string;
  label: string;
  icon?: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: color,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {icon && <Text style={{ fontSize: 7 }}>{icon}</Text>}
      </View>
      <Text style={{ fontSize: 11, color: "#4a5568", fontWeight: "500" }}>
        {label}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8" },

  scrollArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Fond blanc derrière le PNG
  mapWrapper: { backgroundColor: "#ffffff" },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { color: "#7c3aed", fontSize: 13, fontWeight: "600" },

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
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 5,
  },
  dotText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  dotCheck: { color: "#fff", fontSize: 14, fontWeight: "900" },
  dotLock: { fontSize: 11 },

  // Pill flottante (remplace la barre violette)
  infoPill: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  infoPillText: { fontSize: 12, color: "#fff", fontWeight: "500" },

  midBar: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 10,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  stepLine: { width: 28, height: 1, backgroundColor: "#e2e8f0" },
  legend: { flexDirection: "row", justifyContent: "center", gap: 16 },

  bottomBar: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 8,
  },
  selectedLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "600" },
  selectedNumber: { fontSize: 18, fontWeight: "800", color: "#1a1a2e" },
  selectedCreno: { fontSize: 11, color: "#64748b", marginTop: 2 },
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
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },

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
