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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post<T>(path: string, body: unknown): Promise<T> {
  // Render's free tier spins the pattern-engine down after ~15min idle. The
  // critical, non-obvious part: when the service is asleep, Render's edge
  // returns an *instant* 502/503 for the first request while it spins the
  // service up in the BACKGROUND — it does NOT hold the connection open for
  // the ~60s cold start. So a plain long timeout never helped: the first
  // request fails in <1s, and only a LATER request (after the background
  // wake finished) succeeds. That's exactly the "works sometimes" flapping.
  //
  // The fix is to retry on those cold failures with a backoff long enough to
  // outlast a real cold start (~50-156s observed). The first attempt
  // triggers the wake; subsequent attempts ride through it so a single user
  // request transparently waits instead of failing.
  //
  // DENYLIST, not allowlist: we retry EVERY non-success response except a
  // genuine client error (400/422 = the window itself was rejected). An
  // earlier allowlist of specific 5xx codes let a booting service slip
  // through — Render's internal service-to-service routing can return an
  // assortment of transient statuses/reset connections while the free-tier
  // engine spins up (unlike the public edge, it doesn't hold the connection
  // for the wake), and any status outside the allowlist aborted the retry
  // after ~2 tries. Retrying everything-but-bad-input is robust to whatever
  // transient status the wake happens to produce.
  const url = `${PATTERN_ENGINE_URL}${path}`;
  const opts = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const NON_RETRYABLE = new Set([400, 422]); // the input was rejected — retrying won't help
  const maxAttempts = 10;
  let lastDetail = "";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetchWithTimeout(url, opts, 30000);
      if (res.ok) return res.json() as Promise<T>;
      const text = await res.text().catch(() => "");
      if (NON_RETRYABLE.has(res.status)) {
        throw new Error(`pattern-engine ${path} rejected input: ${res.status} ${text}`);
      }
      lastDetail = `${res.status} ${text}`;
    } catch (err) {
      // Network/timeout/connection-reset — a cold-start symptom; retry it.
      // Only the bad-input error we threw just above is non-retryable.
      if (err instanceof Error && err.message.startsWith("pattern-engine")) throw err;
      lastDetail = err instanceof Error ? err.message : String(err);
    }
    // ~14s between tries × 9 gaps ≈ 125s of patience, which covers the
    // common ~50-90s cold start with margin and still returns (with
    // narration) inside the mobile client's 180s ceiling. Rare 150s+
    // outliers are handled by the launch-time warm-up ping pre-waking the
    // engine instead.
    if (attempt < maxAttempts - 1) await sleep(14000);
  }
  throw new Error(`pattern-engine ${path} unreachable after ${maxAttempts} attempts: ${lastDetail}`);
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
