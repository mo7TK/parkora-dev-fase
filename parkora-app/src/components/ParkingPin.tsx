import { Text, View } from "react-native";
import { styles } from "@/src/styles/index.styles";

export default function ParkingPin() {
  return (
    <View style={styles.pin}>
      <Text style={styles.pinText}>P</Text>
    </View>
  );
}
