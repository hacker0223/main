import type { AnalysisResult, Drawing, IndicatorKey, PatternMatch, SandboxCandle, SupportResistanceZone } from "./types";

const DISCLAIMER =
  "Educational pattern recognition only. Not financial advice. Not a prediction.";

function findSwingPoints(candles: SandboxCandle[], lookaround = 3) {
  const highs: { index: number; price: number }[] = [];
  const lows: { index: number; price: number }[] = [];

  for (let i = lookaround; i < candles.length - lookaround; i++) {
    const window = candles.slice(i - lookaround, i + lookaround + 1);
    const isHigh = window.every((c) => candles[i].high >= c.high);
    const isLow = window.every((c) => candles[i].low <= c.low);
    if (isHigh) highs.push({ index: i, price: candles[i].high });
    if (isLow) lows.push({ index: i, price: candles[i].low });
  }
  return { highs, lows };
}

function detectZones(candles: SandboxCandle[]): SupportResistanceZone[] {
  const { highs, lows } = findSwingPoints(candles);
  const zones: SupportResistanceZone[] = [];

  if (highs.length > 0) {
    const strongest = highs.reduce((a, b) => (b.price > a.price ? b : a));
    zones.push({
      label: "Resistance",
      kind: "resistance",
      priceLow: round2(strongest.price * 0.997),
      priceHigh: round2(strongest.price * 1.003),
    });
  }
  if (lows.length > 0) {
    const strongest = lows.reduce((a, b) => (b.price < a.price ? b : a));
    zones.push({
      label: "Support",
      kind: "support",
      priceLow: round2(strongest.price * 0.997),
      priceHigh: round2(strongest.price * 1.003),
    });
  }
  return zones;
}

function detectTrend(candles: SandboxCandle[]): { direction: "up" | "down" | "flat"; strength: number } {
  const closes = candles.map((c) => c.close);
  const firstThird = closes.slice(0, Math.floor(closes.length / 3));
  const lastThird = closes.slice(-Math.floor(closes.length / 3));
  const avgFirst = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
  const avgLast = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
  const pctChange = (avgLast - avgFirst) / avgFirst;

  const direction = pctChange > 0.03 ? "up" : pctChange < -0.03 ? "down" : "flat";
  return { direction, strength: Math.min(1, Math.abs(pctChange) * 5) };
}

function detectVolatility(candles: SandboxCandle[]): number {
  const returns = candles.slice(1).map((c, i) => (c.close - candles[i].close) / candles[i].close);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

function pickPattern(candles: SandboxCandle[]): PatternMatch {
  const { direction, strength } = detectTrend(candles);
  const volatility = detectVolatility(candles);
  const startIndex = Math.max(0, candles.length - Math.floor(candles.length * 0.6));
  const endIndex = candles.length - 1;

  if (direction === "up" && volatility < 0.015) {
    return {
      name: "Ascending Channel",
      description:
        "Price has been making a series of higher highs and higher lows with relatively contained volatility — a steady, orderly uptrend rather than an explosive one.",
      startIndex,
      endIndex,
    };
  }
  if (direction === "up" && strength > 0.5) {
    return {
      name: "Bull Flag (possible)",
      description:
        "A strong upward move followed by a tighter, shallower pullback — the kind of pause that sometimes precedes a continuation, though a pullback like this can just as easily turn into a deeper reversal.",
      startIndex,
      endIndex,
    };
  }
  if (direction === "down" && volatility > 0.02) {
    return {
      name: "Descending Volatility Expansion",
      description:
        "Price is trending lower with widening candle ranges — larger up-and-down swings alongside the downward drift, typically read as increased disagreement between buyers and sellers.",
      startIndex,
      endIndex,
    };
  }
  if (direction === "down") {
    return {
      name: "Descending Channel",
      description: "A steady series of lower highs and lower lows — an orderly downtrend.",
      startIndex,
      endIndex,
    };
  }
  return {
    name: "Range / Consolidation",
    description:
      "Price is oscillating between a fairly consistent ceiling and floor without a clear directional trend — often described as the market \"making up its mind.\"",
    startIndex,
    endIndex,
  };
}

function buildWatchForText(zones: SupportResistanceZone[], pattern: PatternMatch): string {
  const resistance = zones.find((z) => z.kind === "resistance");
  const support = zones.find((z) => z.kind === "support");
  const parts: string[] = [];

  if (resistance) {
    parts.push(
      `A sustained close above roughly $${resistance.priceHigh.toFixed(2)} is the level technical traders would typically watch for as a breakout confirmation.`
    );
  }
  if (support) {
    parts.push(
      `On the downside, a break below roughly $${support.priceLow.toFixed(2)} would be the level watched for a breakdown confirmation.`
    );
  }
  parts.push(
    `This describes the ${pattern.name.toLowerCase()} pattern as it has played out so far — it is not a forecast of what happens next.`
  );
  return parts.join(" ");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Mocked AI analysis. Grounded in real stats computed from the candles
 * passed in (swing highs/lows, trend direction, volatility) rather than
 * random output, so the response shape and quality are representative of
 * what a real model call should return. Swap the body of this function for
 * a real API call later — the signature and return shape are the contract.
 */
export async function analyzeChart(
  candles: SandboxCandle[],
  _indicators: IndicatorKey[],
  _drawings: Drawing[]
): Promise<AnalysisResult> {
  await new Promise((resolve) => setTimeout(resolve, 900 + Math.random() * 700));

  if (candles.length < 15) {
    return {
      patterns: [],
      zones: [],
      watchFor: "Add a few more candles — there isn't enough price history yet to identify a pattern.",
      disclaimer: DISCLAIMER,
      generatedAt: Date.now(),
    };
  }

  const zones = detectZones(candles);
  const pattern = pickPattern(candles);
  const watchFor = buildWatchForText(zones, pattern);

  return {
    patterns: [pattern],
    zones,
    watchFor,
    disclaimer: DISCLAIMER,
    generatedAt: Date.now(),
  };
}
