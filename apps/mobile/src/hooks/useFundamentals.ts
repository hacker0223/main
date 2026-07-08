import { useCallback } from "react";
import { fetchFundamentals } from "../api/client";
import { useAsync } from "./useAsync";

export function useFundamentals(symbol: string | undefined) {
  const fetcher = useCallback(() => {
    if (!symbol) return Promise.reject(new Error("No symbol"));
    return fetchFundamentals(symbol);
  }, [symbol]);

  return useAsync(fetcher, [symbol]);
}
