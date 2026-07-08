import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { typography } from "../../../theme/typography";
import { useTheme } from "../../../theme/useTheme";
import type { IndicatorKey } from "../types";

const INDICATORS: { key: IndicatorKey; label: string }[] = [
  { key: "sma20", label: "SMA 20" },
  { key: "sma50", label: "SMA 50" },
  { key: "ema20", label: "EMA 20" },
  { key: "bollinger", label: "Bollinger" },
  { key: "rsi", label: "RSI" },
  { key: "macd", label: "MACD" },
];

export function IndicatorPanel({
  selected,
  onToggle,
}: {
  selected: Set<IndicatorKey>;
  onToggle: (key: IndicatorKey) => void;
}) {
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
      {INDICATORS.map((ind) => {
        const active = selected.has(ind.key);
        return (
          <Pressable
            key={ind.key}
            onPress={() => onToggle(ind.key)}
            style={[
              styles.pill,
              { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border },
            ]}
          >
            <Text style={[typography.caption, { color: active ? colors.onPrimary : colors.text, fontWeight: "600" }]}>
              {ind.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexGrow: 0 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
});
