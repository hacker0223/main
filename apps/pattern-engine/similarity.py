"""
Similarity search: cosine first-pass, DTW re-rank, de-duplicated selection.

Cosine similarity over the raw normalized-shape vectors is O(n) per
candidate and is used to narrow tens of thousands of historical windows
down to a manageable shortlist (COSINE_SHORTLIST_SIZE). Banded DTW is
O(window_len * band_radius) per pair — cheap on a shortlist, too slow to
run against every historical window on every user query. This two-stage
design is why DTW is usable here at all.

De-duplication happens INSIDE match selection, not as a post-hoc filter on
the final top-k: overlapping windows mean a single real historical move
gets sliced into many nearly-identical day-shifted windows, all of which
would otherwise rank near the top together. If we picked the naive top-20
and deduplicated afterward, we could end up with far fewer than 20 genuine
matches. Instead, selection walks the DTW-ranked candidates in order and
greedily skips any candidate that falls within MIN_TICKER_GAP_DAYS of an
already-accepted match from the same ticker.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from features import Window, WindowOutcome

COSINE_SHORTLIST_SIZE = 100
DEFAULT_TOP_K = 20
DTW_BAND_RADIUS = 5
MIN_TICKER_GAP_DAYS = 15  # candidate matches from the same ticker must be at least this far apart


@dataclass
class WindowDataset:
    """Compact columnar form of the historical windows, loaded once at
    startup from the precomputed data/windows_v1.npz. This is what keeps the
    match path off the ~300MB+ Python-object representation that used to
    OOM-kill the worker: shapes are one contiguous float32 matrix, not
    230k dataclass instances each holding a Python float list.
    """

    shapes: np.ndarray  # (N, window_len) float32
    shape_norms: np.ndarray  # (N,) float32 — precomputed once for cosine
    fwd: np.ndarray  # (N, 3) float32 — [5d, 10d, 20d], NaN where absent
    end_idx: np.ndarray  # (N,) int32
    tickers: np.ndarray  # (N,) str
    start_dates: np.ndarray  # (N,) str
    end_dates: np.ndarray  # (N,) str

    @property
    def size(self) -> int:
        return int(self.shapes.shape[0])


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def dtw_distance(a: np.ndarray, b: np.ndarray, band_radius: int = DTW_BAND_RADIUS) -> float:
    """Sakoe-Chiba banded DTW distance. The band constrains how far the
    alignment can warp (|i - j| <= band_radius); without it, DTW can
    produce pathologically stretched alignments that score two genuinely
    different shapes as similar just by warping through outlier points.
    """
    n, m = len(a), len(b)
    inf = float("inf")
    # (n+1) x (m+1) cost matrix, first row/col = inf except [0][0] = 0.
    d = np.full((n + 1, m + 1), inf)
    d[0, 0] = 0.0

    for i in range(1, n + 1):
        j_lo = max(1, i - band_radius)
        j_hi = min(m, i + band_radius)
        for j in range(j_lo, j_hi + 1):
            cost = abs(a[i - 1] - b[j - 1])
            d[i, j] = cost + min(d[i - 1, j], d[i, j - 1], d[i - 1, j - 1])

    return float(d[n, m])


@dataclass
class Match:
    window: Window
    outcome: WindowOutcome
    cosine_score: float
    dtw_distance: float


def find_matches(
    query_shape: list[float],
    candidates: list[tuple[Window, WindowOutcome]],
    top_k: int = DEFAULT_TOP_K,
    cosine_shortlist_size: int = COSINE_SHORTLIST_SIZE,
    band_radius: int = DTW_BAND_RADIUS,
    min_ticker_gap_days: int = MIN_TICKER_GAP_DAYS,
) -> list[Match]:
    query = np.array(query_shape)

    # Stage 1: cosine first pass over every candidate (fast, O(n) each).
    scored = []
    for w, outcome in candidates:
        if outcome is None:
            continue
        score = cosine_similarity(query, np.array(w.shape))
        scored.append((score, w, outcome))
    scored.sort(key=lambda t: t[0], reverse=True)
    shortlist = scored[:cosine_shortlist_size]

    # Stage 2: banded DTW re-rank, only over the shortlist.
    reranked = []
    for cosine_score, w, outcome in shortlist:
        dist = dtw_distance(query, np.array(w.shape), band_radius=band_radius)
        reranked.append(Match(window=w, outcome=outcome, cosine_score=cosine_score, dtw_distance=dist))
    reranked.sort(key=lambda m: m.dtw_distance)

    # Stage 3: greedy de-duplicated selection. Candidates arrive in
    # DTW-rank order, not chronological order, so a ticker's accepted
    # matches can end up non-monotonic in end_idx — checking only the most
    # recently accepted match (rather than all of them) would let a new
    # candidate slip in right next to an EARLIER accepted match as soon as
    # a later, unrelated one got accepted in between. Track every accepted
    # end_idx per ticker and check distance against all of them.
    selected: list[Match] = []
    accepted_ends_by_ticker: dict[str, list[int]] = {}
    for m in reranked:
        accepted_ends = accepted_ends_by_ticker.get(m.window.ticker, [])
        if any(abs(m.window.end_idx - e) < min_ticker_gap_days for e in accepted_ends):
            continue
        selected.append(m)
        accepted_ends_by_ticker.setdefault(m.window.ticker, []).append(m.window.end_idx)
        if len(selected) >= top_k:
            break

    return selected


def find_matches_compact(
    query_shape: list[float],
    dataset: WindowDataset,
    top_k: int = DEFAULT_TOP_K,
    cosine_shortlist_size: int = COSINE_SHORTLIST_SIZE,
    band_radius: int = DTW_BAND_RADIUS,
    min_ticker_gap_days: int = MIN_TICKER_GAP_DAYS,
) -> list[Match]:
    """Same three-stage cosine -> DTW -> dedup pipeline as find_matches, but
    operating on the compact columnar WindowDataset instead of a list of
    Window objects. Stage 1's cosine pass is a single vectorized matmul over
    the whole shapes matrix (milliseconds), and Match/Window objects are only
    ever materialized for the ~100-window shortlist, never for all ~230k
    windows — that's the whole point, memory-wise. Behavior is otherwise
    identical to find_matches.
    """
    q = np.asarray(query_shape, dtype=np.float32)
    q_norm = float(np.linalg.norm(q))
    if q_norm == 0 or dataset.size == 0:
        return []

    # Stage 1: vectorized cosine over every window at once.
    dots = dataset.shapes @ q  # (N,)
    denom = dataset.shape_norms * q_norm
    with np.errstate(divide="ignore", invalid="ignore"):
        cos = np.where(denom > 0, dots / denom, 0.0)

    shortlist_n = min(cosine_shortlist_size, cos.shape[0])
    # argpartition is O(N) vs a full O(N log N) sort — we only need the top
    # `shortlist_n`, not a fully ordered list of 230k scores.
    top_idx = np.argpartition(-cos, shortlist_n - 1)[:shortlist_n]

    # Stage 2: banded DTW re-rank, only over the shortlist. Materialize
    # Window/Match objects here (and only here).
    reranked: list[Match] = []
    for i in top_idx:
        shape_i = dataset.shapes[i]
        dist = dtw_distance(q, shape_i, band_radius=band_radius)
        fwd = dataset.fwd[i]
        outcome = WindowOutcome(
            fwd_return_5d=None if np.isnan(fwd[0]) else float(fwd[0]),
            fwd_return_10d=None if np.isnan(fwd[1]) else float(fwd[1]),
            fwd_return_20d=None if np.isnan(fwd[2]) else float(fwd[2]),
        )
        window = Window(
            ticker=str(dataset.tickers[i]),
            start_idx=0,  # not stored — never read on the match path
            end_idx=int(dataset.end_idx[i]),
            start_date=str(dataset.start_dates[i]),
            end_date=str(dataset.end_dates[i]),
            shape=[float(v) for v in shape_i],
        )
        reranked.append(
            Match(window=window, outcome=outcome, cosine_score=float(cos[i]), dtw_distance=dist)
        )
    reranked.sort(key=lambda m: m.dtw_distance)

    # Stage 3: greedy de-duplicated selection (identical to find_matches).
    selected: list[Match] = []
    accepted_ends_by_ticker: dict[str, list[int]] = {}
    for m in reranked:
        accepted_ends = accepted_ends_by_ticker.get(m.window.ticker, [])
        if any(abs(m.window.end_idx - e) < min_ticker_gap_days for e in accepted_ends):
            continue
        selected.append(m)
        accepted_ends_by_ticker.setdefault(m.window.ticker, []).append(m.window.end_idx)
        if len(selected) >= top_k:
            break

    return selected


def outcome_distribution(matches: list[Match], horizon: int) -> dict:
    """Real, computed distribution from the matched windows' actual forward
    outcomes — this is what gets handed to the AI narration layer as facts,
    never something the model computes or states itself.
    """
    rets = []
    for m in matches:
        r = {5: m.outcome.fwd_return_5d, 10: m.outcome.fwd_return_10d, 20: m.outcome.fwd_return_20d}[horizon]
        if r is not None:
            rets.append(r)

    if not rets:
        return {"count": 0, "up": 0, "down": 0, "flat": 0, "avg_up_return": None, "avg_down_return": None}

    up = [r for r in rets if r > 0.01]
    down = [r for r in rets if r < -0.01]
    flat = [r for r in rets if -0.01 <= r <= 0.01]

    return {
        "count": len(rets),
        "up": len(up),
        "down": len(down),
        "flat": len(flat),
        "avg_up_return": float(np.mean(up)) if up else None,
        "avg_down_return": float(np.mean(down)) if down else None,
        "avg_flat_return": float(np.mean(flat)) if flat else None,
    }
