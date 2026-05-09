/**
 * app/(parking)/reservation-form.tsx
 * ─────────────────────────────────────
 * ÉTAPE 1 du tunnel de réservation.
 *
 * Nouveau flux :
 *   Détails → [reservation-form] → reservation-spot → reservation-payment
 *
 * L'utilisateur choisit ici la date et le créneau horaire.
 * On passe ensuite à reservation-spot qui filtrera les emplacements
 * déjà réservés sur CE créneau précis.
 * Il n'y a PAS de vérification de disponibilité ici — c'est fait dans
 * reservation-spot (on montre visuellement les places prises).
 */

import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

// ── Time slots (every 30 minutes) ─────────────────────────────────────────────
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

// ── Next 14 days ──────────────────────────────────────────────────────────────
function getNext14Days(): { label: string; value: string }[] {
  const days = [];
  const today = new Date();
  const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const monthNames = [
    "Jan",
    "Fév",
    "Mar",
    "Avr",
    "Mai",
    "Jun",
    "Jul",
    "Aoû",
    "Sep",
    "Oct",
    "Nov",
    "Déc",
  ];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label =
      i === 0
        ? "Aujourd'hui"
        : i === 1
          ? "Demain"
          : `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
    days.push({ label, value: d.toISOString().split("T")[0] });
  }
  return days;
}

function durationLabel(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const total = eh * 60 + em - (sh * 60 + sm);
  if (total <= 0) return "—";
  const h = Math.floor(total / 60),
    m = total % 60;
  return h > 0
    ? m > 0
      ? `${h}h${String(m).padStart(2, "0")}`
      : `${h}h`
    : `${m} min`;
}

function estimatedPrice(start: string, end: string, pph: number): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const total = eh * 60 + em - (sh * 60 + sm);
  if (total <= 0) return 0;
  return Math.round((total / 60) * pph);
}

export default function ReservationForm() {
  const { lotId, name, minimapImage, pricePerHour } = useLocalSearchParams<{
    lotId: string;
    name: string;
    minimapImage: string;
    pricePerHour: string;
  }>();

  const price = Number(pricePerHour ?? 0);
  const DAYS = getNext14Days();

  const [selectedDay, setSelectedDay] = useState(DAYS[0].value);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [showStartPick, setShowStartPick] = useState(false);
  const [showEndPick, setShowEndPick] = useState(false);

  const duration = durationLabel(startTime, endTime);
  const estPrice = estimatedPrice(startTime, endTime, price);
  const isValid = (() => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    return eh * 60 + em > sh * 60 + sm;
  })();

  // ── Continuer → on passe à la sélection de place avec le créneau ──────────
  function handleContinue() {
    if (!isValid) {
      Alert.alert(
        "Horaire invalide",
        "L'heure de fin doit être après l'heure de début.",
      );
      return;
    }
    router.push({
      pathname: "/(parking)/reservation-spot",
      params: {
        lotId,
        name,
        minimapImage,
        pricePerHour,
        // On passe le créneau choisi pour filtrer les places déjà réservées
        date: selectedDay,
        startTime,
        endTime,
        duration,
        estPrice,
      },
    });
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Choisir un créneau</Text>
        <Text style={s.headerSub}>{name}</Text>
      </View>

      {/* Étapes visuelles */}
      <View style={s.stepsRow}>
        <StepBadge num={1} label="Date & heure" active />
        <View style={s.stepLine} />
        <StepBadge num={2} label="Emplacement" active={false} />
        <View style={s.stepLine} />
        <StepBadge num={3} label="Paiement" active={false} />
      </View>

      {/* Section : date */}
      <SectionCard icon="calendar-outline" title="Date">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.dayScroll}
        >
          {DAYS.map((d) => (
            <TouchableOpacity
              key={d.value}
              style={[s.dayChip, selectedDay === d.value && s.dayChipActive]}
              onPress={() => setSelectedDay(d.value)}
            >
              <Text
                style={[
                  s.dayChipText,
                  selectedDay === d.value && s.dayChipTextActive,
                ]}
              >
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SectionCard>

      {/* Section : horaires */}
      <SectionCard icon="time-outline" title="Horaires">
        <View style={s.timeRow}>
          {/* Début */}
          <View style={s.timeBlock}>
            <Text style={s.timeLabel}>Début</Text>
            <TouchableOpacity
              style={s.timePicker}
              onPress={() => {
                setShowStartPick(!showStartPick);
                setShowEndPick(false);
              }}
            >
              <Text style={s.timeValue}>{startTime}</Text>
              <Ionicons name="chevron-down" size={14} color="#94a3b8" />
            </TouchableOpacity>
            {showStartPick && (
              <ScrollView style={s.timeDropdown} nestedScrollEnabled>
                {TIME_SLOTS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      s.timeOption,
                      t === startTime && s.timeOptionActive,
                    ]}
                    onPress={() => {
                      setStartTime(t);
                      setShowStartPick(false);
                    }}
                  >
                    <Text
                      style={[
                        s.timeOptionText,
                        t === startTime && s.timeOptionTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <Ionicons
            name="arrow-forward"
            size={18}
            color="#94a3b8"
            style={s.timeArrow}
          />

          {/* Fin */}
          <View style={s.timeBlock}>
            <Text style={s.timeLabel}>Fin</Text>
            <TouchableOpacity
              style={s.timePicker}
              onPress={() => {
                setShowEndPick(!showEndPick);
                setShowStartPick(false);
              }}
            >
              <Text style={s.timeValue}>{endTime}</Text>
              <Ionicons name="chevron-down" size={14} color="#94a3b8" />
            </TouchableOpacity>
            {showEndPick && (
              <ScrollView style={s.timeDropdown} nestedScrollEnabled>
                {TIME_SLOTS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.timeOption, t === endTime && s.timeOptionActive]}
                    onPress={() => {
                      setEndTime(t);
                      setShowEndPick(false);
                    }}
                  >
                    <Text
                      style={[
                        s.timeOptionText,
                        t === endTime && s.timeOptionTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </SectionCard>

      {/* Section : résumé estimé */}
      <SectionCard icon="receipt-outline" title="Résumé estimé">
        <View style={s.summaryGrid}>
          <SummaryRow label="Date" value={selectedDay} />
          <SummaryRow
            label="Créneau"
            value={isValid ? `${startTime} → ${endTime}` : "—"}
          />
          <SummaryRow label="Durée" value={duration} />
          <SummaryRow
            label="Prix estimé"
            value={isValid ? `${estPrice} DA` : "—"}
            highlight
          />
          <SummaryRow label="Tarif" value={`${price} DA / heure`} />
        </View>
      </SectionCard>

      {/* Info */}
      <View style={s.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color="#1a73e8" />
        <Text style={s.infoBoxText}>
          À l'étape suivante, vous verrez les emplacements disponibles
          uniquement sur ce créneau.
        </Text>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[s.btn, !isValid && s.btnOff]}
        onPress={handleContinue}
        disabled={!isValid}
      >
        <Text style={s.btnText}>Choisir un emplacement →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepBadge({
  num,
  label,
  active,
}: {
  num: number;
  label: string;
  active: boolean;
}) {
  return (
    <View style={ss.stepWrap}>
      <View style={[ss.stepCircle, active && ss.stepCircleActive]}>
        <Text style={[ss.stepNum, active && ss.stepNumActive]}>{num}</Text>
      </View>
      <Text style={[ss.stepLabel, active && ss.stepLabelActive]}>{label}</Text>
    </View>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Ionicons name={icon} size={16} color="#1a73e8" />
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      <View style={s.cardBody}>{children}</View>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={[s.summaryValue, highlight && s.summaryHighlight]}>
        {value}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f0f4f8" },
  content: { paddingBottom: 40 },

  header: {
    backgroundColor: "#7c3aed",
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 14, color: "rgba(255,255,255,0.75)", marginTop: 4 },

  // Steps
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 4,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#1a1a2e" },
  cardBody: { padding: 16 },

  dayScroll: { marginHorizontal: -4 },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    marginHorizontal: 4,
  },
  dayChipActive: { backgroundColor: "#7c3aed" },
  dayChipText: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  dayChipTextActive: { color: "#fff" },

  timeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  timeBlock: { flex: 1 },
  timeLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
    marginBottom: 6,
  },
  timePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f7f9fc",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    height: 44,
  },
  timeValue: { fontSize: 16, fontWeight: "700", color: "#1a1a2e" },
  timeArrow: { marginTop: 30 },
  timeDropdown: {
    maxHeight: 180,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 4,
  },
  timeOption: { paddingVertical: 10, paddingHorizontal: 14 },
  timeOptionActive: { backgroundColor: "#ede9fe" },
  timeOptionText: { fontSize: 14, color: "#1a1a2e" },
  timeOptionTextActive: { color: "#7c3aed", fontWeight: "700" },

  summaryGrid: { gap: 10 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 13, color: "#64748b" },
  summaryValue: { fontSize: 14, fontWeight: "600", color: "#1a1a2e" },
  summaryHighlight: { fontSize: 18, fontWeight: "800", color: "#7c3aed" },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#e8f0fe",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
  },
  infoBoxText: { flex: 1, fontSize: 13, color: "#1a73e8", lineHeight: 20 },

  btn: {
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnOff: { backgroundColor: "#c4b5fd" },
  btnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});

const ss = StyleSheet.create({
  stepWrap: { alignItems: "center", gap: 4 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  stepCircleActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  stepNum: { fontSize: 12, fontWeight: "700", color: "#94a3b8" },
  stepNumActive: { color: "#fff" },
  stepLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "500" },
  stepLabelActive: { color: "#7c3aed", fontWeight: "700" },
});
