import { useCallback } from "react";
import { fetchChart, fetchClassification } from "../../api/client";
import type { ClassifyResponse } from "../../api/client";
import { useAsync } from "../../hooks/useAsync";

const QUERY_WINDOW_LEN = 25; // matches WINDOW_LEN_DEFAULT in apps/pattern-engine/features.py

// Independent fetch rather than reusing the stock detail screen's own
// useChart hook — that one's data granularity depends on whatever
// timeframe the user has selected (5-minute bars for "1D", weekly for
// "5Y", etc.), but the classifier needs a consistent 25 daily closes
// regardless of what the user is looking at. Matches exactly what Pattern
// Lab's own usePatternLab hook does for the same reason.
export function useStockPatternSignal(symbol: string | undefined) {
  const fetcher = useCallback(async (): Promise<ClassifyResponse | null> => {
    if (!symbol) return null;
    const chart = await fetchChart(symbol, "6M");
    if (chart.points.length < QUERY_WINDOW_LEN) return null;
    const recent = chart.points.slice(-QUERY_WINDOW_LEN);
    const closes = recent.map((p) => p.close);
    const volumes = recent.map((p) => p.volume);
    return fetchClassification(closes, volumes, { narrate: false });
  }, [symbol]);

  return useAsync(fetcher, [symbol]);
}
