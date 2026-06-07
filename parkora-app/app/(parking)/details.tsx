import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useAuth } from "@/src/context/AuthContext";
import { BACKEND_URL } from "@/src/constants/config";

type Summary = {
  total: number;
  free: number;
  occupied: number;
  reserved: number;
};
type ParkingLot = {
  hero_image: string;
  minimap_image: string;
  type: "paid" | "free";
  address: string;
  bio: string;
  price_per_hour: number;
  is_open: boolean;
  opening_hours: string | Record<string, string>;
};

const DAY_LABELS: Record<string, string> = {
  lun: "Lun",
  mar: "Mar",
  mer: "Mer",
  jeu: "Jeu",
  ven: "Ven",
  sam: "Sam",
  dim: "Dim",
};

export default function Details() {
  const { lotId, name, totalSpots, latitude, longitude, type } =
    useLocalSearchParams<{
      lotId: string;
      name: string;
      totalSpots: string;
      latitude: string;
      longitude: string;
      type: string;
    }>();

  const { token } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [lotDetails, setLotDetails] = useState<ParkingLot | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  useEffect(() => {
    if (!lotId) return;
    fetch(`${BACKEND_URL}/parking-lots/${lotId}`)
      .then((r) => r.json())
      .then(setLotDetails)
      .catch(() => setLotDetails(null));
  }, [lotId]);

  useEffect(() => {
    if (!lotId) return;
    fetch(`${BACKEND_URL}/spots-summary/${lotId}`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [lotId]);

  useFocusEffect(
    useCallback(() => {
      if (!lotId || !token) return;
      fetch(`${BACKEND_URL}/favorites/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data: { id: string }[]) =>
          setIsFavorite(data.some((l) => l.id === lotId)),
        )
        .catch(() => {});
    }, [lotId, token]),
  );

  async function toggleFavorite() {
    if (!token || !lotId || favLoading) return;
    setFavLoading(true);
    try {
      await fetch(`${BACKEND_URL}/favorites/${lotId}`, {
        method: isFavorite ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsFavorite((v) => !v);
    } finally {
      setFavLoading(false);
    }
  }

  function handleNavigate() {
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    );
  }

  function handleViewLayout() {
    router.push({
      pathname: "/(parking)/minimap",
      params: { lotId, minimapImage: lotDetails?.minimap_image ?? "" },
    });
  }

  function handleReserve() {
    router.push({
      pathname: "/(parking)/reservation-form",
      params: {
        lotId,
        name,
        minimapImage: lotDetails?.minimap_image ?? "",
        pricePerHour: lotDetails?.price_per_hour ?? 0,
      },
    });
  }

  const heroImageUri = lotDetails?.hero_image
    ? `${BACKEND_URL}/assets/images/entrance/${lotDetails.hero_image}`
    : null;

  const isPaid = (type ?? lotDetails?.type) === "paid";
  const isOpen = lotDetails?.is_open ?? true;

  function renderHours() {
    const hours = lotDetails?.opening_hours;
    if (!hours) return null;
    if (hours === "24/7")
      return (
        <View style={s.hoursRow}>
          <Ionicons name="time-outline" size={16} color="#1a73e8" />
          <Text style={s.hoursText}>Ouvert 24h/24 — 7j/7</Text>
        </View>
      );
    return (
      <View style={s.hoursGrid}>
        {Object.entries(hours as Record<string, string>).map(([day, slot]) => (
          <View key={day} style={s.hoursGridRow}>
            <Text style={s.hoursDay}>{DAY_LABELS[day] ?? day}</Text>
            <Text style={[s.hoursSlot, slot === "Fermé" && s.hoursFerme]}>
              {slot}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <View style={s.hero}>
        {heroImageUri ? (
          <Image
            source={{ uri: heroImageUri }}
            style={s.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[s.heroImage, s.heroPlaceholder]} />
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.72)"]}
          style={s.heroGradient}
        >
          <View style={s.heroBottom}>
            {/* Nom à gauche, badge en bas à droite */}
            <View style={{ flex: 1 }}>
              <Text style={s.heroName}>{name}</Text>
              <Text style={s.heroSubtitle}>
                Appuyez sur "Naviguer" pour l'itinéraire
              </Text>
            </View>
            <View
              style={[
                s.typeBadge,
                { backgroundColor: isPaid ? "#1a73e8" : "#16a34a" },
              ]}
            >
              <Text style={s.typeBadgeText}>
                {isPaid ? "Payant" : "Gratuit"}
              </Text>
            </View>
          </View>
        </LinearGradient>
        <TouchableOpacity
          style={s.heartBtn}
          onPress={toggleFavorite}
          disabled={favLoading}
        >
          {favLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={30}
              color={isFavorite ? "#ef4444" : "#fff"}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Open/Closed ──────────────────────────────────────────────────── */}
      <View style={s.openBadgeRow}>
        <View
          style={[
            s.openBadge,
            { backgroundColor: isOpen ? "#dcfce7" : "#fee2e2" },
          ]}
        >
          <View
            style={[
              s.openDot,
              { backgroundColor: isOpen ? "#16a34a" : "#dc2626" },
            ]}
          />
          <Text style={[s.openText, { color: isOpen ? "#15803d" : "#dc2626" }]}>
            {isOpen ? "Ouvert" : "Fermé"}
          </Text>
        </View>
      </View>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <View style={s.card}>
        <View style={s.cardRow}>
          <StatItem label="Total" value={totalSpots} />
          <View style={s.divider} />
          <StatItem
            label="Libres"
            value={summary?.free}
            color="#2ecc71"
            loading={!summary}
          />
          <View style={s.divider} />
          <StatItem
            label="Occupés"
            value={summary?.occupied}
            color="#bc1300"
            loading={!summary}
          />
          {!!summary?.reserved && summary.reserved > 0 && (
            <>
              <View style={s.divider} />
              <StatItem
                label="Réservés"
                value={summary.reserved}
                color="#f97316"
              />
            </>
          )}
        </View>
      </View>

      {lotDetails?.address && (
        <InfoSection icon="location-outline" title="Adresse">
          <Text style={s.infoText}>{lotDetails.address}</Text>
        </InfoSection>
      )}
      {lotDetails?.bio && (
        <InfoSection icon="information-circle-outline" title="À propos">
          <Text style={s.infoText}>{lotDetails.bio}</Text>
        </InfoSection>
      )}

      <InfoSection icon="pricetag-outline" title="Tarif">
        {isPaid ? (
          <View style={s.tarifRow}>
            <Text style={s.tarifPrice}>
              {lotDetails?.price_per_hour ?? "—"} DA
            </Text>
            <Text style={s.tarifUnit}> / heure</Text>
          </View>
        ) : (
          <View style={s.tarifRow}>
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
            <Text style={[s.tarifPrice, { color: "#16a34a" }]}> Gratuit</Text>
          </View>
        )}
      </InfoSection>

      {lotDetails?.opening_hours && (
        <InfoSection icon="calendar-outline" title="Horaires">
          {renderHours()}
        </InfoSection>
      )}

      <TouchableOpacity style={s.buttonNavigate} onPress={handleNavigate}>
        <Ionicons name="navigate" size={18} color="#fff" />
        <Text style={s.buttonTextWhite}> Naviguer vers le parking</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.buttonLayout} onPress={handleViewLayout}>
        <Ionicons name="car-outline" size={22} color="#2563EB" />
        <Text style={s.buttonLayoutText}>Disponibilité en temps réel</Text>
      </TouchableOpacity>

      {isPaid && isOpen && (
        <TouchableOpacity style={s.buttonReserve} onPress={handleReserve}>
          <MaterialCommunityIcons
            name="calendar-check"
            size={20}
            color="#fff"
          />
          <Text style={s.buttonTextWhite}> Réserver une place</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function StatItem({
  label,
  value,
  color,
  loading,
}: {
  label: string;
  value: any;
  color?: string;
  loading?: boolean;
}) {
  return (
    <View style={s.statItem}>
      {loading ? (
        <ActivityIndicator size="large" style={{ marginBottom: 8 }} />
      ) : (
        <Text style={[s.statNumber, color ? { color } : {}]}>
          {value ?? "—"}
        </Text>
      )}
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function InfoSection({
  icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.infoSection}>
      <View style={s.infoHeader}>
        <Ionicons name={icon} size={16} color="#1a73e8" />
        <Text style={s.infoTitle}>{title}</Text>
      </View>
      <View style={s.infoBody}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f4f4" },
  content: { paddingBottom: 40 },
  hero: { width: "100%", height: 260 },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: { backgroundColor: "#ccc" },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "65%",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end", // badge collé en bas à droite
  },
  heroName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
    flexShrink: 1,
  },
  heroSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.75)" },
  // Badge fixé en bas à droite, taille minimale, ne pousse pas le nom
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 10,
    flexShrink: 0,
    alignSelf: "flex-end",
  },
  typeBadgeText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  heartBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  openBadgeRow: { paddingHorizontal: 16, paddingTop: 12 },
  openBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  openDot: { width: 8, height: 8, borderRadius: 4 },
  openText: { fontSize: 13, fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between" },
  statItem: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 28, fontWeight: "700", color: "#2e1a1a" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  divider: { width: 1, backgroundColor: "#eee", marginVertical: 4 },

  infoSection: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  infoTitle: { fontSize: 13, fontWeight: "700", color: "#1a1a2e" },
  infoBody: { paddingHorizontal: 16, paddingVertical: 12 },
  infoText: { fontSize: 14, color: "#4a5568", lineHeight: 22 },
  tarifRow: { flexDirection: "row", alignItems: "baseline" },
  tarifPrice: { fontSize: 22, fontWeight: "800", color: "#1a73e8" },
  tarifUnit: { fontSize: 14, color: "#94a3b8" },
  hoursRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hoursText: { fontSize: 14, color: "#4a5568", fontWeight: "500" },
  hoursGrid: { gap: 4 },
  hoursGridRow: { flexDirection: "row", justifyContent: "space-between" },
  hoursDay: { fontSize: 13, fontWeight: "600", color: "#64748b", width: 36 },
  hoursSlot: { fontSize: 13, color: "#1a1a2e" },
  hoursFerme: { color: "#ef4444" },
  buttonNavigate: {
    flexDirection: "row",
    backgroundColor: "#1a73e8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  buttonLayout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,

    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingVertical: 16,

    marginHorizontal: 16,
    marginBottom: 12,

    borderWidth: 1,
    borderColor: "#BFDBFE",
  },

  buttonLayoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
  },
  buttonReserve: {
    flexDirection: "row",
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonTextWhite: { fontSize: 16, fontWeight: "600", color: "#fff" },
  buttonTextDark: { fontSize: 16, fontWeight: "600", color: "#1a1a2e" },
});
