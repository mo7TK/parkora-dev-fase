import { StyleSheet, Text, View } from "react-native";

type Props = {
  freeSpots?: number;
  type?: "paid" | "free";
};

export default function ParkingPin({ freeSpots, type = "free" }: Props) {
  const hasBadge = freeSpots !== undefined;
  const isFull = hasBadge && freeSpots === 0;

  // Rouge si plein, Bleu si payant avec places, Vert si gratuit avec places
  let pillColor: string;
  if (isFull) {
    pillColor = "#c0392b";
  } else if (type === "paid") {
    pillColor = "#1a73e8";
  } else {
    pillColor = "#02a31d";
  }

  const countColor = isFull ? "#ffb3af" : "#ffffff";

  return (
    <View style={styles.wrapper}>
      <View style={[styles.pill, { backgroundColor: pillColor }]}>
        <Text style={styles.pText}>P</Text>

        {hasBadge && (
          <>
            <View style={styles.divider} />
            <Text style={[styles.countText, { color: countColor }]}>
              {freeSpots}
            </Text>
          </>
        )}
      </View>

      {/* Triangle pointer */}
      <View style={[styles.pointer, { borderTopColor: pillColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    borderRadius: 13,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
    gap: 4,
  },
  pText: {
    fontSize: 11,
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
    fontSize: 11,
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
