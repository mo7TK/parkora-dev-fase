/**
 * app/(auth)/sign-up.tsx
 * ───────────────────────
 * Écran d'inscription en 2 étapes avec sélection d'avatar.
 *
 * Étape 1 — Informations personnelles :
 *   prénom, nom, téléphone
 *
 * Étape 2 — Compte et apparence :
 *   email, mot de passe, confirmation, avatar parmi 12 choix, plaque (optionnel)
 *
 * Flux après soumission :
 *   register() → POST /auth/register → token sauvegardé dans SecureStore
 *   → Guard dans _layout.tsx détecte user != null → redirige vers les tabs
 *
 * L'utilisateur est automatiquement connecté après inscription,
 * pas besoin d'un second appel à sign-in.
 */

import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";

// ── Liste des avatars disponibles ─────────────────────────────────────────────
// Chaque avatar est un emoji + une couleur de fond assortie.
// L'emoji est stocké en base de données et affiché sur l'écran profil.

const AVATARS: { emoji: string; bg: string }[] = [
  { emoji: "🧑", bg: "#dbeafe" },
  { emoji: "👩", bg: "#fce7f3" },
  { emoji: "👨‍💼", bg: "#d1fae5" },
  { emoji: "👩‍💼", bg: "#fef9c3" },
  { emoji: "🧔", bg: "#ede9fe" },
  { emoji: "👱", bg: "#ffedd5" },
  { emoji: "👩‍🦱", bg: "#fee2e2" },
  { emoji: "🐱", bg: "#e0f2fe" },
  { emoji: "🐻", bg: "#fef3c7" },
  { emoji: "🦊", bg: "#ffedd5" },
  { emoji: "🐼", bg: "#f0fdf4" },
  { emoji: "🐯", bg: "#fff7ed" },
];

// ── Helper : formatage de la plaque algérienne ────────────────────────────────
// Formate les chiffres saisis en "12345 110 16" automatiquement.

function formatPlate(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 5) return d;
  if (d.length <= 8) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
}

// ── Écran principal ───────────────────────────────────────────────────────────

export default function SignUp() {
  const { register } = useAuth();

  // ── État : quelle étape est affichée ─────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── État : champs étape 1 ─────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // ── État : champs étape 2 ─────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [plate, setPlate] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]); // sélection par défaut
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── État : feedback utilisateur ────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Passage à l'étape 2 ───────────────────────────────────────────────────

  function goToStep2() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setError("");
    setStep(2);
  }

  // ── Soumission finale ─────────────────────────────────────────────────────

  async function handleRegister() {
    // Validations côté client avant d'appeler le backend
    if (!email.trim() || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        avatar: avatar.emoji, // on envoie uniquement l'emoji, pas la couleur
        plate: plate.trim(),
      });
      // Succès → Guard dans _layout.tsx redirige automatiquement vers les tabs
    } catch (e: any) {
      // Ex : "Cet email est déjà utilisé" (HTTP 409 du backend)
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.screen}>
      <LinearGradient colors={["#1a73e8", "#4da3ff"]} style={s.topBg} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── En-tête avec bouton retour et points d'étapes ────────────────── */}
          <View style={s.header}>
            {/* Retour : étape 2 → étape 1, étape 1 → sign-in */}
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => (step === 2 ? setStep(1) : router.back())}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>

            <View style={s.logoCircle}>
              <Text style={s.logoP}>P</Text>
            </View>
            <Text style={s.brand}>Parkora</Text>

            {/* Points indicateurs d'étape — le point actif est plus large */}
            <View style={s.dots}>
              <View style={[s.dot, step === 1 && s.dotActive]} />
              <View style={[s.dot, step === 2 && s.dotActive]} />
            </View>
          </View>

          <View style={s.card}>
            {/* ══════════════════════ ÉTAPE 1 ══════════════════════ */}
            {step === 1 && (
              <>
                <Text style={s.title}>Créer un compte</Text>
                <Text style={s.sub}>
                  Étape 1 / 2 — Informations personnelles
                </Text>

                <Text style={s.label}>Prénom</Text>
                <View style={s.field}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color="#b0b8c8"
                    style={s.fi}
                  />
                  <TextInput
                    style={s.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Votre prénom"
                    placeholderTextColor="#c8cdd8"
                    autoCapitalize="words"
                  />
                </View>

                <Text style={s.label}>Nom</Text>
                <View style={s.field}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color="#b0b8c8"
                    style={s.fi}
                  />
                  <TextInput
                    style={s.input}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Votre nom"
                    placeholderTextColor="#c8cdd8"
                    autoCapitalize="words"
                  />
                </View>

                <Text style={s.label}>Téléphone</Text>
                <View style={s.field}>
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color="#b0b8c8"
                    style={s.fi}
                  />
                  <TextInput
                    style={s.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+213 XX XX XX XX"
                    placeholderTextColor="#c8cdd8"
                    keyboardType="phone-pad"
                  />
                </View>

                {!!error && <ErrorBox msg={error} />}

                <TouchableOpacity style={s.btn} onPress={goToStep2}>
                  <Text style={s.btnText}>Continuer</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#fff"
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>
              </>
            )}

            {/* ══════════════════════ ÉTAPE 2 ══════════════════════ */}
            {step === 2 && (
              <>
                <Text style={s.title}>Accès & Avatar</Text>
                <Text style={s.sub}>Étape 2 / 2 — Compte et apparence</Text>

                {/* ── Sélecteur d'avatar ─────────────────────────────────────
                    Affiche l'avatar sélectionné en grand, puis la liste
                    horizontale de tous les choix disponibles.             */}
                <Text style={s.label}>Choisissez votre avatar</Text>
                <View style={s.avatarPreview}>
                  <View style={[s.avatarBig, { backgroundColor: avatar.bg }]}>
                    <Text style={s.avatarBigEmoji}>{avatar.emoji}</Text>
                  </View>
                  <Text style={s.avatarPreviewTxt}>Avatar sélectionné</Text>
                </View>

                <FlatList
                  data={AVATARS}
                  keyExtractor={(_, i) => String(i)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.avatarList}
                  renderItem={({ item }) => {
                    const selected = item.emoji === avatar.emoji;
                    return (
                      <TouchableOpacity
                        style={[
                          s.avatarItem,
                          { backgroundColor: item.bg },
                          selected && s.avatarItemSelected,
                        ]}
                        onPress={() => setAvatar(item)}
                      >
                        <Text style={s.avatarEmoji}>{item.emoji}</Text>
                        {/* Coche bleue sur l'avatar sélectionné */}
                        {selected && (
                          <View style={s.avatarCheck}>
                            <Ionicons name="checkmark" size={10} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />

                {/* ── Champs sécurité ────────────────────────────────────────── */}

                <Text style={s.label}>Adresse e-mail</Text>
                <View style={s.field}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color="#b0b8c8"
                    style={s.fi}
                  />
                  <TextInput
                    style={s.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="exemple@email.com"
                    placeholderTextColor="#c8cdd8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <Text style={s.label}>Mot de passe</Text>
                <View style={s.field}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="#b0b8c8"
                    style={s.fi}
                  />
                  <TextInput
                    style={s.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Min. 8 caractères"
                    placeholderTextColor="#c8cdd8"
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={10}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color="#b0b8c8"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={s.label}>Confirmer le mot de passe</Text>
                <View style={s.field}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="#b0b8c8"
                    style={s.fi}
                  />
                  <TextInput
                    style={s.input}
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="Répétez le mot de passe"
                    placeholderTextColor="#c8cdd8"
                    secureTextEntry={!showConfirm}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm((v) => !v)}
                    hitSlop={10}
                  >
                    <Ionicons
                      name={showConfirm ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color="#b0b8c8"
                    />
                  </TouchableOpacity>
                </View>
                {/* Message inline sous le champ de confirmation */}
                {confirm.length > 0 && password !== confirm && (
                  <Text style={s.mismatch}>
                    Les mots de passe ne correspondent pas
                  </Text>
                )}
                {confirm.length > 0 && password === confirm && (
                  <Text style={s.match}>✓ Mots de passe identiques</Text>
                )}

                {/* ── Plaque d'immatriculation (optionnel) ──────────────────── */}
                <Text style={[s.label, { marginTop: 16 }]}>
                  Immatriculation <Text style={s.optional}>(optionnel)</Text>
                </Text>
                {/* Widget visuellement inspiré d'une vraie plaque algérienne */}
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

                {/* Bouton de création de compte — grisé pendant le chargement */}
                <TouchableOpacity
                  style={[s.btn, loading && s.btnOff]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  <Text style={s.btnText}>
                    {loading ? "Création…" : "Créer mon compte"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Lien vers la connexion — visible sur les deux étapes */}
            <View style={s.divRow}>
              <View style={s.divLine} />
              <Text style={s.divTxt}>ou</Text>
              <View style={s.divLine} />
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/sign-in")}
              style={s.altRow}
            >
              <Text style={s.altTxt}>
                Déjà un compte ? <Text style={s.altAccent}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Composant interne : bandeau d'erreur ──────────────────────────────────────

function ErrorBox({ msg }: { msg: string }) {
  return (
    <View style={s.errorBox}>
      <Ionicons name="alert-circle-outline" size={15} color="#ef4444" />
      <Text style={s.errorText}>{msg}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f0f4f8" },
  topBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },

  // En-tête
  header: { alignItems: "center", marginBottom: 24 },
  backBtn: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#1a73e8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 7,
  },
  logoP: { fontSize: 32, fontWeight: "900", color: "#1a73e8" },
  brand: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
    marginBottom: 14,
  },
  dots: { flexDirection: "row", gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: { width: 24, backgroundColor: "#fff" }, // plus large = étape active

  // Carte
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 5,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#1a1a2e", marginBottom: 4 },
  sub: { fontSize: 13, color: "#94a3b8", marginBottom: 8 },

  // Champs
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4a5568",
    marginBottom: 6,
    marginTop: 14,
  },
  optional: { fontWeight: "400", color: "#94a3b8" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f9fc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    height: 50,
  },
  fi: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: "#1a1a2e" },
  mismatch: { fontSize: 12, color: "#ef4444", marginTop: 4, marginLeft: 2 },
  match: { fontSize: 12, color: "#22c55e", marginTop: 4, marginLeft: 2 },

  // Avatar picker
  avatarPreview: { alignItems: "center", marginVertical: 10 },
  avatarBig: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#1a73e8",
  },
  avatarBigEmoji: { fontSize: 38 },
  avatarPreviewTxt: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
  avatarList: { gap: 8, paddingVertical: 4 },
  avatarItem: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarItemSelected: { borderColor: "#1a73e8", borderWidth: 2.5 },
  avatarEmoji: { fontSize: 26 },
  avatarCheck: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#1a73e8",
    justifyContent: "center",
    alignItems: "center",
  },

  // Plaque
  plateOuter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecdd00",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#c9b800",
    overflow: "hidden",
    height: 52,
  },
  plateBand: {
    width: 46,
    height: "100%",
    backgroundColor: "#1a2d5a",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  plateFlag: { fontSize: 14 },
  plateDZ: { fontSize: 7, fontWeight: "800", color: "#fff" },
  plateInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    letterSpacing: 4,
  },

  // Erreur
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginTop: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: "#ef4444" },

  // Bouton
  btn: {
    backgroundColor: "#1a73e8",
    borderRadius: 14,
    height: 52,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#1a73e8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  btnOff: { backgroundColor: "#74aaf0" },
  btnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  // Séparateur et lien connexion
  divRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 20,
  },
  divLine: { flex: 1, height: 1, backgroundColor: "#eef0f4" },
  divTxt: { fontSize: 12, color: "#c0c8d8" },
  altRow: { alignItems: "center" },
  altTxt: { fontSize: 14, color: "#94a3b8" },
  altAccent: { color: "#1a73e8", fontWeight: "700" },
});
