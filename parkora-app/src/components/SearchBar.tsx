import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ── Types ─────────────────────────────────────────────────────────────────────
type ParkingLot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  total_spots: number;
};

type Props = {
  lots: ParkingLot[];
  onSelectLot: (lot: ParkingLot) => void;
};
// ─────────────────────────────────────────────────────────────────────────────

export default function SearchBar({ lots, onSelectLot }: Props) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Animate dropdown opacity
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  const filtered =
    query.trim().length > 0
      ? lots.filter((lot) =>
          lot.name.toLowerCase().includes(query.trim().toLowerCase()),
        )
      : [];

  const showDropdown = isFocused && filtered.length > 0;

  useEffect(() => {
    Animated.timing(dropdownAnim, {
      toValue: showDropdown ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [showDropdown]);

  function handleSelect(lot: ParkingLot) {
    setQuery("");
    setIsFocused(false);
    Keyboard.dismiss();
    onSelectLot(lot);
  }

  function handleClear() {
    setQuery("");
    inputRef.current?.focus();
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* ── Search input row ─────────────────────────────────────────────────── */}
      <View style={[styles.bar, isFocused && styles.barFocused]}>
        <Ionicons
          name="search"
          size={18}
          color={isFocused ? "#1a73e8" : "#888"}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Search for a parking lot..."
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={setQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Small delay so onPress in dropdown fires before blur hides it
            setTimeout(() => setIsFocused(false), 150);
          }}
          returnKeyType="search"
          clearButtonMode="never"
        />

        {/* Clear button — only visible when there's text */}
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#bbb" />
          </TouchableOpacity>
        )}

        <Image
          source={require("../../assets/images/parkora-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* ── Results dropdown ──────────────────────────────────────────────────── */}
      {showDropdown && (
        <Animated.View
          style={[styles.dropdown, { opacity: dropdownAnim }]}
          pointerEvents="box-none"
        >
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={filtered.length > 4}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.resultRow,
                  index < filtered.length - 1 && styles.resultRowBorder,
                ]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.75}
              >
                {/* P icon */}
                <View style={styles.resultIcon}>
                  <Text style={styles.resultIconText}>P</Text>
                </View>

                <View style={styles.resultText}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.resultSub}>
                    {item.total_spots} spots total
                  </Text>
                </View>

                <Ionicons
                  name="arrow-forward-circle-outline"
                  size={20}
                  color="#1a73e8"
                />
              </TouchableOpacity>
            )}
          />
        </Animated.View>
      )}

      {/* ── No results hint ───────────────────────────────────────────────────── */}
      {isFocused && query.trim().length > 0 && filtered.length === 0 && (
        <Animated.View
          style={[styles.dropdown, styles.noResult, { opacity: dropdownAnim }]}
        >
          <Ionicons name="search-outline" size={20} color="#ccc" />
          <Text style={styles.noResultText}>No parking lots found</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 40,
    left: 16,
    right: 16,
    zIndex: 100,
  },

  // ── Bar ───────────────────────────────────────────────────────────────────
  bar: {
    height: 48,
    backgroundColor: "#fff",
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  barFocused: {
    borderColor: "#1a73e8",
    shadowOpacity: 0.18,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#1a1a2e",
    paddingVertical: 0, // prevent Android extra padding
  },

  // ── Dropdown ──────────────────────────────────────────────────────────────
  dropdown: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },

  // ── Result row ────────────────────────────────────────────────────────────
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  resultRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#e8f0fe",
    justifyContent: "center",
    alignItems: "center",
  },
  resultIconText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1a73e8",
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  resultSub: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },

  // ── No result ─────────────────────────────────────────────────────────────
  noResult: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  noResultText: {
    fontSize: 14,
    color: "#bbb",
  },

  // ── Logo ────────────────────────────────────────────────────────
  logo: {
    width: 60,
    marginLeft: 10,
    opacity: 0.85,
  },
});
