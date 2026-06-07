/**
 * app/(parking)/reservation-payment.tsx
 */

import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { useAuth } from "@/src/context/AuthContext";
import { BACKEND_URL } from "@/src/constants/config";

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

export default function ReservationPayment() {
  const {
    lotId,
    name,
    spotId,
    date,
    startTime,
    endTime,
    duration,
    totalPrice,
  } = useLocalSearchParams<{
    lotId: string;
    name: string;
    spotId: string;
    date: string;
    startTime: string;
    endTime: string;
    duration: string;
    totalPrice: string;
  }>();

  const { token } = useAuth();

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);

  // Refs pour focus automatique
  const expiryRef = useRef<TextInput>(null);
  const cvcRef = useRef<TextInput>(null);

  const cardValid =
    cardNumber.replace(/\s/g, "").length === 16 &&
    expiry.length === 5 &&
    cvc.length === 3;

  async function handlePay() {
    if (!cardValid) {
      Alert.alert(
        "Informations incomplètes",
        "Veuillez remplir tous les champs de la carte.",
      );
      return;
    }
    if (!token) {
      Alert.alert("Non connecté", "Vous devez être connecté pour réserver.");
      return;
    }
    setPaying(true);
    try {
      const res = await fetch(`${BACKEND_URL}/reservations/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lot_id: lotId,
          lot_name: name,
          spot_id: Number(spotId),
          date,
          start_time: startTime,
          end_time: endTime,
          payment_method: "cib",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert(
          "Réservation échouée",
          data.detail ?? "Une erreur est survenue.",
        );
        return;
      }
      setSuccess(true);
    } catch {
      Alert.alert("Erreur réseau", "Impossible de contacter le serveur.");
    } finally {
      setPaying(false);
    }
  }

  function goHome() {
    setSuccess(false);
    router.replace("/(tabs)");
  }
  function goToHistory() {
    setSuccess(false);
    router.replace("/(tabs)/reservation");
  }

  // Étoiles CVC pour la carte animée
  const cvcStars = cvc.length > 0 ? "•".repeat(cvc.length) : "•••";

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Paiement</Text>
        <Text style={s.headerSub}>Confirmez votre réservation</Text>
      </View>

      {/* ── Résumé ───────────────────────────────────────────────────────────── */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Ionicons name="receipt-outline" size={16} color="#1a73e8" />
          <Text style={s.cardTitle}>Résumé</Text>
        </View>
        <View style={s.cardBody}>
          <SummaryRow icon="business-outline" label="Parking" value={name} />
          <SummaryRow
            icon="layers-outline"
            label="Place"
            value={`N°${spotId}`}
          />
          <SummaryRow icon="calendar-outline" label="Date" value={date} />
          <SummaryRow
            icon="time-outline"
            label="Horaire"
            value={`${startTime} → ${endTime}`}
          />
          <SummaryRow icon="hourglass-outline" label="Durée" value={duration} />
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Total à payer</Text>
            <Text style={s.priceValue}>{totalPrice} DA</Text>
          </View>
        </View>
      </View>

      {/* ── Carte CIB ────────────────────────────────────────────────────────── */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Ionicons name="card-outline" size={16} color="#1a73e8" />
          <Text style={s.cardTitle}>Carte CIB</Text>
        </View>
        <View style={s.cardBody}>
          {/* Visuel carte */}
          <View style={s.cibCard}>
            <View style={s.cibCardTop}>
              <Text style={s.cibLabel}>CIB</Text>
              <Image
                source={require("../../assets/images/cib_logo.png")}
                style={{ width: 40, height: 40, resizeMode: "contain" }}
              />
            </View>
            <Text style={s.cibNumber}>
              {cardNumber || "•••• •••• •••• ••••"}
            </Text>
            <View style={s.cibBottom}>
              <View>
                <Text style={s.cibFieldLabel}>Expire</Text>
                <Text style={s.cibFieldValue}>{expiry || "MM/AA"}</Text>
              </View>
              <View>
                <Text style={s.cibFieldLabel}>CVC</Text>
                {/* Étoiles dynamiques quand l'utilisateur tape */}
                <Text style={s.cibFieldValue}>{cvcStars}</Text>
              </View>
            </View>
          </View>

          {/* Numéro de carte */}
          <Text style={s.inputLabel}>Numéro de carte</Text>
          <TextInput
            style={s.input}
            value={cardNumber}
            onChangeText={(t) => {
              const formatted = formatCardNumber(t);
              setCardNumber(formatted);
              // Auto-focus sur expiry quand 16 chiffres atteints
              if (formatted.replace(/\s/g, "").length === 16) {
                expiryRef.current?.focus();
              }
            }}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor="#c8cdd8"
            keyboardType="numeric"
            maxLength={19}
            returnKeyType="next"
            onSubmitEditing={() => expiryRef.current?.focus()}
            blurOnSubmit={false}
          />

          <View style={s.inputRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>Date d'expiration</Text>
              <TextInput
                ref={expiryRef}
                style={s.input}
                value={expiry}
                onChangeText={(t) => {
                  const formatted = formatExpiry(t);
                  setExpiry(formatted);
                  // Auto-focus sur CVC quand MM/AA complet
                  if (formatted.length === 5) {
                    cvcRef.current?.focus();
                  }
                }}
                placeholder="MM/AA"
                placeholderTextColor="#c8cdd8"
                keyboardType="numeric"
                maxLength={5}
                returnKeyType="next"
                onSubmitEditing={() => cvcRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>CVC</Text>
              <TextInput
                ref={cvcRef}
                style={s.input}
                value={cvc}
                onChangeText={(t) => setCvc(t.replace(/\D/g, "").slice(0, 3))}
                placeholder="•••"
                placeholderTextColor="#c8cdd8"
                keyboardType="numeric"
                maxLength={3}
                secureTextEntry
                returnKeyType="done"
              />
            </View>
          </View>
        </View>
      </View>

      {/* ── Bouton payer — sans cadre/ombre excessifs ─────────────────────────── */}
      <TouchableOpacity
        style={[s.btn, (!cardValid || paying) && s.btnOff]}
        onPress={handlePay}
        disabled={!cardValid || paying}
      >
        {paying ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={s.btnText}> Payer et réserver · {totalPrice} DA</Text>
          </>
        )}
      </TouchableOpacity>

      {/* ── Modal succès ──────────────────────────────────────────────────────── */}
      <Modal visible={success} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
            </View>
            <Text style={s.successTitle}>Réservation confirmée !</Text>
            <Text style={s.successSub}>
              Votre place N°{spotId} au {name} est réservée de {startTime} à{" "}
              {endTime} le {date}.
            </Text>
            <View style={s.modalDetails}>
              <ModalDetail label="Place" value={`N°${spotId}`} />
              <ModalDetail label="Durée" value={duration} />
              <ModalDetail label="Montant" value={`${totalPrice} DA`} />
            </View>
            <TouchableOpacity style={s.modalBtnPrimary} onPress={goToHistory}>
              <Text style={s.modalBtnTextPrimary}>Voir mes réservations</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalBtnSecondary} onPress={goHome}>
              <Text style={s.modalBtnTextSecondary}>Retour à la carte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={s.summaryRow}>
      <View style={s.summaryIcon}>
        <Ionicons name={icon} size={15} color="#1a73e8" />
      </View>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue}>{value}</Text>
    </View>
  );
}

function ModalDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.modalDetailRow}>
      <Text style={s.modalDetailLabel}>{label}</Text>
      <Text style={s.modalDetailValue}>{value}</Text>
    </View>
  );
}

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

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#e8f0fe",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryLabel: { flex: 1, fontSize: 13, color: "#64748b" },
  summaryValue: { fontSize: 13, fontWeight: "600", color: "#1a1a2e" },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  priceLabel: { fontSize: 15, fontWeight: "700", color: "#1a1a2e" },
  priceValue: { fontSize: 22, fontWeight: "900", color: "#7c3aed" },

  // Carte CIB
  cibCard: {
    backgroundColor: "#1a2d5a",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    minHeight: 160,
  },
  cibCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cibLabel: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 3,
  },
  cibNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 2,
    marginTop: 20,
    marginBottom: 16,
  },
  cibBottom: { flexDirection: "row", justifyContent: "space-between" },
  cibFieldLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cibFieldValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginTop: 2,
  },

  // Inputs
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4a5568",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#f7f9fc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
    color: "#1a1a2e",
  },
  inputRow: { flexDirection: "row", alignItems: "flex-start" },

  // Bouton payer — flat, sans élévation excessive
  btn: {
    flexDirection: "row",
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 24,
  },
  btnOff: { backgroundColor: "#c4b5fd" },
  btnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  // Modal succès
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    alignItems: "center",
  },
  successIcon: { marginBottom: 16 },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a2e",
    marginBottom: 8,
  },
  successSub: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  modalDetails: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginBottom: 20,
  },
  modalDetailRow: { flexDirection: "row", justifyContent: "space-between" },
  modalDetailLabel: { fontSize: 13, color: "#64748b" },
  modalDetailValue: { fontSize: 13, fontWeight: "700", color: "#1a1a2e" },
  modalBtnPrimary: {
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },
  modalBtnTextPrimary: { fontSize: 15, fontWeight: "700", color: "#fff" },
  modalBtnSecondary: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  modalBtnTextSecondary: { fontSize: 15, fontWeight: "600", color: "#94a3b8" },
});
