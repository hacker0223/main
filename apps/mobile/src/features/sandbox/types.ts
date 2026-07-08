// Self-contained types for the chart sandbox. Deliberately NOT reusing the
// shared ChartPoint type (which uses `timestamp`) — this module is isolated
// from the live stocks data layer by design, so it can't be affected by (or
// accidentally affect) anything real-data-related.
export interface SandboxCandle {
  time: number; // index-based synthetic time, ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type IndicatorKey = "sma20" | "sma50" | "ema20" | "bollinger" | "rsi" | "macd";

export interface TrendlineDrawing {
  id: string;
  type: "trendline";
  from: { index: number; price: number };
  to: { index: number; price: number };
}

export type Drawing = TrendlineDrawing;

export interface SupportResistanceZone {
  label: string;
  kind: "support" | "resistance";
  priceLow: number;
  priceHigh: number;
}

export interface PatternMatch {
  name: string;
  description: string;
  startIndex: number;
  endIndex: number;
}

export interface AnalysisResult {
  patterns: PatternMatch[];
  zones: SupportResistanceZone[];
  watchFor: string;
  disclaimer: string;
  generatedAt: number;
}

export type DataSource = "blank" | "random" | "mock-historical";
