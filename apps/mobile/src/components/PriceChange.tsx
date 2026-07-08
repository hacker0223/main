import { StyleSheet, Text } from "react-native";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

export function PriceChange({ change, changePercent }: { change: number; changePercent: number }) {
  const { colors } = useTheme();
  const isPositive = change >= 0;
  const color = isPositive ? colors.positive : colors.negative;
  const sign = isPositive ? "+" : "";

  return (
    <Text style={[typography.caption, styles.text, { color }]}>
      {sign}
      {change.toFixed(2)} ({sign}
      {changePercent.toFixed(2)}%)
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontWeight: "600" },
});
