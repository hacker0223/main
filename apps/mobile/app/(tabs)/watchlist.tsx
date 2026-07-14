import { router } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { EmptyState } from "../../src/components/EmptyState";
import { ErrorState } from "../../src/components/ErrorState";
import { PageTitle } from "../../src/components/PageTitle";
import { Screen } from "../../src/components/Screen";
import { Skeleton } from "../../src/components/Skeleton";
import { StockRow } from "../../src/components/StockRow";
import { useQuotes } from "../../src/hooks/useQuotes";
import { useSparklines } from "../../src/hooks/useSparklines";
import { useWatchlistStore } from "../../src/store/watchlistStore";
import { useTheme } from "../../src/theme/useTheme";

export default function WatchlistScreen() {
  const { colors } = useTheme();
  const symbols = useWatchlistStore((s) => s.symbols);
  const removeSymbol = useWatchlistStore((s) => s.remove);
  const quotes = useQuotes(symbols);
  const sparklines = useSparklines(symbols);

  if (symbols.length === 0) {
    return (
      <Screen>
        <PageTitle>Watchlist</PageTitle>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            icon="eye-outline"
            title="Your watchlist is empty"
            description="Open any stock and tap Watchlist to save it here. Multiple named watchlists are coming soon."
            ctaLabel="Explore stocks"
            onPressCta={() => router.push("/(tabs)/discover")}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={quotes.loading} onRefresh={quotes.refetch} tintColor={colors.primary} />
        }
      >
        <PageTitle>Watchlist</PageTitle>
        {quotes.error && !quotes.data ? (
          <ErrorState message={quotes.error} onRetry={quotes.refetch} />
        ) : quotes.loading && !quotes.data ? (
          Array.from({ length: symbols.length }).map((_, i) => <Skeleton key={i} style={styles.skeleton} />)
        ) : (
          quotes.data?.map((quote) => (
            <StockRow
              key={quote.symbol}
              quote={quote}
              sparkline={sparklines[quote.symbol]}
              onRemove={() => removeSymbol(quote.symbol)}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  skeleton: { height: 66, borderRadius: 14, marginBottom: 10 },
});
