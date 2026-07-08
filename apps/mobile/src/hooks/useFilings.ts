import { useCallback } from "react";
import { fetchFilings } from "../api/client";
import { useAsync } from "./useAsync";

export function useFilings(symbol: string | undefined) {
  const fetcher = useCallback(() => {
    if (!symbol) return Promise.reject(new Error("No symbol"));
    return fetchFilings(symbol);
  }, [symbol]);

  return useAsync(fetcher, [symbol]);
}
