import { useEffect, useState } from "react";
import type { ChartPoint, StockDetail } from "@summit/shared";
import { fetchChart, fetchStockDetail } from "../api/client";

export interface CompareEntry {
  symbol: string;
  detail: StockDetail | null;
  chart: ChartPoint[] | null;
  loading: boolean;
  error: string | null;
}

export function useCompareData(symbols: string[]) {
  const [entries, setEntries] = useState<Record<string, CompareEntry>>({});

  useEffect(() => {
    symbols.forEach((symbol) => {
      if (entries[symbol]) return;
      setEntries((prev) => ({ ...prev, [symbol]: { symbol, detail: null, chart: null, loading: true, error: null } }));

      Promise.all([fetchStockDetail(symbol), fetchChart(symbol, "1M")])
        .then(([detail, chart]) => {
          setEntries((prev) => ({
            ...prev,
            [symbol]: { symbol, detail, chart: chart.points, loading: false, error: null },
          }));
        })
        .catch((err: Error) => {
          setEntries((prev) => ({
            ...prev,
            [symbol]: { symbol, detail: null, chart: null, loading: false, error: err.message },
          }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(",")]);

  return symbols.map((s) => entries[s]).filter(Boolean);
}
