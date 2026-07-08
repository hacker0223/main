import { Fragment, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import Svg, { Circle, Line as SvgLine, Polyline, Rect } from "react-native-svg";
import type { AnalysisResult, Drawing, IndicatorKey, SandboxCandle } from "../types";
import {
  calculateBollingerSeries,
  calculateEMASeries,
  calculateMACDSeries,
  calculateRSISeries,
  calculateSMASeries,
} from "../indicators";
import { useTheme } from "../../../theme/useTheme";
import type { ViewRange } from "../useSandboxState";

// Interactions here are built on React Native's built-in PanResponder
// rather than react-native-gesture-handler + react-native-reanimated.
// PanResponder is pure JS with no native module of its own — it can't
// desync from whatever native binary Expo Go happens to ship, which a
// worklet-based implementation can (and did — see conversation history).
// It behaves identically on web and native, so there's no verification
// gap between what gets tested here and what runs on a real device.

const PRICE_HEIGHT = 260;
const VOLUME_HEIGHT = 46;
const SUB_PANEL_HEIGHT = 70;
const GAP = 8;
const TAP_THRESHOLD = 6;

const INDICATOR_LINE_COLORS: Record<string, string> = {
  sma20: "#2563EB",
  sma50: "#9333EA",
  ema20: "#0D9488",
};

export interface SandboxChartProps {
  candles: SandboxCandle[];
  viewRange: ViewRange;
  selectedIndicators: Set<IndicatorKey>;
  selectedCandleIndex: number | null;
  drawings: Drawing[];
  drawMode: boolean;
  analysis: AnalysisResult | null;
  showAnnotations: boolean;
  onSelectCandle: (globalIndex: number | null) => void;
  onUpdateCandle: (globalIndex: number, patch: Partial<Omit<SandboxCandle, "time">>) => void;
  onAddTrendline: (from: { index: number; price: number }, to: { index: number; price: number }) => void;
  onPan: (deltaIndex: number) => void;
  editable: boolean;
}

export function SandboxChart({
  candles,
  viewRange,
  selectedIndicators,
  selectedCandleIndex,
  drawings,
  drawMode,
  analysis,
  showAnnotations,
  onSelectCandle,
  onUpdateCandle,
  onAddTrendline,
  onPan,
  editable,
}: SandboxChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const visible = useMemo(() => candles.slice(viewRange.start, viewRange.end), [candles, viewRange]);

  const showRSI = selectedIndicators.has("rsi");
  const showMACD = selectedIndicators.has("macd");
  const totalHeight =
    PRICE_HEIGHT +
    GAP +
    VOLUME_HEIGHT +
    (showRSI ? GAP + SUB_PANEL_HEIGHT : 0) +
    (showMACD ? GAP + SUB_PANEL_HEIGHT : 0);

  const closesAll = useMemo(() => candles.map((c) => c.close), [candles]);

  const priceBounds = useMemo(() => {
    if (visible.length === 0) return { min: 0, max: 1 };
    const highs = visible.map((c) => c.high);
    const lows = visible.map((c) => c.low);
    let min = Math.min(...lows);
    let max = Math.max(...highs);

    if (selectedIndicators.has("bollinger")) {
      const bands = calculateBollingerSeries(closesAll, 20).slice(viewRange.start, viewRange.end);
      bands.forEach((b) => {
        if (b.upper !== null) max = Math.max(max, b.upper);
        if (b.lower !== null) min = Math.min(min, b.lower);
      });
    }
    const pad = (max - min) * 0.08 || 1;
    return { min: min - pad, max: max + pad };
  }, [visible, selectedIndicators, closesAll, viewRange]);

  const priceRange = priceBounds.max - priceBounds.min || 1;
  const priceY = (price: number) => PRICE_HEIGHT - ((price - priceBounds.min) / priceRange) * PRICE_HEIGHT;
  const priceFromY = (y: number) => priceBounds.max - (y / PRICE_HEIGHT) * priceRange;

  const slotWidth = width / (visible.length || 1);
  const candleWidth = Math.max(2, Math.min(10, slotWidth * 0.6));
  const xAt = (localIndex: number) => localIndex * slotWidth + slotWidth / 2;

  const maxVolume = Math.max(...visible.map((c) => c.volume), 1);
  const volumeTop = PRICE_HEIGHT + GAP;

  const rsiTop = volumeTop + VOLUME_HEIGHT + GAP;
  const macdTop = rsiTop + (showRSI ? SUB_PANEL_HEIGHT + GAP : 0);

  // --- Background gesture: pan, tap-to-select, and trendline drawing ----
  // all live on one PanResponder so there's only ever one thing deciding
  // what a touch on the chart background means.

  const [dragLine, setDragLine] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(
    null
  );

  const grantRef = useRef({ x: 0, y: 0, lastDx: 0 });

  const commitTrendline = (fromX: number, fromY: number, endX: number, endY: number) => {
    // Ignore a stray tap-without-drag while in draw mode — otherwise it
    // commits a zero-length, invisible trendline instead of doing nothing.
    if (Math.abs(endX - fromX) + Math.abs(endY - fromY) < TAP_THRESHOLD) {
      setDragLine(null);
      return;
    }
    const fromIndex = viewRange.start + Math.max(0, Math.min(visible.length - 1, Math.round(fromX / slotWidth)));
    const toIndex = viewRange.start + Math.max(0, Math.min(visible.length - 1, Math.round(endX / slotWidth)));
    onAddTrendline({ index: fromIndex, price: priceFromY(fromY) }, { index: toIndex, price: priceFromY(endY) });
    setDragLine(null);
  };

  const backgroundResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => editable && selectedCandleIndex === null,
      // Once granted (touch-down on the chart), don't let the parent
      // ScrollView reclaim the gesture mid-drag — trendlines routinely move
      // vertically as much as horizontally, which is exactly the motion a
      // vertical ScrollView tries to intercept.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        grantRef.current = { x: locationX, y: locationY, lastDx: 0 };
        if (drawMode) {
          setDragLine({ from: { x: locationX, y: locationY }, to: { x: locationX, y: locationY } });
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (drawMode) {
          const { x, y } = grantRef.current;
          setDragLine({ from: { x, y }, to: { x: x + gestureState.dx, y: y + gestureState.dy } });
          return;
        }
        if (slotWidth <= 0) return;
        const deltaSinceLast = gestureState.dx - grantRef.current.lastDx;
        const indexDelta = Math.round(-deltaSinceLast / slotWidth);
        if (indexDelta !== 0) {
          onPan(indexDelta);
          grantRef.current.lastDx += indexDelta * -slotWidth;
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (drawMode) {
          const { x, y } = grantRef.current;
          commitTrendline(x, y, x + gestureState.dx, y + gestureState.dy);
          return;
        }
        const moved = Math.abs(gestureState.dx) + Math.abs(gestureState.dy);
        if (moved < TAP_THRESHOLD && slotWidth > 0) {
          const localIndex = Math.max(0, Math.min(visible.length - 1, Math.floor(grantRef.current.x / slotWidth)));
          const globalIndex = viewRange.start + localIndex;
          onSelectCandle(globalIndex === selectedCandleIndex ? null : globalIndex);
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && visible.length > 0 ? (
        <View>
          <View {...backgroundResponder.panHandlers}>
            <Svg width={width} height={totalHeight}>
              {/* Price panel gridline */}
              <SvgLine x1={0} y1={PRICE_HEIGHT / 2} x2={width} y2={PRICE_HEIGHT / 2} stroke={colors.border} strokeWidth={1} />

              {/* Bollinger band */}
              {selectedIndicators.has("bollinger")
                ? renderBollinger(closesAll, viewRange, xAt, priceY, colors.textMuted)
                : null}

              {/* Candles */}
              {visible.map((c, i) => {
                const globalIndex = viewRange.start + i;
                const up = c.close >= c.open;
                const color = up ? colors.positive : colors.negative;
                const x = xAt(i);
                const bodyTop = priceY(Math.max(c.open, c.close));
                const bodyBottom = priceY(Math.min(c.open, c.close));
                const isSelected = globalIndex === selectedCandleIndex;
                return (
                  <Fragment key={c.time}>
                    <SvgLine x1={x} y1={priceY(c.high)} x2={x} y2={priceY(c.low)} stroke={color} strokeWidth={1} />
                    <Rect
                      x={x - candleWidth / 2}
                      y={bodyTop}
                      width={candleWidth}
                      height={Math.max(1, bodyBottom - bodyTop)}
                      fill={color}
                      stroke={isSelected ? colors.primary : "none"}
                      strokeWidth={isSelected ? 2 : 0}
                    />
                  </Fragment>
                );
              })}

              {/* Moving average overlays */}
              {selectedIndicators.has("sma20")
                ? renderLineSeries(calculateSMASeries(closesAll, 20), viewRange, xAt, priceY, INDICATOR_LINE_COLORS.sma20)
                : null}
              {selectedIndicators.has("sma50")
                ? renderLineSeries(calculateSMASeries(closesAll, 50), viewRange, xAt, priceY, INDICATOR_LINE_COLORS.sma50)
                : null}
              {selectedIndicators.has("ema20")
                ? renderLineSeries(calculateEMASeries(closesAll, 20), viewRange, xAt, priceY, INDICATOR_LINE_COLORS.ema20)
                : null}

              {/* User trendlines */}
              {drawings.map((d) => (
                <SvgLine
                  key={d.id}
                  x1={xAt(d.from.index - viewRange.start)}
                  y1={priceY(d.from.price)}
                  x2={xAt(d.to.index - viewRange.start)}
                  y2={priceY(d.to.price)}
                  stroke={colors.text}
                  strokeWidth={2}
                />
              ))}

              {/* In-progress drawing preview */}
              {dragLine ? (
                <SvgLine
                  x1={dragLine.from.x}
                  y1={dragLine.from.y}
                  x2={dragLine.to.x}
                  y2={dragLine.to.y}
                  stroke={colors.primary}
                  strokeWidth={2}
                  strokeDasharray="4,4"
                />
              ) : null}

              {/* AI annotation overlay — visually distinct dashed amber */}
              {showAnnotations && analysis
                ? renderAnnotations(analysis, viewRange, visible.length, xAt, priceY, width, colors.accent)
                : null}

              {/* Volume panel */}
              {visible.map((c, i) => {
                const x = xAt(i);
                const barWidth = Math.max(1, Math.min(8, slotWidth * 0.6));
                const barHeight = (c.volume / maxVolume) * VOLUME_HEIGHT;
                const up = c.close >= c.open;
                return (
                  <Rect
                    key={`v${c.time}`}
                    x={x - barWidth / 2}
                    y={volumeTop + (VOLUME_HEIGHT - barHeight)}
                    width={barWidth}
                    height={barHeight}
                    fill={up ? colors.positive : colors.negative}
                    opacity={0.5}
                  />
                );
              })}

              {/* RSI panel */}
              {showRSI ? renderRSIPanel(closesAll, viewRange, xAt, rsiTop, width, colors) : null}

              {/* MACD panel */}
              {showMACD ? renderMACDPanel(closesAll, viewRange, xAt, macdTop, slotWidth, colors) : null}
            </Svg>
          </View>

          {/* Draggable OHLC handles for the selected candle — separate
              overlaid views, each with their own responder, sitting on top
              of the background responder above. */}
          {selectedCandleIndex !== null && editable && !drawMode
            ? renderHandles({
                globalIndex: selectedCandleIndex,
                candle: candles[selectedCandleIndex],
                localIndex: selectedCandleIndex - viewRange.start,
                xAt,
                priceY,
                priceFromY,
                onUpdateCandle,
                color: colors.primary,
              })
            : null}
        </View>
      ) : null}
    </View>
  );
}

// --- Sub-renderers (return SVG fragments) ------------------------------

function renderLineSeries(
  series: (number | null)[],
  viewRange: ViewRange,
  xAt: (i: number) => number,
  priceY: (p: number) => number,
  color: string
) {
  const points: string[] = [];
  for (let i = viewRange.start; i < viewRange.end; i++) {
    const v = series[i];
    if (v === null || v === undefined) continue;
    points.push(`${xAt(i - viewRange.start)},${priceY(v)}`);
  }
  if (points.length < 2) return null;
  return <Polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={1.5} />;
}

function renderBollinger(
  closes: number[],
  viewRange: ViewRange,
  xAt: (i: number) => number,
  priceY: (p: number) => number,
  color: string
) {
  const bands = calculateBollingerSeries(closes, 20);
  const upperPts: string[] = [];
  const lowerPts: string[] = [];
  for (let i = viewRange.start; i < viewRange.end; i++) {
    const b = bands[i];
    if (b.upper === null || b.lower === null) continue;
    upperPts.push(`${xAt(i - viewRange.start)},${priceY(b.upper)}`);
    lowerPts.push(`${xAt(i - viewRange.start)},${priceY(b.lower)}`);
  }
  if (upperPts.length < 2) return null;
  return (
    <Fragment>
      <Polyline points={upperPts.join(" ")} fill="none" stroke={color} strokeWidth={1} opacity={0.6} />
      <Polyline points={lowerPts.join(" ")} fill="none" stroke={color} strokeWidth={1} opacity={0.6} />
    </Fragment>
  );
}

function renderRSIPanel(
  closes: number[],
  viewRange: ViewRange,
  xAt: (i: number) => number,
  top: number,
  width: number,
  colors: ReturnType<typeof useTheme>["colors"]
) {
  const series = calculateRSISeries(closes, 14);
  const y = (v: number) => top + SUB_PANEL_HEIGHT - (v / 100) * SUB_PANEL_HEIGHT;
  const points: string[] = [];
  for (let i = viewRange.start; i < viewRange.end; i++) {
    const v = series[i];
    if (v === null) continue;
    points.push(`${xAt(i - viewRange.start)},${y(v)}`);
  }
  return (
    <Fragment>
      <SvgLine x1={0} y1={y(70)} x2={width} y2={y(70)} stroke={colors.negative} strokeWidth={1} opacity={0.3} />
      <SvgLine x1={0} y1={y(30)} x2={width} y2={y(30)} stroke={colors.positive} strokeWidth={1} opacity={0.3} />
      {points.length > 1 ? <Polyline points={points.join(" ")} fill="none" stroke={colors.primary} strokeWidth={1.5} /> : null}
    </Fragment>
  );
}

function renderMACDPanel(
  closes: number[],
  viewRange: ViewRange,
  xAt: (i: number) => number,
  top: number,
  slotWidth: number,
  colors: ReturnType<typeof useTheme>["colors"]
) {
  const series = calculateMACDSeries(closes);
  if (!series) return null;
  const visibleHist = series.histogram.slice(viewRange.start, viewRange.end);
  const maxAbs = Math.max(...visibleHist.map((h) => Math.abs(h)), 0.01);
  const mid = top + SUB_PANEL_HEIGHT / 2;
  const y = (v: number) => mid - (v / maxAbs) * (SUB_PANEL_HEIGHT / 2);

  const macdPts: string[] = [];
  const signalPts: string[] = [];
  for (let i = viewRange.start; i < viewRange.end; i++) {
    macdPts.push(`${xAt(i - viewRange.start)},${y(series.macdLine[i])}`);
    signalPts.push(`${xAt(i - viewRange.start)},${y(series.signalLine[i])}`);
  }

  return (
    <Fragment>
      <SvgLine x1={0} y1={mid} x2={xAt(viewRange.end - viewRange.start - 1) + slotWidth} y2={mid} stroke={colors.border} strokeWidth={1} />
      {visibleHist.map((h, i) => (
        <Rect
          key={`macd-h-${i}`}
          x={xAt(i) - slotWidth * 0.3}
          y={h >= 0 ? y(h) : mid}
          width={slotWidth * 0.6}
          height={Math.max(1, Math.abs(y(h) - mid))}
          fill={h >= 0 ? colors.positive : colors.negative}
          opacity={0.5}
        />
      ))}
      <Polyline points={macdPts.join(" ")} fill="none" stroke={colors.primary} strokeWidth={1.5} />
      <Polyline points={signalPts.join(" ")} fill="none" stroke={colors.accent} strokeWidth={1.5} />
    </Fragment>
  );
}

function renderAnnotations(
  analysis: AnalysisResult,
  viewRange: ViewRange,
  visibleCount: number,
  xAt: (i: number) => number,
  priceY: (p: number) => number,
  width: number,
  accent: string
) {
  return (
    <Fragment>
      {analysis.zones.map((zone, i) => {
        const y1 = priceY(zone.priceHigh);
        const y2 = priceY(zone.priceLow);
        return (
          <Fragment key={`zone-${i}`}>
            <Rect x={0} y={Math.min(y1, y2)} width={width} height={Math.max(1, Math.abs(y2 - y1))} fill={accent} opacity={0.12} />
            <SvgLine
              x1={0}
              y1={zone.kind === "resistance" ? y1 : y2}
              x2={width}
              y2={zone.kind === "resistance" ? y1 : y2}
              stroke={accent}
              strokeWidth={1.5}
              strokeDasharray="6,4"
            />
          </Fragment>
        );
      })}
      {analysis.patterns.map((p, i) => {
        const startLocal = Math.max(0, p.startIndex - viewRange.start);
        const endLocal = Math.min(visibleCount - 1, p.endIndex - viewRange.start);
        if (endLocal <= startLocal) return null;
        return (
          <SvgLine
            key={`pattern-${i}`}
            x1={xAt(startLocal)}
            y1={12}
            x2={xAt(endLocal)}
            y2={12}
            stroke={accent}
            strokeWidth={3}
            strokeDasharray="2,3"
          />
        );
      })}
    </Fragment>
  );
}

function renderHandles({
  globalIndex,
  candle,
  localIndex,
  xAt,
  priceY,
  priceFromY,
  onUpdateCandle,
  color,
}: {
  globalIndex: number;
  candle: SandboxCandle;
  localIndex: number;
  xAt: (i: number) => number;
  priceY: (p: number) => number;
  priceFromY: (y: number) => number;
  onUpdateCandle: (index: number, patch: Partial<Omit<SandboxCandle, "time">>) => void;
  color: string;
}) {
  const x = xAt(localIndex);

  // Each handle has a fixed semantic role (open/high/low/close) rather than
  // a "top of body / bottom of body" role re-derived from the candle's
  // current color. If roles were re-derived every render, dragging a handle
  // past the point where open and close cross over would silently swap
  // which field that same finger movement controls, mid-drag. Fixed roles
  // avoid that — the two body handles can simply pass each other visually
  // when open and close invert, same as the candle body itself already does.
  return (
    <Fragment>
      <Handle x={x} y={priceY(candle.high)} color={color} onDrag={(y) => onUpdateCandle(globalIndex, { high: priceFromY(y) })} />
      <Handle x={x} y={priceY(candle.open)} color={color} onDrag={(y) => onUpdateCandle(globalIndex, { open: priceFromY(y) })} />
      <Handle x={x} y={priceY(candle.close)} color={color} onDrag={(y) => onUpdateCandle(globalIndex, { close: priceFromY(y) })} />
      <Handle x={x} y={priceY(candle.low)} color={color} onDrag={(y) => onUpdateCandle(globalIndex, { low: priceFromY(y) })} />
    </Fragment>
  );
}

function Handle({ x, y, color, onDrag }: { x: number; y: number; color: string; onDrag: (y: number) => void }) {
  // Capture the Y at gesture start in a plain ref, not the `y` prop
  // directly — `y` changes on every re-render as the drag commits new
  // candle values, and PanResponder's gestureState.dy is cumulative from
  // gesture start, so anchoring to a stable start value (not a shifting
  // prop) keeps the drag from jumping or jittering mid-gesture.
  const startYRef = useRef(y);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startYRef.current = y;
      },
      onPanResponderMove: (_evt, gestureState) => {
        onDrag(startYRef.current + gestureState.dy);
      },
    })
  ).current;

  return (
    <View
      {...responder.panHandlers}
      style={{ position: "absolute", left: x - 14, top: y - 14, width: 28, height: 28, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={28} height={28}>
        <Circle cx={14} cy={14} r={7} fill={color} stroke="#FFFFFF" strokeWidth={2} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
});
