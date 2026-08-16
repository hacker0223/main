import { useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CollapsibleText } from "../../../components/CollapsibleText";
import { typography } from "../../../theme/typography";
import { useTheme } from "../../../theme/useTheme";
import type { DevilsAdvocateResponse } from "../../../api/client";

export function DevilsAdvocatePanel({
  data,
  loading,
  error,
  onSubmit,
}: {
  data: DevilsAdvocateResponse | null;
  loading: boolean;
  error: string | null;
  onSubmit: (thesis: string) => void;
}) {
  const { colors } = useTheme();
  const [thesis, setThesis] = useState("");

  // Clickable starters so a beginner isn't staring at a blank "state your
  // read" box — tap one to fill it, then edit or submit.
  const starters = [
    "It's breaking out and momentum will keep going up.",
    "It looks overbought and due for a pullback.",
    "This is a bullish reversal bouncing off support.",
    "The downtrend isn't over yet.",
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[typography.cardTitle, { color: colors.text }]}>Devil's Advocate</Text>
        {/* Always rendered (not conditional on focus) — a focus-conditional
            dismiss button disappears the instant the TextInput blurs, which
            can race with and swallow the very tap meant to trigger it. */}
        <Pressable onPress={() => Keyboard.dismiss()} hitSlop={10} style={styles.doneRow}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: "600" }]}>Done</Text>
          <Ionicons name="chevron-down" size={13} color={colors.primary} />
        </Pressable>
      </View>
      <Text style={[typography.caption, styles.intro, { color: colors.textMuted }]}>
        State your read of the chart. Before you commit to it, see the strongest case for the opposite.
      </Text>

      <TextInput
        value={thesis}
        onChangeText={setThesis}
        placeholder="e.g. I think this breaks upward because of the volume spike at resistance"
        placeholderTextColor={colors.textMuted}
        multiline
        style={[typography.body, styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}
      />

      {thesis.trim().length === 0 ? (
        <View style={styles.starters}>
          <Text style={[typography.micro, styles.startersLabel, { color: colors.textMuted }]}>
            Not sure where to start? Tap one:
          </Text>
          <View style={styles.starterChips}>
            {starters.map((s) => (
              <Pressable
                key={s}
                onPress={() => setThesis(s)}
                style={[styles.chip, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
              >
                <Text style={[typography.micro, { color: colors.text }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={() => thesis.trim() && onSubmit(thesis.trim())}
        disabled={loading || thesis.trim().length === 0}
        style={[
          styles.submitButton,
          { backgroundColor: colors.primary, opacity: loading || thesis.trim().length === 0 ? 0.5 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Text style={[typography.caption, { color: colors.onPrimary, fontWeight: "600" }]}>
            Challenge my thesis
          </Text>
        )}
      </Pressable>

      {error ? <Text style={[typography.caption, styles.error, { color: colors.negative }]}>{error}</Text> : null}

      {data ? (
        <View style={styles.result}>
          <View style={[styles.resultCard, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
            <View style={styles.resultLabelRow}>
              <Ionicons name="person-outline" size={13} color={colors.textMuted} />
              <Text style={[typography.micro, styles.resultLabel, { color: colors.textMuted }]}>YOUR THESIS</Text>
            </View>
            <Text style={[typography.body, styles.resultText, { color: colors.text }]}>{data.yourThesis}</Text>
          </View>
          <View style={[styles.resultCard, { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}>
            <View style={styles.resultLabelRow}>
              <Ionicons name="swap-horizontal" size={14} color={colors.accent} />
              <Text style={[typography.micro, styles.resultLabel, { color: colors.accent }]}>THE CASE AGAINST IT</Text>
            </View>
            {/* Collapsed by default, same as the analog panel's narration —
                the counter-thesis is the longest text in Pattern Lab, and
                showing it in full pushed everything else off screen. */}
            <CollapsibleText text={data.devilsAdvocate} style={styles.resultText} collapsedLines={4} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  intro: { marginTop: 4, marginBottom: 12, lineHeight: 17 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 70, textAlignVertical: "top" },
  submitButton: { marginTop: 10, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  error: { marginTop: 10 },
  starters: { marginTop: 10 },
  startersLabel: { marginBottom: 8 },
  starterChips: { gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  // Stacked full-width cards (not two narrow side-by-side columns) so the
  // text reads at a comfortable width instead of a tall, thin scroll.
  result: { marginTop: 16, gap: 10 },
  resultCard: { padding: 14, borderRadius: 12, borderWidth: 1 },
  resultLabelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  resultLabel: { fontWeight: "700", letterSpacing: 0.5 },
  resultText: { lineHeight: 21 },
});
