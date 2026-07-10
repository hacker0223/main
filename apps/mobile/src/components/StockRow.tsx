import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { StockQuote } from "@summit/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CompanyLogo } from "./CompanyLogo";
import { PriceChange } from "./PriceChange";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

export function StockRow({ quote, onRemove }: { quote: StockQuote; onRemove?: () => void }) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => router.push(`/stock/${quote.symbol}`)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.leftGroup}>
        <CompanyLogo symbol={quote.symbol} logoUrl={quote.logoUrl} size={34} />
        <View style={styles.nameCol}>
          <Text style={[typography.cardTitle, { color: colors.text }]}>{quote.symbol}</Text>
          <Text style={[typography.micro, styles.name, { color: colors.textMuted }]} numberOfLines={1}>
            {quote.companyName}
          </Text>
        </View>
      </View>
      <View style={styles.priceCol}>
        <Text style={[typography.cardTitle, { color: colors.text }]}>${quote.price.toFixed(2)}</Text>
        <PriceChange change={quote.change} changePercent={quote.changePercent} />
      </View>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={10} style={styles.removeButton}>
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
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
  // flex: 1 + minWidth: 0 (instead of a fixed name maxWidth) lets the name
  // column ellipsize to whatever space the price column leaves — a fixed
  // 160px cap overflowed into the prices on narrow screens.
  leftGroup: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0, marginRight: 10 },
  nameCol: { flexShrink: 1, minWidth: 0 },
  name: { marginTop: 3 },
  priceCol: { alignItems: "flex-end", flexShrink: 0 },
  removeButton: { marginLeft: 10 },
});
