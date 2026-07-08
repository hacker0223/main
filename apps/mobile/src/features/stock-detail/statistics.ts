// Historical-volatility-based stats. No prediction ML — just the standard
// approach for turning past price behavior into a statistically grounded
// range, the same way options pricing derives implied moves from volatility.

function dailyReturns(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  return returns;
}

export function annualizedVolatility(closes: number[]): number | null {
  if (closes.length < 10) return null;
  const returns = dailyReturns(closes);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1);
  const dailyStdDev = Math.sqrt(variance);
  return dailyStdDev * Math.sqrt(252);
}

export interface ProbabilisticRange {
  low: number;
  high: number;
  confidencePct: number;
  horizonDays: number;
}

// 80% confidence interval (z = 1.2816) over a 30-day horizon, assuming
// log-normal price movement at the stock's own historical volatility.
export function probabilisticRange(
  currentPrice: number,
  volatility: number,
  horizonDays = 30,
  confidencePct = 80
): ProbabilisticRange {
  const z = confidencePct === 80 ? 1.2816 : 1.6449;
  const horizonVol = volatility * Math.sqrt(horizonDays / 365);
  return {
    low: currentPrice * Math.exp(-z * horizonVol),
    high: currentPrice * Math.exp(z * horizonVol),
    confidencePct,
    horizonDays,
  };
}

export interface RiskScoreBreakdown {
  score: number;
  level: "Low" | "Moderate" | "Elevated" | "High";
  volatilityContribution: number;
  betaContribution: number;
  valuationContribution: number;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// Transparent weighted formula — not a black box. Each component is a
// simple normalized 0-1 score against a reasonable real-world range, then
// blended. Weights and bounds are the "why" a user can inspect.
export function calculateRiskScore(input: {
  annualizedVol: number | null;
  beta: number | null;
  peTrailing: number | null;
}): RiskScoreBreakdown {
  const volScore = input.annualizedVol === null ? 0.5 : clamp01((input.annualizedVol - 0.15) / (0.75 - 0.15));
  const betaScore = input.beta === null ? 0.5 : clamp01((Math.abs(input.beta) - 0.5) / (2.2 - 0.5));
  const valuationScore = input.peTrailing === null || input.peTrailing <= 0
    ? 0.5
    : clamp01((input.peTrailing - 15) / (60 - 15));

  const blended = volScore * 0.45 + betaScore * 0.3 + valuationScore * 0.25;
  const score = Math.round(blended * 100);

  const level: RiskScoreBreakdown["level"] =
    score < 30 ? "Low" : score < 55 ? "Moderate" : score < 75 ? "Elevated" : "High";

  return {
    score,
    level,
    volatilityContribution: Math.round(volScore * 100),
    betaContribution: Math.round(betaScore * 100),
    valuationContribution: Math.round(valuationScore * 100),
  };
}
