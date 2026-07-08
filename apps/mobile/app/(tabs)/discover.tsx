import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ErrorState } from "../../src/components/ErrorState";
import { PageTitle } from "../../src/components/PageTitle";
import { Screen } from "../../src/components/Screen";
import { SectionHeading } from "../../src/components/SectionHeading";
import { StockRow } from "../../src/components/StockRow";
import { StockRowSkeleton } from "../../src/components/StockRowSkeleton";
import { curatedSymbols } from "../../src/constants/curatedSymbols";
import { useQuotes } from "../../src/hooks/useQuotes";
import { typography } from "../../src/theme/typography";
import { useTheme } from "../../src/theme/useTheme";

const screeners: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Top gainers today", icon: "trending-up-outline" },
  { label: "High dividend yield", icon: "cash-outline" },
  { label: "52-week highs", icon: "trophy-outline" },
  { label: "Unusual volume", icon: "pulse-outline" },
];

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const quotes = useQuotes(curatedSymbols);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={quotes.loading} onRefresh={quotes.refetch} tintColor={colors.primary} />
        }
      >
        <PageTitle subtitle="Screen the market and explore new ideas.">Discover</PageTitle>

        <Pressable
          onPress={() => router.push("/search")}
          style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={[typography.body, styles.searchPlaceholder, { color: colors.textMuted }]}>
            Search any stock or ETF
          </Text>
        </Pressable>

        <SectionHeading title="Screeners" />
        <View style={styles.screenerGrid}>
          {screeners.map((s) => (
            <View
              key={s.label}
              style={[styles.screenerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name={s.icon} size={18} color={colors.primary} />
              <Text style={[typography.caption, styles.screenerLabel, { color: colors.text }]}>{s.label}</Text>
            </View>
          ))}
        </View>
        <Text style={[typography.micro, styles.comingSoonNote, { color: colors.textMuted }]}>
          Screeners are coming in a future build pass — full filters, saved screens, and alerts.
        </Text>

        <SectionHeading title="Popular stocks" />
        {quotes.loading
          ? Array.from({ length: curatedSymbols.length }).map((_, i) => <StockRowSkeleton key={i} />)
          : quotes.error
            ? <ErrorState message={quotes.error} onRetry={quotes.refetch} />
            : (quotes.data ?? []).map((quote) => <StockRow key={quote.symbol} quote={quote} />)}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  searchPlaceholder: { flex: 1 },
  screenerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  screenerCard: {
    width: "47%",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  screenerLabel: { fontWeight: "600" },
  comingSoonNote: { marginTop: 10, marginBottom: 24 },
});
