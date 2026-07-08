import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/useTheme";

interface Stat {
  label: string;
  value: string;
}

function chunkPairs(stats: Stat[]): Stat[][] {
  const rows: Stat[][] = [];
  for (let i = 0; i < stats.length; i += 2) {
    rows.push(stats.slice(i, i + 2));
  }
  return rows;
}

export function StatGrid({ stats }: { stats: Stat[] }) {
  const { colors } = useTheme();
  const rows = chunkPairs(stats);

  return (
    <View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((stat) => (
            <View key={stat.label} style={styles.cell}>
              <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={1}>
                {stat.label}
              </Text>
              <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
                {stat.value}
              </Text>
            </View>
          ))}
          {row.length === 1 ? <View style={styles.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  cell: { flex: 1, marginBottom: 18 },
  label: { fontSize: 12, marginBottom: 4 },
  value: { fontSize: 15, fontWeight: "600" },
});
