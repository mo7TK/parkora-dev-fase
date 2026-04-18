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

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
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

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSignIn() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace("/(tabs)");
    }, 1200);
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
          {/* ── Logo ── */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLetter}>P</Text>
            </View>
            <Text style={styles.brand}>Parkora</Text>
            <Text style={styles.tagline}>Stationnement Intelligent</Text>
          </View>

          {/* ── Card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connexion</Text>
            <Text style={styles.cardSub}>
              Bienvenue ! Connectez-vous à votre compte.
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
                placeholder="Votre mot de passe"
                secureTextEntry={!showPassword}
                rightElement={
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
                }
              />
            </View>

            <TouchableOpacity style={styles.forgotRow}>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSignIn}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.btnText}>
                {loading ? "Connexion…" : "Se connecter"}
              </Text>
            </TouchableOpacity>

            <View style={styles.divRow}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>ou</Text>
              <View style={styles.divLine} />
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/sign-up")}
              style={styles.altRow}
            >
              <Text style={styles.altText}>
                Pas encore de compte ?{" "}
                <Text style={styles.altAccent}>S'inscrire</Text>
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
    height: 230,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 40,
  },

  // Logo
  logoArea: { alignItems: "center", marginBottom: 28 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#1a73e8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  logoLetter: { fontSize: 36, fontWeight: "900", color: "#1a73e8" },
  brand: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  tagline: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
    letterSpacing: 1,
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

  // Forgot
  forgotRow: { alignSelf: "flex-end", marginTop: 10, marginBottom: 20 },
  forgotText: { fontSize: 13, color: "#1a73e8", fontWeight: "500" },

  // Button
  btn: {
    backgroundColor: "#1a73e8",
    borderRadius: 14,
    height: 52,
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
