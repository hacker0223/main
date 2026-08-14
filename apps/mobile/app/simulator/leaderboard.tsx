import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  AuthRequiredError,
  fetchSimulatorLeaderboard,
  type SimulatorHallOfFame,
  type SimulatorLeaderboardEntry,
} from "../../src/api/client";
import { ErrorState } from "../../src/components/ErrorState";
import { PageTitle } from "../../src/components/PageTitle";
import { Screen } from "../../src/components/Screen";
import { SignInPrompt } from "../../src/components/SignInPrompt";
import { typography } from "../../src/theme/typography";
import { useTheme } from "../../src/theme/useTheme";

// Gold/silver/bronze — the universal video-game podium palette, not tied to
// light/dark theme (a medal should look the same regardless).
const MEDAL_COLORS = ["#D4AF37", "#A8A9AD", "#CD7F32"];

const SECTIONS = [
  {
    key: "single" as const,
    title: "Single stock",
    blurb: "Best runs where the player backed one company at a time.",
    icon: "trending-up-outline" as const,
  },
  {
    key: "portfolio" as const,
    title: "Portfolio",
    blurb: "Best runs built from a basket of several companies.",
    icon: "pie-chart-outline" as const,
  },
  {
    key: "generated" as const,
    title: "Generated market",
    blurb: "Best 7-day runs in a randomly generated fictional market.",
    icon: "planet-outline" as const,
  },
];

export default function SimulatorLeaderboardScreen() {
  const { colors } = useTheme();
  const [data, setData] = useState<SimulatorHallOfFame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    setAuthRequired(false);
    fetchSimulatorLeaderboard()
      .then(setData)
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
            Top 10 per mode, ranked by <Text style={{ fontWeight: "700" }}>% return</Text> — not dollar amount, so a
            $500 run and a $50,000 run compete on equal footing. One spot per account: only your best run in each
            mode is listed.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : authRequired ? (
          <SignInPrompt message="Sign in to see the Hall of Fame." />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : data ? (
          SECTIONS.map((section) => (
            <Section key={section.key} icon={section.icon} title={section.title} blurb={section.blurb} entries={data[section.key]} />
          ))
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Section({
  icon,
  title,
  blurb,
  entries,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  blurb: string;
  entries: SimulatorLeaderboardEntry[];
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={17} color={colors.primary} />
        <Text style={[typography.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <Text style={[typography.micro, styles.sectionBlurb, { color: colors.textMuted }]}>{blurb}</Text>

      {entries.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            None completed yet — finish a run to claim the first spot.
          </Text>
        </View>
      ) : (
        entries.map((entry, i) => {
          const isUp = entry.return_pct >= 0;
          const isMedal = i < 3;
          return (
            <View
              key={entry.id}
              style={[
                styles.row,
                {
                  backgroundColor: entry.isYou ? colors.accentSurface : colors.surface,
                  borderColor: entry.isYou ? colors.accent : colors.border,
                  borderWidth: entry.isYou ? 1.5 : 1,
                },
              ]}
            >
              <View style={[styles.rank, { backgroundColor: isMedal ? MEDAL_COLORS[i] : colors.surfaceRaised }]}>
                {isMedal ? (
                  <Ionicons name="trophy" size={14} color="#1a1a1a" />
                ) : (
                  <Text style={[typography.micro, { color: colors.textMuted, fontWeight: "700" }]}>{i + 1}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.cardTitle, { color: colors.text }]}>
                  {entry.isYou ? "You" : `Player #${i + 1}`}
                </Text>
                <Text style={[typography.micro, { color: colors.textMuted }]}>
                  {entry.mode === "generated" ? "Fictional market" : `Started ${entry.start_date}`}
                </Text>
              </View>
              <Text style={[typography.cardTitle, { color: isUp ? colors.positive : colors.negative }]}>
                {isUp ? "+" : ""}
                {entry.return_pct.toFixed(1)}%
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  rankingNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
  rankingNoteText: { flex: 1, lineHeight: 18 },
  loading: { marginTop: 40 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 },
  sectionBlurb: { marginBottom: 12, lineHeight: 16 },
  emptyCard: { padding: 14, borderRadius: 12, borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, marginBottom: 8 },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
