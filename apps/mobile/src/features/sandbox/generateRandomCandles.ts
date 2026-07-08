import type { SandboxCandle } from "./types";

// Simple seeded PRNG (mulberry32) so a seed can reproduce the same series —
// useful for "practice this exact setup again."
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateRandomCandles(
  count = 80,
  options: { startPrice?: number; volatility?: number; seed?: number } = {}
): SandboxCandle[] {
  const startPrice = options.startPrice ?? 100;
  const volatility = options.volatility ?? 0.02;
  const rand = mulberry32(options.seed ?? Date.now() & 0xffffffff);

  const candles: SandboxCandle[] = [];
  let price = startPrice;
  const now = Date.now();
  const dayMs = 86_400_000;

  // Light mean-reversion + drift so series don't wander off into nonsense
  // ranges, plus volatility clustering (a few calmer/choppier stretches)
  // rather than uniform noise every candle.
  let regimeVol = volatility;
  for (let i = 0; i < count; i++) {
    if (i % 12 === 0) {
      regimeVol = volatility * (0.5 + rand() * 1.5);
    }

    const open = price;
    const drift = (startPrice - price) * 0.01;
    const change = (rand() - 0.5) * 2 * regimeVol * open + drift;
    const close = Math.max(0.5, open + change);

    const wickUp = Math.abs(rand() * regimeVol * open * 0.8);
    const wickDown = Math.abs(rand() * regimeVol * open * 0.8);
    const high = Math.max(open, close) + wickUp;
    const low = Math.max(0.25, Math.min(open, close) - wickDown);

    const volume = Math.round(500_000 + rand() * 2_000_000 * (1 + Math.abs(change / open) * 5));

    candles.push({
      time: now - (count - i) * dayMs,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume,
    });

    price = close;
  }

  return candles;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
