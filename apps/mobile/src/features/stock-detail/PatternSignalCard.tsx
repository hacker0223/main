import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Skeleton } from "../../components/Skeleton";
import { typography } from "../../theme/typography";
import { useTheme } from "../../theme/useTheme";
import { useStockPatternSignal } from "./useStockPatternSignal";

const HORIZON = "10"; // middle-ground default; full 5/10/20 breakdown lives in Pattern Lab itself
const CLASS_ORDER = ["up", "down", "flat"] as const;

// The headline version of Pattern Lab's signal, surfaced directly on the
// stock page instead of requiring a trip to Learn -> Pattern Lab. Loads
// automatically (narrate: false — no Anthropic call fires just from
// viewing a stock; the written explanation is one tap away in Pattern Lab
// itself, not duplicated here).
export function PatternSignalCard({ symbol }: { symbol: string | undefined }) {
  const { colors } = useTheme();
  const signal = useStockPatternSignal(symbol);
  const classColor: Record<string, string> = { up: colors.positive, down: colors.negative, flat: colors.textMuted };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Ionicons name="analytics-outline" size={16} color={colors.accent} />
        <Text style={[typography.cardTitle, { color: colors.text }]}>Pattern Signal</Text>
      </View>

      {signal.loading ? (
        <Skeleton style={{ height: 64, borderRadius: 8 }} />
      ) : signal.error || !signal.data ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Not enough recent history to compute a signal for this stock yet.
        </Text>
      ) : (
        <>
          <Text style={[typography.micro, styles.horizonLabel, { color: colors.textMuted }]}>
            10-day outlook, from a model trained on ~230,000 historical chart windows
          </Text>
          {CLASS_ORDER.map((cls) => {
            const p = signal.data!.horizons[HORIZON]?.probabilities[cls] ?? 0;
            return (
              <View key={cls} style={styles.probRow}>
                <Text style={[typography.caption, styles.probLabel, { color: colors.text }]}>{cls}</Text>
                <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
                  <View style={[styles.fill, { width: `${p * 100}%`, backgroundColor: classColor[cls] }]} />
                </View>
                <Text style={[typography.caption, styles.probValue, { color: colors.textMuted }]}>
                  {(p * 100).toFixed(0)}%
                </Text>
              </View>
            );
          })}
          <Text style={[typography.micro, styles.accuracyNote, { color: colors.textMuted }]}>
            Backtested accuracy: {((signal.data.horizons[HORIZON]?.backtested_accuracy ?? 0) * 100).toFixed(0)}% on
            held-out historical data — a real measurement, not a guarantee. This is historical pattern frequency,
            not a prediction of what this stock will do.
          </Text>
        </>
      )}

      <Pressable
        onPress={() => router.push("/pattern-lab")}
        style={({ pressed }) => [styles.ctaRow, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>
          Full breakdown in Pattern Lab
        </Text>
        <Ionicons name="arrow-forward" size={14} color={colors.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  horizonLabel: { marginBottom: 10, lineHeight: 15 },
  probRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  probLabel: { width: 40, textTransform: "capitalize" },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  probValue: { width: 34, textAlign: "right" },
  accuracyNote: { marginTop: 8, lineHeight: 15 },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12 },
});
