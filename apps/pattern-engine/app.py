"""
FastAPI service for the pattern-match engine. Node/Express proxies to this,
the same way it already proxies to Finnhub/Yahoo/SEC — this service never
talks to the mobile client directly.

/match     — Feature 1: given a query window, return the top de-duplicated
             historical analog matches + a real computed outcome distribution.
/classify  — Feature 3: given a query window, run it through the current
             trained classifier(s) and return probability distributions +
             each model's backtested accuracy.

Neither endpoint calls the Anthropic API — narration is a separate concern
handled server-side in apps/api (Node), which receives this service's raw
numbers as facts and passes them to the LLM to narrate. Keeping AI-calling
code out of this service means it stays a pure numbers/data service,
independently testable without needing an API key at all.
"""

from __future__ import annotations

import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from features import HORIZONS, compute_indicators
from similarity import WindowDataset, find_matches_compact, outcome_distribution
from train_model import FEATURE_KEYS

DATA_DIR = Path(__file__).resolve().parent / "data"
MODELS_DIR = Path(__file__).resolve().parent / "models"
WINDOWS_FILE = DATA_DIR / "windows_v1.npz"

app = FastAPI(title="Summit Pattern Engine")

_dataset_cache: WindowDataset | None = None
_models_cache: dict[int, tuple] | None = None  # horizon -> (model, accuracy)


def get_window_dataset() -> WindowDataset:
    """Loads the precomputed compact window dataset (data/windows_v1.npz,
    built offline by precompute_windows.py). This replaced a per-restart
    rebuild that read all 105 parquet files, recomputed indicators, and
    sliced ~230k windows into Python objects on the request path — that
    OOM-killed the worker on Render's 512MB free tier, taking the whole
    service (including /classify) down with it. Loading one float32 matrix
    is ~23MB resident and near-instant by comparison. Cached in-process;
    rebuilt only on service restart.
    """
    global _dataset_cache
    if _dataset_cache is None:
        if not WINDOWS_FILE.exists():
            raise FileNotFoundError(
                f"Precomputed windows missing at {WINDOWS_FILE} — run precompute_windows.py."
            )
        npz = np.load(WINDOWS_FILE, allow_pickle=False)
        shapes = npz["shapes"].astype(np.float32)
        _dataset_cache = WindowDataset(
            shapes=shapes,
            shape_norms=np.linalg.norm(shapes, axis=1).astype(np.float32),
            fwd=npz["fwd"].astype(np.float32),
            end_idx=npz["end_idx"].astype(np.int32),
            tickers=npz["tickers"],
            start_dates=npz["start_dates"],
            end_dates=npz["end_dates"],
        )
    return _dataset_cache


def get_current_models() -> dict[int, tuple]:
    """Loads the most recent manifest + its model files. 'Most recent' by
    filename's date suffix — an explicit versioning scheme so which model
    is live is always traceable, and rolling back is just pointing at an
    older manifest.
    """
    global _models_cache
    if _models_cache is not None:
        return _models_cache

    manifests = sorted(MODELS_DIR.glob("manifest_v1_*.json"))
    if not manifests:
        raise FileNotFoundError(
            f"No trained models in {MODELS_DIR} — run train_model.py first."
        )
    latest_manifest = manifests[-1]
    with open(latest_manifest) as f:
        manifest = json.load(f)

    models = {}
    for horizon in HORIZONS:
        info = manifest["results"][f"{horizon}d"]
        with open(MODELS_DIR / info["model_file"], "rb") as f:
            clf = pickle.load(f)
        models[horizon] = (clf, info["accuracy"])
    _models_cache = models
    return _models_cache


class WindowQuery(BaseModel):
    # Client sends its own normalized shape (already computed the same way
    # features.py does: percent change from window start) plus the raw
    # closes so the server can derive the same indicator/feature set.
    closes: list[float]
    volumes: list[float] | None = None
    top_k: int = 20


def _query_features_from_closes(closes: list[float], volumes: list[float] | None):
    """Builds a synthetic single-row 'history' from the client's raw closes
    so the SAME compute_indicators/slice_windows path used for training
    data also produces the query's features — no separate/duplicated
    formula for RSI, MACD, etc. Because RSI/MACD/long-MA need lookback the
    client's own short window can't provide, this uses only the
    normalized-shape vector for similarity search directly, and computes
    indicator features from whatever history is actually available,
    falling back to neutral defaults where lookback is insufficient
    (documented in the response, not hidden).
    """
    base = closes[0]
    shape = [(c - base) / base for c in closes]

    n = len(closes)
    insufficient_lookback = n < 200
    df = pd.DataFrame(
        {
            "date": [str(i) for i in range(n)],
            "open": closes,
            "high": closes,
            "low": closes,
            "close": closes,
            "volume": volumes if volumes else [1_000_000] * n,
        }
    )
    ind = compute_indicators(df)
    last = ind.iloc[-1]
    daily_returns = np.diff(np.array(shape))
    feats = {
        "rsi14": float(last["rsi14"]) if not pd.isna(last["rsi14"]) else 50.0,
        "macd_hist": float(last["macd_hist"]) if not pd.isna(last["macd_hist"]) else 0.0,
        "volume_ratio": float(last["volume_ratio"]) if not pd.isna(last["volume_ratio"]) else 1.0,
        "dist_from_sma50": float(last["dist_from_sma50"]) if not pd.isna(last["dist_from_sma50"]) else 0.0,
        "dist_from_sma200": float(last["dist_from_sma200"]) if not pd.isna(last["dist_from_sma200"]) else 0.0,
        "total_return": float(shape[-1]),
        "volatility": float(np.std(daily_returns)) if len(daily_returns) else 0.0,
        "max_drawdown": float(np.min(shape) - np.max(shape[: np.argmin(shape) + 1])) if len(shape) > 1 else 0.0,
    }
    return shape, feats, insufficient_lookback


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/match")
def match(query: WindowQuery):
    if len(query.closes) < 5:
        raise HTTPException(400, "need at least 5 closes to form a query shape")

    shape, _feats, _insufficient = _query_features_from_closes(query.closes, query.volumes)
    dataset = get_window_dataset()
    if dataset.size == 0:
        raise HTTPException(503, "no historical window data loaded")

    matches = find_matches_compact(shape, dataset, top_k=query.top_k)
    if not matches:
        return {"matches": [], "distributions": {}}

    return {
        "matches": [
            {
                "ticker": m.window.ticker,
                "start_date": m.window.start_date,
                "end_date": m.window.end_date,
                "shape": m.window.shape,
                "cosine_score": m.cosine_score,
                "dtw_distance": m.dtw_distance,
                "outcome": {
                    "fwd_return_5d": m.outcome.fwd_return_5d,
                    "fwd_return_10d": m.outcome.fwd_return_10d,
                    "fwd_return_20d": m.outcome.fwd_return_20d,
                },
            }
            for m in matches
        ],
        "distributions": {
            str(h): outcome_distribution(matches, horizon=h) for h in HORIZONS
        },
    }


@app.post("/classify")
def classify(query: WindowQuery):
    if len(query.closes) < 5:
        raise HTTPException(400, "need at least 5 closes to form a query shape")

    _shape, feats, insufficient_lookback = _query_features_from_closes(query.closes, query.volumes)
    x = np.array([[feats[k] for k in FEATURE_KEYS]])

    try:
        models = get_current_models()
    except FileNotFoundError as e:
        raise HTTPException(503, str(e))

    results = {}
    for horizon, (clf, accuracy) in models.items():
        proba = clf.predict_proba(x)[0]
        classes = list(clf.classes_)
        results[str(horizon)] = {
            "probabilities": dict(zip(classes, [float(p) for p in proba])),
            "backtested_accuracy": accuracy,
        }

    return {
        "horizons": results,
        "insufficient_lookback_warning": insufficient_lookback,
        "note": "Backtested accuracy is measured on held-out historical data, "
        "not a guarantee of future performance.",
    }
