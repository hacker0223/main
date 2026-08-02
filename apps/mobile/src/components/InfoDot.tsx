import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

// A small tappable "(i)" placed next to a metric or label. Tapping opens a
// lightweight popover with a plain-English explanation, so a beginner can
// learn what "RSI" or a "10-K" means in place, without hunting the glossary.
export function InfoDot({ title, definition, size = 15 }: { title: string; definition: string; size?: number }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} accessibilityLabel={`What is ${title}?`}>
        <Ionicons name="information-circle-outline" size={size} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.card, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.headerRow}>
              <Text style={[typography.cardTitle, styles.title, { color: colors.text }]}>{title}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={[typography.body, styles.definition, { color: colors.textMuted }]}>{definition}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 28 },
  card: { borderRadius: 16, padding: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  title: { flex: 1 },
  definition: { lineHeight: 21 },
});
