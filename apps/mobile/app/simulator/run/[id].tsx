import { useCallback, useEffect, useState } from "react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  AuthRequiredError,
  abandonSimulatorRun,
  advanceSimulatorRun,
  completeSimulatorRun,
  fetchSimulatorRunState,
  fetchSimulatorWorld,
  tradeSimulatorRun,
  type GeneratedCompany,
  type GeneratedEvent,
  type GeneratedWorldView,
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
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [world, setWorld] = useState<GeneratedWorldView | null>(null);

  const isGenerated = state?.run.mode === "generated";

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

  // The fictional market is re-fetched whenever the run's day changes rather
  // than cached client-side: the server only ever reveals days the player has
  // actually reached, so the newly unlocked prices and headlines can only
  // come from a fresh request.
  useEffect(() => {
    if (!id || !isGenerated) return;
    let cancelled = false;
    fetchSimulatorWorld(id)
      .then((w) => {
        if (!cancelled) setWorld(w);
      })
      .catch(() => {
        /* the run itself already surfaces errors; a missing world just hides the market panels */
      });
    return () => {
      cancelled = true;
    };
  }, [id, isGenerated, state?.run.sim_date]);

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
      <Stack.Screen
        options={{
          headerShown: true,
          title:
            run.mode === "single" ? "Single-stock run" : run.mode === "portfolio" ? "Portfolio run" : "Generated market",
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {isGenerated ? (
          <View style={[styles.fictionBanner, { backgroundColor: colors.surfaceRaised }]}>
            <Ionicons name="planet-outline" size={14} color={colors.textMuted} />
            <Text style={[typography.micro, { color: colors.textMuted, flex: 1 }]}>
              Fictional market — every company, price, and headline here is invented.
            </Text>
          </View>
        ) : null}

        <View style={[styles.summaryCard, { backgroundColor: colors.accentSurface, borderColor: colors.accent }]}>
          <Text style={[typography.micro, { color: colors.textMuted }]}>
            {isGenerated ? "Trading day" : "Simulated date"}
          </Text>
          <Text style={[typography.display, { color: colors.text, fontSize: 28 }]}>
            {isGenerated && world ? `Day ${world.day} of ${world.totalDays}` : run.sim_date}
          </Text>
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
        ) : isGenerated ? (
          <>
            <SectionHeading title="Advance" />
            <Pressable
              disabled={busy || (world ? world.day >= world.totalDays : true)}
              onPress={() => runAction(() => advanceSimulatorRun(run.id, { by: "day" }))}
              style={[
                styles.nextDayButton,
                {
                  backgroundColor: colors.primary,
                  opacity: busy || (world ? world.day >= world.totalDays : true) ? 0.4 : 1,
                },
              ]}
            >
              <Ionicons name="play-forward" size={15} color={colors.onPrimary} />
              <Text style={[typography.body, { color: colors.onPrimary, fontWeight: "700" }]}>
                {world && world.day >= world.totalDays ? "Final day reached — end your run" : "Next day"}
              </Text>
            </Pressable>
          </>
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

        {isGenerated && world ? <NewsFeed events={world.events} colors={colors} /> : null}
        {isGenerated && world ? <MarketList companies={world.companies} colors={colors} /> : null}

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
          <TradeForm
            mode={run.mode}
            busy={busy}
            companies={world?.companies ?? null}
            onTrade={(input) => runAction(() => tradeSimulatorRun(run.id, input))}
            colors={colors}
          />
        ) : null}

        {error ? <Text style={[typography.caption, styles.error, { color: colors.negative }]}>{error}</Text> : null}

        {run.status === "active" ? (
          <View style={styles.completeAction}>
            <Button label="End run & record result" onPress={() => setConfirmEnd(true)} disabled={busy} />
            <Pressable
              onPress={() => setConfirmQuit(true)}
              disabled={busy}
              hitSlop={8}
              style={styles.quitLink}
            >
              <Text style={[typography.caption, { color: colors.negative, fontWeight: "600" }]}>
                Quit without saving
              </Text>
            </Pressable>

            <ConfirmDialog
              visible={confirmEnd}
              title="End this run?"
              message="This locks in your final value and adds it to the Hall of Fame. You can't undo this."
              confirmLabel="End run"
              onCancel={() => setConfirmEnd(false)}
              onConfirm={() => {
                setConfirmEnd(false);
                runAction(() => completeSimulatorRun(run.id));
              }}
            />
            <ConfirmDialog
              visible={confirmQuit}
              title="Quit this run?"
              message="The run is deleted and nothing is recorded — it won't appear on the Hall of Fame or in your runs. You can't undo this."
              confirmLabel="Quit run"
              onCancel={() => setConfirmQuit(false)}
              onConfirm={async () => {
                setConfirmQuit(false);
                setBusy(true);
                try {
                  await abandonSimulatorRun(run.id);
                  router.replace("/simulator");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Couldn't quit the run.");
                  setBusy(false);
                }
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

// A generated market has a fixed, known list of 20 companies, so there's
// nothing to search — the picker filters that list locally. Real-market
// modes keep hitting the live search endpoint.
function NewsFeed({ events, colors }: { events: GeneratedEvent[]; colors: ReturnType<typeof useTheme>["colors"] }) {
  if (events.length === 0) return null;
  return (
    <>
      <SectionHeading title="Market news" />
      {events.slice(0, 8).map((e, i) => {
        const up = e.impact >= 0;
        return (
          <View key={`${e.day}-${i}`} style={[styles.newsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.newsHeader}>
              <Text style={[typography.micro, { color: colors.textMuted }]}>
                Day {e.day} · {e.scope === "market" ? "Market-wide" : e.scope === "sector" ? "Sector" : "Company"}
              </Text>
              <Text style={[typography.micro, { color: up ? colors.positive : colors.negative, fontWeight: "700" }]}>
                {up ? "+" : ""}
                {(e.impact * 100).toFixed(1)}%
              </Text>
            </View>
            <Text style={[typography.cardTitle, { color: colors.text }]}>{e.headline}</Text>
            <Text style={[typography.micro, styles.newsDetail, { color: colors.textMuted }]}>{e.detail}</Text>
          </View>
        );
      })}
    </>
  );
}

function MarketList({ companies, colors }: { companies: GeneratedCompany[]; colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <>
      <SectionHeading title="The market" />
      {companies.map((c) => {
        const up = (c.changePct ?? 0) >= 0;
        return (
          <View key={c.symbol} style={[styles.marketRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.cardTitle, { color: colors.text }]}>
                {c.symbol} <Text style={[typography.micro, { color: colors.textMuted }]}>{c.sector}</Text>
              </Text>
              <Text style={[typography.micro, { color: colors.textMuted }]} numberOfLines={1}>
                {c.name}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[typography.cardTitle, { color: colors.text }]}>${c.price.toFixed(2)}</Text>
              {c.changePct !== null ? (
                <Text style={[typography.micro, { color: up ? colors.positive : colors.negative }]}>
                  {up ? "+" : ""}
                  {c.changePct.toFixed(1)}%
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </>
  );
}

function TradeForm({
  mode,
  busy,
  companies,
  onTrade,
  colors,
}: {
  mode: "single" | "portfolio" | "generated";
  busy: boolean;
  companies: GeneratedCompany[] | null;
  onTrade: (input: { symbol: string; side: "buy" | "sell"; shares: number }) => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const [query, setQuery] = useState("");
  const [symbol, setSymbol] = useState<string | null>(null);
  const [sharesText, setSharesText] = useState("");
  const isGenerated = mode === "generated";
  const { results: searchResults } = useStockSearch(isGenerated ? "" : query);

  const results = isGenerated
    ? (companies ?? [])
        .filter((c) => {
          const q = query.trim().toUpperCase();
          return q.length === 0 || c.symbol.includes(q) || c.name.toUpperCase().includes(q);
        })
        .map((c) => ({ symbol: c.symbol, companyName: c.name }))
    : searchResults.map((r) => ({ symbol: r.symbol, companyName: r.companyName }));

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
            placeholder={
              isGenerated ? "Filter the 20 listed companies" : mode === "single" ? "Search for a stock" : "Search to add a stock"
            }
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            style={[typography.body, styles.searchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}
          />
          {results.slice(0, isGenerated ? 6 : 5).map((r) => (
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
  fictionBanner: { flexDirection: "row", alignItems: "center", gap: 7, padding: 10, borderRadius: 10, marginBottom: 12 },
  nextDayButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 8 },
  newsRow: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  newsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  newsDetail: { marginTop: 4, lineHeight: 16 },
  marketRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 6, gap: 10 },
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
  quitLink: { alignSelf: "center", marginTop: 14, paddingVertical: 6 },
});
