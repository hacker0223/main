import type {
  ChartResponse,
  Filing,
  FundamentalsData,
  InsiderTransaction,
  StockDetail,
  StockQuote,
  StockSearchResult,
} from "@summit/shared";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

async function apiGet<T>(path: string): Promise<T> {
  if (!API_URL) {
    throw new Error("Can't reach the server — app isn't configured with a backend URL.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("That took too long to load. Check your connection and try again.");
    }
    throw new Error("Can't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchStockDetail(symbol: string): Promise<StockDetail> {
  return apiGet(`/api/stocks/${encodeURIComponent(symbol)}`);
}

export function fetchChart(symbol: string, range: string): Promise<ChartResponse> {
  return apiGet(`/api/stocks/${encodeURIComponent(symbol)}/chart?range=${range}`);
}

export function searchStocks(query: string): Promise<StockSearchResult[]> {
  return apiGet(`/api/stocks/search?q=${encodeURIComponent(query)}`);
}

export function fetchQuotes(symbols: string[]): Promise<StockQuote[]> {
  return apiGet(`/api/stocks/quotes?symbols=${symbols.map(encodeURIComponent).join(",")}`);
}

export interface NewsItem {
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  image: string;
}

export function fetchNews(symbol: string): Promise<NewsItem[]> {
  return apiGet(`/api/stocks/${encodeURIComponent(symbol)}/news`);
}

export function fetchFundamentals(symbol: string): Promise<FundamentalsData & { insiderTransactions: InsiderTransaction[] }> {
  return apiGet(`/api/stocks/${encodeURIComponent(symbol)}/fundamentals`);
}

export function fetchFilings(symbol: string): Promise<Filing[]> {
  return apiGet(`/api/stocks/${encodeURIComponent(symbol)}/filings`);
}

export interface ScreenerEntry {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  week52High?: number;
}

export function fetchScreener(kind: "gainers" | "losers" | "52w-highs"): Promise<ScreenerEntry[]> {
  return apiGet(`/api/stocks/screeners/${kind}`);
}
