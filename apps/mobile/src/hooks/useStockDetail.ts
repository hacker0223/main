import { useCallback } from "react";
import { fetchStockDetail } from "../api/client";
import { useAsync } from "./useAsync";

export function useStockDetail(symbol: string | undefined) {
  const fetcher = useCallback(() => {
    if (!symbol) return Promise.reject(new Error("No symbol"));
    return fetchStockDetail(symbol);
  }, [symbol]);

  return useAsync(fetcher, [symbol]);
}
