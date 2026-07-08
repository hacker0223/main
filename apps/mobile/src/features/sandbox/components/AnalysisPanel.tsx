import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Skeleton } from "../../../components/Skeleton";
import { typography } from "../../../theme/typography";
import { useTheme } from "../../../theme/useTheme";
import type { AnalysisResult } from "../types";

export function AnalysisPanel({
  analysis,
  loading,
  error,
  hasEnoughData,
  onAnalyze,
  showAnnotations,
  onToggleAnnotations,
}: {
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  hasEnoughData: boolean;
  onAnalyze: () => void;
  showAnnotations: boolean;
  onToggleAnnotations: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}>
      <View style={styles.headerRow}>
        <Ionicons name="sparkles" size={15} color={colors.accent} />
        <Text style={[typography.sectionTitle, { color: colors.text }]}>AI Chart Analysis</Text>
      </View>

      {!analysis && !loading ? (
        <>
          <Text style={[typography.caption, styles.intro, { color: colors.textMuted }]}>
            Sends the visible candles, selected indicators, and your drawings for pattern-recognition commentary —
            not a price prediction.
          </Text>
          <Pressable
            onPress={onAnalyze}
            disabled={!hasEnoughData}
            style={[styles.analyzeButton, { backgroundColor: colors.accent, opacity: hasEnoughData ? 1 : 0.4 }]}
          >
            <Text style={[typography.body, { color: colors.onAccent, fontWeight: "700" }]}>Analyze</Text>
          </Pressable>
          {!hasEnoughData ? (
            <Text style={[typography.micro, styles.note, { color: colors.textMuted }]}>
              Add a few more candles first.
            </Text>
          ) : null}
        </>
      ) : loading ? (
        <View>
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 8 }} />
          <Skeleton style={{ width: "100%", height: 14, marginBottom: 8, borderRadius: 4 }} />
          <Skeleton style={{ width: "70%", height: 14, borderRadius: 4 }} />
        </View>
      ) : error ? (
        <View>
          <Text style={[typography.caption, { color: colors.negative }]}>{error}</Text>
          <Pressable onPress={onAnalyze} style={styles.retryButton}>
            <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>Try again</Text>
          </Pressable>
        </View>
      ) : analysis ? (
        <View>
          {analysis.patterns.map((p, i) => (
            <View key={i} style={styles.patternRow}>
              <Text style={[typography.cardTitle, { color: colors.text }]}>{p.name}</Text>
              <Text style={[typography.caption, styles.patternDesc, { color: colors.textMuted }]}>
                {p.description}
              </Text>
            </View>
          ))}

          {analysis.zones.length > 0 ? (
            <View style={styles.zonesWrap}>
              {analysis.zones.map((z, i) => (
                <View key={i} style={styles.zoneRow}>
                  <View
                    style={[
                      styles.zoneDot,
                      { backgroundColor: z.kind === "resistance" ? colors.negative : colors.positive },
                    ]}
                  />
                  <Text style={[typography.caption, { color: colors.text }]}>
                    {z.label}: ${z.priceLow.toFixed(2)}–${z.priceHigh.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={[typography.caption, styles.watchFor, { color: colors.text }]}>{analysis.watchFor}</Text>

          <Pressable onPress={onToggleAnnotations} style={styles.toggleRow}>
            <Ionicons
              name={showAnnotations ? "checkbox" : "square-outline"}
              size={16}
              color={colors.accent}
            />
            <Text style={[typography.caption, { color: colors.text }]}>Show AI annotations on chart</Text>
          </Pressable>

          <Text style={[typography.micro, styles.disclaimer, { color: colors.textMuted }]}>{analysis.disclaimer}</Text>

          <Pressable onPress={onAnalyze} style={styles.retryButton}>
            <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>Re-analyze</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  intro: { lineHeight: 18, marginBottom: 12 },
  analyzeButton: { paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  note: { marginTop: 8, textAlign: "center" },
  patternRow: { marginBottom: 10 },
  patternDesc: { marginTop: 3, lineHeight: 18 },
  zonesWrap: { marginBottom: 10, gap: 6 },
  zoneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },
  watchFor: { lineHeight: 19, marginBottom: 12 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  disclaimer: { lineHeight: 15, marginBottom: 10 },
  retryButton: { alignSelf: "flex-start" },
});
