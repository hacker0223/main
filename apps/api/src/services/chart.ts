import type { ChartPoint, ChartTimeframe } from "@summit/shared";
import { cached } from "./cache";
import { fetchWithTimeout, NotFoundError } from "./errors";

// Yahoo Finance's chart endpoint is unofficial/undocumented — no public terms of
// service for programmatic use. It's the only free source of historical OHLCV
// candles (Finnhub gates /stock/candle behind a paid plan). Fine for now; swap
// for a proper licensed data source (Finnhub premium, Polygon, Twelve Data)
// before a real launch.
const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

const RANGE_PARAMS: Record<ChartTimeframe, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" },
  "1W": { range: "5d", interval: "30m" },
  "1M": { range: "1mo", interval: "1d" },
  "6M": { range: "6mo", interval: "1d" },
  YTD: { range: "ytd", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
  "5Y": { range: "5y", interval: "1wk" },
  MAX: { range: "max", interval: "1mo" },
};

interface YahooChartResponse {
  chart: {
    result: [
      {
        timestamp: number[];
        indicators: {
          quote: [{ open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] }];
        };
      },
    ] | null;
    error: unknown;
  };
}

async function fetchCandles(symbol: string, timeframe: ChartTimeframe): Promise<ChartPoint[]> {
  const { range, interval } = RANGE_PARAMS[timeframe];
  const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;

  const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 8000);
  if (res.status === 404) {
    throw new NotFoundError(`Unknown symbol: ${symbol}`);
  }
  if (!res.ok) {
    throw new Error(`Chart fetch failed for ${symbol}: ${res.status}`);
  }
  const body = (await res.json()) as YahooChartResponse;
  const result = body.chart.result?.[0];
  if (!result) return [];

  const { timestamp, indicators } = result;
  const quote = indicators.quote[0];

  const points: ChartPoint[] = [];
  for (let i = 0; i < timestamp.length; i++) {
    const close = quote.close[i];
    if (close === null || close === undefined) continue;
    points.push({
      timestamp: timestamp[i] * 1000,
      open: quote.open[i] ?? close,
      high: quote.high[i] ?? close,
      low: quote.low[i] ?? close,
      close,
      volume: quote.volume[i] ?? 0,
    });
  }
  return points;
}

export async function getChart(symbol: string, timeframe: ChartTimeframe): Promise<ChartPoint[]> {
  const ttl = timeframe === "1D" ? 60_000 : 300_000;
  return cached(`chart:${symbol}:${timeframe}`, ttl, () => fetchCandles(symbol, timeframe));
}
