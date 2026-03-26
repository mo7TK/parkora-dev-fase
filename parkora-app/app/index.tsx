import { router } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import { View } from "react-native";

import ParkingPin from "@/src/components/ParkingPin";
import { styles } from "@/src/styles/index.styles";
import { PARKING_LOT } from "@/src/constants/config";

// ─────────────────────────────────────────────────────────────────────────────

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude:       PARKING_LOT.latitude,
          longitude:      PARKING_LOT.longitude,
          latitudeDelta:  0.005,   // zoom level — smaller = more zoomed in
          longitudeDelta: 0.005,
        }}
      >
        <Marker
          coordinate={{
            latitude:  PARKING_LOT.latitude,
            longitude: PARKING_LOT.longitude,
          }}
          onPress={() => router.push("/details")}
        >
          <ParkingPin />
        </Marker>

      </MapView>
    </View>
  );
}
