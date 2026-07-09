import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from features import Window, WindowOutcome, compute_indicators, slice_windows, WINDOW_LEN_DEFAULT
from similarity import cosine_similarity, dtw_distance, find_matches, outcome_distribution


def test_dtw_identical_sequences_is_zero():
    a = np.array([0.0, 0.01, 0.02, 0.015, 0.03])
    assert dtw_distance(a, a) == 0.0
    print("test_dtw_identical_sequences_is_zero: PASS")


def test_dtw_distinguishes_shapes():
    uptrend = np.array([0.0, 0.02, 0.04, 0.06, 0.08])
    downtrend = np.array([0.0, -0.02, -0.04, -0.06, -0.08])
    flat = np.array([0.0, 0.001, -0.001, 0.0005, 0.0])
    # A near-identical uptrend should be much closer than the downtrend.
    near_uptrend = np.array([0.0, 0.021, 0.039, 0.062, 0.079])
    assert dtw_distance(uptrend, near_uptrend) < dtw_distance(uptrend, downtrend)
    assert dtw_distance(uptrend, near_uptrend) < dtw_distance(uptrend, flat)
    print("test_dtw_distinguishes_shapes: PASS")


def test_cosine_range():
    a = np.array([0.0, 0.01, 0.02])
    b = np.array([0.0, 0.01, 0.02])
    assert abs(cosine_similarity(a, a) - 1.0) < 1e-9
    c = np.array([0.0, -0.01, -0.02])
    # Opposite-signed shape should score low/negative, not high.
    assert cosine_similarity(a, c) < cosine_similarity(a, b)
    print("test_cosine_range: PASS")


def make_synthetic_series(n, seed, drift=0.0005, vol=0.015):
    rng = np.random.default_rng(seed)
    returns = rng.normal(drift, vol, n)
    close = 100 * np.cumprod(1 + returns)
    dates = pd.date_range("2023-01-01", periods=n, freq="B")
    volume = rng.integers(1_000_000, 5_000_000, n)
    return pd.DataFrame(
        {
            "date": dates.strftime("%Y-%m-%d"),
            "open": close * 0.999,
            "high": close * 1.005,
            "low": close * 0.995,
            "close": close,
            "volume": volume,
        }
    )


def test_dedup_enforces_min_ticker_gap():
    # Two tickers, 500 rows each -> plenty of overlapping windows from the
    # SAME ticker will look nearly identical to each other (adjacent,
    # day-shifted). Confirm find_matches doesn't return a pile of
    # near-duplicate matches from the same ticker clustered together.
    df_a = compute_indicators(make_synthetic_series(500, seed=1))
    df_b = compute_indicators(make_synthetic_series(500, seed=2))

    windows_a = slice_windows(df_a, "AAA", window_len=WINDOW_LEN_DEFAULT, step=1)
    windows_b = slice_windows(df_b, "BBB", window_len=WINDOW_LEN_DEFAULT, step=1)
    all_windows = windows_a + windows_b

    query_shape = windows_a[100][0].shape  # an arbitrary real window as the query

    matches = find_matches(query_shape, all_windows, top_k=15, min_ticker_gap_days=15)

    # Check no two matches from the same ticker are closer than the gap.
    by_ticker = {}
    for m in matches:
        by_ticker.setdefault(m.window.ticker, []).append(m.window.end_idx)
    for ticker, ends in by_ticker.items():
        ends.sort()
        for i in range(1, len(ends)):
            gap = ends[i] - ends[i - 1]
            assert gap >= 15, f"{ticker} matches too close together: gap={gap}"
    print(f"test_dedup_enforces_min_ticker_gap: PASS ({len(matches)} matches, tickers={list(by_ticker.keys())})")


def test_outcome_distribution_matches_raw_counts():
    outcomes = [
        WindowOutcome(fwd_return_5d=0.05, fwd_return_10d=0.05, fwd_return_20d=0.05),
        WindowOutcome(fwd_return_5d=-0.05, fwd_return_10d=-0.05, fwd_return_20d=-0.05),
        WindowOutcome(fwd_return_5d=0.0, fwd_return_10d=0.0, fwd_return_20d=0.0),
    ]
    from similarity import Match

    dummy_window = Window(
        ticker="X", start_idx=0, end_idx=0, start_date="", end_date="", shape=[0.0]
    )
    matches = [Match(window=dummy_window, outcome=o, cosine_score=1.0, dtw_distance=0.0) for o in outcomes]
    dist = outcome_distribution(matches, horizon=5)
    assert dist["count"] == 3
    assert dist["up"] == 1
    assert dist["down"] == 1
    assert dist["flat"] == 1
    print("test_outcome_distribution_matches_raw_counts: PASS")


if __name__ == "__main__":
    test_dtw_identical_sequences_is_zero()
    test_dtw_distinguishes_shapes()
    test_cosine_range()
    test_dedup_enforces_min_ticker_gap()
    test_outcome_distribution_matches_raw_counts()
    print("\nAll similarity tests passed.")
