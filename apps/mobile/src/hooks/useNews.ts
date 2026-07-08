import { useCallback } from "react";
import { fetchNews } from "../api/client";
import { useAsync } from "./useAsync";

export function useNews(symbol: string | undefined) {
  const fetcher = useCallback(() => {
    if (!symbol) return Promise.reject(new Error("No symbol"));
    return fetchNews(symbol);
  }, [symbol]);

  return useAsync(fetcher, [symbol]);
}
