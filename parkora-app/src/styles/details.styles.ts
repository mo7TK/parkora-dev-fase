import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f4",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 24,
  },

  // ── Stats card ────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2e1a1a",
  },
  statNumberFree: {
    color: "#2ecc71",
  },
  statNumberOccupied: {
    color: "#bc1300",
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: "#eee",
    marginVertical: 4,
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  buttonNavigate: {
    backgroundColor: "#1a73e8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonLayout: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  buttonTextWhite: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  buttonTextDark: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a2e",
  },

  // ── Loading / error ───────────────────────────────────────────────────────
  loadingText: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    marginTop: 8,
  },
});
