import { generateRandomCandles } from "./generateRandomCandles";
import type { SandboxCandle } from "./types";

export interface MockSeries {
  id: string;
  label: string;
  description: string;
  candles: SandboxCandle[];
}

// Illustrative-only series, deliberately not named after any real ticker —
// this is the mocked stand-in for "load real historical data," swapped for
// a real market-data call later. Fixed seeds keep each one reproducible.
export const mockHistoricalSeries: MockSeries[] = [
  {
    id: "steady-climb",
    label: "Steady Climb",
    description: "Low-volatility uptrend — good for practicing moving-average reads.",
    candles: generateRandomCandles(90, { startPrice: 82, volatility: 0.012, seed: 1001 }),
  },
  {
    id: "choppy-range",
    label: "Choppy Range",
    description: "Sideways chop with no clear trend — good for support/resistance practice.",
    candles: generateRandomCandles(90, { startPrice: 140, volatility: 0.024, seed: 2002 }),
  },
  {
    id: "sharp-breakdown",
    label: "Sharp Breakdown",
    description: "Calm start, then a volatile leg down — good for spotting momentum shifts.",
    candles: generateRandomCandles(90, { startPrice: 65, volatility: 0.018, seed: 3003 }),
  },
];
