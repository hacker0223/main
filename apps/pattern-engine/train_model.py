"""
Classifier training — the one genuinely trainable/retrainable component in
this whole feature set. The LLM (Anthropic API) is never trained or
fine-tuned; it only narrates numbers this script computes.

Trains three separate GradientBoostingClassifier models, one per horizon
(5d/10d/20d), rather than one multi-output model. Separate models are
simpler to evaluate independently (each horizon gets its own honest
accuracy/precision/recall, rather than one aggregate score that obscures
which horizon is actually predictive) and there's no real cost to it here
since inference is just three cheap forward passes over the same feature
vector.

Run standalone, on demand or on a schedule as new data arrives — this is
NOT called live per user request. It reads apps/pattern-engine/data/*.parquet
(written by ingest_yahoo.py) and writes versioned model files to models/.

PURGED TIME SPLIT — the subtlety that's easy to get wrong:
A naive time-based split (train = windows ending before date X, test =
windows ending after date X) still leaks information. A window ending
right before the cutoff has its label computed from prices up to 20 days
AFTER the cutoff (the forward-outcome horizon) — so its label depends on
data that's chronologically "test period" information bleeding into a
"training" example. The fix (standard in financial ML, sometimes called
"purging") is to remove a gap of max(HORIZONS) trading days on the TRAIN
side of the boundary: any training window whose outcome window would
extend past the cutoff gets dropped, not just windows that start after it.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.utils.class_weight import compute_sample_weight

from features import HORIZONS, compute_indicators, slice_windows, WINDOW_LEN_DEFAULT

DATA_DIR = Path(__file__).resolve().parent / "data"
MODELS_DIR = Path(__file__).resolve().parent / "models"
TEST_FRACTION = 0.2
FEATURE_KEYS = [
    "rsi14",
    "macd_hist",
    "volume_ratio",
    "dist_from_sma50",
    "dist_from_sma200",
    "total_return",
    "volatility",
    "max_drawdown",
]


def load_all_windows(data_dir: Path = DATA_DIR) -> list[tuple]:
    """Load every ticker's parquet file, compute indicators, and slice into
    windows with outcomes. Returns a flat list of (Window, WindowOutcome)
    tuples across all tickers, each window tagged with its own end_date so
    the purged split can order everything chronologically regardless of
    which ticker it came from.
    """
    all_windows = []
    files = sorted(data_dir.glob("*.parquet"))
    if not files:
        raise FileNotFoundError(
            f"No parquet files in {data_dir} — run ingest_yahoo.py first."
        )
    for f in files:
        ticker = f.stem
        df = pd.read_parquet(f)
        df_ind = compute_indicators(df)
        windows = slice_windows(df_ind, ticker, window_len=WINDOW_LEN_DEFAULT, step=1)
        all_windows.extend(windows)
    return all_windows


def purged_time_split(
    windows: list[tuple], test_fraction: float = TEST_FRACTION
) -> tuple[list, list]:
    """Sort all windows by end_date, take the most recent `test_fraction`
    as the test set, then purge any TRAIN window whose outcome horizon
    would extend past the test set's start date. No shuffling — this is
    time-series data, and shuffling across the split would itself leak
    chronological information.
    """
    sorted_windows = sorted(windows, key=lambda wo: wo[0].end_date)
    n = len(sorted_windows)
    split_idx = int(n * (1 - test_fraction))
    test_set = sorted_windows[split_idx:]
    if not test_set:
        return sorted_windows, []
    test_start_date = test_set[0][0].end_date

    max_horizon = max(HORIZONS)
    train_set = []
    purged_count = 0
    for w, outcome in sorted_windows[:split_idx]:
        # A window's outcome depends on prices up to max_horizon trading
        # days after its end_date. If that reaches into the test period,
        # drop it from train rather than let it leak test-period info.
        end_date = pd.Timestamp(w.end_date)
        test_start = pd.Timestamp(test_start_date)
        # Trading-day horizon approximated as calendar days * 1.5 for the
        # purge check (conservative — errs toward purging slightly more
        # than the strict minimum, never less).
        if end_date + pd.Timedelta(days=int(max_horizon * 1.5)) >= test_start:
            purged_count += 1
            continue
        train_set.append((w, outcome))

    print(f"  purged {purged_count} train windows near the split boundary")
    return train_set, test_set


def to_xy(windows: list[tuple], horizon: int) -> tuple[np.ndarray, np.ndarray]:
    X, y = [], []
    for w, outcome in windows:
        label = outcome.label(horizon)
        if label is None:
            continue
        feats = w.to_feature_dict()
        X.append([feats[k] for k in FEATURE_KEYS])
        y.append(label)
    return np.array(X), np.array(y)


def train_and_evaluate(train_windows: list[tuple], test_windows: list[tuple], horizon: int) -> dict:
    X_train, y_train = to_xy(train_windows, horizon)
    X_test, y_test = to_xy(test_windows, horizon)

    if len(X_train) == 0 or len(X_test) == 0:
        raise ValueError(f"Not enough data to train horizon={horizon}d model")

    # This dataset spans a mostly-rising 10-year window, so "up" outcomes
    # heavily outnumber "down"/"flat". Without correcting for that, the
    # model just learns to predict "up" most of the time and still posts a
    # deceptively decent-looking accuracy number without having learned any
    # real distinguishing signal — GradientBoostingClassifier has no
    # class_weight param (unlike RandomForest/LogisticRegression), so the
    # standard way to correct for this is balanced per-sample weights.
    sample_weight = compute_sample_weight("balanced", y_train)

    clf = GradientBoostingClassifier(n_estimators=100, max_depth=3, random_state=42)
    clf.fit(X_train, y_train, sample_weight=sample_weight)

    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    train_class_counts = {cls: int((y_train == cls).sum()) for cls in np.unique(y_train)}
    test_class_counts = {cls: int((y_test == cls).sum()) for cls in np.unique(y_test)}

    return {
        "model": clf,
        "accuracy": accuracy,
        "report": report,
        "n_train": len(X_train),
        "n_test": len(X_test),
        "train_class_counts": train_class_counts,
        "test_class_counts": test_class_counts,
    }


def main():
    MODELS_DIR.mkdir(exist_ok=True)
    print("Loading windows from all tickers...")
    all_windows = load_all_windows()
    print(f"  {len(all_windows)} total windows")

    print("\nPurged time split...")
    train_windows, test_windows = purged_time_split(all_windows)
    print(f"  train: {len(train_windows)}  test: {len(test_windows)}")

    data_cutoff = max(w.end_date for w, _ in all_windows)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_summary = {}

    for horizon in HORIZONS:
        print(f"\nTraining {horizon}d horizon model...")
        result = train_and_evaluate(train_windows, test_windows, horizon)

        model_filename = f"model_{horizon}d_v1_{timestamp}.pkl"
        import pickle

        with open(MODELS_DIR / model_filename, "wb") as f:
            pickle.dump(result["model"], f)

        print(f"  accuracy: {result['accuracy']:.3f} ({result['n_test']} held-out setups)")
        print(f"  saved -> {model_filename}")

        results_summary[f"{horizon}d"] = {
            "model_file": model_filename,
            "accuracy": result["accuracy"],
            "n_train": result["n_train"],
            "n_test": result["n_test"],
            "train_class_counts": result["train_class_counts"],
            "test_class_counts": result["test_class_counts"],
            "per_class": {
                cls: {"precision": v["precision"], "recall": v["recall"], "f1": v["f1-score"]}
                for cls, v in result["report"].items()
                if cls in ("up", "down", "flat")
            },
        }

    manifest = {
        "trained_at": datetime.now().isoformat(),
        "data_cutoff_date": data_cutoff,
        "feature_keys": FEATURE_KEYS,
        "results": results_summary,
    }
    manifest_path = MODELS_DIR / f"manifest_v1_{timestamp}.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nManifest written -> {manifest_path}")
    print("\nHonest accuracy numbers (not marketing numbers) are in the manifest.")
    print("These are traceable to a specific data cutoff and can be compared across retrains.")


if __name__ == "__main__":
    main()
