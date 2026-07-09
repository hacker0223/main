import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from features import Window, WindowOutcome, HORIZONS
from train_model import purged_time_split


def make_window(end_date: str, idx: int) -> tuple:
    w = Window(
        ticker="TEST",
        start_idx=idx - 24,
        end_idx=idx,
        start_date=end_date,
        end_date=end_date,
        shape=[0.0] * 25,
    )
    outcome = WindowOutcome(fwd_return_5d=0.01, fwd_return_10d=0.01, fwd_return_20d=0.01)
    return (w, outcome)


def test_purge_removes_boundary_leakage():
    # 300 windows, one per calendar day, Jan 1 2023 through ~Oct 2023.
    dates = pd.date_range("2023-01-01", periods=300, freq="D")
    windows = [make_window(d.strftime("%Y-%m-%d"), i) for i, d in enumerate(dates)]

    train, test = purged_time_split(windows, test_fraction=0.2)

    test_start_date = pd.Timestamp(test[0][0].end_date)
    max_horizon_days = max(HORIZONS) * 1.5  # matches the conservative purge window in train_model.py

    # No train window should have an end_date within max_horizon_days of test_start.
    for w, _ in train:
        end_date = pd.Timestamp(w.end_date)
        gap = (test_start_date - end_date).days
        assert gap >= max_horizon_days, (
            f"train window at {w.end_date} is only {gap} days before test start "
            f"{test_start_date.date()} — leakage not purged"
        )

    # Sanity: train + test should be strictly less than the original count
    # (purging must have actually removed something) and test should be
    # non-empty and drawn from the tail.
    assert len(train) + len(test) < len(windows)
    assert len(test) == 60  # 20% of 300
    print(f"test_purge_removes_boundary_leakage: PASS (train={len(train)}, test={len(test)}, purged={len(windows)-len(train)-len(test)})")


def test_split_is_chronological_not_random():
    dates = pd.date_range("2023-01-01", periods=100, freq="D")
    windows = [make_window(d.strftime("%Y-%m-%d"), i) for i, d in enumerate(dates)]
    # Shuffle input order to confirm the function sorts internally rather
    # than relying on caller order.
    import random

    shuffled = windows.copy()
    random.Random(7).shuffle(shuffled)

    train, test = purged_time_split(shuffled, test_fraction=0.2)
    all_test_dates = [pd.Timestamp(w.end_date) for w, _ in test]
    all_train_dates = [pd.Timestamp(w.end_date) for w, _ in train]
    assert max(all_train_dates) < min(all_test_dates), "train must be strictly before test chronologically"
    print("test_split_is_chronological_not_random: PASS")


if __name__ == "__main__":
    test_purge_removes_boundary_leakage()
    test_split_is_chronological_not_random()
    print("\nAll train-split tests passed.")
