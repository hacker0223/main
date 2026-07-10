import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchChart } from "../../api/client";
import { analyzeChart } from "./analyzeChart";
import { generateRandomCandles } from "./generateRandomCandles";
import { mockHistoricalSeries } from "./mockHistoricalData";
import type { AnalysisResult, DataSource, Drawing, IndicatorKey, SandboxCandle, TrendlineDrawing } from "./types";

const BLANK_CANDLE_COUNT = 30;
const BLANK_START_PRICE = 100;

function makeBlankCandles(): SandboxCandle[] {
  const now = Date.now();
  const dayMs = 86_400_000;
  // open/close start a hair apart (not exactly equal) so their drag handles
  // never perfectly overlap — a doji starting candle would make the two
  // handles impossible to grab independently.
  return Array.from({ length: BLANK_CANDLE_COUNT }, (_, i) => ({
    time: now - (BLANK_CANDLE_COUNT - i) * dayMs,
    open: BLANK_START_PRICE - 0.15,
    high: BLANK_START_PRICE + 1,
    low: BLANK_START_PRICE - 1,
    close: BLANK_START_PRICE + 0.15,
    volume: 1_000_000,
  }));
}

export interface ReplayState {
  active: boolean;
  playing: boolean;
  visibleCount: number;
  speedMs: number;
}

export interface ViewRange {
  start: number;
  end: number; // exclusive
}

export function useSandboxState() {
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  // Which mock-historical series is loaded, so "New chart" can regenerate
  // the same one instead of forcing the user to reopen the picker.
  const [activeMockId, setActiveMockId] = useState<string | null>(null);
  // Same idea for an imported real stock — remembered so "New chart" can
  // re-fetch the same symbol instead of bouncing back to the picker.
  const [activeImportSymbol, setActiveImportSymbol] = useState<string | null>(null);
  const [importState, setImportState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });
  const [candles, setCandles] = useState<SandboxCandle[]>([]);
  const [selectedCandleIndex, setSelectedCandleIndex] = useState<number | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [drawMode, setDrawMode] = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState<Set<IndicatorKey>>(new Set());
  const [viewRange, setViewRange] = useState<ViewRange>({ start: 0, end: 0 });
  const [replay, setReplay] = useState<ReplayState>({ active: false, playing: false, visibleCount: 0, speedMs: 700 });
  const [analysis, setAnalysis] = useState<{ data: AnalysisResult | null; loading: boolean; error: string | null }>({
    data: null,
    loading: false,
    error: null,
  });

  const resetViewToFull = useCallback((length: number) => {
    setViewRange({ start: 0, end: length });
  }, []);

  const loadBlank = useCallback(() => {
    const next = makeBlankCandles();
    setCandles(next);
    setDataSource("blank");
    setDrawings([]);
    setSelectedCandleIndex(null);
    setReplay({ active: false, playing: false, visibleCount: next.length, speedMs: 700 });
    setAnalysis({ data: null, loading: false, error: null });
    resetViewToFull(next.length);
  }, [resetViewToFull]);

  const loadRandom = useCallback(() => {
    const next = generateRandomCandles(80);
    setCandles(next);
    setDataSource("random");
    setDrawings([]);
    setSelectedCandleIndex(null);
    setReplay({ active: false, playing: false, visibleCount: next.length, speedMs: 700 });
    setAnalysis({ data: null, loading: false, error: null });
    resetViewToFull(next.length);
  }, [resetViewToFull]);

  const loadMock = useCallback(
    (seriesId: string) => {
      const series = mockHistoricalSeries.find((s) => s.id === seriesId);
      if (!series) return;
      setCandles(series.candles);
      setDataSource("mock-historical");
      setActiveMockId(seriesId);
      setDrawings([]);
      setSelectedCandleIndex(null);
      setReplay({ active: false, playing: false, visibleCount: series.candles.length, speedMs: 700 });
      setAnalysis({ data: null, loading: false, error: null });
      resetViewToFull(series.candles.length);
    },
    [resetViewToFull]
  );

  // Loads a real stock's actual historical daily candles into the sandbox —
  // still a read-only practice surface (drawings/edits never leave this
  // screen, nothing here is a live position or an order), just backed by a
  // real chart shape instead of illustrative/random data.
  const importStock = useCallback(
    async (symbol: string) => {
      const ticker = symbol.toUpperCase();
      setImportState({ loading: true, error: null });
      try {
        const chart = await fetchChart(ticker, "6M");
        if (chart.points.length < 15) {
          setImportState({ loading: false, error: `Not enough recent trading history for ${ticker}.` });
          return;
        }
        const next: SandboxCandle[] = chart.points.map((p) => ({
          time: p.timestamp,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          volume: p.volume,
        }));
        setCandles(next);
        setDataSource("imported");
        setActiveImportSymbol(ticker);
        setDrawings([]);
        setSelectedCandleIndex(null);
        setReplay({ active: false, playing: false, visibleCount: next.length, speedMs: 700 });
        setAnalysis({ data: null, loading: false, error: null });
        resetViewToFull(next.length);
        setImportState({ loading: false, error: null });
      } catch (err) {
        setImportState({ loading: false, error: (err as Error).message });
      }
    },
    [resetViewToFull]
  );

  const reset = useCallback(() => {
    setDataSource(null);
    setActiveMockId(null);
    setActiveImportSymbol(null);
    setImportState({ loading: false, error: null });
    setCandles([]);
    setDrawings([]);
    setSelectedCandleIndex(null);
    setReplay({ active: false, playing: false, visibleCount: 0, speedMs: 700 });
    setAnalysis({ data: null, loading: false, error: null });
    setViewRange({ start: 0, end: 0 });
  }, []);

  // Regenerates a fresh chart of whatever type is currently active, without
  // returning to the data-source picker — "New chart" should feel like a
  // restart of the same practice session, not an exit from the tab.
  const newChart = useCallback(() => {
    if (dataSource === "blank") loadBlank();
    else if (dataSource === "random") loadRandom();
    else if (dataSource === "mock-historical" && activeMockId) loadMock(activeMockId);
    else if (dataSource === "imported" && activeImportSymbol) importStock(activeImportSymbol);
    else reset();
  }, [dataSource, activeMockId, activeImportSymbol, loadBlank, loadRandom, loadMock, importStock, reset]);

  const updateCandle = useCallback((index: number, patch: Partial<Omit<SandboxCandle, "time">>) => {
    setCandles((prev) => {
      const next = [...prev];
      const merged = { ...next[index], ...patch };
      // Keep OHLC internally consistent: high is always >= max(open, close),
      // low always <= min(open, close), regardless of which handle moved.
      merged.high = Math.max(merged.high, merged.open, merged.close);
      merged.low = Math.min(merged.low, merged.open, merged.close);
      next[index] = merged;
      return next;
    });
  }, []);

  const addCandleAfter = useCallback((index: number) => {
    setCandles((prev) => {
      const base = prev[index] ?? prev[prev.length - 1];
      if (!base) return prev;
      const dayMs = 86_400_000;
      const newCandle: SandboxCandle = {
        time: base.time + dayMs,
        open: base.close,
        high: base.close + 1,
        low: base.close - 1,
        close: base.close,
        volume: base.volume,
      };
      const next = [...prev.slice(0, index + 1), newCandle, ...prev.slice(index + 1)];
      return next;
    });
    // The view window doesn't track candle count on its own, so a candle
    // added at (or past) the current right edge would otherwise land just
    // outside viewRange and never actually appear — "Add candle" looking
    // like it does nothing.
    setViewRange((prev) => (index + 1 >= prev.end ? { start: prev.start, end: prev.end + 1 } : prev));
  }, []);

  const selectCandle = useCallback((index: number | null) => {
    setSelectedCandleIndex(index);
  }, []);

  const toggleDrawMode = useCallback(() => {
    setDrawMode((prev) => !prev);
    setSelectedCandleIndex(null);
  }, []);

  const addTrendline = useCallback((from: TrendlineDrawing["from"], to: TrendlineDrawing["to"]) => {
    setDrawings((prev) => [...prev, { id: `tl-${Date.now()}`, type: "trendline", from, to }]);
  }, []);

  const removeDrawing = useCallback((id: string) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearDrawings = useCallback(() => setDrawings([]), []);

  const toggleIndicator = useCallback((key: IndicatorKey) => {
    setSelectedIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const effectiveCandles = useMemo(
    () => (replay.active ? candles.slice(0, replay.visibleCount) : candles),
    [candles, replay.active, replay.visibleCount]
  );

  const startReplay = useCallback(() => {
    setReplay({ active: true, playing: false, visibleCount: Math.min(15, candles.length), speedMs: 700 });
    setViewRange({ start: 0, end: Math.min(15, candles.length) });
    setAnalysis({ data: null, loading: false, error: null });
  }, [candles.length]);

  const exitReplay = useCallback(() => {
    setReplay({ active: false, playing: false, visibleCount: candles.length, speedMs: 700 });
    resetViewToFull(candles.length);
  }, [candles.length, resetViewToFull]);

  const stepReplay = useCallback(
    (delta: number) => {
      setReplay((prev) => {
        const visibleCount = Math.max(1, Math.min(candles.length, prev.visibleCount + delta));
        return { ...prev, visibleCount, playing: false };
      });
    },
    [candles.length]
  );

  const togglePlaying = useCallback(() => {
    setReplay((prev) => ({ ...prev, playing: !prev.playing }));
  }, []);

  const setReplaySpeed = useCallback((speedMs: number) => {
    setReplay((prev) => ({ ...prev, speedMs }));
  }, []);

  // Auto-advance while playing.
  const candlesLength = candles.length;
  useEffect(() => {
    if (!replay.playing) return;
    const timer = setInterval(() => {
      setReplay((prev) => {
        if (prev.visibleCount >= candlesLength) {
          return { ...prev, playing: false };
        }
        return { ...prev, visibleCount: prev.visibleCount + 1 };
      });
    }, replay.speedMs);
    return () => clearInterval(timer);
  }, [replay.playing, replay.speedMs, candlesLength]);

  // Keep the view window following replay reveals so newly revealed candles
  // stay on screen instead of requiring a manual pan.
  useEffect(() => {
    if (!replay.active) return;
    setViewRange((prev) => {
      const windowSize = Math.max(prev.end - prev.start, 15);
      const end = replay.visibleCount;
      const start = Math.max(0, end - windowSize);
      return { start, end };
    });
  }, [replay.active, replay.visibleCount]);

  const runAnalysis = useCallback(async () => {
    if (effectiveCandles.length === 0) return;
    setAnalysis({ data: null, loading: true, error: null });
    try {
      const result = await analyzeChart(effectiveCandles, Array.from(selectedIndicators), drawings);
      setAnalysis({ data: result, loading: false, error: null });
    } catch (err) {
      setAnalysis({ data: null, loading: false, error: (err as Error).message });
    }
  }, [effectiveCandles, selectedIndicators, drawings]);

  const zoom = useCallback(
    (factor: number, anchorIndex?: number) => {
      setViewRange((prev) => {
        const total = effectiveCandles.length;
        const currentSize = prev.end - prev.start;
        const newSize = Math.max(10, Math.min(total, Math.round(currentSize * factor)));
        const anchor = anchorIndex ?? (prev.start + prev.end) / 2;
        let start = Math.round(anchor - newSize / 2);
        let end = start + newSize;
        if (start < 0) {
          end -= start;
          start = 0;
        }
        if (end > total) {
          start -= end - total;
          end = total;
        }
        return { start: Math.max(0, start), end: Math.min(total, end) };
      });
    },
    [effectiveCandles.length]
  );

  const pan = useCallback(
    (deltaIndex: number) => {
      setViewRange((prev) => {
        const total = effectiveCandles.length;
        const size = prev.end - prev.start;
        let start = prev.start + deltaIndex;
        start = Math.max(0, Math.min(total - size, start));
        return { start, end: start + size };
      });
    },
    [effectiveCandles.length]
  );

  return {
    dataSource,
    activeImportSymbol,
    importState,
    importStock,
    candles,
    effectiveCandles,
    selectedCandleIndex,
    drawings,
    drawMode,
    selectedIndicators,
    viewRange,
    replay,
    analysis,
    loadBlank,
    loadRandom,
    loadMock,
    reset,
    newChart,
    updateCandle,
    addCandleAfter,
    selectCandle,
    toggleDrawMode,
    addTrendline,
    removeDrawing,
    clearDrawings,
    toggleIndicator,
    startReplay,
    exitReplay,
    stepReplay,
    togglePlaying,
    setReplaySpeed,
    runAnalysis,
    zoom,
    pan,
  };
}

export type SandboxStateApi = ReturnType<typeof useSandboxState>;
