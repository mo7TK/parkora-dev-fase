import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },

  // ── Custom "P" pin ────────────────────────────────────────────────────────
  pin: {
    width: 30,
    height: 30,
    borderRadius: 22,
    backgroundColor: "#1a73e8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  pinText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
});
