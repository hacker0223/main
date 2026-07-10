import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { typography } from "../../../theme/typography";
import { useTheme } from "../../../theme/useTheme";
import type { ClassifyResponse } from "../../../api/client";

const HORIZON_LABELS: Record<string, string> = { "5": "5 days", "10": "10 days", "20": "20 days" };
const CLASS_ORDER = ["up", "down", "flat"] as const;

export function ClassifierPanel({
  data,
  loading,
  error,
  onRun,
}: {
  data: ClassifyResponse | null;
  loading: boolean;
  error: string | null;
  onRun: () => void;
}) {
  const { colors } = useTheme();
  const classColor: Record<string, string> = { up: colors.positive, down: colors.negative, flat: colors.textMuted };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[typography.cardTitle, { color: colors.text }]}>Classifier Estimate</Text>
        <Pressable onPress={onRun} disabled={loading} style={[styles.runButton, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={[typography.caption, { color: colors.onPrimary, fontWeight: "600" }]}>Run model</Text>
          )}
        </Pressable>
      </View>

      {loading ? (
        <Text style={[typography.caption, styles.patience, { color: colors.textMuted }]}>
          This can take a couple of minutes if the server's been idle — please be patient.
        </Text>
      ) : null}

      {error ? <Text style={[typography.caption, { color: colors.negative }]}>{error}</Text> : null}

      {data ? (
        <>
          {data.insufficient_lookback_warning ? (
            <Text style={[typography.micro, styles.warning, { color: colors.accent }]}>
              Not enough price history for this symbol to compute long-term indicators (50/200-day averages) —
              some inputs fell back to neutral defaults.
            </Text>
          ) : null}

          {Object.entries(data.horizons).map(([horizon, result]) => (
            <View key={horizon} style={styles.horizonBlock}>
              <View style={styles.horizonHeader}>
                <Text style={[typography.caption, { color: colors.text, fontWeight: "600" }]}>
                  {HORIZON_LABELS[horizon] ?? `${horizon} days`}
                </Text>
                <Text style={[typography.micro, { color: colors.textMuted }]}>
                  backtested accuracy {(result.backtested_accuracy * 100).toFixed(0)}%
                </Text>
              </View>
              {CLASS_ORDER.map((cls) => {
                const p = result.probabilities[cls] ?? 0;
                return (
                  <View key={cls} style={styles.probRow}>
                    <Text style={[typography.micro, styles.probLabel, { color: colors.textMuted }]}>{cls}</Text>
                    <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
                      <View style={[styles.fill, { width: `${p * 100}%`, backgroundColor: classColor[cls] }]} />
                    </View>
                    <Text style={[typography.micro, styles.probValue, { color: colors.textMuted }]}>
                      {(p * 100).toFixed(0)}%
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}

          {data.narration ? (
            <Text style={[typography.body, styles.narration, { color: colors.text }]}>{data.narration}</Text>
          ) : data.narrationError ? (
            <Text style={[typography.caption, styles.narrationError, { color: colors.textMuted }]}>
              AI narration unavailable: {data.narrationError}
            </Text>
          ) : null}

          <Text style={[typography.micro, styles.note, { color: colors.textMuted }]}>{data.note}</Text>
        </>
      ) : !loading && !error ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          A small, genuinely retrainable model's estimate — not the AI's own guess. Its backtested accuracy is
          shown next to every number, never presented as a guarantee.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  runButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minWidth: 96, alignItems: "center" },
  warning: { marginBottom: 10, lineHeight: 16 },
  patience: { marginBottom: 10, lineHeight: 16, fontStyle: "italic" },
  horizonBlock: { marginBottom: 14 },
  horizonHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  probRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  probLabel: { width: 36, textTransform: "capitalize" },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  probValue: { width: 34, textAlign: "right" },
  narration: { marginTop: 6, lineHeight: 20 },
  narrationError: { marginTop: 6, fontStyle: "italic" },
  note: { marginTop: 10, lineHeight: 15 },
});
