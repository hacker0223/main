import { useCallback, useState } from "react";
import { fetchAnalogs, fetchChart, fetchClassification, fetchDevilsAdvocate } from "../../api/client";
import type { AnalogsResponse, ClassifyResponse, DevilsAdvocateResponse } from "../../api/client";

const QUERY_WINDOW_LEN = 25; // matches WINDOW_LEN_DEFAULT in apps/pattern-engine/features.py

interface AsyncSlice<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const idle = <T,>(): AsyncSlice<T> => ({ data: null, loading: false, error: null });

export function usePatternLab() {
  const [symbol, setSymbol] = useState<string | null>(null);
  const [closes, setCloses] = useState<number[] | null>(null);
  const [volumes, setVolumes] = useState<number[] | null>(null);
  const [chartState, setChartState] = useState<AsyncSlice<true>>(idle());
  const [analogs, setAnalogs] = useState<AsyncSlice<AnalogsResponse>>(idle());
  const [classification, setClassification] = useState<AsyncSlice<ClassifyResponse>>(idle());
  const [devilsAdvocate, setDevilsAdvocate] = useState<AsyncSlice<DevilsAdvocateResponse>>(idle());

  const loadTicker = useCallback(async (ticker: string) => {
    setSymbol(ticker);
    setCloses(null);
    setVolumes(null);
    setAnalogs(idle());
    setClassification(idle());
    setDevilsAdvocate(idle());
    setChartState({ data: null, loading: true, error: null });
    try {
      const chart = await fetchChart(ticker, "6M");
      if (chart.points.length < QUERY_WINDOW_LEN) {
        throw new Error(`Not enough recent trading history for ${ticker} to form a query window.`);
      }
      const recent = chart.points.slice(-QUERY_WINDOW_LEN);
      setCloses(recent.map((p) => p.close));
      setVolumes(recent.map((p) => p.volume));
      setChartState({ data: true, loading: false, error: null });
    } catch (err) {
      setChartState({ data: null, loading: false, error: (err as Error).message });
    }
  }, []);

  const runAnalogs = useCallback(async () => {
    if (!closes) return;
    setAnalogs({ data: null, loading: true, error: null });
    try {
      const result = await fetchAnalogs(closes, volumes ?? undefined);
      setAnalogs({ data: result, loading: false, error: null });
    } catch (err) {
      setAnalogs({ data: null, loading: false, error: (err as Error).message });
    }
  }, [closes, volumes]);

  const runClassification = useCallback(async () => {
    if (!closes) return;
    setClassification({ data: null, loading: true, error: null });
    try {
      const result = await fetchClassification(closes, volumes ?? undefined);
      setClassification({ data: result, loading: false, error: null });
    } catch (err) {
      setClassification({ data: null, loading: false, error: (err as Error).message });
    }
  }, [closes, volumes]);

  const runDevilsAdvocate = useCallback(
    async (userThesis: string) => {
      if (!symbol) return;
      setDevilsAdvocate({ data: null, loading: true, error: null });
      try {
        const chartDescription = `${symbol}, last ${QUERY_WINDOW_LEN} trading days`;
        const result = await fetchDevilsAdvocate(chartDescription, userThesis);
        setDevilsAdvocate({ data: result, loading: false, error: null });
      } catch (err) {
        setDevilsAdvocate({ data: null, loading: false, error: (err as Error).message });
      }
    },
    [symbol]
  );

  const reset = useCallback(() => {
    setSymbol(null);
    setCloses(null);
    setVolumes(null);
    setChartState(idle());
    setAnalogs(idle());
    setClassification(idle());
    setDevilsAdvocate(idle());
  }, []);

  return {
    symbol,
    closes,
    chartState,
    analogs,
    classification,
    devilsAdvocate,
    loadTicker,
    runAnalogs,
    runClassification,
    runDevilsAdvocate,
    reset,
  };
}

export type PatternLabApi = ReturnType<typeof usePatternLab>;
