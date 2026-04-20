/**
 * app/(auth)/sign-in.tsx
 * ───────────────────────
 * Écran de connexion — premier écran vu par un utilisateur non connecté.
 *
 * Ce que fait cet écran :
 *   1. Affiche un formulaire email + mot de passe
 *   2. Appelle login() du AuthContext au moment de la soumission
 *   3. login() appelle POST /auth/login sur le backend
 *   4. En cas de succès → token sauvegardé → Guard redirige vers les tabs
 *   5. En cas d'erreur → message affiché sous le formulaire
 *
 * La navigation vers les tabs se fait automatiquement via le Guard
 * dans _layout.tsx — cet écran n'a pas besoin de router.replace().
 */

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
import { useAuth } from "@/src/context/AuthContext";

export default function SignIn() {
  // On récupère uniquement login() — on n'a pas besoin de user ici
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // message d'erreur backend

  // ── Soumission du formulaire ───────────────────────────────────────────────

  async function handleLogin() {
    // Validation côté client avant d'appeler le backend
    if (!email.trim() || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await login(email.trim(), password);
      // Succès → _saveSession() a mis user à jour dans AuthContext
      // → le Guard dans _layout.tsx détecte user != null
      // → redirige automatiquement vers /(tabs)
    } catch (e: any) {
      // Le backend a renvoyé une erreur (mauvais mot de passe, compte inexistant...)
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.screen}>
      {/* Fond dégradé bleu en haut de l'écran */}
      <LinearGradient colors={["#1a73e8", "#4da3ff"]} style={s.topBg} />

      {/* KeyboardAvoidingView remonte le contenu quand le clavier apparaît */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Logo ─────────────────────────────────────────────────────────── */}
          <View style={s.logoArea}>
            <View style={s.logoCircle}>
              <Text style={s.logoP}>P</Text>
            </View>
            <Text style={s.brand}>Parkora</Text>
            <Text style={s.tagline}>Stationnement Intelligent</Text>
          </View>

          {/* ── Carte du formulaire ──────────────────────────────────────────── */}
          <View style={s.card}>
            <Text style={s.title}>Connexion</Text>
            <Text style={s.sub}>
              Bienvenue ! Connectez-vous à votre compte.
            </Text>

            {/* Champ email */}
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

            {/* Champ mot de passe avec bouton afficher/masquer */}
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

            {/* Bandeau d'erreur — visible uniquement si error !== "" */}
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

            {/* Bouton de connexion — grisé pendant le chargement */}
            <TouchableOpacity
              style={[s.btn, loading && s.btnOff]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={s.btnText}>
                {loading ? "Connexion…" : "Se connecter"}
              </Text>
            </TouchableOpacity>

            {/* Séparateur */}
            <View style={s.divRow}>
              <View style={s.divLine} />
              <Text style={s.divTxt}>ou</Text>
              <View style={s.divLine} />
            </View>

            {/* Lien vers l'inscription */}
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

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f0f4f8" },

  // Fond dégradé positionné en absolu derrière tout le contenu
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
  logoP: { fontSize: 36, fontWeight: "900", color: "#1a73e8" },
  brand: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  tagline: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 },

  // Carte du formulaire
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

  // Champs de formulaire
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

  // Bandeau d'erreur
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

  // Bouton principal
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
  btnOff: { backgroundColor: "#74aaf0" }, // grisé pendant le chargement
  btnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  // Séparateur "ou"
  divRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 20,
  },
  divLine: { flex: 1, height: 1, backgroundColor: "#eef0f4" },
  divTxt: { fontSize: 12, color: "#c0c8d8" },

  // Lien d'inscription
  altRow: { alignItems: "center" },
  altTxt: { fontSize: 14, color: "#94a3b8" },
  altAccent: { color: "#1a73e8", fontWeight: "700" },
});
