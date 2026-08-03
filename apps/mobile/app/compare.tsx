import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CompareChart, seriesColorFor } from "../src/components/CompareChart";
import { EmptyState } from "../src/components/EmptyState";
import { InfoDot } from "../src/components/InfoDot";
import { Screen } from "../src/components/Screen";
import { formatCompactNumber, formatPercent, formatRatio } from "../src/features/stock-detail/format";
import { useCompareData } from "../src/hooks/useCompareData";
import { usePairStats } from "../src/hooks/usePairStats";
import { useStockSearch } from "../src/hooks/useStockSearch";
import { typography } from "../src/theme/typography";
import { useTheme } from "../src/theme/useTheme";

const MAX_SYMBOLS = 4;

export default function CompareScreen() {
  const { colors } = useTheme();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const { results, loading: searching } = useStockSearch(query);
  const entries = useCompareData(symbols);
  const pairStats = usePairStats(symbols.length === 2 ? symbols[0] : null, symbols.length === 2 ? symbols[1] : null);

  const addSymbol = (symbol: string) => {
    if (symbols.includes(symbol) || symbols.length >= MAX_SYMBOLS) return;
    setSymbols([...symbols, symbol]);
    setQuery("");
  };

  const removeSymbol = (symbol: string) => {
    setSymbols(symbols.filter((s) => s !== symbol));
  };

  const rows: { label: string; get: (d: NonNullable<typeof entries[number]["detail"]>) => string }[] = [
    { label: "Price", get: (d) => `$${d.quote.price.toFixed(2)}` },
    { label: "Change %", get: (d) => `${d.quote.changePercent >= 0 ? "+" : ""}${d.quote.changePercent.toFixed(2)}%` },
    { label: "Market cap", get: (d) => `$${formatCompactNumber(d.keyStats.marketCap)}` },
    { label: "PE (TTM)", get: (d) => formatRatio(d.keyStats.peTrailing) },
    { label: "EPS", get: (d) => (d.keyStats.eps ? `$${d.keyStats.eps.toFixed(2)}` : "—") },
    { label: "Dividend yield", get: (d) => formatPercent(d.keyStats.dividendYield) },
    { label: "Beta", get: (d) => (d.keyStats.beta ? d.keyStats.beta.toFixed(2) : "—") },
    { label: "52-wk range", get: (d) => `$${d.keyStats.week52Low.toFixed(0)}–$${d.keyStats.week52High.toFixed(0)}` },
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[typography.pageTitle, { color: colors.text }]}>Compare</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={[styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.chipRow}>
        {symbols.map((symbol, i) => (
          <View key={symbol} style={[styles.chip, { borderColor: seriesColorFor(i), backgroundColor: colors.surface }]}>
            <View style={[styles.dot, { backgroundColor: seriesColorFor(i) }]} />
            <Text style={[typography.cardTitle, { color: colors.text }]}>{symbol}</Text>
            <Pressable onPress={() => removeSymbol(symbol)} hitSlop={8}>
              <Ionicons name="close" size={14} color={colors.textMuted} />
            </Pressable>
          </View>
        ))}
        {symbols.length < MAX_SYMBOLS ? (
          <View style={[styles.addWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Ionicons name="add" size={16} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Add a stock"
              placeholderTextColor={colors.textMuted}
              style={[typography.caption, styles.addInput, { color: colors.text }]}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              // The keyboard's own Done key finishes typing: add the top
              // match if there is one, otherwise just dismiss. Leaving the
              // screen is the separate close (X) button up top.
              onSubmitEditing={() => {
                if (results[0]) addSymbol(results[0].symbol);
                else Keyboard.dismiss();
              }}
            />
          </View>
        ) : null}
      </View>

      {query.length > 0 ? (
        <View style={[styles.suggestBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {searching ? (
            <ActivityIndicator color={colors.primary} style={{ padding: 12 }} />
          ) : (
            results.slice(0, 6).map((r) => (
              <Pressable key={r.symbol} onPress={() => addSymbol(r.symbol)} style={styles.suggestRow}>
                <Text style={[typography.cardTitle, { color: colors.text }]}>{r.symbol}</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
                  {r.companyName}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}

      {symbols.length < 2 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            icon="git-compare-outline"
            title="Add 2 or more stocks"
            description="Search and add up to 4 stocks to see them side by side."
          />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <CompareChart series={entries.filter((e) => e.chart).map((e) => ({ symbol: e.symbol, points: e.chart! }))} />
          <View style={styles.legendRow}>
            {symbols.map((s, i) => (
              <View key={s} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: seriesColorFor(i) }]} />
                <Text style={[typography.micro, { color: colors.textMuted }]}>{s}</Text>
              </View>
            ))}
          </View>

          {symbols.length === 2 ? (
            <PairRelationshipCard symbols={symbols} pairStats={pairStats} colors={colors} />
          ) : null}

          <View style={[styles.table, { borderColor: colors.border }]}>
            <View style={[styles.tableRow, { borderColor: colors.border }]}>
              <View style={styles.labelCol} />
              {symbols.map((s, i) => (
                <Text key={s} style={[typography.label, styles.col, { color: seriesColorFor(i) }]}>
                  {s}
                </Text>
              ))}
            </View>
            {rows.map((row) => (
              <View key={row.label} style={[styles.tableRow, { borderColor: colors.border }]}>
                <Text style={[typography.caption, styles.labelCol, { color: colors.textMuted }]}>{row.label}</Text>
                {entries.map((entry) => (
                  <Text key={entry.symbol} style={[typography.cardTitle, styles.col, { color: colors.text }]}>
                    {entry.loading ? "…" : entry.detail ? row.get(entry.detail) : "—"}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const PAIR_METHODOLOGY =
  "Regresses the two stocks' log prices against each other over the last 6 months, then checks whether the gap between them (the \"spread\") tends to snap back toward its average — a simplified version of what's called a cointegration test. Rather than trusting that check at face value, it's validated with a Monte Carlo simulation: hundreds of pairs of unrelated random walks (same length and volatility) are generated, and the real pair's result is only called meaningful if it stands out from that random-noise baseline at 90% confidence. Correlation and mean-reversion are two different things — two stocks can move together (high correlation) without their spread ever reverting, and vice versa.";

function PairRelationshipCard({
  symbols,
  pairStats,
  colors,
}: {
  symbols: string[];
  pairStats: ReturnType<typeof usePairStats>;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={[pairStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={pairStyles.headerRow}>
        <Text style={[typography.cardTitle, { color: colors.text }]}>
          {symbols[0]} vs {symbols[1]} relationship
        </Text>
        <InfoDot title="How this is measured" definition={PAIR_METHODOLOGY} />
      </View>

      {pairStats.loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
      ) : pairStats.error ? (
        <Text style={[typography.caption, { color: colors.negative }]}>{pairStats.error}</Text>
      ) : pairStats.data ? (
        <>
          <View style={pairStyles.statRow}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>Return correlation</Text>
            <Text style={[typography.cardTitle, { color: colors.text }]}>
              {pairStats.data.correlation.toFixed(2)}
            </Text>
          </View>
          <View style={pairStyles.statRow}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>Hedge ratio</Text>
            <Text style={[typography.cardTitle, { color: colors.text }]}>
              {pairStats.data.hedgeRatio.toFixed(2)}
            </Text>
          </View>
          <View style={[pairStyles.divider, { backgroundColor: colors.border }]} />
          {pairStats.data.significant && pairStats.data.halfLifeDays !== null ? (
            <Text style={[typography.caption, { color: colors.textMuted, lineHeight: 18 }]}>
              Their spread shows statistically meaningful mean-reversion (90% confidence) over the last 6
              months, with a half-life of about {pairStats.data.halfLifeDays.toFixed(0)} trading days — after a
              gap opens, it has historically closed about halfway back in roughly that time. Historical
              tendency, not a guarantee it continues.
            </Text>
          ) : (
            <Text style={[typography.caption, { color: colors.textMuted, lineHeight: 18 }]}>
              No statistically meaningful mean-reversion detected in their spread over the last 6 months
              (p = {pairStats.data.pValue.toFixed(2)}, below 90% confidence) — the gap between them may not
              reliably snap back on its own.
            </Text>
          )}
        </>
      ) : (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Not enough overlapping price history for these two to compute this yet.
        </Text>
      )}
    </View>
  );
}

const pairStyles = StyleSheet.create({
  card: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
});

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 16 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  addWrap: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, height: 36, borderRadius: 10, borderWidth: 1, minWidth: 130 },
  addInput: { flex: 1, height: "100%" },
  suggestBox: { borderRadius: 12, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  suggestRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 12, marginBottom: 20 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  table: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 32 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  labelCol: { flex: 1.3 },
  col: { flex: 1, textAlign: "center" },
});
