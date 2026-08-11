import { closeOnOrBefore, getHistoricalDaily } from "./chart";
import { supabaseAdmin } from "./supabaseAdmin";
import { NotFoundError } from "./errors";

export class SimulatorError extends Error {}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function admin() {
  if (!supabaseAdmin) throw new Error("Simulator database isn't configured on this server.");
  return supabaseAdmin;
}

interface RunRow {
  id: string;
  user_id: string;
  mode: "single" | "portfolio";
  start_date: string;
  sim_date: string;
  initial_cash: number;
  cash: number;
  status: "active" | "completed";
  final_value: number | null;
  return_pct: number | null;
}

interface HoldingRow {
  id: string;
  run_id: string;
  symbol: string;
  shares: number;
  avg_cost: number;
}

// Every mutating function below takes userId and re-checks run.user_id
// itself rather than trusting a route-level check — this is the actual
// authorization boundary (RLS can't help here since these calls all use
// the service-role key, which bypasses RLS by design).
async function fetchOwnedRun(userId: string, runId: string): Promise<RunRow> {
  const { data, error } = await admin().from("simulator_runs").select("*").eq("id", runId).single();
  if (error || !data) throw new NotFoundError("Run not found.");
  if (data.user_id !== userId) throw new NotFoundError("Run not found.");
  return data as RunRow;
}

export async function createRun(
  userId: string,
  input: { mode: "single" | "portfolio"; startDate: string; initialCash: number }
): Promise<RunRow> {
  if (input.startDate > today()) throw new SimulatorError("Start date can't be in the future.");
  if (input.initialCash <= 0) throw new SimulatorError("Starting cash must be greater than zero.");

  const { data, error } = await admin()
    .from("simulator_runs")
    .insert({
      user_id: userId,
      mode: input.mode,
      start_date: input.startDate,
      sim_date: input.startDate,
      initial_cash: input.initialCash,
      cash: input.initialCash,
    })
    .select()
    .single();
  if (error || !data) throw new Error(`Failed to create run: ${error?.message}`);
  return data as RunRow;
}

async function priceOnSimDate(symbol: string, run: RunRow): Promise<number> {
  const series = await getHistoricalDaily(symbol, run.start_date);
  const hit = closeOnOrBefore(series, run.sim_date);
  if (!hit) throw new SimulatorError(`No trading data for ${symbol} at this point in the run.`);
  return hit.close;
}

export interface RunState {
  run: RunRow;
  holdings: (HoldingRow & { currentPrice: number; marketValue: number })[];
  totalValue: number;
}

export async function getRunState(userId: string, runId: string): Promise<RunState> {
  const run = await fetchOwnedRun(userId, runId);
  const { data: holdingRows, error } = await admin().from("simulator_holdings").select("*").eq("run_id", runId);
  if (error) throw new Error(`Failed to load holdings: ${error.message}`);

  const holdings = await Promise.all(
    ((holdingRows ?? []) as HoldingRow[]).map(async (h) => {
      const currentPrice = await priceOnSimDate(h.symbol, run);
      return { ...h, currentPrice, marketValue: currentPrice * h.shares };
    })
  );

  const totalValue = run.cash + holdings.reduce((sum, h) => sum + h.marketValue, 0);
  return { run, holdings, totalValue };
}

export async function executeTrade(
  userId: string,
  runId: string,
  input: { symbol: string; side: "buy" | "sell"; shares: number }
): Promise<RunState> {
  if (input.shares <= 0) throw new SimulatorError("Shares must be greater than zero.");
  const symbol = input.symbol.toUpperCase();

  const run = await fetchOwnedRun(userId, runId);
  if (run.status !== "active") throw new SimulatorError("This run has already ended.");
  if (run.mode === "single") {
    const { data: existing } = await admin().from("simulator_holdings").select("symbol").eq("run_id", runId);
    const symbols = new Set((existing ?? []).map((h: { symbol: string }) => h.symbol));
    if (input.side === "buy" && symbols.size > 0 && !symbols.has(symbol)) {
      throw new SimulatorError("This is a single-stock run — sell your current position before buying a different one.");
    }
  }

  const price = await priceOnSimDate(symbol, run);
  const db = admin();

  if (input.side === "buy") {
    const cost = price * input.shares;
    if (cost > run.cash) throw new SimulatorError("Not enough cash for this trade.");

    const { data: existing } = await db.from("simulator_holdings").select("*").eq("run_id", runId).eq("symbol", symbol).maybeSingle();
    if (existing) {
      const existingHolding = existing as HoldingRow;
      const newShares = existingHolding.shares + input.shares;
      const newAvgCost = (existingHolding.shares * existingHolding.avg_cost + cost) / newShares;
      const { error } = await db
        .from("simulator_holdings")
        .update({ shares: newShares, avg_cost: newAvgCost })
        .eq("id", existingHolding.id);
      if (error) throw new Error(`Failed to update holding: ${error.message}`);
    } else {
      const { error } = await db
        .from("simulator_holdings")
        .insert({ run_id: runId, symbol, shares: input.shares, avg_cost: price });
      if (error) throw new Error(`Failed to open holding: ${error.message}`);
    }

    const { error: cashError } = await db.from("simulator_runs").update({ cash: run.cash - cost, updated_at: new Date().toISOString() }).eq("id", runId);
    if (cashError) throw new Error(`Failed to update cash: ${cashError.message}`);
  } else {
    const { data: existing } = await db.from("simulator_holdings").select("*").eq("run_id", runId).eq("symbol", symbol).maybeSingle();
    const existingHolding = existing as HoldingRow | null;
    if (!existingHolding || existingHolding.shares < input.shares) {
      throw new SimulatorError("You don't own enough shares to sell that many.");
    }

    const proceeds = price * input.shares;
    const remainingShares = existingHolding.shares - input.shares;
    if (remainingShares === 0) {
      const { error } = await db.from("simulator_holdings").delete().eq("id", existingHolding.id);
      if (error) throw new Error(`Failed to close holding: ${error.message}`);
    } else {
      const { error } = await db.from("simulator_holdings").update({ shares: remainingShares }).eq("id", existingHolding.id);
      if (error) throw new Error(`Failed to update holding: ${error.message}`);
    }

    const { error: cashError } = await db.from("simulator_runs").update({ cash: run.cash + proceeds, updated_at: new Date().toISOString() }).eq("id", runId);
    if (cashError) throw new Error(`Failed to update cash: ${cashError.message}`);
  }

  const { error: txError } = await db
    .from("simulator_transactions")
    .insert({ run_id: runId, symbol, side: input.side, shares: input.shares, price, sim_date: run.sim_date });
  if (txError) throw new Error(`Failed to record transaction: ${txError.message}`);

  return getRunState(userId, runId);
}

export type AdvanceTarget = "day" | "week" | "month" | "year" | { date: string };

function computeNextSimDate(from: string, target: AdvanceTarget): string {
  const d = new Date(`${from}T00:00:00Z`);
  if (typeof target === "object") return target.date;
  if (target === "day") d.setUTCDate(d.getUTCDate() + 1);
  else if (target === "week") d.setUTCDate(d.getUTCDate() + 7);
  else if (target === "month") d.setUTCMonth(d.getUTCMonth() + 1);
  else if (target === "year") d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export async function advanceRun(userId: string, runId: string, target: AdvanceTarget): Promise<RunState> {
  const run = await fetchOwnedRun(userId, runId);
  if (run.status !== "active") throw new SimulatorError("This run has already ended.");

  let nextDate = computeNextSimDate(run.sim_date, target);
  const cap = today();
  if (nextDate > cap) nextDate = cap;
  if (nextDate < run.sim_date) throw new SimulatorError("Can't move a run backward in time.");

  const { error } = await admin()
    .from("simulator_runs")
    .update({ sim_date: nextDate, updated_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw new Error(`Failed to advance run: ${error.message}`);

  return getRunState(userId, runId);
}

export async function completeRun(userId: string, runId: string): Promise<RunState> {
  const state = await getRunState(userId, runId);
  if (state.run.status !== "active") throw new SimulatorError("This run has already ended.");

  const returnPct = ((state.totalValue - state.run.initial_cash) / state.run.initial_cash) * 100;
  const { error } = await admin()
    .from("simulator_runs")
    .update({ status: "completed", final_value: state.totalValue, return_pct: returnPct, updated_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw new Error(`Failed to complete run: ${error.message}`);

  return getRunState(userId, runId);
}

export async function listRuns(userId: string): Promise<RunRow[]> {
  const { data, error } = await admin().from("simulator_runs").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list runs: ${error.message}`);
  return (data ?? []) as RunRow[];
}

export interface LeaderboardEntry {
  id: string;
  mode: "single" | "portfolio";
  start_date: string;
  return_pct: number;
  final_value: number;
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const { data, error } = await admin()
    .from("simulator_runs")
    .select("id, mode, start_date, return_pct, final_value")
    .eq("status", "completed")
    .order("return_pct", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load leaderboard: ${error.message}`);
  return (data ?? []) as LeaderboardEntry[];
}
