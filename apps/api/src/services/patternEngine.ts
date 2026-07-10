import { fetchWithTimeout, UpstreamTimeoutError } from "./errors";

// Proxies to the Python pattern-engine service (apps/pattern-engine) — same
// role as this file's siblings proxying to Finnhub/Yahoo/SEC, just for an
// in-house service instead of a third party. This file never touches the
// Anthropic API; it only forwards computed numbers (matches, probabilities)
// which the narration layer (anthropic.ts) later turns into text.
//
// The fallback here is the actual deployed pattern-engine URL, not
// localhost — render.yaml marks PATTERN_ENGINE_URL as sync: false (a
// manual dashboard step), which was never actually set on the live
// summit-api service. That silently fell through to localhost:8000 (dead
// on Render, nothing listens there), failing every pattern-lab request
// instantly. Local dev overrides this via apps/api/.env, so it's
// unaffected by this fallback changing.
const PATTERN_ENGINE_URL = process.env.PATTERN_ENGINE_URL || "https://summit-pattern-engine.onrender.com";

export interface WindowQuery {
  closes: number[];
  volumes?: number[];
  topK?: number;
}

export interface MatchResult {
  ticker: string;
  start_date: string;
  end_date: string;
  shape: number[];
  cosine_score: number;
  dtw_distance: number;
  outcome: { fwd_return_5d: number | null; fwd_return_10d: number | null; fwd_return_20d: number | null };
}

export interface MatchResponse {
  matches: MatchResult[];
  distributions: Record<string, { count: number; up: number; down: number; flat: number; avg_up_return: number | null; avg_down_return: number | null; avg_flat_return?: number | null }>;
}

export interface ClassifyResponse {
  horizons: Record<string, { probabilities: Record<string, number>; backtested_accuracy: number }>;
  insufficient_lookback_warning: boolean;
  note: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  // Render's free tier spins the pattern-engine service down after ~15min
  // idle. Cold-start duration measured directly against this service has
  // been anywhere from ~50s to ~156s — 90s was cutting off real, still-
  // succeeding requests. This is a stopgap, not a real fix: the actual fix
  // is either upgrading the pattern-engine instance so it never spins down,
  // or accepting that a cold visitor sometimes waits a while. 170s gives
  // real margin above the worst cold start measured so far, while staying
  // under the mobile client's own 180s timeout for this call.
  const res = await fetchWithTimeout(
    `${PATTERN_ENGINE_URL}${path}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    170000
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`pattern-engine ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function getMatches(query: WindowQuery): Promise<MatchResponse> {
  return post<MatchResponse>("/match", {
    closes: query.closes,
    volumes: query.volumes,
    top_k: query.topK ?? 20,
  });
}

export async function getClassification(query: WindowQuery): Promise<ClassifyResponse> {
  return post<ClassifyResponse>("/classify", {
    closes: query.closes,
    volumes: query.volumes,
  });
}

export { UpstreamTimeoutError };
