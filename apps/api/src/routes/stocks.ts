import { Router } from "express";
import type { ChartTimeframe } from "@summit/shared";
import { getNews, getQuoteSummary, getStockDetail, searchStocks } from "../services/finnhub";
import { getChart } from "../services/chart";

const VALID_TIMEFRAMES: ChartTimeframe[] = ["1D", "1W", "1M", "6M", "YTD", "1Y", "5Y", "MAX"];

export const stocksRouter = Router();

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
    res.status(502).json({ error: (err as Error).message });
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
        } catch {
          return null;
        }
      })
    );
    res.json(quotes.filter(Boolean));
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

stocksRouter.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const detail = await getStockDetail(symbol);
    const chart = await getChart(symbol, "1D");
    res.json({ ...detail, aiSummary: null, chart });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
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
    res.status(502).json({ error: (err as Error).message });
  }
});

stocksRouter.get("/:symbol/news", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const news = await getNews(symbol);
    res.json(news.slice(0, 20));
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});
