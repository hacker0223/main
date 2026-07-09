import { StyleSheet, Text, View } from "react-native";
import { typography } from "../../../theme/typography";
import { useTheme } from "../../../theme/useTheme";
import type { OutcomeDistribution } from "../../../api/client";

function pct(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}

function formatReturn(r: number | null | undefined): string {
  if (r === null || r === undefined) return "—";
  return `${r >= 0 ? "+" : ""}${(r * 100).toFixed(1)}%`;
}

export function OutcomeHistogram({ distribution }: { distribution: OutcomeDistribution }) {
  const { colors } = useTheme();
  const { count, up, down, flat, avg_up_return, avg_down_return, avg_flat_return } = distribution;

  if (count === 0) {
    return (
      <Text style={[typography.caption, { color: colors.textMuted }]}>No matches with a computable outcome.</Text>
    );
  }

  const rows: { label: string; n: number; avg: number | null | undefined; color: string }[] = [
    { label: "Up", n: up, avg: avg_up_return, color: colors.positive },
    { label: "Down", n: down, avg: avg_down_return, color: colors.negative },
    { label: "Flat", n: flat, avg: avg_flat_return, color: colors.textMuted },
  ];

  return (
    <View>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={[typography.caption, styles.label, { color: colors.text }]}>{row.label}</Text>
          <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
            <View style={[styles.fill, { width: `${pct(row.n, count)}%`, backgroundColor: row.color }]} />
          </View>
          <Text style={[typography.micro, styles.stat, { color: colors.textMuted }]}>
            {row.n}/{count} · avg {formatReturn(row.avg)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  label: { width: 36 },
  track: { flex: 1, height: 10, borderRadius: 5, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5 },
  stat: { width: 110, textAlign: "right" },
});
