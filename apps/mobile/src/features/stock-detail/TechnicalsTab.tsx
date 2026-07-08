import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ErrorState } from "../../components/ErrorState";
import { SectionHeading } from "../../components/SectionHeading";
import { Skeleton } from "../../components/Skeleton";
import { useChart } from "../../hooks/useChart";
import { typography } from "../../theme/typography";
import { useTheme } from "../../theme/useTheme";
import {
  calculateBollingerBands,
  calculateMACD,
  calculateMovingAverages,
  calculateRSI,
} from "./technicals";

export function TechnicalsTab({ symbol }: { symbol: string | undefined }) {
  const { colors } = useTheme();
  // Indicators need daily closes regardless of what timeframe the price
  // chart above is showing — 6 months gives enough history for SMA50/RSI/MACD.
  const chart = useChart(symbol, "6M");

  const closes = useMemo(() => (chart.data?.points ?? []).map((p) => p.close), [chart.data]);
  const currentPrice = closes[closes.length - 1];

  if (chart.loading || !chart.data) {
    return (
      <View>
        <Skeleton style={{ width: "100%", height: 90, borderRadius: 14, marginBottom: 16 }} />
        <Skeleton style={{ width: "100%", height: 140, borderRadius: 14, marginBottom: 16 }} />
        <Skeleton style={{ width: "100%", height: 110, borderRadius: 14 }} />
      </View>
    );
  }

  if (chart.error) {
    return <ErrorState message={chart.error} onRetry={chart.refetch} />;
  }

  if (closes.length < 30) {
    return (
      <Text style={[typography.body, { color: colors.textMuted, textAlign: "center", paddingVertical: 40 }]}>
        Not enough trading history yet to compute technical indicators for this stock.
      </Text>
    );
  }

  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  const bands = calculateBollingerBands(closes);
  const mas = calculateMovingAverages(closes);

  const rsiReading = rsi === null ? null : rsi >= 70 ? "Overbought" : rsi <= 30 ? "Oversold" : "Neutral";
  const rsiColor = rsiReading === "Overbought" ? colors.negative : rsiReading === "Oversold" ? colors.positive : colors.textMuted;

  return (
    <View>
      <Text style={[typography.micro, styles.note, { color: colors.textMuted }]}>
        Computed from 6 months of daily closes — standard formulas (RSI-14, MACD 12/26/9, Bollinger 20,2), not a
        prediction. Pattern detection, not forecasting.
      </Text>

      <SectionHeading title="RSI (14)" />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {rsi === null ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>Not enough data.</Text>
        ) : (
          <>
            <View style={styles.rsiRow}>
              <Text style={[typography.display, { color: colors.text, fontSize: 28 }]}>{rsi.toFixed(1)}</Text>
              <Text style={[typography.cardTitle, { color: rsiColor }]}>{rsiReading}</Text>
            </View>
            <View style={[styles.rsiTrack, { backgroundColor: colors.surfaceRaised }]}>
              <View style={[styles.rsiZone, { left: "0%", width: "30%", backgroundColor: colors.positive, opacity: 0.25 }]} />
              <View style={[styles.rsiZone, { left: "70%", width: "30%", backgroundColor: colors.negative, opacity: 0.25 }]} />
              <View style={[styles.rsiMarker, { left: `${Math.min(98, Math.max(2, rsi))}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[typography.micro, styles.helper, { color: colors.textMuted }]}>
              Below 30 = oversold, above 70 = overbought. Momentum signal, not a buy/sell call.
            </Text>
          </>
        )}
      </View>

      <SectionHeading title="MACD (12, 26, 9)" />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {macd === null ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>Not enough data.</Text>
        ) : (
          <>
            <Stat label="MACD line" value={macd.macd.toFixed(2)} colors={colors} />
            <Stat label="Signal line" value={macd.signal.toFixed(2)} colors={colors} />
            <Stat
              label="Histogram"
              value={macd.histogram.toFixed(2)}
              valueColor={macd.histogram >= 0 ? colors.positive : colors.negative}
              last
              colors={colors}
            />
            <Text style={[typography.micro, styles.helper, { color: colors.textMuted }]}>
              {macd.histogram >= 0
                ? "MACD is above its signal line — short-term momentum is trending up."
                : "MACD is below its signal line — short-term momentum is trending down."}
            </Text>
          </>
        )}
      </View>

      <SectionHeading title="Moving averages" />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MaRow label="Price vs SMA 20" price={currentPrice} ma={mas.sma20} colors={colors} />
        <MaRow label="Price vs SMA 50" price={currentPrice} ma={mas.sma50} colors={colors} />
        <MaRow label="Price vs SMA 200" price={currentPrice} ma={mas.sma200} colors={colors} last />
      </View>

      {bands ? (
        <>
          <SectionHeading title="Bollinger Bands (20, 2σ)" />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Stat label="Upper band" value={`$${bands.upper.toFixed(2)}`} colors={colors} />
            <Stat label="Middle (SMA 20)" value={`$${bands.middle.toFixed(2)}`} colors={colors} />
            <Stat label="Lower band" value={`$${bands.lower.toFixed(2)}`} colors={colors} last />
            <Text style={[typography.micro, styles.helper, { color: colors.textMuted }]}>
              Price is at {(bands.percentB * 100).toFixed(0)}% of the band width —{" "}
              {bands.percentB > 1
                ? "trading above the upper band."
                : bands.percentB < 0
                  ? "trading below the lower band."
                  : "within its recent volatility range."}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

function Stat({
  label,
  value,
  valueColor,
  last,
  colors,
}: {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider, { borderColor: colors.border }]}>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[typography.cardTitle, { color: valueColor ?? colors.text }]}>{value}</Text>
    </View>
  );
}

function MaRow({
  label,
  price,
  ma,
  colors,
  last,
}: {
  label: string;
  price: number;
  ma: number | null;
  colors: ReturnType<typeof useTheme>["colors"];
  last?: boolean;
}) {
  const above = ma !== null && price >= ma;
  return (
    <View style={[styles.row, !last && styles.rowDivider, { borderColor: colors.border }]}>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
      {ma === null ? (
        <Text style={[typography.cardTitle, { color: colors.textMuted }]}>—</Text>
      ) : (
        <Text style={[typography.cardTitle, { color: above ? colors.positive : colors.negative }]}>
          {above ? "Above" : "Below"} (${ma.toFixed(2)})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { marginBottom: 16, lineHeight: 16 },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  rsiRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 },
  rsiTrack: { height: 6, borderRadius: 3, overflow: "hidden", position: "relative", marginBottom: 10 },
  rsiZone: { position: "absolute", top: 0, bottom: 0 },
  rsiMarker: { position: "absolute", top: -3, width: 12, height: 12, borderRadius: 6, marginLeft: -6 },
  helper: { marginTop: 4, lineHeight: 15 },
});
