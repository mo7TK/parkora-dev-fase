import { StyleSheet, Text, View } from "react-native";

type Props = {
  freeSpots?: number;
};

export default function ParkingPin({ freeSpots }: Props) {
  const hasBadge = freeSpots !== undefined;
  const isFull = hasBadge && freeSpots === 0;
  const pillColor = isFull ? "#c0392b" : "#02a31d";
  const countColor = isFull ? "#ffb3af" : "rgb(255, 255, 255)";

  return (
    <View style={styles.wrapper}>
      <View style={[styles.pill, { backgroundColor: pillColor }]}>
        {/* P label */}
        <Text style={styles.pText}>P</Text>

        {/* Divider + count — only when freeSpots is provided */}
        {hasBadge && (
          <>
            <View style={styles.divider} />
            <Text style={[styles.countText, { color: countColor }]}>
              {freeSpots}
            </Text>
          </>
        )}
      </View>

      {/* Downward triangle pointer */}
      <View style={[styles.pointer, { borderTopColor: pillColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    height: 25,
    borderRadius: 13,
    paddingHorizontal: 5,
    borderWidth: 1.5,
    borderColor: "#fff",
    gap: 2,
  },

  pText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 16,
  },

  divider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.45)",
  },

  countText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },

  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },
});
