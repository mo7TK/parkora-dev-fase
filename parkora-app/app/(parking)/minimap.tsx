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

// ── Types ─────────────────────────────────────────────────────────────────────
type Spot = { id: number; status: "free" | "occupied" };
type ConnectionStatus = "connecting" | "connected" | "disconnected";
// ─────────────────────────────────────────────────────────────────────────────

const DOT_SIZE = 28;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function MiniMap() {
  // lotId and minimapImage are passed from the details screen.
  // minimapImage is just the filename e.g. "parking_map_epb.png"
  const { lotId, minimapImage } = useLocalSearchParams<{
    lotId: string;
    minimapImage: string;
  }>();

  // ── Build the image URI from the backend ────────────────────────────────────
  const mapImageUri =
    lotId && minimapImage
      ? `${BACKEND_URL}/assets/images/minimaps/${minimapImage}`
      : null;

  // ── Look up spot config for this lot ────────────────────────────────────────
  const lotConfig = lotId ? SPOT_CONFIGS[lotId] : null;

  const imageDisplayWidth = SCREEN_WIDTH;
  const imageDisplayHeight = lotConfig
    ? (lotConfig.imageHeight / lotConfig.imageWidth) * imageDisplayWidth
    : SCREEN_HEIGHT;

  // ── Spot state ───────────────────────────────────────────────────────────────
  const [spots, setSpots] = useState<Spot[]>([]);
  const [connectionStatus, setStatus] =
    useState<ConnectionStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);

  // ── Reanimated shared values ────────────────────────────────────────────────
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // ── Pinch (zoom) ─────────────────────────────────────────────────────────────
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), 4);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // ── Pan (drag) ───────────────────────────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // ── Reset view ───────────────────────────────────────────────────────────────
  function resetView() {
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }

  // ── WebSocket — connects to /ws/{lotId} ──────────────────────────────────────
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
  }[connectionStatus];

  const freeCount = spots.filter((s) => s.status === "free").length;
  const occupiedCount = spots.filter((s) => s.status === "occupied").length;

  // ── Guard: no URI or no spot config for this lot ─────────────────────────────
  if (!mapImageUri || !lotConfig) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Map not configured</Text>
        <Text style={styles.errorBody}>
          No minimap image or spot positions found for this parking lot.{"\n"}
          Make sure the lot has a minimap_image set in the database and an entry
          in spotPositions.ts.
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* ── Full-screen map ─────────────────────────────────────────────────── */}
      <View style={styles.mapClip}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View
            style={[
              { width: imageDisplayWidth, height: imageDisplayHeight },
              animatedStyle,
            ]}
          >
            {/* Map image — loaded dynamically via backend URI */}
            <Image
              source={{ uri: mapImageUri }}
              style={{ width: imageDisplayWidth, height: imageDisplayHeight }}
              resizeMode="cover"
            />

            {/* Spot dots — positioned using % of the display image size */}
            {spots.map((spot) => {
              const pos = lotConfig.positions[spot.id];
              if (!pos) return null;

              const left = (pos.x / 100) * imageDisplayWidth - DOT_SIZE / 2;
              const top = (pos.y / 100) * imageDisplayHeight - DOT_SIZE / 2;

              return (
                <View
                  key={spot.id}
                  style={[
                    styles.spotDot,
                    {
                      left,
                      top,
                      backgroundColor:
                        spot.status === "free" ? "#2ecc71" : "#e74c3c",
                    },
                  ]}
                >
                  <Text style={styles.spotDotText}>{spot.id}</Text>
                </View>
              );
            })}
          </Animated.View>
        </GestureDetector>
      </View>

      {/* ── Floating status pill ─────────────────────────────────────────────── */}
      <View style={styles.topOverlay}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusText}>{connectionStatus}</Text>
        </View>

        {spots.length > 0 && (
          <>
            <View style={styles.separator} />
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, styles.dotFree]} />
              <Text style={styles.summaryText}>Free: {freeCount}</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, styles.dotOccupied]} />
              <Text style={styles.summaryText}>Occupied: {occupiedCount}</Text>
            </View>
          </>
        )}
      </View>

      {/* ── Waiting message ──────────────────────────────────────────────────── */}
      {spots.length === 0 && (
        <View style={styles.waiting}>
          <Text style={styles.waitingText}>
            Waiting for detection data…{"\n"}Make sure detect.py is running.
          </Text>
        </View>
      )}

      {/* ── Reset view button ────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.resetButton} onPress={resetView}>
        <Text style={styles.resetButtonText}>⊙ Reset View</Text>
      </TouchableOpacity>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Map ───────────────────────────────────────────────────────────────────
  mapClip: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    overflow: "hidden",
  },

  // ── Spot dot ──────────────────────────────────────────────────────────────
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
  spotDotText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Status pill ───────────────────────────────────────────────────────────
  topOverlay: {
    position: "absolute",
    top: 30,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.50)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 13,
    color: "#fff",
    textTransform: "capitalize",
    fontWeight: "500",
  },
  separator: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  dotFree: { backgroundColor: "#2ecc71" },
  dotOccupied: { backgroundColor: "#e74c3c" },
  summaryText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "500",
  },

  // ── Waiting ───────────────────────────────────────────────────────────────
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

  // ── Reset button ──────────────────────────────────────────────────────────
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
  resetButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a73e8",
  },

  // ── Error state ───────────────────────────────────────────────────────────
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
