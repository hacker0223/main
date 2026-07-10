import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { typography } from "../../../theme/typography";
import { useTheme } from "../../../theme/useTheme";
import type { AnalogsResponse } from "../../../api/client";
import { OutcomeHistogram } from "./OutcomeHistogram";

const HORIZONS = ["5", "10", "20"] as const;

export function AnalogMatchesPanel({
  data,
  loading,
  error,
  onRun,
}: {
  data: AnalogsResponse | null;
  loading: boolean;
  error: string | null;
  onRun: () => void;
}) {
  const { colors } = useTheme();
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>("10");

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[typography.cardTitle, { color: colors.text }]}>Historical Analog Matches</Text>
        <Pressable onPress={onRun} disabled={loading} style={[styles.runButton, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={[typography.caption, { color: colors.onPrimary, fontWeight: "600" }]}>Find matches</Text>
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
          <View style={styles.horizonRow}>
            {HORIZONS.map((h) => (
              <Pressable
                key={h}
                onPress={() => setHorizon(h)}
                style={[
                  styles.horizonPill,
                  {
                    backgroundColor: horizon === h ? colors.primary : colors.surfaceRaised,
                    borderColor: horizon === h ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.micro,
                    { color: horizon === h ? colors.onPrimary : colors.textMuted, fontWeight: "600" },
                  ]}
                >
                  {h}d
                </Text>
              </Pressable>
            ))}
          </View>

          {data.distributions[horizon] ? (
            <OutcomeHistogram distribution={data.distributions[horizon]} />
          ) : null}

          {data.narration ? (
            <Text style={[typography.body, styles.narration, { color: colors.text }]}>{data.narration}</Text>
          ) : data.narrationError ? (
            <Text style={[typography.caption, styles.narrationError, { color: colors.textMuted }]}>
              AI narration unavailable: {data.narrationError}
            </Text>
          ) : null}

          <Text style={[typography.caption, styles.subheading, { color: colors.textMuted }]}>
            Top matches ({data.matches.length})
          </Text>
          {data.matches.slice(0, 8).map((m, i) => (
            <View key={`${m.ticker}-${m.end_date}-${i}`} style={[styles.matchRow, { borderColor: colors.border }]}>
              <Text style={[typography.caption, { color: colors.text, fontWeight: "600" }]}>{m.ticker}</Text>
              <Text style={[typography.micro, { color: colors.textMuted }]}>
                {m.start_date} → {m.end_date}
              </Text>
              <Text style={[typography.micro, { color: colors.textMuted }]}>
                sim {(m.cosine_score * 100).toFixed(0)}%
              </Text>
            </View>
          ))}
        </>
      ) : !loading && !error ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Finds real historical chart windows shaped like this one, and shows what actually happened next —
          not a prediction, a frequency count from real precedents.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  runButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minWidth: 96, alignItems: "center" },
  horizonRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  patience: { marginBottom: 10, lineHeight: 16, fontStyle: "italic" },
  horizonPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  narration: { marginTop: 10, lineHeight: 20 },
  narrationError: { marginTop: 10, fontStyle: "italic" },
  subheading: { marginTop: 14, marginBottom: 6 },
  matchRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
});
