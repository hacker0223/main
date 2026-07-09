"""
Shared windowing + feature extraction.

This is the single source of truth for both the similarity-search pipeline
(similarity.py) and the classifier training script (train_model.py) — both
import from here rather than recomputing indicators or slicing windows
themselves. That's the actual mechanism satisfying "don't duplicate
feature-extraction logic between the pattern matcher and the classifier."

Indicator math (RSI/MACD/SMA) intentionally mirrors the formulas already
used in apps/mobile/src/features/stock-detail/technicals.ts (14-period RSI,
12/26/9 MACD, simple moving averages) so behavior is consistent with the
rest of the app, even though this is a separate language/runtime.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

WINDOW_LEN_DEFAULT = 25  # trading days; spec calls for 20-30
HORIZONS = (5, 10, 20)  # trading days forward
UP_THRESHOLD = 0.01  # +1%
DOWN_THRESHOLD = -0.01  # -1%
MA_LONG = 200  # longest lookback we need before a window can start
VOLUME_AVG_WINDOW = 20


def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Add RSI/MACD/moving-average/volume-ratio columns to a full OHLCV
    series. Must be called on the FULL history for a ticker before
    windowing — these all need lookback (up to 200 days for the long MA),
    and computing them on a pre-sliced window would starve them of it.
    """
    out = df.copy().reset_index(drop=True)
    close = out["close"]

    # RSI(14) — Wilder's smoothing.
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / 14, min_periods=14, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / 14, min_periods=14, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    out["rsi14"] = 100 - (100 / (1 + rs))
    out["rsi14"] = out["rsi14"].fillna(50)  # no movement yet -> neutral

    # MACD(12,26,9).
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    out["macd_hist"] = macd_line - signal_line

    # Moving averages + distance-from-MA (as a fraction of price).
    out["sma50"] = close.rolling(50).mean()
    out["sma200"] = close.rolling(200).mean()
    out["dist_from_sma50"] = (close - out["sma50"]) / out["sma50"]
    out["dist_from_sma200"] = (close - out["sma200"]) / out["sma200"]

    # Volume relative to its own trailing average.
    vol_avg = out["volume"].rolling(VOLUME_AVG_WINDOW).mean()
    out["volume_ratio"] = out["volume"] / vol_avg.replace(0, np.nan)

    return out


@dataclass
class Window:
    ticker: str
    start_idx: int
    end_idx: int  # inclusive
    start_date: str
    end_date: str
    shape: list[float] = field(repr=False)  # normalized close, len == window_len
    rsi14: float = 0.0
    macd_hist: float = 0.0
    volume_ratio: float = 0.0
    dist_from_sma50: float = 0.0
    dist_from_sma200: float = 0.0

    def summary_stats(self) -> dict[str, float]:
        """Compact scalar summary of the shape vector, used (alongside the
        indicator fields) as classifier input. The classifier deliberately
        uses these summary stats rather than the raw ~25-dim shape vector
        as features — keeps the feature space low-dimensional and
        interpretable for a first version. The full shape vector is still
        used as-is for similarity search in similarity.py, which needs the
        actual shape, not a summary of it.
        """
        arr = np.array(self.shape)
        daily_returns = np.diff(arr)
        return {
            "total_return": float(arr[-1]),  # shape is already % from window start
            "volatility": float(np.std(daily_returns)) if len(daily_returns) else 0.0,
            "max_drawdown": float(np.min(arr) - np.max(arr[: np.argmin(arr) + 1]))
            if len(arr) > 1
            else 0.0,
        }

    def to_feature_dict(self) -> dict[str, float]:
        d = {
            "rsi14": self.rsi14,
            "macd_hist": self.macd_hist,
            "volume_ratio": self.volume_ratio if not np.isnan(self.volume_ratio) else 1.0,
            "dist_from_sma50": self.dist_from_sma50 if not np.isnan(self.dist_from_sma50) else 0.0,
            "dist_from_sma200": self.dist_from_sma200 if not np.isnan(self.dist_from_sma200) else 0.0,
        }
        d.update(self.summary_stats())
        return d


@dataclass
class WindowOutcome:
    fwd_return_5d: float | None
    fwd_return_10d: float | None
    fwd_return_20d: float | None

    def label(self, horizon: int) -> str | None:
        ret = {5: self.fwd_return_5d, 10: self.fwd_return_10d, 20: self.fwd_return_20d}[horizon]
        if ret is None:
            return None
        if ret > UP_THRESHOLD:
            return "up"
        if ret < DOWN_THRESHOLD:
            return "down"
        return "flat"


def _normalized_shape(close: pd.Series, start_idx: int, end_idx: int) -> list[float]:
    segment = close.iloc[start_idx : end_idx + 1].to_numpy()
    base = segment[0]
    return ((segment - base) / base).tolist()


def slice_windows(
    df_with_indicators: pd.DataFrame,
    ticker: str,
    window_len: int = WINDOW_LEN_DEFAULT,
    step: int = 1,
    include_outcomes: bool = True,
) -> list[tuple[Window, WindowOutcome | None]]:
    """Slice a single ticker's indicator-augmented series into overlapping
    windows. Requires MA_LONG (200) days of history before a window can
    start (so sma200/dist_from_sma200 are real, not NaN), and — when
    include_outcomes is True — requires max(HORIZONS) days of future data
    after the window end (otherwise the outcome can't be computed and the
    window is skipped, not filled with a fake value).
    """
    df = df_with_indicators
    close = df["close"]
    n = len(df)
    max_horizon = max(HORIZONS)

    results: list[tuple[Window, WindowOutcome | None]] = []
    earliest_start = MA_LONG  # need 200 days of lookback before this
    latest_start = n - window_len - (max_horizon if include_outcomes else 0)

    for start_idx in range(earliest_start, max(earliest_start, latest_start), step):
        end_idx = start_idx + window_len - 1
        if end_idx >= n:
            break
        row = df.iloc[end_idx]
        if pd.isna(row["sma200"]):
            continue  # not enough history yet for this particular row

        w = Window(
            ticker=ticker,
            start_idx=start_idx,
            end_idx=end_idx,
            start_date=str(df.iloc[start_idx]["date"]),
            end_date=str(row["date"]),
            shape=_normalized_shape(close, start_idx, end_idx),
            rsi14=float(row["rsi14"]),
            macd_hist=float(row["macd_hist"]),
            volume_ratio=float(row["volume_ratio"]) if not pd.isna(row["volume_ratio"]) else 1.0,
            dist_from_sma50=float(row["dist_from_sma50"]) if not pd.isna(row["dist_from_sma50"]) else 0.0,
            dist_from_sma200=float(row["dist_from_sma200"]),
        )

        outcome = None
        if include_outcomes:
            end_close = close.iloc[end_idx]
            rets = {}
            for h in HORIZONS:
                future_idx = end_idx + h
                if future_idx >= n:
                    rets[h] = None
                else:
                    rets[h] = float((close.iloc[future_idx] - end_close) / end_close)
            outcome = WindowOutcome(
                fwd_return_5d=rets[5], fwd_return_10d=rets[10], fwd_return_20d=rets[20]
            )
            if all(v is None for v in rets.values()):
                continue  # no usable outcome at all, skip entirely

        results.append((w, outcome))

    return results
