/**
 * app/(tabs)/reservation.tsx
 * ────────────────────────────
 * Onglet Réservations — historique complet.
 *
 * Statuts :
 *   confirmed → à venir (bleu)
 *   ongoing   → en cours, calculé à la volée (violet)
 *   completed → terminée (vert)
 *   cancelled → annulée (gris)
 */

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { useAuth } from "@/src/context/AuthContext";
import { BACKEND_URL } from "@/src/constants/config";

type ReservationStatus = "confirmed" | "ongoing" | "completed" | "cancelled";

type Reservation = {
  id: string;
  lot_id: string;
  lot_name: string;
  spot_id: number;
  date: string;
  start_time: string;
  end_time: string;
  duration_min: number;
  total_price: number;
  status: ReservationStatus;
  payment_method: string;
  created_at: string;
};

// ── Calcule si une réservation est "en cours" en ce moment ───────────────────
function computeDisplayStatus(r: Reservation): ReservationStatus {
  if (r.status !== "confirmed") return r.status;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  if (r.date !== todayStr) return "confirmed";

  const [sh, sm] = r.start_time.split(":").map(Number);
  const [eh, em] = r.end_time.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (nowMin >= startMin && nowMin < endMin) return "ongoing";
  return "confirmed";
}

const STATUS_CONFIG: Record<
  ReservationStatus,
  { label: string; color: string; bg: string; icon: string }
> = {
  confirmed: {
    label: "À venir",
    color: "#1a73e8",
    bg: "#e8f0fe",
    icon: "time-outline",
  },
  ongoing: {
    label: "En cours",
    color: "#7c3aed",
    bg: "#ede9fe",
    icon: "radio-button-on-outline",
  },
  completed: {
    label: "Terminée",
    color: "#16a34a",
    bg: "#dcfce7",
    icon: "checkmark-circle-outline",
  },
  cancelled: {
    label: "Annulée",
    color: "#64748b",
    bg: "#f1f5f9",
    icon: "close-circle-outline",
  },
};

function formatDuration(mins: number): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0
    ? m > 0
      ? `${h}h${String(m).padStart(2, "0")}`
      : `${h}h`
    : `${m} min`;
}

// ── Calcule le temps restant en minutes ──────────────────────────────────────
function remainingMinutes(endTime: string): number {
  const now = new Date();
  const [eh, em] = endTime.split(":").map(Number);
  const endMin = eh * 60 + em;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return Math.max(0, endMin - nowMin);
}

export default function ReservationHistory() {
  const { token } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());

  // Tick toutes les 30s pour rafraîchir les statuts "ongoing"
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  async function fetchReservations() {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/reservations/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setReservations(Array.isArray(data) ? data : []);
    } catch {
      setReservations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReservations();
    }, [token]),
  );

  async function cancelReservation(id: string) {
    Alert.alert(
      "Annuler la réservation",
      "Voulez-vous vraiment annuler cette réservation ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/reservations/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              setReservations((prev) =>
                prev.map((r) =>
                  r.id === id ? { ...r, status: "cancelled" } : r,
                ),
              );
            } catch {
              Alert.alert("Erreur", "Impossible d'annuler la réservation.");
            }
          },
        },
      ],
    );
  }

  // Calcule les statuts affichés en tenant compte de l'heure actuelle
  const displayed = reservations.map((r) => ({
    ...r,
    displayStatus: computeDisplayStatus(r),
  }));

  const ongoing = displayed.filter((r) => r.displayStatus === "ongoing");
  const upcoming = displayed.filter((r) => r.displayStatus === "confirmed");
  const past = displayed.filter(
    (r) => r.displayStatus === "completed" || r.displayStatus === "cancelled",
  );

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchReservations();
          }}
          colors={["#7c3aed"]}
        />
      }
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <LinearGradient colors={["#7c3aed", "#a855f7"]} style={s.header}>
        <Text style={s.headerTitle}>Réservations</Text>
        <Text style={s.headerSub}>Historique de vos réservations</Text>
        {!loading && (
          <View style={s.badgeRow}>
            {ongoing.length > 0 && (
              <View
                style={[
                  s.headerBadge,
                  { backgroundColor: "rgba(255,255,255,0.35)" },
                ]}
              >
                <View style={s.pulseDot} />
                <Text style={s.headerBadgeText}>{ongoing.length} en cours</Text>
              </View>
            )}
            {upcoming.length > 0 && (
              <View style={s.headerBadge}>
                <Text style={s.headerBadgeText}>{upcoming.length} à venir</Text>
              </View>
            )}
          </View>
        )}
      </LinearGradient>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <ActivityIndicator
          size="large"
          color="#7c3aed"
          style={{ marginTop: 60 }}
        />
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!loading && reservations.length === 0 && (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <MaterialCommunityIcons
              name="calendar-blank"
              size={48}
              color="#cbd5e1"
            />
          </View>
          <Text style={s.emptyTitle}>Aucune réservation</Text>
          <Text style={s.emptySub}>
            Réservez une place depuis la fiche d'un parking payant.
          </Text>
          <TouchableOpacity
            style={s.emptyBtn}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={s.emptyBtnText}>Découvrir les parkings</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── En cours ────────────────────────────────────────────────────────── */}
      {!loading && ongoing.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>En cours</Text>
          {ongoing.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              displayStatus={r.displayStatus}
              onCancel={() => cancelReservation(r.id)}
            />
          ))}
        </View>
      )}

      {/* ── À venir ─────────────────────────────────────────────────────────── */}
      {!loading && upcoming.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>À venir</Text>
          {upcoming.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              displayStatus={r.displayStatus}
              onCancel={() => cancelReservation(r.id)}
            />
          ))}
        </View>
      )}

      {/* ── Historique ──────────────────────────────────────────────────────── */}
      {!loading && past.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Historique</Text>
          {past.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              displayStatus={r.displayStatus}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ── Reservation card component ────────────────────────────────────────────────

function ReservationCard({
  reservation: r,
  displayStatus,
  onCancel,
}: {
  reservation: Reservation & { displayStatus: ReservationStatus };
  displayStatus: ReservationStatus;
  onCancel?: () => void;
}) {
  const conf = STATUS_CONFIG[displayStatus];
  const isOngoing = displayStatus === "ongoing";
  const remaining = isOngoing ? remainingMinutes(r.end_time) : null;

  return (
    <View style={[s.card, isOngoing && s.cardOngoing]}>
      <View style={s.cardInner}>
        {/* Top row */}
        <View style={s.cardTop}>
          <View style={[s.cardIcon, { backgroundColor: conf.bg }]}>
            <Ionicons name={conf.icon as any} size={22} color={conf.color} />
          </View>
          <View style={s.cardMeta}>
            <Text style={s.cardLotName} numberOfLines={1}>
              {r.lot_name}
            </Text>
            <Text style={s.cardDate}>{r.date}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: conf.bg }]}>
            {isOngoing && (
              <View style={[s.ongoingDot, { backgroundColor: conf.color }]} />
            )}
            <Text style={[s.statusText, { color: conf.color }]}>
              {conf.label}
            </Text>
          </View>
        </View>

        {/* Temps restant pour "en cours" */}
        {isOngoing && remaining !== null && (
          <View style={[s.remainingBar, { borderColor: conf.color + "40" }]}>
            <Ionicons name="hourglass-outline" size={14} color={conf.color} />
            <Text style={[s.remainingText, { color: conf.color }]}>
              {remaining > 0
                ? `Encore ${remaining} min — se termine à ${r.end_time}`
                : "Se termine très bientôt"}
            </Text>
          </View>
        )}

        {/* Details grid */}
        <View style={s.cardDetails}>
          <DetailChip
            icon="layers-outline"
            label="Place"
            value={`N°${r.spot_id}`}
          />
          <DetailChip
            icon="time-outline"
            label="Horaire"
            value={`${r.start_time} – ${r.end_time}`}
          />
          <DetailChip
            icon="hourglass-outline"
            label="Durée"
            value={formatDuration(r.duration_min)}
          />
          <DetailChip
            icon="pricetag-outline"
            label="Montant"
            value={`${r.total_price} DA`}
            highlight
          />
        </View>

        {/* Cancel button — uniquement pour "confirmed" et "ongoing" */}
        {(displayStatus === "confirmed" || displayStatus === "ongoing") &&
          onCancel && (
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
              <Text style={s.cancelBtnText}>Annuler la réservation</Text>
            </TouchableOpacity>
          )}
      </View>
    </View>
  );
}

function DetailChip({
  icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={s.chip}>
      <Ionicons name={icon} size={13} color="#94a3b8" />
      <View>
        <Text style={s.chipLabel}>{label}</Text>
        <Text style={[s.chipValue, highlight && s.chipHighlight]}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f0f4f8" },
  content: { paddingBottom: 40 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 28,
  },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  headerBadgeText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 2,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardOngoing: {
    shadowColor: "#7c3aed",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: "#c4b5fd",
  },
  cardInner: {
    flex: 1,
    padding: 16,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardMeta: { flex: 1 },
  cardLotName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  cardDate: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ongoingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: { fontSize: 11, fontWeight: "700" },

  remainingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  remainingText: {
    fontSize: 13,
    fontWeight: "600",
  },

  cardDetails: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: "45%",
  },
  chipLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "600" },
  chipValue: { fontSize: 13, fontWeight: "600", color: "#1a1a2e" },
  chipHighlight: { color: "#7c3aed", fontWeight: "800" },

  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#fee2e2",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "600", color: "#ef4444" },

  empty: {
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1a1a2e" },
  emptySub: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
