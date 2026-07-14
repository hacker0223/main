import { StyleSheet, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { useTheme } from "../theme/useTheme";

// A tiny trend line for a stock row. Colored by its own direction over the
// window (first vs last close), independent of the day's % change shown
// beside it — the row already states today's move in words/color; this adds
// the shape of the recent path. Purely decorative: renders nothing if there
// isn't enough data.
export function Sparkline({
  data,
  width = 56,
  height = 28,
}: {
  data: number[] | undefined;
  width?: number;
  height?: number;
}) {
  const { colors } = useTheme();

  if (!data || data.length < 2) {
    return <View style={{ width, height }} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2; // keep the stroke off the very edge

  const stepX = (width - pad * 2) / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (height - pad * 2) * (1 - (v - min) / range);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const rising = data[data.length - 1] >= data[0];
  const stroke = rising ? colors.positive : colors.negative;

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height}>
        <Polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
});
