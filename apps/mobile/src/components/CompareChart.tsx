import { useState } from "react";
import type { ChartPoint } from "@summit/shared";
import { StyleSheet, View } from "react-native";
import Svg, { Line as SvgLine, Polyline } from "react-native-svg";
import { useTheme } from "../theme/useTheme";

const HEIGHT = 200;
const SERIES_COLORS = ["#2563EB", "#D97706", "#0D9488", "#9333EA"];

export interface CompareSeries {
  symbol: string;
  points: ChartPoint[];
}

export function CompareChart({ series }: { series: CompareSeries[] }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const normalized = series
    .filter((s) => s.points.length > 0)
    .map((s) => {
      const base = s.points[0].close;
      return { symbol: s.symbol, values: s.points.map((p) => ((p.close - base) / base) * 100) };
    });

  const allValues = normalized.flatMap((s) => s.values);
  const min = Math.min(0, ...allValues);
  const max = Math.max(0, ...allValues);
  const range = max - min || 1;

  const y = (v: number) => HEIGHT - ((v - min) / range) * HEIGHT;
  const zeroY = y(0);

  return (
    <View style={styles.container} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          <SvgLine x1={0} y1={zeroY} x2={width} y2={zeroY} stroke={colors.border} strokeWidth={1} />
          {normalized.map((s, i) => {
            const slotWidth = width / (s.values.length - 1 || 1);
            return (
              <Polyline
                key={s.symbol}
                points={s.values.map((v, idx) => `${idx * slotWidth},${y(v)}`).join(" ")}
                fill="none"
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2.5}
              />
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

export function seriesColorFor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

const styles = StyleSheet.create({
  container: { width: "100%", height: HEIGHT },
});
