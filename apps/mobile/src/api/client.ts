import type {
  ChartResponse,
  Filing,
  FundamentalsData,
  InsiderTransaction,
  StockDetail,
  StockQuote,
  StockSearchResult,
} from "@summit/shared";

import { supabase } from "../lib/supabase";
import { useServerStatus } from "../store/serverStatusStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

// 30s, not 10s: the backend runs on a free tier that sleeps after ~15 min
// idle and takes ~20s to cold-start. A 10s cap timed out on every first
// request against a cold server, so a new user saw errors everywhere. The
// warm-up ping (see warmUpBackend) means this long ceiling is rarely
// reached in practice; it's here so a genuine cold start SUCCEEDS instead
// of failing. A slow request means "server waking up," not "your wifi."
const GET_TIMEOUT_MS = 30_000;

// Any successful response proves the server is awake — clear the "waking
// up" banner immediately, even if the warm-up ping hasn't returned yet.
function markServerAwake() {
  useServerStatus.getState().setWarming(false);
}

async function apiGet<T>(path: string): Promise<T> {
  if (!API_URL) {
    throw new Error("Can't reach the server — app isn't configured with a backend URL.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GET_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("The server is taking longer than usual — it may be waking up. Try again in a moment.");
    }
    throw new Error("Can't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  markServerAwake();
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown, timeoutMs = 25_000): Promise<T> {
  if (!API_URL) {
    throw new Error("Can't reach the server — app isn't configured with a backend URL.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("The server is taking longer than usual — it may be waking up. Try again in a moment.");
    }
    throw new Error("Can't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const responseBody = await res.json().catch(() => ({}));
    throw new Error(responseBody.error || `Request failed: ${res.status}`);
  }
  markServerAwake();
  return res.json() as Promise<T>;
}

// Asks Supabase's own client for the live session rather than trusting our
// Zustand mirror (authStore) — the SDK owns token refresh internally and
// getSession() hands back a valid, current token (refreshing under the hood
// if needed), so this can't go stale the way a cached copy can. A prior
// version read the cached copy directly and could throw "sign in again"
// even while genuinely signed in, whenever that mirror drifted from
// Supabase's actual session for any reason.
async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) throw new AuthRequiredError("Accounts aren't set up yet.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AuthRequiredError("Sign in to use this feature.");
  return { Authorization: `Bearer ${token}` };
}

// A distinct error type (not just a message string) so screens can tell
// "you're not signed in" apart from a genuine server/network failure and
// show a calm sign-in prompt instead of a scary "couldn't load" error box.
export class AuthRequiredError extends Error {}

// Simulator routes are all authenticated — a separate pair of helpers
// rather than adding an optional-headers param to apiGet/apiPost above,
// since every other caller of those never needs auth and shouldn't have to
// think about it.
async function apiAuthGet<T>(path: string): Promise<T> {
  if (!API_URL) throw new Error("Can't reach the server — app isn't configured with a backend URL.");
  const res = await fetch(`${API_URL}${path}`, { headers: await authHeader() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body.error || `Request failed: ${res.status}`;
    throw res.status === 401 ? new AuthRequiredError(message) : new Error(message);
  }
  return res.json() as Promise<T>;
}

async function apiAuthPost<T>(path: string, body: unknown = {}): Promise<T> {
  if (!API_URL) throw new Error("Can't reach the server — app isn't configured with a backend URL.");
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const responseBody = await res.json().catch(() => ({}));
    const message = responseBody.error || `Request failed: ${res.status}`;
    throw res.status === 401 ? new AuthRequiredError(message) : new Error(message);
  }
  return res.json() as Promise<T>;
}

export function fetchStockDetail(symbol: string): Promise<StockDetail> {
  return apiGet(`/api/stocks/${encodeURIComponent(symbol)}`);
}

export function fetchChart(symbol: string, range: string): Promise<ChartResponse> {
  return apiGet(`/api/stocks/${encodeURIComponent(symbol)}/chart?range=${range}`);
}

export function searchStocks(query: string): Promise<StockSearchResult[]> {
  return apiGet(`/api/stocks/search?q=${encodeURIComponent(query)}`);
}

export function fetchQuotes(symbols: string[]): Promise<StockQuote[]> {
  return apiGet(`/api/stocks/quotes?symbols=${symbols.map(encodeURIComponent).join(",")}`);
}

// Compact recent-trend series per symbol, for the row sparklines. Keyed by
// symbol; a symbol with no data is simply absent from the map.
export function fetchSparklines(symbols: string[]): Promise<Record<string, number[]>> {
  return apiGet(`/api/stocks/sparklines?symbols=${symbols.map(encodeURIComponent).join(",")}`);
}

export interface NewsItem {
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  image: string;
}

export function fetchNews(symbol: string): Promise<NewsItem[]> {
  return apiGet(`/api/stocks/${encodeURIComponent(symbol)}/news`);
}

export function fetchFundamentals(symbol: string): Promise<FundamentalsData & { insiderTransactions: InsiderTransaction[] }> {
  return apiGet(`/api/stocks/${encodeURIComponent(symbol)}/fundamentals`);
}

export function fetchFilings(symbol: string): Promise<Filing[]> {
  return apiGet(`/api/stocks/${encodeURIComponent(symbol)}/filings`);
}

export interface ScreenerEntry {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  week52High?: number;
}

export function fetchScreener(kind: "gainers" | "losers" | "52w-highs"): Promise<ScreenerEntry[]> {
  return apiGet(`/api/stocks/screeners/${kind}`);
}

// --- Pattern Lab ---------------------------------------------------------

export interface PatternMatch {
  ticker: string;
  start_date: string;
  end_date: string;
  shape: number[];
  cosine_score: number;
  dtw_distance: number;
  outcome: { fwd_return_5d: number | null; fwd_return_10d: number | null; fwd_return_20d: number | null };
}

export interface OutcomeDistribution {
  count: number;
  up: number;
  down: number;
  flat: number;
  avg_up_return: number | null;
  avg_down_return: number | null;
  avg_flat_return?: number | null;
}

export interface AnalogsResponse {
  matches: PatternMatch[];
  distributions: Record<string, OutcomeDistribution>;
  narration: string | null;
  narrationError: string | null;
}

// 180s, not the default 25s: this proxies through the backend to a
// separate Render free-tier service whose cold-start duration has been
// measured anywhere from ~50s to ~156s. The backend's own proxy timeout is
// 170s for the same reason — this needs to outlast that, not race it. This
// is a stopgap for a free-tier limitation, not a real fix.
const PATTERN_LAB_TIMEOUT_MS = 180_000;

export function fetchAnalogs(
  closes: number[],
  volumes?: number[],
  opts?: { narrate?: boolean; timeoutMs?: number }
): Promise<AnalogsResponse> {
  return apiPost(
    "/api/pattern-lab/analogs",
    { closes, volumes, topK: 20, narrate: opts?.narrate },
    opts?.timeoutMs ?? PATTERN_LAB_TIMEOUT_MS
  );
}

export interface ClassifyHorizonResult {
  probabilities: Record<string, number>;
  backtested_accuracy: number;
}

export interface ClassifyResponse {
  horizons: Record<string, ClassifyHorizonResult>;
  insufficient_lookback_warning: boolean;
  note: string;
  narration: string | null;
  narrationError: string | null;
}

export function fetchClassification(
  closes: number[],
  volumes?: number[],
  opts?: { narrate?: boolean; timeoutMs?: number }
): Promise<ClassifyResponse> {
  return apiPost(
    "/api/pattern-lab/classify",
    { closes, volumes, narrate: opts?.narrate },
    opts?.timeoutMs ?? PATTERN_LAB_TIMEOUT_MS
  );
}

export interface DevilsAdvocateResponse {
  yourThesis: string;
  devilsAdvocate: string;
}

export function fetchDevilsAdvocate(
  chartDescription: string,
  userThesis: string
): Promise<DevilsAdvocateResponse> {
  return apiPost("/api/pattern-lab/devils-advocate", { chartDescription, userThesis });
}

// --- Opt-in AI summaries -------------------------------------------------
// Both mirror Pattern Lab's "narrate the already-computed numbers, don't
// invent new ones" pattern, but as their own explicit "Summarize" buttons
// rather than auto-firing, matching the app's cost-conscious default.

export interface InsightsSummaryRequest {
  riskScore: number;
  volatilityWeight: number;
  betaWeight: number;
  valuationWeight: number;
  annualizedVolatilityPct: number;
  rangeLow: number;
  rangeCurrent: number;
  rangeHigh: number;
}

export function fetchInsightsSummary(symbol: string, body: InsightsSummaryRequest): Promise<{ summary: string }> {
  return apiPost(`/api/stocks/${encodeURIComponent(symbol)}/insights-summary`, body);
}

export function fetchNewsSummary(symbol: string): Promise<{ summary: string }> {
  return apiGet(`/api/stocks/${encodeURIComponent(symbol)}/news-summary`);
}

// --- Historical Simulator -------------------------------------------------
// All authenticated; the server is the sole source of truth for prices,
// trades, and valuations (see apps/api/src/services/simulatorEngine.ts) —
// the client only ever sends intent ("buy 10 shares", "advance a month"),
// never a price or a result.

export type SimulatorMode = "single" | "portfolio" | "generated";

export interface SimulatorRun {
  id: string;
  user_id: string;
  mode: SimulatorMode;
  start_date: string;
  sim_date: string;
  initial_cash: number;
  cash: number;
  status: "active" | "completed";
  final_value: number | null;
  return_pct: number | null;
  seed: number | null;
  created_at: string;
  updated_at: string;
}

export interface SimulatorHolding {
  id: string;
  run_id: string;
  symbol: string;
  shares: number;
  avg_cost: number;
  currentPrice: number;
  marketValue: number;
}

export interface SimulatorRunState {
  run: SimulatorRun;
  holdings: SimulatorHolding[];
  totalValue: number;
}

export function fetchSimulatorRuns(): Promise<SimulatorRun[]> {
  return apiAuthGet("/api/simulator/runs");
}

export function createSimulatorRun(
  input:
    | { mode: "single" | "portfolio"; startDate: string; initialCash: number }
    | { mode: "generated" }
): Promise<SimulatorRun> {
  return apiAuthPost("/api/simulator/runs", input);
}

export function fetchSimulatorRunState(runId: string): Promise<SimulatorRunState> {
  return apiAuthGet(`/api/simulator/runs/${encodeURIComponent(runId)}`);
}

export function tradeSimulatorRun(
  runId: string,
  input: { symbol: string; side: "buy" | "sell"; shares: number }
): Promise<SimulatorRunState> {
  return apiAuthPost(`/api/simulator/runs/${encodeURIComponent(runId)}/trade`, input);
}

export function advanceSimulatorRun(
  runId: string,
  target: { by: "day" | "week" | "month" | "year" } | { date: string }
): Promise<SimulatorRunState> {
  return apiAuthPost(`/api/simulator/runs/${encodeURIComponent(runId)}/advance`, target);
}

export function completeSimulatorRun(runId: string): Promise<SimulatorRunState> {
  return apiAuthPost(`/api/simulator/runs/${encodeURIComponent(runId)}/complete`);
}

// Quit without recording a result — the run is deleted and never reaches
// the Hall of Fame, unlike completeSimulatorRun.
export async function abandonSimulatorRun(runId: string): Promise<void> {
  if (!API_URL) throw new Error("Can't reach the server — app isn't configured with a backend URL.");
  const res = await fetch(`${API_URL}/api/simulator/runs/${encodeURIComponent(runId)}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body.error || `Request failed: ${res.status}`;
    throw res.status === 401 ? new AuthRequiredError(message) : new Error(message);
  }
}

export interface SimulatorLeaderboardEntry {
  id: string;
  mode: SimulatorMode;
  start_date: string;
  return_pct: number;
  final_value: number;
  isYou: boolean;
}

export interface SimulatorHallOfFame {
  single: SimulatorLeaderboardEntry[];
  portfolio: SimulatorLeaderboardEntry[];
  generated: SimulatorLeaderboardEntry[];
}

// /leaderboard (without /sections) is frozen on its original flat-array
// shape for older installed builds — this app wants the sectioned view.
export function fetchSimulatorLeaderboard(): Promise<SimulatorHallOfFame> {
  return apiAuthGet("/api/simulator/leaderboard/sections");
}

// --- Generated (fictional) market -----------------------------------------
// Everything below describes an invented market: the companies, the prices,
// and the headlines are all generated and have no connection to real
// securities. The server only ever returns days the player has reached.

export interface GeneratedCompany {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePct: number | null;
}

export interface GeneratedEvent {
  day: number;
  headline: string;
  detail: string;
  affects: string[];
  impact: number;
  scope: "company" | "sector" | "market";
}

export interface GeneratedWorldView {
  day: number;
  totalDays: number;
  companies: GeneratedCompany[];
  events: GeneratedEvent[];
}

export function fetchSimulatorWorld(runId: string): Promise<GeneratedWorldView> {
  return apiAuthGet(`/api/simulator/runs/${encodeURIComponent(runId)}/world`);
}

// --- Account deletion -------------------------------------------------
// Apple Guideline 5.1.1(v): account creation requires in-app account
// deletion, not just sign-out or deactivation. This calls the backend
// (the anon key this app holds can't delete an auth.users row — that
// needs the service-role key), which also cascades every simulator run,
// holding, and transaction tied to the account.
export async function deleteAccount(): Promise<void> {
  if (!API_URL) throw new Error("Can't reach the server — app isn't configured with a backend URL.");
  const res = await fetch(`${API_URL}/api/account`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body.error || `Request failed: ${res.status}`;
    throw res.status === 401 ? new AuthRequiredError(message) : new Error(message);
  }
}
