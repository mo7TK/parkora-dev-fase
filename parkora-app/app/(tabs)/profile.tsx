/**
 * app/(tabs)/profile.tsx
 * ───────────────────────
 * Écran de profil utilisateur avec modification des informations,
 * du mot de passe et de l'immatriculation.
 */

import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { BACKEND_URL } from "@/src/constants/config";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPlate(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 5) return d;
  if (d.length <= 8) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={s.row}>
      <View style={s.rowIcon}>
        <Ionicons name={icon} size={18} color="#1a73e8" />
      </View>
      <View>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

function FieldInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  showToggle,
  onToggleSecure,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
  showToggle?: boolean;
  onToggleSecure?: () => void;
  maxLength?: number;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.fieldWrap}>
        <TextInput
          style={s.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#c8cdd8"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
        />
        {showToggle && (
          <TouchableOpacity onPress={onToggleSecure} hitSlop={10}>
            <Ionicons
              name={secureTextEntry ? "eye-outline" : "eye-off-outline"}
              size={18}
              color="#b0b8c8"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Modal: modifier les infos personnelles ─────────────────────────────────────

function EditInfoModal({
  visible,
  onClose,
  user,
  token,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  user: any;
  token: string | null;
  onSaved: (updated: any) => void;
}) {
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError("Tous les champs sont obligatoires.");
      return;
    }
    if (firstName.trim().length < 3) {
      setError("Le prénom doit contenir au moins 3 lettres.");
      return;
    }
    if (lastName.trim().length < 3) {
      setError("Le nom doit contenir au moins 3 lettres.");
      return;
    }
    if (!/^\+213\d{9}$/.test(phone.trim()) && !/^0\d{9}$/.test(phone.trim())) {
      setError("Numéro invalide. Format : +213XXXXXXXXX ou 0XXXXXXXXX");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/me/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Erreur serveur");
      onSaved(data);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.modalOverlay}
      >
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Modifier mes informations</Text>

          <FieldInput
            label="Prénom"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Votre prénom"
            autoCapitalize="words"
          />
          <FieldInput
            label="Nom"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Votre nom"
            autoCapitalize="words"
          />
          <FieldInput
            label="Téléphone"
            value={phone}
            onChangeText={setPhone}
            placeholder="+213XXXXXXXXX"
            keyboardType="phone-pad"
          />

          {!!error && <ErrorBox msg={error} />}

          <TouchableOpacity
            style={[s.saveBtn, loading && s.saveBtnOff]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={s.saveBtnText}>
              {loading ? "Enregistrement…" : "Enregistrer"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Modal: modifier le mot de passe ───────────────────────────────────────────

function EditPasswordModal({
  visible,
  onClose,
  token,
}: {
  visible: boolean;
  onClose: () => void;
  token: string | null;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError("");
  }

  async function handleSave() {
    if (!current || !next || !confirm) {
      setError("Tous les champs sont obligatoires.");
      return;
    }
    if (next.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (next !== confirm) {
      setError(
        "Le nouveau mot de passe et la confirmation ne correspondent pas.",
      );
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/me/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: current,
          new_password: next,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Erreur serveur");
      Alert.alert("Succès", "Mot de passe modifié avec succès.");
      reset();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.modalOverlay}
      >
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Modifier le mot de passe</Text>

          <FieldInput
            label="Ancien mot de passe"
            value={current}
            onChangeText={setCurrent}
            placeholder="Mot de passe actuel"
            secureTextEntry={!showCurrent}
            showToggle
            onToggleSecure={() => setShowCurrent((v) => !v)}
          />
          <FieldInput
            label="Nouveau mot de passe"
            value={next}
            onChangeText={setNext}
            placeholder="Min. 8 caractères"
            secureTextEntry={!showNext}
            showToggle
            onToggleSecure={() => setShowNext((v) => !v)}
          />
          <FieldInput
            label="Confirmer le mot de passe"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Répétez le nouveau mot de passe"
            secureTextEntry={!showConfirm}
            showToggle
            onToggleSecure={() => setShowConfirm((v) => !v)}
          />

          {confirm.length > 0 && next !== confirm && (
            <Text style={s.mismatch}>
              Les mots de passe ne correspondent pas
            </Text>
          )}
          {confirm.length > 0 && next === confirm && next.length >= 8 && (
            <Text style={s.match}>✓ Mots de passe identiques</Text>
          )}

          {!!error && <ErrorBox msg={error} />}

          <TouchableOpacity
            style={[s.saveBtn, loading && s.saveBtnOff]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={s.saveBtnText}>
              {loading ? "Enregistrement…" : "Modifier le mot de passe"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={() => {
              reset();
              onClose();
            }}
          >
            <Text style={s.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Modal: modifier l'immatriculation ─────────────────────────────────────────

function EditPlateModal({
  visible,
  onClose,
  user,
  token,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  user: any;
  token: string | null;
  onSaved: (updated: any) => void;
}) {
  const [plate, setPlate] = useState(user?.plate ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (plate && plate.replace(/\D/g, "").length !== 10) {
      setError("L'immatriculation doit contenir exactement 10 chiffres.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/me/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plate: plate.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Erreur serveur");
      onSaved(data);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.modalOverlay}
      >
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Modifier l'immatriculation</Text>

          <Text style={s.fieldLabel}>Immatriculation</Text>
          <View style={s.plateOuter}>
            <View style={s.plateBand}>
              <Text style={s.plateFlag}>🇩🇿</Text>
              <Text style={s.plateDZ}>DZ</Text>
            </View>
            <TextInput
              style={s.plateInput}
              value={plate}
              onChangeText={(t) => setPlate(formatPlate(t))}
              placeholder="12345 110 16"
              placeholderTextColor="#c7b900"
              keyboardType="numeric"
              maxLength={12}
            />
          </View>

          {!!error && <ErrorBox msg={error} />}

          <TouchableOpacity
            style={[s.saveBtn, { marginTop: 20 }, loading && s.saveBtnOff]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={s.saveBtnText}>
              {loading ? "Enregistrement…" : "Enregistrer"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <View style={s.errorBox}>
      <Ionicons name="alert-circle-outline" size={15} color="#ef4444" />
      <Text style={s.errorText}>{msg}</Text>
    </View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────

export default function Profile() {
  const { user, token, logout, setUser } = useAuth() as any;

  const [showEditInfo, setShowEditInfo] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditPlate, setShowEditPlate] = useState(false);

  const fullName = user ? `${user.first_name} ${user.last_name}` : "";

  function confirmLogout() {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnecter", style: "destructive", onPress: logout },
    ]);
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      {/* ── En-tête gradient ──────────────────────────────────────────────── */}
      <LinearGradient colors={["#1a73e8", "#4da3ff"]} style={s.header}>
        <View style={s.avatarWrap}>
          <Text style={s.avatarEmoji}>{user?.avatar ?? "🧑"}</Text>
        </View>
        <Text style={s.name}>{fullName}</Text>
        <Text style={s.email}>{user?.email ?? ""}</Text>
      </LinearGradient>

      {/* ── Section : informations personnelles ──────────────────────────── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Informations personnelles</Text>
          <TouchableOpacity
            style={s.editChip}
            onPress={() => setShowEditInfo(true)}
          >
            <Ionicons name="pencil-outline" size={13} color="#1a73e8" />
            <Text style={s.editChipText}>Modifier</Text>
          </TouchableOpacity>
        </View>
        <View style={s.card}>
          <InfoRow
            icon="person-outline"
            label="Prénom"
            value={user?.first_name ?? ""}
          />
          <View style={s.sep} />
          <InfoRow
            icon="person-outline"
            label="Nom"
            value={user?.last_name ?? ""}
          />
          <View style={s.sep} />
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={user?.email ?? ""}
          />
          <View style={s.sep} />
          <InfoRow
            icon="call-outline"
            label="Téléphone"
            value={user?.phone ?? ""}
          />
        </View>
      </View>

      {/* ── Section : sécurité ───────────────────────────────────────────── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Sécurité</Text>
        <TouchableOpacity
          style={s.actionCard}
          onPress={() => setShowEditPassword(true)}
          activeOpacity={0.8}
        >
          <View style={s.actionIcon}>
            <Ionicons name="lock-closed-outline" size={20} color="#1a73e8" />
          </View>
          <View style={s.actionBody}>
            <Text style={s.actionTitle}>Mot de passe</Text>
            <Text style={s.actionSub}>Modifier votre mot de passe</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#c8cdd8" />
        </TouchableOpacity>
      </View>

      {/* ── Section : véhicule ───────────────────────────────────────────── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Véhicule</Text>
          <TouchableOpacity
            style={s.editChip}
            onPress={() => setShowEditPlate(true)}
          >
            <Ionicons name="pencil-outline" size={13} color="#1a73e8" />
            <Text style={s.editChipText}>
              {user?.plate ? "Modifier" : "Ajouter"}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={s.card}>
          {user?.plate ? (
            <View style={s.platePad}>
              <View style={s.plateWidget}>
                <View style={s.plateBandDisplay}>
                  <Text style={s.plateFlag}>🇩🇿</Text>
                  <Text style={s.plateDZ}>DZ</Text>
                </View>
                <Text style={s.plateNumber}>{user.plate}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={s.noPlateRow}
              onPress={() => setShowEditPlate(true)}
            >
              <Ionicons name="car-outline" size={20} color="#c8cdd8" />
              <Text style={s.noPlateText}>
                Aucune immatriculation enregistrée
              </Text>
              <Ionicons name="add-circle-outline" size={20} color="#1a73e8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Déconnexion ──────────────────────────────────────────────────── */}
      <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={s.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <EditInfoModal
        visible={showEditInfo}
        onClose={() => setShowEditInfo(false)}
        user={user}
        token={token}
        onSaved={(updated) => setUser && setUser(updated)}
      />
      <EditPasswordModal
        visible={showEditPassword}
        onClose={() => setShowEditPassword(false)}
        token={token}
      />
      <EditPlateModal
        visible={showEditPlate}
        onClose={() => setShowEditPlate(false)}
        user={user}
        token={token}
        onSaved={(updated) => setUser && setUser(updated)}
      />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f0f4f8" },
  content: { paddingBottom: 40 },

  header: { paddingTop: 60, paddingBottom: 36, alignItems: "center", gap: 6 },
  avatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 3,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarEmoji: { fontSize: 48 },
  name: { fontSize: 22, fontWeight: "800", color: "#fff" },
  email: { fontSize: 13, color: "rgba(255,255,255,0.8)" },

  section: { marginHorizontal: 16, marginTop: 22 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  editChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e8f0fe",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  editChipText: { fontSize: 12, fontWeight: "700", color: "#1a73e8" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#e8f0fe",
    justifyContent: "center",
    alignItems: "center",
  },
  rowLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
    marginBottom: 2,
  },
  rowValue: { fontSize: 15, color: "#1a1a2e", fontWeight: "600" },
  sep: { height: 1, backgroundColor: "#f1f5f9", marginLeft: 66 },

  // Action card (password)
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#e8f0fe",
    justifyContent: "center",
    alignItems: "center",
  },
  actionBody: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a2e" },
  actionSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },

  // Plate
  platePad: { padding: 20, alignItems: "center" },
  plateWidget: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecdd00",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#c9b800",
    overflow: "hidden",
    height: 52,
    width: 220,
  },
  plateBandDisplay: {
    width: 42,
    height: "100%",
    backgroundColor: "#1a2d5a",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  plateFlag: { fontSize: 14 },
  plateDZ: { fontSize: 7, fontWeight: "800", color: "#fff" },
  plateNumber: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    letterSpacing: 3,
  },
  noPlateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 18,
  },
  noPlateText: { flex: 1, fontSize: 14, color: "#c8cdd8", fontStyle: "italic" },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 28,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#fecaca",
    elevation: 2,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },

  // ── Modals ──────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a2e",
    marginBottom: 20,
  },

  // Field
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4a5568",
    marginBottom: 6,
  },
  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f9fc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    height: 50,
  },
  fieldInput: { flex: 1, fontSize: 15, color: "#1a1a2e" },

  mismatch: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 2,
  },
  match: {
    fontSize: 12,
    color: "#22c55e",
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 2,
  },

  // Plate input in modal
  plateOuter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecdd00",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#c9b800",
    overflow: "hidden",
    height: 52,
    marginBottom: 4,
  },
  plateBand: {
    width: 46,
    height: "100%",
    backgroundColor: "#1a2d5a",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  plateInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    letterSpacing: 4,
  },

  // Buttons
  saveBtn: {
    backgroundColor: "#1a73e8",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#1a73e8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnOff: { backgroundColor: "#74aaf0" },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  cancelBtn: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#94a3b8" },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 8,
  },
  errorText: { flex: 1, fontSize: 13, color: "#ef4444" },
});
