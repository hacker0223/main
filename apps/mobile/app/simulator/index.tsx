import { useCallback, useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AuthRequiredError, fetchSimulatorRuns, type SimulatorRun } from "../../src/api/client";
import { ErrorState } from "../../src/components/ErrorState";
import { PageTitle } from "../../src/components/PageTitle";
import { Screen } from "../../src/components/Screen";
import { SectionHeading } from "../../src/components/SectionHeading";
import { SignInPrompt } from "../../src/components/SignInPrompt";
import { useAuthStore } from "../../src/store/authStore";
import { typography } from "../../src/theme/typography";
import { useTheme } from "../../src/theme/useTheme";

export default function SimulatorHomeScreen() {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const [runs, setRuns] = useState<SimulatorRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setError(null);
    setAuthRequired(false);
    return fetchSimulatorRuns()
      .then(setRuns)
      .catch((err: Error) => {
        if (err instanceof AuthRequiredError) setAuthRequired(true);
        else setError(err.message);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: "Historical Simulator" }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <PageTitle subtitle="Invest fake money at any point in real market history, then fast-forward and see what happens.">
          Time Machine
        </PageTitle>

        {!user || authRequired ? (
          <SignInPrompt message="Sign in to start a run — your progress and leaderboard spot are tied to your account." />
        ) : (
          <>
            <View style={styles.startRow}>
              <StartCard
                icon="trending-up-outline"
                title="Single stock"
                summary="Pick one stock, one starting date."
                onPress={() => router.push("/simulator/new?mode=single")}
                colors={colors}
              />
              <StartCard
                icon="pie-chart-outline"
                title="Portfolio"
                summary="Build a basket of multiple stocks."
                onPress={() => router.push("/simulator/new?mode=portfolio")}
                colors={colors}
              />
            </View>

            <Pressable onPress={() => router.push("/simulator/leaderboard")} style={styles.leaderboardLink}>
              <Ionicons name="trophy-outline" size={16} color={colors.primary} />
              <Text style={[typography.caption, { color: colors.primary, fontWeight: "700" }]}>Leaderboard</Text>
            </Pressable>

            <SectionHeading title="Your runs" />
            {loading ? (
              <ActivityIndicator color={colors.primary} style={styles.loading} />
            ) : error ? (
              <ErrorState message={error} onRetry={load} />
            ) : runs.length === 0 ? (
              <Text style={[typography.caption, styles.empty, { color: colors.textMuted }]}>
                No runs yet — start one above.
              </Text>
            ) : (
              runs.map((run) => <RunRow key={run.id} run={run} colors={colors} />)
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function StartCard({
  icon,
  title,
  summary,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  summary: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.startCard,
        { backgroundColor: colors.accentSurface, borderColor: colors.accent, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.startIcon, { backgroundColor: colors.accent }]}>
        <Ionicons name={icon} size={18} color={colors.onAccent} />
      </View>
      <Text style={[typography.cardTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[typography.caption, styles.startSummary, { color: colors.textMuted }]}>{summary}</Text>
    </Pressable>
  );
}

function RunRow({ run, colors }: { run: SimulatorRun; colors: ReturnType<typeof useTheme>["colors"] }) {
  const isUp = (run.return_pct ?? 0) >= 0;
  return (
    <Pressable
      onPress={() => router.push(`/simulator/${run.id}`)}
      style={({ pressed }) => [styles.runRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[typography.cardTitle, { color: colors.text }]}>
          {run.mode === "single" ? "Single stock" : "Portfolio"} run
        </Text>
        <Text style={[typography.micro, { color: colors.textMuted }]}>
          Started {run.start_date} · now at {run.sim_date} · {run.status === "completed" ? "Completed" : "In progress"}
        </Text>
      </View>
      {run.return_pct !== null ? (
        <Text style={[typography.cardTitle, { color: isUp ? colors.positive : colors.negative }]}>
          {isUp ? "+" : ""}
          {run.return_pct.toFixed(1)}%
        </Text>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  startRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  startCard: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  startIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  startSummary: { marginTop: 3, lineHeight: 16 },
  leaderboardLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginBottom: 20 },
  loading: { marginVertical: 20 },
  empty: { textAlign: "center", paddingVertical: 20 },
  runRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 10 },
});
