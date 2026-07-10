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

interface YahooTradingWindow {
  start: number; // unix seconds
  end: number;
}

interface YahooChartMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  currentTradingPeriod?: {
    pre: YahooTradingWindow;
    regular: YahooTradingWindow;
    post: YahooTradingWindow;
  };
}

interface YahooChartResponse {
  chart: {
    result: [
      {
        meta: YahooChartMeta;
        timestamp: number[];
        indicators: {
          quote: [{ open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] }];
        };
      },
    ] | null;
    error: unknown;
  };
}

async function fetchYahooChart(symbol: string, timeframe: ChartTimeframe) {
  const { range, interval } = RANGE_PARAMS[timeframe];
  // includePrePost matters specifically for the intraday (1D/1W) ranges —
  // without it, Yahoo silently drops pre-market and after-hours bars/meta
  // entirely, which is exactly the gap that made the app's price data look
  // stale outside regular trading hours.
  const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=true`;

  const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 8000);
  if (res.status === 404) {
    throw new NotFoundError(`Unknown symbol: ${symbol}`);
  }
  if (!res.ok) {
    throw new Error(`Chart fetch failed for ${symbol}: ${res.status}`);
  }
  return (await res.json()) as YahooChartResponse;
}

async function fetchCandles(symbol: string, timeframe: ChartTimeframe): Promise<ChartPoint[]> {
  const body = await fetchYahooChart(symbol, timeframe);
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

export interface ExtendedHoursQuote {
  marketState: "PRE" | "POST" | "CLOSED";
  price: number;
  changePercent: number;
}

// Yahoo's own quote endpoint (the one that actually carries preMarketPrice/
// postMarketPrice fields directly) now requires a crumb+cookie session and
// rejects plain requests ("Unauthorized") — confirmed by hand, not assumed.
// The chart endpoint's `meta` block doesn't carry those price fields either,
// only a `hasPrePostMarketData` flag and a `currentTradingPeriod` block —
// and that block describes the NEXT session's windows once the market is
// closed overnight before pre-market opens, which doesn't line up with the
// actual candle timestamps (still the previous session's data) for
// matching purposes. So: don't try to window-match candles against
// currentTradingPeriod at all. With includePrePost=true the very last
// candle in the array is always the most recent available print, whichever
// session it's from — just take that directly, and use current wall-clock
// time only to decide what to call it (pre-market / after hours / closed).
function deriveExtendedHoursQuote(body: YahooChartResponse): ExtendedHoursQuote | null {
  const result = body.chart.result?.[0];
  const period = result?.meta.currentTradingPeriod;
  const regularMarketPrice = result?.meta.regularMarketPrice;
  if (!result || !period || regularMarketPrice === undefined) return null;

  const nowSec = Date.now() / 1000;
  let session: ExtendedHoursQuote["marketState"] | null = null;
  if (nowSec >= period.regular.start && nowSec < period.regular.end) {
    return null; // inside regular trading hours — the live quote already covers this
  } else if (nowSec >= period.pre.start && nowSec < period.regular.start) {
    session = "PRE";
  } else {
    // Covers both "after-hours session still running" and "genuinely
    // closed overnight" — in both cases there's nothing newer than the
    // last available post-market print, just labeled differently below.
    session = nowSec >= period.regular.end && nowSec < period.post.end ? "POST" : "CLOSED";
  }

  const { timestamp, indicators } = result;
  const closes = indicators.quote[0].close;
  let latestClose: number | null = null;
  for (let i = timestamp.length - 1; i >= 0; i--) {
    if (closes[i] !== null && closes[i] !== undefined) {
      latestClose = closes[i];
      break;
    }
  }
  if (latestClose === null || latestClose === regularMarketPrice) return null;

  return {
    marketState: session,
    price: latestClose,
    changePercent: ((latestClose - regularMarketPrice) / regularMarketPrice) * 100,
  };
}

// Best-effort only, and deliberately not wired into the batch /quotes
// endpoint — that one already fans out one Finnhub call per watchlist/home-
// screen symbol, and doubling that with a Yahoo call per symbol on every
// poll wasn't worth the extra latency/reliability risk for now. Only the
// single-stock detail page gets this.
async function fetchExtendedHours(symbol: string): Promise<ExtendedHoursQuote | null> {
  const body = await fetchYahooChart(symbol, "1D");
  return deriveExtendedHoursQuote(body);
}

export async function getExtendedHoursQuote(symbol: string): Promise<ExtendedHoursQuote | null> {
  return cached(`extended-hours:${symbol}`, 60_000, () => fetchExtendedHours(symbol));
}
