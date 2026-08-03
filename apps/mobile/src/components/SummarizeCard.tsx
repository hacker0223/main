import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/useTheme";

// Opt-in AI summary button, shared by AI Insights and News. Never fires
// automatically — the user taps it, matching the app's cost-conscious
// default of not calling Anthropic on every page view.
export function SummarizeCard({ label, onSummarize }: { label: string; onSummarize: () => Promise<string> }) {
  const { colors } = useTheme();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  const run = async () => {
    setState("loading");
    try {
      const text = await onSummarize();
      setSummary(text);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  };

  if (state === "idle") {
    return (
      <Pressable
        onPress={run}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.accentSurface, borderColor: colors.accent, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Ionicons name="sparkles" size={15} color={colors.accent} />
        <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>{label}</Text>
      </Pressable>
    );
  }

  if (state === "loading") {
    return (
      <View style={[styles.card, styles.loadingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[typography.micro, { color: colors.textMuted }]}>Summarizing…</Text>
      </View>
    );
  }

  if (state === "error") {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[typography.caption, { color: colors.negative }]}>{error}</Text>
        <Pressable onPress={run} hitSlop={8} style={styles.retry}>
          <Text style={[typography.caption, { color: colors.accent, fontWeight: "700" }]}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.accentCard, { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}>
      <View style={styles.headingRow}>
        <Ionicons name="sparkles" size={14} color={colors.accent} />
        <Text style={[typography.micro, { color: colors.accent, fontWeight: "700" }]}>AI SUMMARY</Text>
      </View>
      <Text style={[typography.body, { color: colors.text }]}>{summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  accentCard: { borderWidth: 1.5 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  retry: { marginTop: 8, alignSelf: "flex-start" },
});
