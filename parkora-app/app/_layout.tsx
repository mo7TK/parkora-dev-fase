import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    // SafeAreaProvider tells every screen in the app where the system UI
    // (status bar, Android nav buttons) begins and ends.
    // Without it, the tab bar overlaps the Android gesture/button bar.
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="details" options={{ title: "Parking Details" }} />
        <Stack.Screen name="minimap" options={{ title: "Parking Layout" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
