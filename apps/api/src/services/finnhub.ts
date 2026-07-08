import type { AnalystConsensus, StockDetail, StockKeyStats, StockQuote, StockSearchResult } from "@summit/shared";
import { cached } from "./cache";

const BASE_URL = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY;

if (!API_KEY) {
  throw new Error("FINNHUB_API_KEY is not set. Add it to apps/api/.env");
}

async function finnhubGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(BASE_URL + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("token", API_KEY as string);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Finnhub ${path} failed: ${res.status}`);
  }
  const body = (await res.json()) as T & { error?: string };
  if (body && typeof body === "object" && "error" in body && body.error) {
    throw new Error(`Finnhub ${path} error: ${body.error}`);
  }
  return body;
}

interface FinnhubQuote {
  c: number; // current price
  d: number; // change
  dp: number; // change percent
  h: number;
  l: number;
  o: number;
  pc: number; // previous close
  t: number;
}

interface FinnhubProfile {
  ticker: string;
  name: string;
  logo: string;
  finnhubIndustry: string;
  marketCapitalization: number;
  weburl: string;
  exchange: string;
  ipo: string;
  country: string;
}

interface FinnhubMetric {
  metric: {
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
    beta?: number;
    peTTM?: number;
    peExclExtraTTM?: number;
    forwardPE?: number;
    epsTTM?: number;
    currentDividendYieldTTM?: number;
    "10DayAverageTradingVolume"?: number;
  };
}

interface FinnhubRecommendation {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

interface FinnhubSearchResult {
  count: number;
  result: { symbol: string; description: string; type: string; displaySymbol: string }[];
}

export interface FinnhubNewsItem {
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  image: string;
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  return cached(`search:${query.toLowerCase()}`, 60_000, async () => {
    const data = await finnhubGet<FinnhubSearchResult>("/search", { q: query });
    return data.result
      .filter((r) => !r.symbol.includes(".") && (r.type === "Common Stock" || r.type === "ETP"))
      .slice(0, 25)
      .map((r) => ({ symbol: r.symbol, companyName: r.description, type: r.type }));
  });
}

async function getQuote(symbol: string): Promise<FinnhubQuote> {
  return cached(`quote:${symbol}`, 15_000, () => finnhubGet<FinnhubQuote>("/quote", { symbol }));
}

async function getProfile(symbol: string): Promise<FinnhubProfile> {
  return cached(`profile:${symbol}`, 3_600_000, () =>
    finnhubGet<FinnhubProfile>("/stock/profile2", { symbol })
  );
}

async function getMetrics(symbol: string): Promise<FinnhubMetric> {
  return cached(`metric:${symbol}`, 3_600_000, () =>
    finnhubGet<FinnhubMetric>("/stock/metric", { symbol, metric: "all" })
  );
}

async function getRecommendations(symbol: string): Promise<FinnhubRecommendation[]> {
  return cached(`rec:${symbol}`, 3_600_000, () =>
    finnhubGet<FinnhubRecommendation[]>("/stock/recommendation", { symbol })
  );
}

export async function getNews(symbol: string): Promise<FinnhubNewsItem[]> {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return cached(`news:${symbol}`, 600_000, () =>
    finnhubGet<FinnhubNewsItem[]>("/company-news", { symbol, from: fmt(from), to: fmt(to) })
  );
}

export async function getQuoteSummary(symbol: string): Promise<StockQuote> {
  const [quote, profile] = await Promise.all([getQuote(symbol), getProfile(symbol)]);
  return {
    symbol,
    companyName: profile.name || symbol,
    logoUrl: profile.logo || undefined,
    price: quote.c,
    change: quote.d,
    changePercent: quote.dp,
  };
}

function buildFactsLine(profile: FinnhubProfile): string {
  const parts: string[] = [];
  if (profile.exchange) parts.push(`Trades on ${profile.exchange}`);
  if (profile.ipo) parts.push(`IPO'd ${profile.ipo.slice(0, 4)}`);
  if (profile.country) parts.push(`Headquartered in ${profile.country}`);
  return parts.length > 0 ? parts.join(" · ") : "No company profile available for this ticker.";
}

export async function getStockDetail(symbol: string): Promise<Omit<StockDetail, "chart" | "aiSummary">> {
  const [quote, profile, metrics, recommendations] = await Promise.all([
    getQuote(symbol),
    getProfile(symbol),
    getMetrics(symbol),
    getRecommendations(symbol).catch(() => []),
  ]);

  const m = metrics.metric;

  const keyStats: StockKeyStats = {
    marketCap: (profile.marketCapitalization || 0) * 1_000_000,
    peTrailing: m.peTTM ?? m.peExclExtraTTM ?? null,
    peForward: m.forwardPE ?? null,
    eps: m.epsTTM ?? null,
    dividendYield: m.currentDividendYieldTTM ?? null,
    week52Low: m["52WeekLow"] ?? quote.l,
    week52High: m["52WeekHigh"] ?? quote.h,
    avgVolume: (m["10DayAverageTradingVolume"] ?? 0) * 1_000_000,
    volume: null,
    beta: m.beta ?? null,
  };

  const latestRec = recommendations[0] ?? null;
  const analystConsensus: AnalystConsensus | null = latestRec
    ? {
        buy: latestRec.strongBuy + latestRec.buy,
        hold: latestRec.hold,
        sell: latestRec.sell + latestRec.strongSell,
        averagePriceTarget: null,
      }
    : null;

  return {
    quote: {
      symbol,
      companyName: profile.name || symbol,
      logoUrl: profile.logo || undefined,
      price: quote.c,
      change: quote.d,
      changePercent: quote.dp,
    },
    keyStats,
    sector: profile.finnhubIndustry || "—",
    industry: profile.finnhubIndustry || "—",
    description: buildFactsLine(profile),
    analystConsensus,
  };
}
