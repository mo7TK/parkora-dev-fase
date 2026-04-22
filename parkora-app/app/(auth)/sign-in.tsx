/**
 * app/(auth)/sign-in.tsx
 */

import { useState } from "react";
import {
  Image,
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

export default function SignIn() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
    } catch (e: any) {
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
          {/* ── Logo ─────────────────────────────────────────────────────── */}
          <View style={s.logoArea}>
            <Image
              source={require("../../assets/images/parkora-logo-white.png")}
              style={s.logo}
              resizeMode="contain"
            />
            <Text style={s.brand}>Stationner n’a jamais été aussi simple</Text>
            <Text style={s.tagline}>Stationnement Intelligent</Text>
          </View>

          {/* ── Carte du formulaire ──────────────────────────────────────── */}
          <View style={s.card}>
            <Text style={s.title}>Connexion</Text>
            <Text style={s.sub}>
              Bienvenue ! Connectez-vous à votre compte.
            </Text>

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
                placeholder="Votre mot de passe"
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

            {!!error && (
              <View style={s.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={15}
                  color="#ef4444"
                />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.btn, loading && s.btnOff]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={s.btnText}>
                {loading ? "Connexion…" : "Se connecter"}
              </Text>
            </TouchableOpacity>

            <View style={s.divRow}>
              <View style={s.divLine} />
              <Text style={s.divTxt}>ou</Text>
              <View style={s.divLine} />
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/sign-up")}
              style={s.altRow}
            >
              <Text style={s.altTxt}>
                Pas encore de compte ?{" "}
                <Text style={s.altAccent}>S'inscrire</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f0f4f8" },

  topBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
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
  logo: {
    width: 200,
    height: 90,
  },
  brand: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 1,
    marginTop: 4,
  },
  tagline: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 },

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
  sub: { fontSize: 13, color: "#94a3b8", marginBottom: 20 },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4a5568",
    marginBottom: 6,
    marginTop: 14,
  },
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

  btn: {
    backgroundColor: "#1a73e8",
    borderRadius: 14,
    height: 52,
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
