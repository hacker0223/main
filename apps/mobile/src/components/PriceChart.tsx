import { Fragment, useState } from "react";
import type { ChartPoint } from "@summit/shared";
import { StyleSheet, View } from "react-native";
import Svg, { Line as SvgLine, Polyline, Rect } from "react-native-svg";
import { useTheme } from "../theme/useTheme";

const PRICE_HEIGHT = 180;
const VOLUME_HEIGHT = 44;
const GAP = 8;

export type ChartMode = "line" | "candle";

export function PriceChart({
  points,
  isPositive,
  mode,
}: {
  points: ChartPoint[];
  isPositive: boolean;
  mode: ChartMode;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  if (points.length === 0) {
    return <View style={styles.container} />;
  }

  const highs = points.map((p) => p.high);
  const lows = points.map((p) => p.low);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const range = max - min || 1;
  const maxVolume = Math.max(...points.map((p) => p.volume), 1);

  const priceY = (value: number) => PRICE_HEIGHT - ((value - min) / range) * PRICE_HEIGHT;
  const lineColor = isPositive ? colors.positive : colors.negative;

  const slotWidth = width / points.length;
  const candleWidth = Math.max(1.5, Math.min(8, slotWidth * 0.6));

  return (
    <View style={styles.container} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={PRICE_HEIGHT + GAP + VOLUME_HEIGHT}>
          <SvgLine
            x1={0}
            y1={PRICE_HEIGHT / 2}
            x2={width}
            y2={PRICE_HEIGHT / 2}
            stroke={colors.border}
            strokeWidth={1}
          />

          {mode === "line" ? (
            <Polyline
              points={points
                .map((p, i) => `${i * slotWidth + slotWidth / 2},${priceY(p.close)}`)
                .join(" ")}
              fill="none"
              stroke={lineColor}
              strokeWidth={2.5}
            />
          ) : (
            points.map((p, i) => {
              const x = i * slotWidth + slotWidth / 2;
              const up = p.close >= p.open;
              const color = up ? colors.positive : colors.negative;
              const bodyTop = priceY(Math.max(p.open, p.close));
              const bodyBottom = priceY(Math.min(p.open, p.close));
              return (
                <Fragment key={i}>
                  <SvgLine
                    x1={x}
                    y1={priceY(p.high)}
                    x2={x}
                    y2={priceY(p.low)}
                    stroke={color}
                    strokeWidth={1}
                  />
                  <Rect
                    x={x - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={Math.max(1, bodyBottom - bodyTop)}
                    fill={color}
                  />
                </Fragment>
              );
            })
          )}

          {points.map((p, i) => {
            const x = i * slotWidth + slotWidth / 2;
            const barWidth = Math.max(1, Math.min(6, slotWidth * 0.6));
            const barHeight = (p.volume / maxVolume) * VOLUME_HEIGHT;
            const up = p.close >= p.open;
            return (
              <Rect
                key={`v${i}`}
                x={x - barWidth / 2}
                y={PRICE_HEIGHT + GAP + (VOLUME_HEIGHT - barHeight)}
                width={barWidth}
                height={barHeight}
                fill={up ? colors.positive : colors.negative}
                opacity={0.5}
              />
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", height: PRICE_HEIGHT + GAP + VOLUME_HEIGHT },
});
