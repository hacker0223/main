import type {
  AnalystConsensus,
  FinancialLineItem,
  FundamentalsData,
  InsiderTransaction,
  StockDetail,
  StockKeyStats,
  StockQuote,
  StockSearchResult,
} from "@summit/shared";
import { cached } from "./cache";
import { fetchWithTimeout, NotFoundError, RateLimitedError } from "./errors";

const BASE_URL = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY;

if (!API_KEY) {
  throw new Error("FINNHUB_API_KEY is not set. Add it to apps/api/.env");
}

async function finnhubGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(BASE_URL + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("token", API_KEY as string);

  const res = await fetchWithTimeout(url.toString(), {}, 8000);
  if (res.status === 429) {
    throw new RateLimitedError();
  }
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

// Finnhub doesn't 404 for unknown tickers — /quote returns all-zero fields
// with t:0 instead. Treat that as "not found" rather than a real $0 quote.
function isValidQuote(quote: FinnhubQuote): boolean {
  return quote.t !== 0;
}

export async function getQuoteSummary(symbol: string): Promise<StockQuote> {
  const [quote, profile] = await Promise.all([getQuote(symbol), getProfile(symbol)]);
  if (!isValidQuote(quote)) {
    throw new NotFoundError(`Unknown symbol: ${symbol}`);
  }
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
    getMetrics(symbol).catch(() => ({ metric: {} }) as FinnhubMetric),
    getRecommendations(symbol).catch(() => []),
  ]);

  if (!isValidQuote(quote)) {
    throw new NotFoundError(`Unknown symbol: ${symbol}`);
  }

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

interface FinnhubReportConcept {
  concept: string;
  value: number;
  label: string;
}

interface FinnhubFinancialsReported {
  data: {
    form: string;
    year: number;
    endDate: string;
    filedDate: string;
    report: {
      ic?: FinnhubReportConcept[];
      bs?: FinnhubReportConcept[];
    };
  }[];
}

// Prioritized GAAP concept candidates per line — companies tag the same
// real-world figure with slightly different concepts, so we take the first
// match from each candidate list rather than requiring an exact name.
const INCOME_STATEMENT_LINES: { label: string; concepts: string[] }[] = [
  { label: "Revenue", concepts: ["us-gaap_Revenues", "us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax", "us-gaap_RevenueFromContractWithCustomerIncludingAssessedTax"] },
  { label: "Cost of Revenue", concepts: ["us-gaap_CostOfGoodsAndServicesSold", "us-gaap_CostOfRevenue"] },
  { label: "Gross Profit", concepts: ["us-gaap_GrossProfit"] },
  { label: "Operating Income", concepts: ["us-gaap_OperatingIncomeLoss"] },
  { label: "Net Income", concepts: ["us-gaap_NetIncomeLoss", "us-gaap_ProfitLoss"] },
  { label: "EPS (Diluted)", concepts: ["us-gaap_EarningsPerShareDiluted"] },
];

const BALANCE_SHEET_LINES: { label: string; concepts: string[] }[] = [
  { label: "Cash & Equivalents", concepts: ["us-gaap_CashAndCashEquivalentsAtCarryingValue"] },
  { label: "Total Current Assets", concepts: ["us-gaap_AssetsCurrent"] },
  { label: "Total Assets", concepts: ["us-gaap_Assets"] },
  { label: "Total Current Liabilities", concepts: ["us-gaap_LiabilitiesCurrent"] },
  { label: "Total Liabilities", concepts: ["us-gaap_Liabilities"] },
  { label: "Total Equity", concepts: ["us-gaap_StockholdersEquity", "us-gaap_StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"] },
];

function extractLines(
  concepts: FinnhubReportConcept[] | undefined,
  targets: { label: string; concepts: string[] }[]
): FinancialLineItem[] {
  if (!concepts) return [];
  const byConcept = new Map(concepts.map((c) => [c.concept, c]));
  const lines: FinancialLineItem[] = [];
  for (const target of targets) {
    const match = target.concepts.map((c) => byConcept.get(c)).find(Boolean);
    if (match) lines.push({ label: target.label, value: match.value });
  }
  return lines;
}

export async function getFundamentals(symbol: string): Promise<FundamentalsData> {
  return cached(`fundamentals:${symbol}`, 3_600_000, async () => {
    const data = await finnhubGet<FinnhubFinancialsReported>("/stock/financials-reported", {
      symbol,
      freq: "annual",
    });
    const latest = data.data?.[0];
    if (!latest) {
      throw new NotFoundError(`No financial statements found for ${symbol}`);
    }
    return {
      form: latest.form,
      fiscalYear: latest.year,
      periodEnd: latest.endDate,
      filedDate: latest.filedDate,
      incomeStatement: extractLines(latest.report.ic, INCOME_STATEMENT_LINES),
      balanceSheet: extractLines(latest.report.bs, BALANCE_SHEET_LINES),
    };
  });
}

interface FinnhubInsiderTransaction {
  name: string;
  share: number;
  change: number;
  transactionDate: string;
  transactionCode: string;
}

export async function getInsiderTransactions(symbol: string): Promise<InsiderTransaction[]> {
  return cached(`insider:${symbol}`, 3_600_000, async () => {
    const data = await finnhubGet<{ data: FinnhubInsiderTransaction[] }>("/stock/insider-transactions", {
      symbol,
    });
    return (data.data || []).slice(0, 15).map((t) => ({
      name: t.name,
      shares: t.share,
      change: t.change,
      transactionDate: t.transactionDate,
      transactionCode: t.transactionCode,
    }));
  });
}

// Moderate universe of liquid, well-known stocks across sectors — kept
// small deliberately to stay well under Finnhub's free-tier 60 req/min cap
// even on a fully cold cache.
const SCREENER_UNIVERSE = [
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AVGO",
  "JPM", "V", "MA", "JNJ", "UNH", "PG", "KO", "PEP",
  "XOM", "CVX", "HD", "DIS",
];

export interface ScreenerEntry {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  week52High?: number;
}

export async function getScreener(kind: "gainers" | "losers" | "52w-highs"): Promise<ScreenerEntry[]> {
  return cached(`screener:${kind}`, 120_000, async () => {
    const quotes = await Promise.all(
      SCREENER_UNIVERSE.map(async (symbol) => {
        try {
          const quote = await getQuoteSummary(symbol);
          return quote;
        } catch {
          return null;
        }
      })
    );
    const valid = quotes.filter((q): q is StockQuote => q !== null);

    if (kind === "gainers") {
      return valid
        .filter((q) => q.changePercent > 0)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 10)
        .map((q) => ({ symbol: q.symbol, companyName: q.companyName, price: q.price, change: q.change, changePercent: q.changePercent }));
    }

    if (kind === "losers") {
      return valid
        .filter((q) => q.changePercent < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 10)
        .map((q) => ({ symbol: q.symbol, companyName: q.companyName, price: q.price, change: q.change, changePercent: q.changePercent }));
    }

    // 52w-highs: needs metrics too, fetched per-symbol with the existing 1hr cache
    const withMetrics = await Promise.all(
      valid.map(async (q) => {
        try {
          const metrics = await getMetrics(q.symbol);
          const week52High = metrics.metric["52WeekHigh"];
          return { ...q, week52High };
        } catch {
          return { ...q, week52High: undefined };
        }
      })
    );
    return withMetrics
      .filter((q) => q.week52High !== undefined && q.price >= q.week52High * 0.98)
      .sort((a, b) => b.price / (b.week52High ?? 1) - a.price / (a.week52High ?? 1))
      .slice(0, 10)
      .map((q) => ({
        symbol: q.symbol,
        companyName: q.companyName,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        week52High: q.week52High,
      }));
  });
}
