/**
 * app/_layout.tsx
 * ────────────────
 * Layout racine de l'application — le premier fichier chargé par Expo Router.
 *
 * Deux responsabilités :
 *
 *   1. Envelopper toute l'app dans <AuthProvider>
 *      → donne accès à useAuth() dans TOUS les écrans
 *
 *   2. <Guard> surveille l'état d'authentification en permanence
 *      et redirige automatiquement selon la règle :
 *        • user === null et hors (auth) → /(auth)/sign-in
 *        • user !== null et dans (auth) → /(tabs)
 *
 * Pourquoi séparer Guard de RootLayout ?
 *   useAuth() est un hook React — il ne peut être appelé qu'à l'intérieur
 *   d'un composant enfant de <AuthProvider>. Si on l'appelait directement
 *   dans RootLayout, il serait en dehors du Provider et crasherait.
 */

import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";

// ── Gardien de navigation ─────────────────────────────────────────────────────

function Guard() {
  const { user, loading } = useAuth();
  const segments = useSegments(); // ["(tabs)", "index"] par exemple
  const router = useRouter();

  useEffect(() => {
    // On attend que la session soit restaurée depuis SecureStore avant d'agir.
    // Sans ça, l'app redirigerait vers sign-in à chaque démarrage même si
    // l'utilisateur était déjà connecté — le temps de lire SecureStore.
    if (loading) return;

    const inAuth = segments[0] === "(auth)";

    if (!user && !inAuth) {
      // Pas connecté et on essaie d'accéder aux tabs → force sign-in
      router.replace("/(auth)/sign-in");
    } else if (user && inAuth) {
      // Déjà connecté et on est sur sign-in/sign-up → inutile, va aux tabs
      router.replace("/(tabs)");
    }
    // Dans tous les autres cas, on ne fait rien (déjà au bon endroit)
  }, [user, loading, segments]);

  // ── Spinner de démarrage ──────────────────────────────────────────────────
  // Affiché pendant que SecureStore restaure la session (quelques millisecondes).
  // Évite le flash de l'écran de connexion quand l'utilisateur est déjà connecté.
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  // ── Structure de navigation ───────────────────────────────────────────────
  // headerShown: false sur tous les groupes car chaque écran gère son propre header.
  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(parking)" options={{ headerShown: false }} />
    </Stack>
  );
}

// ── Layout racine ─────────────────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/*
        AuthProvider doit englober Guard (et tout le reste),
        sinon useAuth() dans Guard lèverait une erreur.
      */}
      <AuthProvider>
        <Guard />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
