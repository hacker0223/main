// Thin re-export over the existing technicals math (src/features/stock-detail/technicals.ts)
// so the sandbox reuses the same formulas as the real Technicals tab instead
// of a second implementation.
export {
  calculateSMASeries,
  calculateEMASeries,
  calculateRSISeries,
  calculateMACDSeries,
  calculateBollingerSeries,
  type MacdSeries,
  type BollingerSeriesPoint,
} from "../stock-detail/technicals";
