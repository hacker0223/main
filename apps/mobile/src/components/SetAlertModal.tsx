import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

export function SetAlertModal({
  visible,
  symbol,
  currentPrice,
  onClose,
  onSave,
}: {
  visible: boolean;
  symbol: string;
  currentPrice: number;
  onClose: () => void;
  onSave: (targetPrice: number, direction: "above" | "below") => void;
}) {
  const { colors } = useTheme();
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [priceText, setPriceText] = useState(currentPrice.toFixed(2));

  const parsed = Number(priceText);
  const isValid = priceText.trim().length > 0 && !Number.isNaN(parsed) && parsed > 0;

  const handleSave = () => {
    if (!isValid) return;
    onSave(parsed, direction);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={[typography.cardTitle, { color: colors.text }]}>Set a price alert — {symbol}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={[typography.caption, styles.subtitle, { color: colors.textMuted }]}>
            Current price: ${currentPrice.toFixed(2)}. Checked whenever you have this stock open — not a push
            notification.
          </Text>

          <View style={styles.directionRow}>
            <DirectionOption
              label="Price goes above"
              active={direction === "above"}
              onPress={() => setDirection("above")}
              colors={colors}
            />
            <DirectionOption
              label="Price goes below"
              active={direction === "below"}
              onPress={() => setDirection("below")}
              colors={colors}
            />
          </View>

          <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}>
            <Text style={[typography.body, { color: colors.textMuted }]}>$</Text>
            <TextInput
              value={priceText}
              onChangeText={setPriceText}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              style={[typography.body, styles.input, { color: colors.text }]}
            />
          </View>

          <Pressable
            onPress={handleSave}
            disabled={!isValid}
            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: isValid ? 1 : 0.4 }]}
          >
            <Text style={[typography.body, { color: colors.onPrimary, fontWeight: "700" }]}>Save alert</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DirectionOption({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.directionOption,
        {
          backgroundColor: active ? colors.primary : "transparent",
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[typography.caption, { color: active ? colors.onPrimary : colors.text, fontWeight: "600" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  card: { borderRadius: 18, padding: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  subtitle: { marginTop: 8, marginBottom: 16, lineHeight: 17 },
  directionRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  directionOption: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 18,
  },
  input: { flex: 1, height: "100%", minWidth: 0 },
  saveButton: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
});
