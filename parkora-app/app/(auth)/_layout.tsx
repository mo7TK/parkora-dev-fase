/**
 * app/(auth)/_layout.tsx
 * ───────────────────────
 * Layout du groupe d'authentification.
 *
 * Le groupe (auth) contient les écrans accessibles sans être connecté :
 *   • sign-in  → connexion
 *   • sign-up  → inscription
 *
 * headerShown: false → chaque écran gère son propre design d'en-tête
 * (le gradient bleu avec le logo Parkora).
 */

import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
