import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "../../src/components/EmptyState";
import { ErrorState } from "../../src/components/ErrorState";
import { Screen } from "../../src/components/Screen";
import { SectionHeading } from "../../src/components/SectionHeading";
import { StockRow } from "../../src/components/StockRow";
import { StockRowSkeleton } from "../../src/components/StockRowSkeleton";
import { SummitWordmark } from "../../src/components/SummitWordmark";
import { curatedSymbols } from "../../src/constants/curatedSymbols";
import { buildDailyBrief } from "../../src/features/home/dailyBrief";
import { useQuotes } from "../../src/hooks/useQuotes";
import { useWatchlistStore } from "../../src/store/watchlistStore";
import { typography } from "../../src/theme/typography";
import { useTheme } from "../../src/theme/useTheme";

function greetingForHour(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const quotes = useQuotes(curatedSymbols.slice(0, 4));
  const greeting = greetingForHour(new Date().getHours());
  const watchlistSymbols = useWatchlistStore((s) => s.symbols);
  const watchlistQuotes = useQuotes(watchlistSymbols.slice(0, 3));
  const dailyBrief = buildDailyBrief(watchlistQuotes.data ?? [], quotes.data ?? []);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={quotes.loading} onRefresh={quotes.refetch} tintColor={colors.primary} />
        }
      >
        <View style={styles.brandRow}>
          <SummitWordmark />
          <Pressable onPress={() => router.push("/search")} hitSlop={10}>
            <Ionicons name="search" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.header}>
          <Text style={[typography.pageTitle, { color: colors.text }]}>{greeting}</Text>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Here's a quick look at today's market.
          </Text>
        </View>

        <SectionHeading title="Watchlist" action="View all" onPressAction={() => router.push("/(tabs)/watchlist")} />
        {watchlistSymbols.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <EmptyState
              icon="eye-outline"
              title="Watchlist is empty"
              description="Save stocks you're watching to see quick updates here."
              ctaLabel="Explore stocks"
              onPressCta={() => router.push("/(tabs)/discover")}
              compact
            />
          </View>
        ) : watchlistQuotes.loading ? (
          <StockRowSkeleton />
        ) : (
          (watchlistQuotes.data ?? []).map((quote) => <StockRow key={quote.symbol} quote={quote} />)
        )}

        <View style={styles.aiHeadingRow}>
          <Ionicons name="bar-chart-outline" size={15} color={colors.accent} />
          <Text style={[typography.sectionTitle, { color: colors.text }]}>Daily Brief</Text>
        </View>
        <View style={[styles.card, styles.aiCard, { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}>
          <Text style={[typography.body, styles.aiText, { color: colors.text }]}>{dailyBrief}</Text>
        </View>

        <SectionHeading title="Market snapshot" />
        {quotes.loading
          ? Array.from({ length: 4 }).map((_, i) => <StockRowSkeleton key={i} />)
          : quotes.error
            ? <ErrorState message={quotes.error} onRetry={quotes.refetch} />
            : (quotes.data ?? []).map((quote) => <StockRow key={quote.symbol} quote={quote} />)}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 20,
  },
  header: { marginBottom: 20 },
  card: { padding: 4, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  aiCard: { padding: 16, borderWidth: 1.5 },
  aiHeadingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, marginTop: 8 },
  aiText: { lineHeight: 20 },
});
