import { useEffect, useState } from "react";
import { fetchChart } from "../api/client";
import { computePairStats, type PairStats } from "../features/stock-detail/pairStats";

// A real regression + Monte Carlo significance test needs more history than
// the 1-month chart Compare already shows visually (~20 points — too few
// for either step to be meaningful) — so this fetches its own 6-month
// window for exactly the two symbols being compared, independent of
// whatever range the visual chart is using.
export function usePairStats(symbolA: string | null, symbolB: string | null) {
  const [data, setData] = useState<PairStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbolA || !symbolB) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchChart(symbolA, "6M"), fetchChart(symbolB, "6M")])
      .then(([chartA, chartB]) => {
        if (cancelled) return;
        const closesA = chartA.points.map((p) => p.close);
        const closesB = chartB.points.map((p) => p.close);
        setData(computePairStats(closesA, closesB));
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbolA, symbolB]);

  return { data, loading, error };
}
