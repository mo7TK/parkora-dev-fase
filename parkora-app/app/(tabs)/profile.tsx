import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

export default function Profile() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dev Navigation</Text>

      <TouchableOpacity
        style={styles.btnSignIn}
        onPress={() => router.push("/(auth)/sign-in")}
      >
        <Text style={styles.btnText}>→ Sign In</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btnSignUp}
        onPress={() => router.push("/(auth)/sign-up")}
      >
        <Text style={styles.btnText}>→ Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f4f4",
    gap: 14,
  },
  title: {
    fontSize: 13,
    color: "#aaa",
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  btnSignIn: {
    backgroundColor: "#1a73e8",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnSignUp: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
