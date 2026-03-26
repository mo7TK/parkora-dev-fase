import { Stack } from "expo-router";

// ── Root layout ───────────────────────────────────────────────────────────────
// Stack navigator wraps everything — tabs group + details + minimap
// Each screen can override its own header settings below
// ─────────────────────────────────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <Stack>
      {/* The entire tabs group is one entry in the stack */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Stack screens pushed on top of the tabs */}
      <Stack.Screen name="details"  options={{ title: "Parking Details" }} />
      <Stack.Screen name="minimap"  options={{ title: "Parking Layout"  }} />
    </Stack>
  );
}
