import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        {/* The tabs group */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/*
          name="details"  matches  app/details.tsx
          name="minimap"  matches  app/minimap.tsx
          Simple flat structure — no subfolders, no ambiguity.
        */}
        <Stack.Screen name="details" options={{ title: "Parking Details" }} />
        <Stack.Screen name="minimap" options={{ title: "Parking Layout" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
