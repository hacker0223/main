import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { AuthRequiredError, fetchSimulatorLeaderboard, type SimulatorLeaderboardEntry } from "../../src/api/client";
import { ErrorState } from "../../src/components/ErrorState";
import { PageTitle } from "../../src/components/PageTitle";
import { Screen } from "../../src/components/Screen";
import { SignInPrompt } from "../../src/components/SignInPrompt";
import { typography } from "../../src/theme/typography";
import { useTheme } from "../../src/theme/useTheme";

// Gold/silver/bronze — the universal video-game podium palette, not tied to
// light/dark theme (a medal should look the same regardless).
const MEDAL_COLORS = ["#D4AF37", "#A8A9AD", "#CD7F32"];

export default function SimulatorLeaderboardScreen() {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<SimulatorLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    setAuthRequired(false);
    fetchSimulatorLeaderboard()
      .then(setEntries)
      .catch((err: Error) => {
        if (err instanceof AuthRequiredError) setAuthRequired(true);
        else setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: "Hall of Fame" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageTitle subtitle="The best completed runs in Summit history.">Hall of Fame</PageTitle>

        <View style={[styles.rankingNote, { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}>
          <Ionicons name="stats-chart-outline" size={16} color={colors.accent} />
          <Text style={[typography.caption, styles.rankingNoteText, { color: colors.text }]}>
            Ranked by <Text style={{ fontWeight: "700" }}>% return</Text>, not dollar amount — a $500 run and a
            $50,000 run compete on equal footing.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : authRequired ? (
          <SignInPrompt message="Sign in to see the Hall of Fame." />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : entries.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="trophy-outline" size={32} color={colors.textMuted} />
            <Text style={[typography.body, styles.emptyTitle, { color: colors.text }]}>None completed yet</Text>
            <Text style={[typography.caption, styles.emptyBody, { color: colors.textMuted }]}>
              End a run to claim the first spot in the Hall of Fame.
            </Text>
          </View>
        ) : (
          entries.map((entry, i) => {
            const isUp = entry.return_pct >= 0;
            const isMedal = i < 3;
            return (
              <View key={entry.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.rank, { backgroundColor: isMedal ? MEDAL_COLORS[i] : colors.surfaceRaised }]}>
                  {isMedal ? (
                    <Ionicons name="trophy" size={14} color="#1a1a1a" />
                  ) : (
                    <Text style={[typography.micro, { color: colors.textMuted, fontWeight: "700" }]}>{i + 1}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.cardTitle, { color: colors.text }]}>
                    {entry.mode === "single" ? "Single stock" : "Portfolio"}
                  </Text>
                  <Text style={[typography.micro, { color: colors.textMuted }]}>Started {entry.start_date}</Text>
                </View>
                <Text style={[typography.cardTitle, { color: isUp ? colors.positive : colors.negative }]}>
                  {isUp ? "+" : ""}
                  {entry.return_pct.toFixed(1)}%
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  rankingNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  rankingNoteText: { flex: 1, lineHeight: 18 },
  loading: { marginTop: 40 },
  emptyWrap: { alignItems: "center", paddingVertical: 30 },
  emptyTitle: { marginTop: 10, fontWeight: "700" },
  emptyBody: { marginTop: 4, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
