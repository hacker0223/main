import { fetchWithTimeout } from "./errors";
import type { MatchResponse, ClassifyResponse } from "./patternEngine";

// The ONLY place in this codebase that calls the Anthropic API. Claude is
// used exclusively as a pretrained model for narration/explanation — it is
// never fine-tuned, never trained, and this file never lets it invent a
// number. Every statistic in the prompts below (win rates, average returns,
// classifier probabilities, backtested accuracy) is computed in Python
// (apps/pattern-engine) or TypeScript and handed to the model as facts to
// explain, not facts to produce.
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

class AnthropicNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set — narration is unavailable until a real key is configured.");
    this.name = "AnthropicNotConfiguredError";
  }
}

async function callClaude(system: string, userMessage: string, maxTokens = 1024): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AnthropicNotConfiguredError();
  }

  const res = await fetchWithTimeout(
    ANTHROPIC_API_URL,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    },
    20000
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API error: ${res.status} ${text}`);
  }

  const body = (await res.json()) as { content: { type: string; text?: string }[] };
  const textBlock = body.content.find((b) => b.type === "text");
  if (!textBlock?.text) throw new Error("Anthropic API returned no text content");
  return textBlock.text;
}

const NARRATION_SYSTEM_PROMPT = `You are explaining historical chart-pattern matches to a retail investor learning technical analysis.

You will be given: the current chart's shape/indicator summary, and a list of historically similar chart windows with their REAL, ALREADY-COMPUTED forward outcomes (percent returns 5/10/20 trading days later) and a REAL, ALREADY-COMPUTED outcome distribution (counts and average returns).

Rules, no exceptions:
1. You must not state or imply a single directional prediction ("this will go up", "expect a breakout", etc.) — you are describing historical frequency, not forecasting.
2. Every number you state (counts, percentages, average returns) must come directly from the data provided to you. Never compute, estimate, round in a misleading way, or invent a number not present in the input.
3. Explicitly state, in your own words, that this is historical pattern frequency from a small sample of past analogs — not a prediction of what THIS chart will do.
4. Explicitly mention the base rate of the setup going the "wrong" way (i.e., don't only emphasize the majority outcome — state the minority outcome honestly too).
5. Explain in plain language what characteristics make the matched windows similar to the current one (shape, RSI/MACD state, volume, etc.) — this part is genuinely your job; the numbers are not.
6. Keep it to 3-4 short paragraphs. No bullet-point disclaimers repeated multiple times — one clear, upfront framing is enough.
7. Plain prose only — no markdown of any kind (no # headings, no ** bold, no bullet lists). Your output is rendered as raw text in a mobile app, so markdown syntax shows up as literal symbols.`;

export interface NarrationInput {
  queryDescription: string; // e.g. "25-day window, RSI 62, MACD bullish, volume 1.4x average"
  matches: MatchResponse["matches"];
  distributions: MatchResponse["distributions"];
}

export async function narrateMatches(input: NarrationInput): Promise<string> {
  const userMessage = JSON.stringify(
    {
      current_setup: input.queryDescription,
      matched_windows: input.matches.map((m) => ({
        ticker: m.ticker,
        period: `${m.start_date} to ${m.end_date}`,
        similarity_cosine: m.cosine_score,
        similarity_dtw_distance: m.dtw_distance,
        forward_return_5d: m.outcome.fwd_return_5d,
        forward_return_10d: m.outcome.fwd_return_10d,
        forward_return_20d: m.outcome.fwd_return_20d,
      })),
      outcome_distributions_by_horizon: input.distributions,
    },
    null,
    2
  );

  return callClaude(NARRATION_SYSTEM_PROMPT, userMessage);
}

const CLASSIFIER_NARRATION_SYSTEM_PROMPT = `You are explaining a statistical classifier's output to a retail investor learning technical analysis.

You will be given a REAL, ALREADY-COMPUTED probability distribution (up/down/flat) from a trained classifier for a specific forward time horizon, plus that model's REAL, ALREADY-COMPUTED backtested accuracy on held-out historical data.

Rules, no exceptions:
1. Do not restate the probabilities as a prediction or recommendation — frame them explicitly as "this model's estimate based on historically similar setups," nothing more.
2. Never invent, adjust, or round the numbers in a way not present in the input.
3. You must mention the backtested accuracy figure and explicitly note it is a historical measurement, not a guarantee of future performance.
4. If accuracy is not meaningfully better than chance (roughly 33% for a 3-class up/down/flat split), say so plainly rather than glossing over it.
5. Keep it to 1-2 short paragraphs.
6. Plain prose only — no markdown of any kind (no # headings, no ** bold, no bullet lists). Your output is rendered as raw text in a mobile app, so markdown syntax shows up as literal symbols.`;

export async function narrateClassification(classification: ClassifyResponse): Promise<string> {
  const userMessage = JSON.stringify(classification, null, 2);
  return callClaude(CLASSIFIER_NARRATION_SYSTEM_PROMPT, userMessage, 512);
}

const DEVILS_ADVOCATE_SYSTEM_PROMPT = `You are a skilled technical analyst whose job is to argue the STRONGEST plausible counter-thesis to a retail investor's stated read of a chart.

You will be given: a description of the chart (shape, indicators, any drawings/annotations) and the user's stated thesis in their own words.

Rules:
1. Argue genuinely and specifically for the OPPOSITE directional conclusion, using real technical reasoning tied to what's actually described in the chart (e.g., "this volume spike near resistance could equally read as exhaustion/distribution rather than a breakout signal, and here's the pattern that typically looks like...").
2. Do not hedge into "well it could go either way" — that defeats the purpose. Commit to the strongest good-faith counter-argument you can make, even though you are not endorsing it as more likely to be correct than the user's thesis.
3. Do not introduce invented data (no numbers, no outcome statistics) — this is a rhetorical/technical counter-argument based on chart reading, not a data-backed prediction. If you'd naturally want to cite a statistic, don't; reason qualitatively about the pattern instead.
4. Do not declare a winner between the two theses. End by naming what would need to happen next on the chart to confirm or invalidate EACH thesis (a specific, observable trigger for each side) — this keeps it actionable and non-committal about who's "right."
5. Keep it to 2-3 short paragraphs.
6. Plain prose only — no markdown of any kind (no # headings, no ** bold, no bullet lists). Your output is rendered as raw text in a mobile app, so markdown syntax shows up as literal symbols.`;

export interface DevilsAdvocateInput {
  chartDescription: string;
  userThesis: string;
}

export async function generateDevilsAdvocate(input: DevilsAdvocateInput): Promise<string> {
  const userMessage = JSON.stringify(
    { chart_description: input.chartDescription, users_thesis: input.userThesis },
    null,
    2
  );
  return callClaude(DEVILS_ADVOCATE_SYSTEM_PROMPT, userMessage);
}

export { AnthropicNotConfiguredError };
