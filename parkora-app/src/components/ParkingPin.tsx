import { StyleSheet, Text, View } from "react-native";

type Props = {
  /** When provided, shows the free spot count below the P */
  freeSpots?: number;
};

export default function ParkingPin({ freeSpots }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.pin}>
        <Text style={styles.pinText}>P</Text>
      </View>
      {freeSpots !== undefined && (
        <View style={[styles.badge, freeSpots === 0 && styles.badgeFull]}>
          <Text style={styles.badgeText}>{freeSpots}</Text>
        </View>
      )}
      {/* Small triangle pointer below the pin */}
      <View style={styles.pointer} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  pin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1a73e8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  pinText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#1a73e8",
    marginTop: -1,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#2ecc71",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeFull: {
    backgroundColor: "#e74c3c",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
});
