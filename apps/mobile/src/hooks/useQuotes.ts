import { useCallback } from "react";
import { fetchQuotes } from "../api/client";
import { useAsync } from "./useAsync";

export function useQuotes(symbols: string[]) {
  const key = symbols.join(",");
  const fetcher = useCallback(() => fetchQuotes(symbols), [key]);
  return useAsync(fetcher, [key]);
}
