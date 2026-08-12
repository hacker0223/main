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
      <Stack.Screen options={{ headerShown: true, title: "Leaderboard" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageTitle subtitle="Best completed runs, ranked by total return — any stock, any starting date, any amount of cash.">
          Leaderboard
        </PageTitle>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : authRequired ? (
          <SignInPrompt message="Sign in to see the leaderboard." />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : entries.length === 0 ? (
          <Text style={[typography.caption, styles.empty, { color: colors.textMuted }]}>
            No completed runs yet — be the first.
          </Text>
        ) : (
          entries.map((entry, i) => {
            const isUp = entry.return_pct >= 0;
            return (
              <View key={entry.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.rank, { backgroundColor: i < 3 ? colors.accent : colors.surfaceRaised }]}>
                  {i < 3 ? (
                    <Ionicons name="trophy" size={14} color={colors.onAccent} />
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
  loading: { marginTop: 40 },
  empty: { textAlign: "center", paddingVertical: 30 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
