import { useCallback } from "react";
import { fetchSparklines } from "../api/client";
import { useAsync } from "./useAsync";

// Sparklines are purely decorative context on a row — never block or error
// the list on them. This returns the by-symbol map (or an empty object while
// loading / on failure), so callers can treat "no sparkline yet" the same as
// "this symbol had no data": just don't draw one.
export function useSparklines(symbols: string[]) {
  const key = symbols.join(",");
  const fetcher = useCallback(async () => {
    if (symbols.length === 0) return {} as Record<string, number[]>;
    return fetchSparklines(symbols);
  }, [key]);
  const { data } = useAsync(fetcher, [key]);
  return data ?? {};
}
