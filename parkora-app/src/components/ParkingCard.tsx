import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ── Types ─────────────────────────────────────────────────────────────────────
type Props = {
  name:    string;
  onPress: () => void;
};
// ─────────────────────────────────────────────────────────────────────────────

export default function ParkingCard({ name, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>P</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.sub}>Tap to view details</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#aaa" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection:  "row",
    alignItems:     "center",
    backgroundColor: "#f8f8f8",
    borderRadius:   12,
    padding:        14,
    gap:            12,
  },
  iconBox: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: "#1a73e8",
    justifyContent:  "center",
    alignItems:      "center",
  },
  iconText: {
    color:      "#fff",
    fontSize:   18,
    fontWeight: "700",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize:   15,
    fontWeight: "600",
    color:      "#1a1a2e",
  },
  sub: {
    fontSize:  12,
    color:     "#aaa",
    marginTop: 2,
  },
});
