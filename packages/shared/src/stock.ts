export interface StockQuote {
  symbol: string;
  companyName: string;
  logoUrl?: string;
  price: number;
  change: number;
  changePercent: number;
  afterHoursPrice?: number;
  afterHoursChangePercent?: number;
}

export interface StockKeyStats {
  marketCap: number;
  peTrailing: number | null;
  peForward: number | null;
  eps: number | null;
  dividendYield: number | null;
  week52Low: number;
  week52High: number;
  avgVolume: number;
  volume: number | null;
  beta: number | null;
}

export type ChartTimeframe = "1D" | "1W" | "1M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";

export interface ChartPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartResponse {
  symbol: string;
  range: ChartTimeframe;
  points: ChartPoint[];
}

export interface AnalystConsensus {
  buy: number;
  hold: number;
  sell: number;
  averagePriceTarget: number | null;
}

export interface StockDetail {
  quote: StockQuote;
  keyStats: StockKeyStats;
  sector: string;
  industry: string;
  description: string;
  analystConsensus: AnalystConsensus | null;
  aiSummary: string | null;
  chart: ChartPoint[];
}

export interface StockSearchResult {
  symbol: string;
  companyName: string;
  type: string;
}
