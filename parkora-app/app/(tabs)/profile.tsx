/**
 * app/(tabs)/profile.tsx
 * ───────────────────────
 * Écran de profil utilisateur.
 *
 * Affiche les informations du compte connecté :
 *   • Avatar choisi lors de l'inscription (emoji en grand)
 *   • Prénom, nom, email, téléphone
 *   • Plaque d'immatriculation si renseignée
 *   • Bouton de déconnexion avec confirmation
 *
 * Toutes les données viennent de useAuth().user
 * qui est chargé depuis SecureStore au démarrage de l'app.
 * Aucun appel réseau nécessaire pour afficher ce profil.
 *
 * La déconnexion appelle logout() du AuthContext qui :
 *   1. Efface le token et le user de SecureStore
 *   2. Met user à null dans le state React
 *   3. Le Guard dans _layout.tsx détecte user === null
 *      et redirige automatiquement vers sign-in
 */

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/src/context/AuthContext";

// ── Composant ligne d'information ─────────────────────────────────────────────
// Réutilisé pour chaque champ du profil (prénom, nom, email, téléphone).

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={s.row}>
      {/* Icône dans un cercle bleu clair */}
      <View style={s.rowIcon}>
        <Ionicons name={icon} size={18} color="#1a73e8" />
      </View>
      <View>
        <Text style={s.rowLabel}>{label}</Text>
        {/* "—" si la valeur est vide */}
        <Text style={s.rowValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────

export default function Profile() {
  // user contient toutes les infos sauvegardées après connexion/inscription
  const { user, logout } = useAuth();

  const fullName = user ? `${user.first_name} ${user.last_name}` : "";

  // ── Confirmation avant déconnexion ────────────────────────────────────────
  // On demande confirmation pour éviter les déconnexions accidentelles.
  // logout() est async car il efface SecureStore avant de mettre à jour le state.

  function confirmLogout() {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnecter", style: "destructive", onPress: logout },
    ]);
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      {/* ── En-tête gradient avec avatar ───────────────────────────────────── */}
      <LinearGradient colors={["#1a73e8", "#4da3ff"]} style={s.header}>
        {/* L'avatar est l'emoji choisi lors de l'inscription */}
        <View style={s.avatarWrap}>
          <Text style={s.avatarEmoji}>{user?.avatar ?? "🧑"}</Text>
        </View>
        <Text style={s.name}>{fullName}</Text>
        <Text style={s.email}>{user?.email ?? ""}</Text>
      </LinearGradient>

      {/* ── Section : informations personnelles ──────────────────────────────── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Informations personnelles</Text>
        <View style={s.card}>
          <InfoRow
            icon="person-outline"
            label="Prénom"
            value={user?.first_name ?? ""}
          />
          <View style={s.sep} />
          <InfoRow
            icon="person-outline"
            label="Nom"
            value={user?.last_name ?? ""}
          />
          <View style={s.sep} />
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={user?.email ?? ""}
          />
          <View style={s.sep} />
          <InfoRow
            icon="call-outline"
            label="Téléphone"
            value={user?.phone ?? ""}
          />
        </View>
      </View>

      {/* ── Section : véhicule — affichée uniquement si une plaque est renseignée */}
      {!!user?.plate && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Véhicule</Text>
          <View style={s.card}>
            <View style={s.platePad}>
              {/* Widget visuellement inspiré d'une vraie plaque algérienne */}
              <View style={s.plateWidget}>
                <View style={s.plateBand}>
                  <Text style={s.plateFlag}>🇩🇿</Text>
                  <Text style={s.plateDZ}>DZ</Text>
                </View>
                <Text style={s.plateNumber}>{user.plate}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── Bouton déconnexion ────────────────────────────────────────────────── */}
      <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={s.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f0f4f8" },
  content: { paddingBottom: 40 },

  // En-tête gradient
  header: { paddingTop: 60, paddingBottom: 36, alignItems: "center", gap: 6 },
  avatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 3,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarEmoji: { fontSize: 48 },
  name: { fontSize: 22, fontWeight: "800", color: "#fff" },
  email: { fontSize: 13, color: "rgba(255,255,255,0.8)" },

  // Sections
  section: { marginHorizontal: 16, marginTop: 22 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Carte blanche
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // Lignes d'info
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#e8f0fe",
    justifyContent: "center",
    alignItems: "center",
  },
  rowLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
    marginBottom: 2,
  },
  rowValue: { fontSize: 15, color: "#1a1a2e", fontWeight: "600" },
  sep: { height: 1, backgroundColor: "#f1f5f9", marginLeft: 66 }, // aligné après l'icône

  // Plaque
  platePad: { padding: 20, alignItems: "center" },
  plateWidget: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecdd00",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#c9b800",
    overflow: "hidden",
    height: 52,
    width: 220,
  },
  plateBand: {
    width: 42,
    height: "100%",
    backgroundColor: "#1a2d5a",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  plateFlag: { fontSize: 14 },
  plateDZ: { fontSize: 7, fontWeight: "800", color: "#fff" },
  plateNumber: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    letterSpacing: 3,
  },

  // Bouton déconnexion
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 28,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#fecaca",
    elevation: 2,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },
});
