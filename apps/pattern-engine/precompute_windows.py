"""
Build-time precomputation of the historical analog-match dataset.

Why this exists: the /match endpoint needs to compare a query shape against
every historical window. Rebuilding those windows on the request path
(reading all 105 parquet files, recomputing indicators, slicing ~230k
overlapping windows into Python objects) was both slow AND memory-heavy
enough to OOM-kill the worker on Render's 512MB free tier — which took the
whole service down, breaking /classify too since they share a process.

This script does that expensive work ONCE, offline, and serializes only
what /match actually reads (shape + ticker + dates + end_idx + forward
returns — NOT the indicator fields, which the match path never touches) as
compact columnar numpy arrays. At runtime app.py loads this single file:
float32 shapes are ~23MB resident vs. ~300MB+ for 230k Python Window
objects, and there's no pandas/compute spike on the request path at all.

Run this whenever the underlying data/ parquet files change, then commit
the resulting data/windows_v1.npz alongside them. It is deliberately a
committed artifact (like the model .pkl files) so a fresh deploy doesn't
have to rebuild it.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from features import HORIZONS, WINDOW_LEN_DEFAULT, compute_indicators, slice_windows

DATA_DIR = Path(__file__).resolve().parent / "data"
OUT_FILE = DATA_DIR / "windows_v1.npz"


def build() -> None:
    shapes: list[list[float]] = []
    tickers: list[str] = []
    start_dates: list[str] = []
    end_dates: list[str] = []
    end_idxs: list[int] = []
    fwd: list[list[float]] = []  # [5d, 10d, 20d], NaN where the horizon has no data

    files = sorted(DATA_DIR.glob("*.parquet"))
    for f in files:
        df = pd.read_parquet(f)
        df_ind = compute_indicators(df)
        for window, outcome in slice_windows(df_ind, f.stem, window_len=WINDOW_LEN_DEFAULT, step=1):
            if outcome is None:
                continue
            shapes.append(window.shape)
            tickers.append(window.ticker)
            start_dates.append(window.start_date)
            end_dates.append(window.end_date)
            end_idxs.append(window.end_idx)
            fwd.append(
                [
                    np.nan if outcome.fwd_return_5d is None else outcome.fwd_return_5d,
                    np.nan if outcome.fwd_return_10d is None else outcome.fwd_return_10d,
                    np.nan if outcome.fwd_return_20d is None else outcome.fwd_return_20d,
                ]
            )

    shapes_arr = np.asarray(shapes, dtype=np.float32)
    fwd_arr = np.asarray(fwd, dtype=np.float32)
    end_idx_arr = np.asarray(end_idxs, dtype=np.int32)
    tickers_arr = np.asarray(tickers)
    start_dates_arr = np.asarray(start_dates)
    end_dates_arr = np.asarray(end_dates)

    np.savez_compressed(
        OUT_FILE,
        shapes=shapes_arr,
        fwd=fwd_arr,
        end_idx=end_idx_arr,
        tickers=tickers_arr,
        start_dates=start_dates_arr,
        end_dates=end_dates_arr,
        window_len=np.int32(WINDOW_LEN_DEFAULT),
        horizons=np.asarray(HORIZONS, dtype=np.int32),
    )
    print(
        f"Wrote {OUT_FILE.name}: {len(shapes)} windows from {len(files)} files, "
        f"shapes {shapes_arr.shape} float32 (~{shapes_arr.nbytes / 1e6:.1f}MB in memory)."
    )


if __name__ == "__main__":
    build()
