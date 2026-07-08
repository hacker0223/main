import { useEffect, useRef, useState } from "react";
import type { StockSearchResult } from "@summit/shared";
import { searchStocks } from "../api/client";

export function useStockSearch(query: string) {
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      searchStocks(trimmed)
        .then((r) => {
          if (id === requestId.current) {
            setResults(r);
            setLoading(false);
            setError(null);
          }
        })
        .catch((err: Error) => {
          if (id === requestId.current) {
            setError(err.message);
            setLoading(false);
          }
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return { results, loading, error };
}
