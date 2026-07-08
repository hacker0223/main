import type { ChartResponse, StockDetail, StockQuote, StockSearchResult } from "@summit/shared";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not set — add it to apps/mobile/.env");
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
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
