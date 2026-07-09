"""Quick sanity checks for features.py — run directly with the venv python,
not pytest (keeping the dependency list minimal for now).
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from features import compute_indicators, slice_windows, HORIZONS, MA_LONG, WINDOW_LEN_DEFAULT


def make_synthetic_series(n=400, seed=1):
    rng = np.random.default_rng(seed)
    returns = rng.normal(0.0005, 0.015, n)
    close = 100 * np.cumprod(1 + returns)
    dates = pd.date_range("2023-01-01", periods=n, freq="B")
    volume = rng.integers(1_000_000, 5_000_000, n)
    return pd.DataFrame(
        {
            "date": dates.strftime("%Y-%m-%d"),
            "open": close * (1 - 0.001),
            "high": close * 1.005,
            "low": close * 0.995,
            "close": close,
            "volume": volume,
        }
    )


def test_indicators_present_and_bounded():
    df = make_synthetic_series()
    out = compute_indicators(df)
    assert "rsi14" in out.columns
    valid_rsi = out["rsi14"].dropna()
    assert (valid_rsi >= 0).all() and (valid_rsi <= 100).all(), "RSI must be in [0, 100]"
    assert out["sma200"].iloc[MA_LONG:].notna().all(), "sma200 should be populated after 200 rows"
    print("test_indicators_present_and_bounded: PASS")


def test_windows_respect_lookback_and_horizon():
    df = make_synthetic_series(n=400)
    out = compute_indicators(df)
    windows = slice_windows(out, "TEST", window_len=WINDOW_LEN_DEFAULT, step=5)
    assert len(windows) > 0, "should produce at least one window"
    max_h = max(HORIZONS)
    for w, outcome in windows:
        assert w.start_idx >= MA_LONG, "window must not start before 200-day lookback is satisfied"
        assert w.end_idx + max_h < 400 or outcome is not None
        assert len(w.shape) == WINDOW_LEN_DEFAULT
        assert w.shape[0] == 0.0, "shape vector should start at 0% (normalized to window start)"
    print(f"test_windows_respect_lookback_and_horizon: PASS ({len(windows)} windows)")


def test_outcome_labels_consistent_with_thresholds():
    df = make_synthetic_series(n=400)
    out = compute_indicators(df)
    windows = slice_windows(out, "TEST", window_len=WINDOW_LEN_DEFAULT, step=3)
    checked = 0
    for w, outcome in windows:
        if outcome is None or outcome.fwd_return_5d is None:
            continue
        label = outcome.label(5)
        if outcome.fwd_return_5d > 0.01:
            assert label == "up"
        elif outcome.fwd_return_5d < -0.01:
            assert label == "down"
        else:
            assert label == "flat"
        checked += 1
    assert checked > 0
    print(f"test_outcome_labels_consistent_with_thresholds: PASS ({checked} outcomes checked)")


def test_no_window_starts_without_full_lookback():
    # A short series (less than MA_LONG rows) should produce zero windows,
    # not windows with garbage/NaN long-MA distance.
    df = make_synthetic_series(n=100)
    out = compute_indicators(df)
    windows = slice_windows(out, "TEST", window_len=WINDOW_LEN_DEFAULT)
    assert len(windows) == 0, "series shorter than MA_LONG should yield no windows"
    print("test_no_window_starts_without_full_lookback: PASS")


if __name__ == "__main__":
    test_indicators_present_and_bounded()
    test_windows_respect_lookback_and_horizon()
    test_outcome_labels_consistent_with_thresholds()
    test_no_window_starts_without_full_lookback()
    print("\nAll feature tests passed.")
