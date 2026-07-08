import { router } from "expo-router";
import type { StockQuote } from "@summit/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PriceChange } from "./PriceChange";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

export function StockRow({ quote }: { quote: StockQuote }) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => router.push(`/stock/${quote.symbol}`)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View>
        <Text style={[typography.cardTitle, { color: colors.text }]}>{quote.symbol}</Text>
        <Text style={[typography.micro, styles.name, { color: colors.textMuted }]} numberOfLines={1}>
          {quote.companyName}
        </Text>
      </View>
      <View style={styles.priceCol}>
        <Text style={[typography.cardTitle, { color: colors.text }]}>${quote.price.toFixed(2)}</Text>
        <PriceChange change={quote.change} changePercent={quote.changePercent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  name: { marginTop: 3, maxWidth: 180 },
  priceCol: { alignItems: "flex-end" },
});
