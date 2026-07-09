import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[typography.cardTitle, { color: colors.text }]}>Devil's Advocate</Text>
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
        <View style={styles.compareRow}>
          <View style={[styles.thesisCol, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
            <Text style={[typography.caption, styles.thesisLabel, { color: colors.textMuted }]}>Your thesis</Text>
            <Text style={[typography.body, { color: colors.text }]}>{data.yourThesis}</Text>
          </View>
          <View style={[styles.thesisCol, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
            <Text style={[typography.caption, styles.thesisLabel, { color: colors.textMuted }]}>
              Devil's Advocate
            </Text>
            <Text style={[typography.body, { color: colors.text }]}>{data.devilsAdvocate}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  intro: { marginTop: 4, marginBottom: 12, lineHeight: 17 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 70, textAlignVertical: "top" },
  submitButton: { marginTop: 10, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  error: { marginTop: 10 },
  compareRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  thesisCol: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1 },
  thesisLabel: { marginBottom: 6, fontWeight: "600" },
});
