import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { StockKeyStats } from "@summit/shared";
import { StyleSheet, Text, View } from "react-native";
import { ErrorState } from "../../components/ErrorState";
import { SectionHeading } from "../../components/SectionHeading";
import { Skeleton } from "../../components/Skeleton";
import { useChart } from "../../hooks/useChart";
import { typography } from "../../theme/typography";
import { useTheme } from "../../theme/useTheme";
import { annualizedVolatility, calculateRiskScore, probabilisticRange } from "./statistics";

export function AIInsightsTab({ symbol, keyStats }: { symbol: string | undefined; keyStats: StockKeyStats | undefined }) {
  const { colors } = useTheme();
  const chart = useChart(symbol, "6M");

  const closes = useMemo(() => (chart.data?.points ?? []).map((p) => p.close), [chart.data]);

  if (chart.loading || !chart.data) {
    return (
      <View>
        <Skeleton style={{ width: "100%", height: 130, borderRadius: 14, marginBottom: 16 }} />
        <Skeleton style={{ width: "100%", height: 110, borderRadius: 14 }} />
      </View>
    );
  }

  if (chart.error) {
    return <ErrorState message={chart.error} onRetry={chart.refetch} />;
  }

  if (closes.length < 20 || !keyStats) {
    return (
      <Text style={[typography.body, { color: colors.textMuted, textAlign: "center", paddingVertical: 40 }]}>
        Not enough data yet to compute risk and range for this stock.
      </Text>
    );
  }

  const vol = annualizedVolatility(closes);
  const currentPrice = closes[closes.length - 1];
  const range = vol === null ? null : probabilisticRange(currentPrice, vol, 30, 80);
  const risk = calculateRiskScore({ annualizedVol: vol, beta: keyStats.beta, peTrailing: keyStats.peTrailing });

  const riskColor =
    risk.level === "Low" ? colors.positive : risk.level === "Moderate" ? colors.accent : colors.negative;

  return (
    <View>
      <View style={styles.headingRow}>
        <Ionicons name="sparkles" size={15} color={colors.accent} />
        <Text style={[typography.sectionTitle, { color: colors.text }]}>Risk score</Text>
        <View style={[styles.badge, { backgroundColor: colors.accentSurface }]}>
          <Text style={[typography.micro, { color: colors.accent, fontWeight: "700" }]}>STATISTICAL</Text>
        </View>
      </View>
      <View style={[styles.card, styles.accentCard, { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}>
        <View style={styles.riskHeader}>
          <Text style={[typography.display, { color: colors.text, fontSize: 36 }]}>{risk.score}</Text>
          <View style={[styles.levelPill, { backgroundColor: riskColor }]}>
            <Text style={[typography.micro, { color: colors.background, fontWeight: "700" }]}>
              {risk.level.toUpperCase()}
            </Text>
          </View>
        </View>
        <BreakdownBar label="Volatility" value={risk.volatilityContribution} colors={colors} />
        <BreakdownBar label="Beta (market sensitivity)" value={risk.betaContribution} colors={colors} />
        <BreakdownBar label="Valuation" value={risk.valuationContribution} colors={colors} />
        <Text style={[typography.micro, styles.attribution, { color: colors.textMuted }]}>
          Transparent formula: 45% historical volatility, 30% beta, 25% valuation. Not a prediction — a way to see
          why a stock is flagged riskier, so you can judge it yourself.
        </Text>
      </View>

      {range ? (
        <>
          <SectionHeading title="30-day probabilistic range" />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rangeRow}>
              <View>
                <Text style={[typography.micro, { color: colors.textMuted }]}>Low</Text>
                <Text style={[typography.cardTitle, { color: colors.negative }]}>${range.low.toFixed(2)}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={[typography.micro, { color: colors.textMuted }]}>Current</Text>
                <Text style={[typography.cardTitle, { color: colors.text }]}>${currentPrice.toFixed(2)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[typography.micro, { color: colors.textMuted }]}>High</Text>
                <Text style={[typography.cardTitle, { color: colors.positive }]}>${range.high.toFixed(2)}</Text>
              </View>
            </View>
            <Text style={[typography.micro, styles.attribution, { color: colors.textMuted }]}>
              Based on {range.confidencePct}% historical volatility over the last 6 months, not a forecast of where
              the price will land — a statistically grounded range, the same logic options pricing uses.
            </Text>
          </View>
        </>
      ) : null}

      <View style={[styles.comingSoonNote, { backgroundColor: colors.surfaceRaised }]}>
        <Text style={[typography.micro, { color: colors.textMuted }]}>
          Sentiment scoring and earnings call analysis are coming in a future pass. Everything above is real
          statistics, computed live, not a preview — and the Pattern Signal on the Overview tab adds a trained
          model's read of the recent chart shape.
        </Text>
      </View>
    </View>
  );
}

function BreakdownBar({ label, value, colors }: { label: string; value: number; colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={[typography.caption, styles.breakdownLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={[styles.breakdownTrack, { backgroundColor: colors.surface }]}>
        <View style={[styles.breakdownFill, { width: `${value}%`, backgroundColor: colors.accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 4 },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  accentCard: { borderWidth: 1.5 },
  riskHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  levelPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  breakdownRow: { marginBottom: 10 },
  breakdownLabel: { marginBottom: 4 },
  breakdownTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  breakdownFill: { height: "100%", borderRadius: 3 },
  attribution: { marginTop: 8, lineHeight: 15 },
  rangeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  comingSoonNote: { padding: 12, borderRadius: 10, marginTop: 8 },
});
