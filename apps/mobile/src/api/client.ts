import type {
  ChartResponse,
  Filing,
  FundamentalsData,
  InsiderTransaction,
  StockDetail,
  StockQuote,
  StockSearchResult,
} from "@summit/shared";

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
