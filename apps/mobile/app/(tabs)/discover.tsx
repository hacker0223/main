import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ErrorState } from "../../src/components/ErrorState";
import { PageTitle } from "../../src/components/PageTitle";
import { PriceChange } from "../../src/components/PriceChange";
import { Screen } from "../../src/components/Screen";
import { SectionHeading } from "../../src/components/SectionHeading";
import { StockRow } from "../../src/components/StockRow";
import { StockRowSkeleton } from "../../src/components/StockRowSkeleton";
import { curatedSymbols } from "../../src/constants/curatedSymbols";
import { suggestionsForInterests } from "../../src/constants/interestSuggestions";
import { useQuotes } from "../../src/hooks/useQuotes";
import { useSparklines } from "../../src/hooks/useSparklines";
import { useScreener } from "../../src/hooks/useScreener";
import { useOnboardingStore } from "../../src/store/onboardingStore";
import { useWatchlistStore } from "../../src/store/watchlistStore";
import { typography } from "../../src/theme/typography";
import { useTheme } from "../../src/theme/useTheme";

const screenerTabs: { key: "gainers" | "losers" | "52w-highs"; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "gainers", label: "Top gainers", icon: "trending-up-outline" },
  { key: "losers", label: "Top losers", icon: "trending-down-outline" },
  { key: "52w-highs", label: "52-week highs", icon: "trophy-outline" },
];

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const quotes = useQuotes(curatedSymbols);
  const [activeScreener, setActiveScreener] = useState<(typeof screenerTabs)[number]["key"]>("gainers");
  const screener = useScreener(activeScreener);

  // The section that actually keeps onboarding's "we'll use these to
  // suggest stocks for your watchlist" promise. Already-watchlisted
  // symbols are excluded — a suggestion you've already taken is noise.
  const interests = useOnboardingStore((s) => s.answers.interests);
  const watchlistSymbols = useWatchlistStore((s) => s.symbols);
  const suggestedSymbols = suggestionsForInterests(interests, watchlistSymbols);
  const suggested = useQuotes(suggestedSymbols);
  const sparklines = useSparklines([...curatedSymbols, ...suggestedSymbols]);

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

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => router.push("/search")}
            style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <Text style={[typography.body, styles.searchPlaceholder, { color: colors.textMuted }]}>
              Search any stock or ETF
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/compare")}
            style={[styles.compareButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="git-compare-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <SectionHeading title="Screeners" />
        <View style={styles.screenerTabRow}>
          {screenerTabs.map((s) => {
            const selected = s.key === activeScreener;
            return (
              <Pressable
                key={s.key}
                onPress={() => setActiveScreener(s.key)}
                style={[
                  styles.screenerPill,
                  { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.surface },
                ]}
              >
                <Ionicons name={s.icon} size={14} color={selected ? colors.onPrimary : colors.textMuted} />
                <Text style={[typography.caption, { color: selected ? colors.onPrimary : colors.text, fontWeight: "600" }]}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {screener.loading ? (
          Array.from({ length: 5 }).map((_, i) => <StockRowSkeleton key={i} />)
        ) : screener.error ? (
          <ErrorState message={screener.error} onRetry={screener.refetch} />
        ) : !screener.data || screener.data.length === 0 ? (
          <Text style={[typography.caption, styles.emptyScreener, { color: colors.textMuted }]}>
            No stocks in this screen from today's universe.
          </Text>
        ) : (
          screener.data.map((entry) => (
            <Pressable
              key={entry.symbol}
              onPress={() => router.push(`/stock/${entry.symbol}`)}
              style={[styles.screenerRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View>
                <Text style={[typography.cardTitle, { color: colors.text }]}>{entry.symbol}</Text>
                <Text style={[typography.micro, { color: colors.textMuted }]} numberOfLines={1}>
                  {entry.companyName}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[typography.cardTitle, { color: colors.text }]}>${entry.price.toFixed(2)}</Text>
                <PriceChange change={entry.change} changePercent={entry.changePercent} />
              </View>
            </Pressable>
          ))
        )}
        <Text style={[typography.micro, styles.universeNote, { color: colors.textMuted }]}>
          Screened live from a curated universe of 20 liquid stocks — full market-wide filters are coming in a
          future pass.
        </Text>

        {suggestedSymbols.length > 0 ? (
          <>
            <SectionHeading title="Picked for your interests" />
            {suggested.loading ? (
              Array.from({ length: Math.min(3, suggestedSymbols.length) }).map((_, i) => (
                <StockRowSkeleton key={i} />
              ))
            ) : suggested.error ? null : (
              (suggested.data ?? []).map((quote) => (
                <StockRow key={quote.symbol} quote={quote} sparkline={sparklines[quote.symbol]} />
              ))
            )}
            <Text style={[typography.micro, styles.universeNote, { color: colors.textMuted }]}>
              Based on the interests you picked during setup — a browsing starting point, not a
              recommendation.
            </Text>
          </>
        ) : null}

        <SectionHeading title="Popular stocks" />
        {quotes.loading
          ? Array.from({ length: curatedSymbols.length }).map((_, i) => <StockRowSkeleton key={i} />)
          : quotes.error
            ? <ErrorState message={quotes.error} onRetry={quotes.refetch} />
            : (quotes.data ?? []).map((quote) => (
                <StockRow key={quote.symbol} quote={quote} sparkline={sparklines[quote.symbol]} />
              ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  compareButton: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
  },
  searchPlaceholder: { flex: 1 },
  screenerTabRow: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  screenerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  screenerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  emptyScreener: { textAlign: "center", paddingVertical: 20 },
  universeNote: { marginTop: 4, marginBottom: 24 },
});
