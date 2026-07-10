import { Fragment, useRef, useState } from "react";
import type { ChartPoint, ChartTimeframe } from "@summit/shared";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line as SvgLine,
  LinearGradient,
  Polygon,
  Polyline,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

// Interactions use React Native's built-in PanResponder (pure JS), not
// react-native-gesture-handler — same reasoning as the sandbox chart: no
// native-module version skew with Expo Go, identical behavior on web and
// device. The responder is created exactly ONCE via a ref and reads live
// values through a second ref; recreating it per render corrupts an
// in-flight gesture's internal dx/dy state (hard-won sandbox lesson).

const PRICE_HEIGHT = 200;
const VOLUME_HEIGHT = 40;
const TIME_AXIS_HEIGHT = 16;
const GAP = 6;
const PRICE_GUTTER = 52; // right-edge space for $ labels
const GRID_LINES = 4;

const SMA_COLORS = { sma20: "#2563EB", sma50: "#9333EA" };

export type ChartMode = "line" | "candle";

interface Scrub {
  index: number;
}

function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function formatPrice(v: number): string {
  return v >= 1000 ? `$${Math.round(v).toLocaleString("en-US")}` : `$${v.toFixed(2)}`;
}

function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(Math.round(v));
}

function formatWhen(timestamp: number, timeframe: ChartTimeframe | undefined): string {
  const d = new Date(timestamp);
  const intraday = timeframe === "1D" || timeframe === "1W";
  if (intraday) {
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return timeframe === "1W" ? `${d.toLocaleDateString("en-US", { weekday: "short" })} ${time}` : time;
  }
  if (timeframe === "5Y" || timeframe === "MAX") {
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PriceChart({
  points,
  isPositive,
  mode,
  timeframe,
  onInteractionStateChange,
}: {
  points: ChartPoint[];
  isPositive: boolean;
  mode: ChartMode;
  timeframe?: ChartTimeframe;
  // Fires true on scrub start / false on end so the parent screen can lock
  // its ScrollView — on a real device the native scroll recognizer will
  // otherwise steal the drag partway through (same failure mode the
  // sandbox chart hit).
  onInteractionStateChange?: (active: boolean) => void;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [scrub, setScrub] = useState<Scrub | null>(null);

  const chartAreaWidth = Math.max(0, width - PRICE_GUTTER);
  const slotWidth = chartAreaWidth / (points.length || 1);

  // Live values for the once-created PanResponder.
  const latestRef = useRef({ slotWidth, pointsLen: points.length, onInteractionStateChange });
  latestRef.current = { slotWidth, pointsLen: points.length, onInteractionStateChange };

  const responderRef = useRef<ReturnType<typeof PanResponder.create> | null>(null);
  if (!responderRef.current) {
    const indexAt = (x: number) => {
      const { slotWidth: sw, pointsLen } = latestRef.current;
      if (sw <= 0 || pointsLen === 0) return 0;
      return Math.max(0, Math.min(pointsLen - 1, Math.floor(x / sw)));
    };
    responderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        latestRef.current.onInteractionStateChange?.(true);
        setScrub({ index: indexAt(evt.nativeEvent.locationX) });
      },
      onPanResponderMove: (evt) => {
        setScrub({ index: indexAt(evt.nativeEvent.locationX) });
      },
      onPanResponderRelease: () => {
        latestRef.current.onInteractionStateChange?.(false);
        setScrub(null);
      },
      onPanResponderTerminate: () => {
        latestRef.current.onInteractionStateChange?.(false);
        setScrub(null);
      },
    });
  }

  if (points.length === 0) {
    return <View style={styles.container} />;
  }

  // Scale selection matters more than it looks: intraday feeds (especially
  // pre/post-market) print occasional junk wicks — a single bad 4 AM tick
  // 5% off price squashes the whole chart into a band. Line mode scales to
  // closes only (the line IS closes; standard for line charts). Candle mode
  // scales to percentile-trimmed highs/lows so one rogue wick can't own the
  // axis — the outlier wick itself just clips, which is the honest tradeoff.
  const closesForScale = points.map((p) => p.close);
  const trim = (values: number[], lo: boolean) => {
    if (points.length < 50) return lo ? Math.min(...values) : Math.max(...values);
    const sorted = [...values].sort((a, b) => a - b);
    const idx = lo ? Math.floor(sorted.length * 0.01) : Math.ceil(sorted.length * 0.99) - 1;
    return sorted[idx];
  };
  const highs = points.map((p) => p.high);
  const lows = points.map((p) => p.low);
  const min = mode === "line" ? Math.min(...closesForScale) : trim(lows, true);
  const max = mode === "line" ? Math.max(...closesForScale) : trim(highs, false);
  const pad = (max - min) * 0.04 || 1;
  const yMin = min - pad;
  const yMax = max + pad;
  const range = yMax - yMin;
  const maxVolume = Math.max(...points.map((p) => p.volume), 1);

  const priceY = (value: number) => PRICE_HEIGHT - ((value - yMin) / range) * PRICE_HEIGHT;
  const xAt = (i: number) => i * slotWidth + slotWidth / 2;
  const lineColor = isPositive ? colors.positive : colors.negative;
  const candleWidth = Math.max(1.5, Math.min(8, slotWidth * 0.6));

  const volumeTop = PRICE_HEIGHT + GAP;
  const timeAxisTop = volumeTop + VOLUME_HEIGHT + 2;
  const svgHeight = timeAxisTop + TIME_AXIS_HEIGHT;

  const firstClose = points[0].close;
  const closes = points.map((p) => p.close);

  // SMA overlays only on daily-or-coarser bars — a "20-period" average of
  // 5-minute candles isn't the SMA 20 anyone means, and would mislead more
  // than it informs.
  const dailyOrCoarser = timeframe !== undefined && timeframe !== "1D" && timeframe !== "1W";
  const sma20 = dailyOrCoarser && points.length >= 20 ? sma(closes, 20) : null;
  const sma50 = dailyOrCoarser && points.length >= 50 ? sma(closes, 50) : null;

  // Visible-period extremes for the high/low markers — looked up in the
  // same series the scale came from, so the index always exists.
  const hiIndex = (mode === "line" ? closesForScale : highs).indexOf(max);
  const loIndex = (mode === "line" ? closesForScale : lows).indexOf(min);

  // Wicks beyond the trimmed scale (rare junk ticks) clip to the panel
  // edge instead of drawing outside the chart.
  const clampY = (y: number) => Math.max(0, Math.min(PRICE_HEIGHT, y));

  // Time-axis labels: 3 evenly spaced.
  const timeLabelIndexes =
    points.length >= 3
      ? [0, Math.floor((points.length - 1) / 2), points.length - 1]
      : points.length === 2
        ? [0, 1]
        : [0];

  const gridPrices = Array.from(
    { length: GRID_LINES },
    (_, i) => yMin + (range * (i + 0.5)) / GRID_LINES
  );

  const scrubPoint = scrub ? points[scrub.index] : null;
  const scrubChangePct = scrubPoint ? ((scrubPoint.close - firstClose) / firstClose) * 100 : null;

  const smaLinePoints = (series: (number | null)[]) => {
    const pts: string[] = [];
    for (let i = 0; i < series.length; i++) {
      const v = series[i];
      if (v === null) continue;
      pts.push(`${xAt(i)},${priceY(v)}`);
    }
    return pts.join(" ");
  };

  // Area fill under the line (line mode): close the polygon along the bottom.
  const areaPoints =
    mode === "line"
      ? `${xAt(0)},${PRICE_HEIGHT} ` +
        points.map((p, i) => `${xAt(i)},${priceY(p.close)}`).join(" ") +
        ` ${xAt(points.length - 1)},${PRICE_HEIGHT}`
      : "";

  // Clamp marker/label x so text near the edges doesn't clip.
  const clampLabelX = (x: number) => Math.max(28, Math.min(chartAreaWidth - 28, x));

  return (
    <View>
      {/* Readout row — fixed height so the layout doesn't jump when a scrub
          starts. Shows the touched candle's full OHLCV while scrubbing, and
          the period's range summary otherwise. */}
      <View style={styles.readoutRow}>
        {scrubPoint ? (
          <>
            <View style={styles.readoutTop}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {formatWhen(scrubPoint.timestamp, timeframe)}
              </Text>
              {scrubChangePct !== null ? (
                <Text
                  style={[
                    typography.caption,
                    styles.readoutChange,
                    { color: scrubChangePct >= 0 ? colors.positive : colors.negative },
                  ]}
                >
                  {scrubChangePct >= 0 ? "+" : ""}
                  {scrubChangePct.toFixed(2)}% in period
                </Text>
              ) : null}
            </View>
            <Text style={[typography.micro, { color: colors.text }]} numberOfLines={1}>
              O {formatPrice(scrubPoint.open)}  H {formatPrice(scrubPoint.high)}  L{" "}
              {formatPrice(scrubPoint.low)}  C {formatPrice(scrubPoint.close)}  ·  Vol{" "}
              {formatVolume(scrubPoint.volume)}
            </Text>
          </>
        ) : (
          <>
            <View style={styles.readoutTop}>
              <Text style={[typography.micro, { color: colors.textMuted }]}>
                Period high {formatPrice(max)} · low {formatPrice(min)}
              </Text>
              {sma20 || sma50 ? (
                <View style={styles.legend}>
                  {sma20 ? (
                    <View style={styles.legendItem}>
                      <View style={[styles.legendSwatch, { backgroundColor: SMA_COLORS.sma20 }]} />
                      <Text style={[typography.micro, { color: colors.textMuted }]}>SMA 20</Text>
                    </View>
                  ) : null}
                  {sma50 ? (
                    <View style={styles.legendItem}>
                      <View style={[styles.legendSwatch, { backgroundColor: SMA_COLORS.sma50 }]} />
                      <Text style={[typography.micro, { color: colors.textMuted }]}>SMA 50</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
            <Text style={[typography.micro, { color: colors.textMuted }]}>
              Touch and drag the chart to inspect any point
            </Text>
          </>
        )}
      </View>

      <View
        style={styles.container}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        {...responderRef.current.panHandlers}
      >
        {width > 0 ? (
          <Svg width={width} height={svgHeight}>
            <Defs>
              <LinearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={lineColor} stopOpacity="0.18" />
                <Stop offset="1" stopColor={lineColor} stopOpacity="0.01" />
              </LinearGradient>
            </Defs>

            {/* Gridlines + price labels */}
            {gridPrices.map((gp, i) => (
              <Fragment key={`grid-${i}`}>
                <SvgLine
                  x1={0}
                  y1={priceY(gp)}
                  x2={chartAreaWidth}
                  y2={priceY(gp)}
                  stroke={colors.border}
                  strokeWidth={0.75}
                  opacity={0.8}
                />
                <SvgText
                  x={chartAreaWidth + 6}
                  y={priceY(gp) + 3}
                  fontSize={10}
                  fill={colors.textMuted}
                >
                  {formatPrice(gp)}
                </SvgText>
              </Fragment>
            ))}

            {/* Baseline at period-start close (line mode) — instant read of
                above/below where the period began. */}
            {mode === "line" ? (
              <SvgLine
                x1={0}
                y1={priceY(firstClose)}
                x2={chartAreaWidth}
                y2={priceY(firstClose)}
                stroke={colors.textMuted}
                strokeWidth={0.75}
                strokeDasharray="3,4"
                opacity={0.7}
              />
            ) : null}

            {/* Price series */}
            {mode === "line" ? (
              <>
                <Polygon points={areaPoints} fill="url(#priceFill)" />
                <Polyline
                  points={points.map((p, i) => `${xAt(i)},${priceY(p.close)}`).join(" ")}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={2.25}
                />
              </>
            ) : (
              points.map((p, i) => {
                const x = xAt(i);
                const up = p.close >= p.open;
                const color = up ? colors.positive : colors.negative;
                const bodyTop = priceY(Math.max(p.open, p.close));
                const bodyBottom = priceY(Math.min(p.open, p.close));
                return (
                  <Fragment key={i}>
                    <SvgLine
                      x1={x}
                      y1={clampY(priceY(p.high))}
                      x2={x}
                      y2={clampY(priceY(p.low))}
                      stroke={color}
                      strokeWidth={1}
                    />
                    <Rect
                      x={x - candleWidth / 2}
                      y={clampY(bodyTop)}
                      width={candleWidth}
                      height={Math.max(1, clampY(bodyBottom) - clampY(bodyTop))}
                      fill={color}
                    />
                  </Fragment>
                );
              })
            )}

            {/* SMA overlays */}
            {sma20 ? (
              <Polyline points={smaLinePoints(sma20)} fill="none" stroke={SMA_COLORS.sma20} strokeWidth={1.25} opacity={0.9} />
            ) : null}
            {sma50 ? (
              <Polyline points={smaLinePoints(sma50)} fill="none" stroke={SMA_COLORS.sma50} strokeWidth={1.25} opacity={0.9} />
            ) : null}

            {/* Period high/low markers */}
            <SvgText
              x={clampLabelX(xAt(hiIndex))}
              y={Math.max(10, priceY(max) - 5)}
              fontSize={9}
              fill={colors.textMuted}
              textAnchor="middle"
            >
              {formatPrice(max)}
            </SvgText>
            <SvgText
              x={clampLabelX(xAt(loIndex))}
              y={Math.min(PRICE_HEIGHT - 2, priceY(min) + 11)}
              fontSize={9}
              fill={colors.textMuted}
              textAnchor="middle"
            >
              {formatPrice(min)}
            </SvgText>

            {/* Volume */}
            {points.map((p, i) => {
              const x = xAt(i);
              const barWidth = Math.max(1, Math.min(6, slotWidth * 0.6));
              const barHeight = (p.volume / maxVolume) * VOLUME_HEIGHT;
              const up = p.close >= p.open;
              return (
                <Rect
                  key={`v${i}`}
                  x={x - barWidth / 2}
                  y={volumeTop + (VOLUME_HEIGHT - barHeight)}
                  width={barWidth}
                  height={barHeight}
                  fill={up ? colors.positive : colors.negative}
                  opacity={scrub && scrub.index === i ? 0.95 : 0.45}
                />
              );
            })}

            {/* Time axis */}
            {timeLabelIndexes.map((idx, n) => (
              <SvgText
                key={`t-${idx}`}
                x={clampLabelX(xAt(idx))}
                y={timeAxisTop + 11}
                fontSize={9.5}
                fill={colors.textMuted}
                textAnchor={n === 0 ? "start" : n === timeLabelIndexes.length - 1 ? "end" : "middle"}
              >
                {formatWhen(points[idx].timestamp, timeframe)}
              </SvgText>
            ))}

            {/* Crosshair */}
            {scrub && scrubPoint ? (
              <>
                <SvgLine
                  x1={xAt(scrub.index)}
                  y1={0}
                  x2={xAt(scrub.index)}
                  y2={volumeTop + VOLUME_HEIGHT}
                  stroke={colors.text}
                  strokeWidth={1}
                  opacity={0.55}
                />
                <Circle
                  cx={xAt(scrub.index)}
                  cy={priceY(scrubPoint.close)}
                  r={4.5}
                  fill={lineColor}
                  stroke={colors.background}
                  strokeWidth={2}
                />
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: PRICE_HEIGHT + GAP + VOLUME_HEIGHT + 2 + TIME_AXIS_HEIGHT,
  },
  readoutRow: { height: 40, paddingHorizontal: 20, marginBottom: 4, justifyContent: "center" },
  readoutTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  readoutChange: { fontWeight: "600" },
  legend: { flexDirection: "row", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendSwatch: { width: 10, height: 3, borderRadius: 2 },
});
