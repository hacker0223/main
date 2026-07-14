import { Router, type Response } from "express";
import type { ChartTimeframe } from "@summit/shared";
import {
  getFundamentals,
  getInsiderTransactions,
  getNews,
  getQuoteSummary,
  getScreener,
  getStockDetail,
  searchStocks,
} from "../services/finnhub";
import { getChart, getExtendedHoursQuote } from "../services/chart";
import { getFilings } from "../services/sec";
import { NotFoundError, RateLimitedError, UpstreamTimeoutError } from "../services/errors";

const VALID_TIMEFRAMES: ChartTimeframe[] = ["1D", "1W", "1M", "6M", "YTD", "1Y", "5Y", "MAX"];
const VALID_SCREENERS = ["gainers", "losers", "52w-highs"] as const;

export const stocksRouter = Router();

function handleError(context: string, err: unknown, res: Response) {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error(`[stocks:${context}] ${error.name}: ${error.message}`);

  if (error instanceof NotFoundError) {
    res.status(404).json({ error: "We couldn't find that stock." });
  } else if (error instanceof RateLimitedError) {
    res.status(429).json({ error: "Too many requests right now — give it a moment and try again." });
  } else if (error instanceof UpstreamTimeoutError) {
    res.status(504).json({ error: "That took too long to load. Check your connection and try again." });
  } else {
    res.status(502).json({ error: "Something went wrong loading market data. Try again shortly." });
  }
}

// Static routes first — Express matches in order, and these would otherwise
// be swallowed by the "/:symbol" catch-all below.

stocksRouter.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 1) {
    res.json([]);
    return;
  }
  try {
    const results = await searchStocks(q);
    res.json(results);
  } catch (err) {
    handleError("search", err, res);
  }
});

stocksRouter.get("/quotes", async (req, res) => {
  const symbols = String(req.query.symbols || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0) {
    res.json([]);
    return;
  }

  try {
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          return await getQuoteSummary(symbol);
        } catch (err) {
          console.error(`[stocks:quotes] skipping ${symbol}: ${(err as Error).message}`);
          return null;
        }
      })
    );
    res.json(quotes.filter(Boolean));
  } catch (err) {
    handleError("quotes", err, res);
  }
});

// Compact recent-trend series (one per symbol) for the little sparklines on
// stock rows. Batched so a list of N rows is a single request, not N; each
// symbol is fetched in parallel and independently, and a symbol that fails
// (or has no data) is simply omitted rather than failing the whole call.
const SPARKLINE_MAX_SYMBOLS = 30;
const SPARKLINE_MAX_POINTS = 24; // downsample to keep the payload and render tiny

stocksRouter.get("/sparklines", async (req, res) => {
  const symbols = String(req.query.symbols || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, SPARKLINE_MAX_SYMBOLS);

  if (symbols.length === 0) {
    res.json({});
    return;
  }

  try {
    const entries = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const points = await getChart(symbol, "1M");
          const closes = points.map((p) => p.close);
          if (closes.length < 2) return null;
          // Evenly downsample to at most SPARKLINE_MAX_POINTS, always keeping
          // the last point so the endpoint matches the current price.
          const step = Math.ceil(closes.length / SPARKLINE_MAX_POINTS);
          const sampled = step <= 1 ? closes : closes.filter((_, i) => i % step === 0);
          if (sampled[sampled.length - 1] !== closes[closes.length - 1]) {
            sampled.push(closes[closes.length - 1]);
          }
          return [symbol, sampled] as const;
        } catch (err) {
          console.error(`[stocks:sparklines] skipping ${symbol}: ${(err as Error).message}`);
          return null;
        }
      })
    );
    const bySymbol: Record<string, number[]> = {};
    for (const entry of entries) {
      if (entry) bySymbol[entry[0]] = entry[1];
    }
    res.json(bySymbol);
  } catch (err) {
    handleError("sparklines", err, res);
  }
});

stocksRouter.get("/screeners/:kind", async (req, res) => {
  const kind = req.params.kind as (typeof VALID_SCREENERS)[number];
  if (!VALID_SCREENERS.includes(kind)) {
    res.status(400).json({ error: `Invalid screener. Use one of ${VALID_SCREENERS.join(", ")}` });
    return;
  }
  try {
    const results = await getScreener(kind);
    res.json(results);
  } catch (err) {
    handleError("screener", err, res);
  }
});

// Dynamic per-symbol routes.

stocksRouter.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const detail = await getStockDetail(symbol);
    const chart = await getChart(symbol, "1D");

    // Best-effort — Finnhub's quote never carries pre/post-market prices at
    // all, so without this the header always shows a stale regular-session
    // price outside trading hours (e.g. a stock that moved 8% after an
    // earnings beat at 6pm would still show its flat 4pm close). A failure
    // here shouldn't take down the whole stock page over a "nice to have."
    const extendedHours = await getExtendedHoursQuote(symbol).catch(() => null);
    if (extendedHours) {
      detail.quote.afterHoursPrice = extendedHours.price;
      detail.quote.afterHoursChangePercent = extendedHours.changePercent;
      detail.quote.afterHoursSession = extendedHours.marketState;
    }

    res.json({ ...detail, aiSummary: null, chart });
  } catch (err) {
    handleError("detail", err, res);
  }
});

stocksRouter.get("/:symbol/chart", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const range = String(req.query.range || "1D") as ChartTimeframe;
  if (!VALID_TIMEFRAMES.includes(range)) {
    res.status(400).json({ error: `Invalid range. Use one of ${VALID_TIMEFRAMES.join(", ")}` });
    return;
  }
  try {
    const points = await getChart(symbol, range);
    res.json({ symbol, range, points });
  } catch (err) {
    handleError("chart", err, res);
  }
});

stocksRouter.get("/:symbol/news", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const news = await getNews(symbol);
    res.json(news.slice(0, 20));
  } catch (err) {
    handleError("news", err, res);
  }
});

stocksRouter.get("/:symbol/fundamentals", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const [fundamentals, insiders] = await Promise.all([
      getFundamentals(symbol),
      getInsiderTransactions(symbol).catch(() => []),
    ]);
    res.json({ ...fundamentals, insiderTransactions: insiders });
  } catch (err) {
    handleError("fundamentals", err, res);
  }
});

stocksRouter.get("/:symbol/filings", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const filings = await getFilings(symbol);
    res.json(filings);
  } catch (err) {
    handleError("filings", err, res);
  }
});
