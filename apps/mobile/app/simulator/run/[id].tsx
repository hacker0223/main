import { useCallback, useEffect, useState } from "react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  AuthRequiredError,
  advanceSimulatorRun,
  completeSimulatorRun,
  fetchSimulatorRunState,
  tradeSimulatorRun,
  type SimulatorRunState,
} from "../../../src/api/client";
import { Button } from "../../../src/components/Button";
import { ConfirmDialog } from "../../../src/components/ConfirmDialog";
import { DateField } from "../../../src/components/DateField";
import { ErrorState } from "../../../src/components/ErrorState";
import { Screen } from "../../../src/components/Screen";
import { SectionHeading } from "../../../src/components/SectionHeading";
import { SignInPrompt } from "../../../src/components/SignInPrompt";
import { useStockSearch } from "../../../src/hooks/useStockSearch";
import { typography } from "../../../src/theme/typography";
import { useTheme } from "../../../src/theme/useTheme";

export default function SimulatorRunScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<SimulatorRunState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setError(null);
    return fetchSimulatorRunState(id)
      .then(setState)
      .catch((err: Error) => {
        if (err instanceof AuthRequiredError) setAuthRequired(true);
        else setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (action: () => Promise<SimulatorRunState>) => {
    setBusy(true);
    setError(null);
    try {
      const next = await action();
      setState(next);
    } catch (err) {
      if (err instanceof AuthRequiredError) setAuthRequired(true);
      else setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: "Run" }} />
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      </Screen>
    );
  }

  if (authRequired) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: "Run" }} />
        <SignInPrompt message="Your session needs a refresh — sign in again to keep going." />
      </Screen>
    );
  }

  if (error && !state) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: "Run" }} />
        <ErrorState message={error} onRetry={load} />
      </Screen>
    );
  }

  if (!state) return null;
  const { run, holdings, totalValue } = state;
  const returnPct = ((totalValue - run.initial_cash) / run.initial_cash) * 100;
  const isUp = returnPct >= 0;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: run.mode === "single" ? "Single-stock run" : "Portfolio run" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.summaryCard, { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}>
          <Text style={[typography.micro, { color: colors.textMuted }]}>Simulated date</Text>
          <Text style={[typography.display, { color: colors.text, fontSize: 28 }]}>{run.sim_date}</Text>
          <View style={styles.summaryRow}>
            <View>
              <Text style={[typography.micro, { color: colors.textMuted }]}>Total value</Text>
              <Text style={[typography.cardTitle, { color: colors.text }]}>${totalValue.toFixed(2)}</Text>
            </View>
            <View>
              <Text style={[typography.micro, { color: colors.textMuted }]}>Cash</Text>
              <Text style={[typography.cardTitle, { color: colors.text }]}>${run.cash.toFixed(2)}</Text>
            </View>
            <View>
              <Text style={[typography.micro, { color: colors.textMuted }]}>Return</Text>
              <Text style={[typography.cardTitle, { color: isUp ? colors.positive : colors.negative }]}>
                {isUp ? "+" : ""}
                {returnPct.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {run.status === "completed" ? (
          <View style={[styles.doneBanner, { backgroundColor: colors.surfaceRaised }]}>
            <Ionicons name="flag-outline" size={16} color={colors.textMuted} />
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              This run is complete and on the leaderboard.
            </Text>
          </View>
        ) : (
          <>
            <SectionHeading title="Fast-forward" />
            <View style={styles.ffRow}>
              {(["day", "week", "month", "year"] as const).map((unit) => (
                <Pressable
                  key={unit}
                  disabled={busy}
                  onPress={() => runAction(() => advanceSimulatorRun(run.id, { by: unit }))}
                  style={[styles.ffButton, { backgroundColor: colors.surface, borderColor: colors.border, opacity: busy ? 0.5 : 1 }]}
                >
                  <Text style={[typography.caption, { color: colors.text, fontWeight: "700" }]}>+1 {unit}</Text>
                </Pressable>
              ))}
            </View>
            <JumpToDate simDate={run.sim_date} busy={busy} onJump={(date) => runAction(() => advanceSimulatorRun(run.id, { date }))} colors={colors} />
          </>
        )}

        <SectionHeading title="Holdings" />
        {holdings.length === 0 ? (
          <Text style={[typography.caption, styles.empty, { color: colors.textMuted }]}>No positions yet.</Text>
        ) : (
          holdings.map((h) => {
            const gain = (h.currentPrice - h.avg_cost) * h.shares;
            const gainPct = ((h.currentPrice - h.avg_cost) / h.avg_cost) * 100;
            const up = gain >= 0;
            return (
              <View key={h.id} style={[styles.holdingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.cardTitle, { color: colors.text }]}>{h.symbol}</Text>
                  <Text style={[typography.micro, { color: colors.textMuted }]}>
                    {h.shares.toFixed(4)} sh @ ${h.avg_cost.toFixed(2)} avg
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[typography.cardTitle, { color: colors.text }]}>${h.marketValue.toFixed(2)}</Text>
                  <Text style={[typography.micro, { color: up ? colors.positive : colors.negative }]}>
                    {up ? "+" : ""}
                    {gainPct.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {run.status === "active" ? (
          <TradeForm runId={run.id} mode={run.mode} busy={busy} onTrade={(input) => runAction(() => tradeSimulatorRun(run.id, input))} colors={colors} />
        ) : null}

        {error ? <Text style={[typography.caption, styles.error, { color: colors.negative }]}>{error}</Text> : null}

        {run.status === "active" ? (
          <View style={styles.completeAction}>
            <Button label="End run" variant="secondary" onPress={() => setConfirmEnd(true)} disabled={busy} />
            <ConfirmDialog
              visible={confirmEnd}
              title="End this run?"
              message="This locks in your final value and adds it to the leaderboard. You can't undo this."
              confirmLabel="End run"
              onCancel={() => setConfirmEnd(false)}
              onConfirm={() => {
                setConfirmEnd(false);
                runAction(() => completeSimulatorRun(run.id));
              }}
            />
          </View>
        ) : (
          <View style={styles.completeAction}>
            <Button label="Back to Time Machine" variant="secondary" onPress={() => router.replace("/simulator")} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function JumpToDate({
  simDate,
  busy,
  onJump,
  colors,
}: {
  simDate: string;
  busy: boolean;
  onJump: (date: string) => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const [target, setTarget] = useState(simDate);
  return (
    <View style={styles.jumpRow}>
      <View style={{ flex: 1 }}>
        <DateField value={target} onChange={setTarget} />
      </View>
      <Pressable
        disabled={busy || target <= simDate}
        onPress={() => onJump(target)}
        style={[styles.jumpButton, { backgroundColor: colors.primary, opacity: busy || target <= simDate ? 0.4 : 1 }]}
      >
        <Text style={[typography.caption, { color: colors.onPrimary, fontWeight: "700" }]}>Jump</Text>
      </Pressable>
    </View>
  );
}

function TradeForm({
  runId,
  mode,
  busy,
  onTrade,
  colors,
}: {
  runId: string;
  mode: "single" | "portfolio";
  busy: boolean;
  onTrade: (input: { symbol: string; side: "buy" | "sell"; shares: number }) => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const [query, setQuery] = useState("");
  const [symbol, setSymbol] = useState<string | null>(null);
  const [sharesText, setSharesText] = useState("");
  const { results } = useStockSearch(query);

  const shares = parseFloat(sharesText);
  const canTrade = symbol !== null && Number.isFinite(shares) && shares > 0 && !busy;

  return (
    <View style={[styles.tradeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[typography.cardTitle, { color: colors.text }]}>Trade</Text>

      {symbol ? (
        <View style={styles.selectedSymbolRow}>
          <Text style={[typography.body, { color: colors.text, fontWeight: "700" }]}>{symbol}</Text>
          <Pressable onPress={() => { setSymbol(null); setQuery(""); }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={mode === "single" ? "Search for a stock" : "Search to add a stock"}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            style={[typography.body, styles.searchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}
          />
          {results.slice(0, 5).map((r) => (
            <Pressable key={r.symbol} onPress={() => { setSymbol(r.symbol); setQuery(""); }} style={styles.resultRow}>
              <Text style={[typography.caption, { color: colors.text }]}>{r.symbol}</Text>
              <Text style={[typography.micro, { color: colors.textMuted }]} numberOfLines={1}>{r.companyName}</Text>
            </Pressable>
          ))}
        </>
      )}

      <TextInput
        value={sharesText}
        onChangeText={(t) => setSharesText(t.replace(/[^0-9.]/g, ""))}
        placeholder="Shares"
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
        style={[typography.body, styles.searchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}
      />

      <View style={styles.tradeButtons}>
        <Pressable
          disabled={!canTrade}
          onPress={() => { onTrade({ symbol: symbol!, side: "buy", shares }); setSharesText(""); setSymbol(null); }}
          style={[styles.tradeButton, { backgroundColor: colors.positive, opacity: canTrade ? 1 : 0.4 }]}
        >
          <Text style={[typography.caption, { color: "#fff", fontWeight: "700" }]}>Buy</Text>
        </Pressable>
        <Pressable
          disabled={!canTrade}
          onPress={() => { onTrade({ symbol: symbol!, side: "sell", shares }); setSharesText(""); setSymbol(null); }}
          style={[styles.tradeButton, { backgroundColor: colors.negative, opacity: canTrade ? 1 : 0.4 }]}
        >
          <Text style={[typography.caption, { color: "#fff", fontWeight: "700" }]}>Sell</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  loading: { marginTop: 60 },
  summaryCard: { padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  doneBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, marginBottom: 16 },
  ffRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  ffButton: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  jumpRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginBottom: 16 },
  jumpButton: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10 },
  empty: { paddingVertical: 12 },
  holdingRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  tradeCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 20 },
  selectedSymbolRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, marginBottom: 10 },
  searchInput: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10 },
  resultRow: { paddingVertical: 8 },
  tradeButtons: { flexDirection: "row", gap: 10, marginTop: 12 },
  tradeButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  error: { marginTop: 12 },
  completeAction: { marginTop: 20 },
});
