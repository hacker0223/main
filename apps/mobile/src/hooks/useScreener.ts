import { useCallback } from "react";
import { fetchScreener, type ScreenerEntry } from "../api/client";
import { useAsync } from "./useAsync";

export function useScreener(kind: "gainers" | "losers" | "52w-highs") {
  const fetcher = useCallback(() => fetchScreener(kind), [kind]);
  return useAsync<ScreenerEntry[]>(fetcher, [kind]);
}
