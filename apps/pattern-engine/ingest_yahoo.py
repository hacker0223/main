"""
Historical OHLCV ingestion for the pattern-match engine's data layer.

Originally planned around Stooq's free CSV endpoint, but as of this
writing that endpoint is gated behind a client-side JavaScript
proof-of-work challenge (a SHA-256 puzzle solved in-browser) — not
reachable from a plain HTTP client, and deliberately solving that
challenge would mean circumventing anti-bot protection, which isn't
something to do quietly. Using Yahoo Finance's unofficial chart endpoint
instead — the same endpoint and the same "unofficial/undocumented, no
public ToS for programmatic use" caveat already documented in
apps/api/src/services/chart.ts, which uses it in production today.

IMPORTANT: this is a free, unofficial, undocumented endpoint with no
licensing terms for redistribution or commercial use. It's fine for
development and demos. Swap for a licensed provider (Polygon, Tiingo,
Finnhub premium) before any real launch — same caveat that already
applies to the live app's chart data.

Run: python ingest_yahoo.py
Writes one parquet file per ticker to data/<TICKER>.parquet
"""

from __future__ import annotations

import time
from pathlib import Path

import pandas as pd
import requests

from tickers import TICKERS

YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart"
DATA_DIR = Path(__file__).resolve().parent / "data"
RANGE = "10y"
INTERVAL = "1d"
REQUEST_DELAY_SECONDS = 0.3  # be a reasonable citizen, don't hammer an unofficial endpoint


def fetch_ticker_history(ticker: str) -> pd.DataFrame | None:
    url = f"{YAHOO_BASE}/{ticker}?interval={INTERVAL}&range={RANGE}"
    try:
        resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
    except requests.RequestException as e:
        print(f"  {ticker}: request failed ({e})")
        return None

    if resp.status_code != 200:
        print(f"  {ticker}: HTTP {resp.status_code}")
        return None

    body = resp.json()
    result = body.get("chart", {}).get("result")
    if not result:
        print(f"  {ticker}: no data in response")
        return None

    r = result[0]
    timestamps = r.get("timestamp")
    if not timestamps:
        print(f"  {ticker}: empty timestamp series")
        return None

    quote = r["indicators"]["quote"][0]
    df = pd.DataFrame(
        {
            "date": pd.to_datetime(timestamps, unit="s").strftime("%Y-%m-%d"),
            "open": quote["open"],
            "high": quote["high"],
            "low": quote["low"],
            "close": quote["close"],
            "volume": quote["volume"],
        }
    )
    # Yahoo returns null rows for non-trading gaps inside the range; drop them.
    df = df.dropna(subset=["close"]).reset_index(drop=True)
    return df


def main():
    DATA_DIR.mkdir(exist_ok=True)
    ok, failed = 0, []

    for i, ticker in enumerate(TICKERS):
        df = fetch_ticker_history(ticker)
        if df is None or len(df) < 300:
            failed.append(ticker)
            continue
        df.to_parquet(DATA_DIR / f"{ticker}.parquet", index=False)
        ok += 1
        print(f"  {ticker}: {len(df)} rows -> {DATA_DIR / f'{ticker}.parquet'}")
        time.sleep(REQUEST_DELAY_SECONDS)

    print(f"\nDone: {ok} tickers ingested, {len(failed)} failed.")
    if failed:
        print("Failed:", ", ".join(failed))


if __name__ == "__main__":
    main()
