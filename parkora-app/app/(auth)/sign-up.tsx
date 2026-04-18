import { useState } from "react";
import {
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

// ── Generic field ─────────────────────────────────────────────────────────────
type FieldProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words";
  rightElement?: React.ReactNode;
};

function Field({
  label,
  value,
  onChangeText,
  icon,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  rightElement,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <Ionicons
          name={icon}
          size={18}
          color={focused ? "#1a73e8" : "#b0b8c8"}
          style={styles.fieldIcon}
        />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#c8cdd8"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightElement}
      </View>
    </View>
  );
}

// ── Plate field ───────────────────────────────────────────────────────────────
function PlateField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (t: string) => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      {/* Label row */}
      <View style={styles.plateLabelRow}>
        <Text style={styles.label}>Immatriculation</Text>
        <View style={styles.optBadge}>
          <Text style={styles.optBadgeText}>Optionnel</Text>
        </View>
      </View>

      {/* Plate widget */}
      <View style={[styles.plateOuter, focused && styles.plateOuterFocused]}>
        {/* Country band */}
        <View style={styles.countryBand}>
          <Text style={styles.countryFlag}>🇩🇿</Text>
          <Text style={styles.countryCode}>DZ</Text>
        </View>

        {/* Input */}
        <TextInput
          style={styles.plateInput}
          value={value}
          onChangeText={(t) => onChangeText(formatPlate(t))}
          placeholder="12345 110 16"
          placeholderTextColor={focused ? "#a89e00" : "#c7b900"}
          keyboardType="numeric"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={12} // 10 digits + 2 spaces
        />

        {/* Bolt decorations */}
        <View style={styles.bolts}>
          <View style={styles.bolt} />
          <View style={styles.bolt} />
        </View>
      </View>

      <Text style={styles.plateHint}>
        Entrez les chiffres de votre plaque · ex: 12345 126 16
      </Text>
    </View>
  );
}

function formatPlate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 5) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  return `${digits.slice(0, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

// ── Step dots ─────────────────────────────────────────────────────────────────
function StepDots({ current }: { current: number }) {
  return (
    <View style={styles.stepRow}>
      {[1, 2].map((s) => (
        <View
          key={s}
          style={[styles.stepDot, current === s && styles.stepDotActive]}
        />
      ))}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function SignUp() {
  const [step, setStep] = useState(1);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [plate, setPlate] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordsMatch = confirm.length > 0 && password === confirm;
  const passwordsMismatch = confirm.length > 0 && password !== confirm;

  function handleSubmit() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace("/(tabs)");
    }, 1400);
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={["#1a73e8", "#4da3ff"]} style={styles.topBg} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => (step === 2 ? setStep(1) : router.back())}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>

            <View style={styles.logoCircle}>
              <Text style={styles.logoLetter}>P</Text>
            </View>
            <Text style={styles.brand}>Parkora</Text>
            <StepDots current={step} />
          </View>

          {/* ── Card ── */}
          <View style={styles.card}>
            {step === 1 ? (
              <>
                <Text style={styles.cardTitle}>Créer un compte</Text>
                <Text style={styles.cardSub}>
                  Étape 1 sur 2 · Informations personnelles
                </Text>

                <View style={styles.form}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Prénom"
                        value={firstName}
                        onChangeText={setFirstName}
                        icon="person-outline"
                        placeholder="Votre prénom"
                        autoCapitalize="words"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Nom"
                        value={lastName}
                        onChangeText={setLastName}
                        icon="person-outline"
                        placeholder="Votre nom"
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <Field
                    label="Téléphone"
                    value={phone}
                    onChangeText={setPhone}
                    icon="call-outline"
                    placeholder="+213 XX XX XX XX"
                    keyboardType="phone-pad"
                  />
                </View>

                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => setStep(2)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnText}>Continuer</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#fff"
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Accès & Véhicule</Text>
                <Text style={styles.cardSub}>
                  Étape 2 sur 2 · Sécurité et véhicule
                </Text>

                <View style={styles.form}>
                  <Field
                    label="Adresse e-mail"
                    value={email}
                    onChangeText={setEmail}
                    icon="mail-outline"
                    placeholder="exemple@email.com"
                    keyboardType="email-address"
                  />

                  <Field
                    label="Mot de passe"
                    value={password}
                    onChangeText={setPassword}
                    icon="lock-closed-outline"
                    placeholder="Min. 8 caractères"
                    secureTextEntry={!showPassword}
                    rightElement={
                      <TouchableOpacity
                        onPress={() => setShowPassword((v) => !v)}
                        hitSlop={10}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-off-outline" : "eye-outline"
                          }
                          size={18}
                          color="#b0b8c8"
                        />
                      </TouchableOpacity>
                    }
                  />

                  <View>
                    <Field
                      label="Confirmer le mot de passe"
                      value={confirm}
                      onChangeText={setConfirm}
                      icon={
                        passwordsMatch
                          ? "checkmark-circle-outline"
                          : "lock-closed-outline"
                      }
                      placeholder="Répétez le mot de passe"
                      secureTextEntry={!showConfirm}
                      rightElement={
                        <TouchableOpacity
                          onPress={() => setShowConfirm((v) => !v)}
                          hitSlop={10}
                        >
                          <Ionicons
                            name={
                              showConfirm ? "eye-off-outline" : "eye-outline"
                            }
                            size={18}
                            color="#b0b8c8"
                          />
                        </TouchableOpacity>
                      }
                    />
                    {passwordsMismatch && (
                      <Text style={styles.errorMsg}>
                        Les mots de passe ne correspondent pas
                      </Text>
                    )}
                    {passwordsMatch && (
                      <Text style={styles.successMsg}>
                        ✓ Mots de passe identiques
                      </Text>
                    )}
                  </View>

                  {/* Separator */}
                  <View style={styles.sectionSep}>
                    <View style={styles.sepLine} />
                    <Text style={styles.sepLabel}>Votre véhicule</Text>
                    <View style={styles.sepLine} />
                  </View>

                  <PlateField value={plate} onChangeText={setPlate} />
                </View>

                <TouchableOpacity
                  style={[styles.btn, loading && styles.btnDisabled]}
                  onPress={handleSubmit}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  <Text style={styles.btnText}>
                    {loading ? "Création…" : "Créer mon compte"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.divRow}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>ou</Text>
              <View style={styles.divLine} />
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/sign-in")}
              style={styles.altRow}
            >
              <Text style={styles.altText}>
                Déjà un compte ?{" "}
                <Text style={styles.altAccent}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
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

  // Header
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
  logoLetter: { fontSize: 32, fontWeight: "900", color: "#1a73e8" },
  brand: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
    marginBottom: 14,
  },

  // Step dots
  stepRow: { flexDirection: "row", gap: 8 },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  stepDotActive: {
    backgroundColor: "#fff",
    width: 24,
  },

  // Card
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
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a2e",
    marginBottom: 6,
  },
  cardSub: { fontSize: 13, color: "#94a3b8", marginBottom: 24, lineHeight: 20 },

  // Form
  form: { gap: 14 },
  row: { flexDirection: "row", gap: 10 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#4a5568", marginLeft: 2 },
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
  fieldFocused: { borderColor: "#1a73e8", backgroundColor: "#f0f6ff" },
  fieldIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: "#1a1a2e", paddingVertical: 0 },

  errorMsg: { fontSize: 12, color: "#ef4444", marginTop: 4, marginLeft: 4 },
  successMsg: { fontSize: 12, color: "#22c55e", marginTop: 4, marginLeft: 4 },

  // Section sep
  sectionSep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  sepLine: { flex: 1, height: 1, backgroundColor: "#eef0f4" },
  sepLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  // Plate
  plateLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 2,
  },
  optBadge: {
    backgroundColor: "#f0f4ff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#c7d7ff",
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  optBadgeText: { fontSize: 10, fontWeight: "600", color: "#6b8cff" },
  plateOuter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecdd00",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#c9b800",
    overflow: "hidden",
    height: 56,
  },
  plateOuterFocused: { borderColor: "#1a73e8" },
  countryBand: {
    width: 46,
    height: "100%",
    backgroundColor: "#1a2d5a",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  countryFlag: { fontSize: 15 },
  countryCode: {
    fontSize: 8,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  plateInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    letterSpacing: 4,
    paddingHorizontal: 10,
  },
  bolts: {
    width: 18,
    height: "100%",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 14,
  },
  bolt: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#c9b800",
    borderWidth: 1,
    borderColor: "#b0a200",
  },
  plateHint: { fontSize: 11, color: "#b0b8c8", marginLeft: 2 },

  // Button
  btn: {
    backgroundColor: "#1a73e8",
    borderRadius: 14,
    height: 52,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1a73e8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  btnDisabled: { backgroundColor: "#74aaf0" },
  btnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  // Divider
  divRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 20,
  },
  divLine: { flex: 1, height: 1, backgroundColor: "#eef0f4" },
  divText: { fontSize: 12, color: "#c0c8d8" },

  // Alt
  altRow: { alignItems: "center" },
  altText: { fontSize: 14, color: "#94a3b8" },
  altAccent: { color: "#1a73e8", fontWeight: "700" },
});
