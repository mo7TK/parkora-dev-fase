import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex:              1,
    backgroundColor:   "#f4f4f4",
    paddingTop:        60,
    paddingHorizontal: 16,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize:     24,
    fontWeight:   "600",
    color:        "#1a1a2e",
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  statusDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
  },
  statusText: {
    fontSize:        13,
    color:           "#555",
    textTransform:   "capitalize",
  },

  // ── Summary ───────────────────────────────────────────────────────────────
  summary: {
    flexDirection: "row",
    gap:           20,
    marginBottom:  20,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  summaryDot: {
    width:        14,
    height:       14,
    borderRadius: 3,
  },
  summaryText: {
    fontSize:   15,
    color:      "#333",
    fontWeight: "500",
  },

  // ── Waiting state ─────────────────────────────────────────────────────────
  waiting: {
    flex:           1,
    justifyContent: "center",
    alignItems:     "center",
  },
  waitingText: {
    fontSize:   15,
    color:      "#888",
    textAlign:  "center",
    lineHeight: 24,
  },

  // ── Grid ──────────────────────────────────────────────────────────────────
  grid: {
    paddingBottom: 40,
  },
  row: {
    justifyContent: "flex-start",
  },

  // ── Spot box ──────────────────────────────────────────────────────────────
  spot: {
    height:         100,
    width:          "30%",
    margin:         6,
    borderRadius:   10,
    justifyContent: "center",
    alignItems:     "center",
  },
  spotFree: {
    backgroundColor: "#2ecc71",
  },
  spotOccupied: {
    backgroundColor: "#e74c3c",
  },
  spotNumber: {
    fontSize:   22,
    fontWeight: "700",
    color:      "#fff",
  },
  spotLabel: {
    fontSize:  11,
    color:     "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
});
