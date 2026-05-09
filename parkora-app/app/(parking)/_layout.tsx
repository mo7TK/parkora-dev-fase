import { Stack } from "expo-router";

export default function ParkingLayout() {
  return (
    <Stack>
      <Stack.Screen name="details" options={{ title: "Parking Details" }} />
      <Stack.Screen name="minimap" options={{ title: "Parking Layout" }} />
      <Stack.Screen
        name="reservation-spot"
        options={{ title: "Choisir une place" }}
      />
      <Stack.Screen name="reservation-form" options={{ title: "Réserver" }} />
      <Stack.Screen
        name="reservation-payment"
        options={{ title: "Paiement" }}
      />
    </Stack>
  );
}
