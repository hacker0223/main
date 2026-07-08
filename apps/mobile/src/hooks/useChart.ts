import { useCallback } from "react";
import type { ChartTimeframe } from "@summit/shared";
import { fetchChart } from "../api/client";
import { useAsync } from "./useAsync";

export function useChart(symbol: string | undefined, range: ChartTimeframe) {
  const fetcher = useCallback(() => {
    if (!symbol) return Promise.reject(new Error("No symbol"));
    return fetchChart(symbol, range);
  }, [symbol, range]);

  return useAsync(fetcher, [symbol, range]);
}
