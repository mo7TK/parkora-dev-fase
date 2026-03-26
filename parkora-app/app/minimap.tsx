import { useEffect, useRef, useState } from "react";
import { FlatList, Text, View } from "react-native";

import SpotBox from "@/src/components/SpotBox";
import { styles } from "@/src/styles/minimap.styles";
import { WS_URL } from "@/src/constants/config";

// ── Types ─────────────────────────────────────────────────────────────────────
type Spot = {
  id:     number;
  status: "free" | "occupied";
};

type ConnectionStatus = "connecting" | "connected" | "disconnected";
// ─────────────────────────────────────────────────────────────────────────────

export default function MiniMap() {
  const [spots, setSpots]                     = useState<Spot[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const wsRef                                 = useRef<WebSocket | null>(null);

  useEffect(() => {
    function connect() {
      setConnectionStatus("connecting");
      const ws    = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus("connected");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setSpots(data.spots);
      };

      ws.onclose = () => {
        setConnectionStatus("disconnected");
        setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const statusColor = {
    connecting:   "#f0a500",
    connected:    "#2ecc71",
    disconnected: "#e74c3c",
  }[connectionStatus];

  const freeCount     = spots.filter((s) => s.status === "free").length;
  const occupiedCount = spots.filter((s) => s.status === "occupied").length;

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>Parking Layout</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusText}>{connectionStatus}</Text>
        </View>
      </View>

      {spots.length > 0 && (
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, styles.spotFree]} />
            <Text style={styles.summaryText}>Free: {freeCount}</Text>
          </View>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, styles.spotOccupied]} />
            <Text style={styles.summaryText}>Occupied: {occupiedCount}</Text>
          </View>
        </View>
      )}

      {spots.length === 0 && (
        <View style={styles.waiting}>
          <Text style={styles.waitingText}>
            Waiting for detection data...{"\n"}Make sure detect.py is running.
          </Text>
        </View>
      )}

      <FlatList
        data={spots}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <SpotBox id={item.id} status={item.status} />}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
      />

    </View>
  );
}
