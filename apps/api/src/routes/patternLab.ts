import { Router } from "express";
import { getClassification, getMatches } from "../services/patternEngine";
import {
  AnthropicNotConfiguredError,
  generateDevilsAdvocate,
  narrateClassification,
  narrateMatches,
} from "../services/anthropic";

export const patternLabRouter = Router();

function handleError(context: string, err: unknown, res: import("express").Response) {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error(`[pattern-lab:${context}] ${error.name}: ${error.message}`);

  if (error instanceof AnthropicNotConfiguredError) {
    res.status(503).json({ error: error.message, code: "anthropic_not_configured" });
  } else {
    res.status(502).json({ error: "Something went wrong running the pattern engine. Try again shortly." });
  }
}

interface AnalogRequestBody {
  closes: number[];
  volumes?: number[];
  topK?: number;
  // Defaults to true (Pattern Lab's existing behavior). The stock detail
  // page's auto-loading summary card passes narrate: false so browsing to
  // any stock doesn't fire an Anthropic call on every page view — it just
  // wants the real computed numbers, fast, and lets the user opt into the
  // full written explanation from Pattern Lab itself.
  narrate?: boolean;
}

// Feature 1: historical analog matches + real outcome distribution + AI
// narration grounded entirely in the computed matches/distributions above.
patternLabRouter.post("/analogs", async (req, res) => {
  const body = req.body as AnalogRequestBody;
  if (!Array.isArray(body.closes) || body.closes.length < 5) {
    res.status(400).json({ error: "closes must be an array of at least 5 numbers" });
    return;
  }

  try {
    const matchResult = await getMatches({ closes: body.closes, volumes: body.volumes, topK: body.topK });

    let narration: string | null = null;
    let narrationError: string | null = null;
    if (body.narrate !== false && matchResult.matches.length > 0) {
      try {
        narration = await narrateMatches({
          queryDescription: `${body.closes.length}-day window`,
          matches: matchResult.matches,
          distributions: matchResult.distributions,
        });
      } catch (err) {
        // Narration is additive to the real computed matches/distributions
        // above, which are already correct and useful on their own — a
        // failure here (missing key, no credits, rate limit, network blip)
        // should degrade to "no narration" text, not fail the whole
        // request and throw away data that was already successfully
        // computed.
        narrationError = err instanceof Error ? err.message : String(err);
        console.error(`[pattern-lab:analogs] narration failed: ${narrationError}`);
      }
    }

    res.json({ ...matchResult, narration, narrationError });
  } catch (err) {
    handleError("analogs", err, res);
  }
});

// Feature 3: classifier probability distribution + AI narration of it.
patternLabRouter.post("/classify", async (req, res) => {
  const body = req.body as AnalogRequestBody;
  if (!Array.isArray(body.closes) || body.closes.length < 5) {
    res.status(400).json({ error: "closes must be an array of at least 5 numbers" });
    return;
  }

  try {
    const classification = await getClassification({ closes: body.closes, volumes: body.volumes });

    let narration: string | null = null;
    let narrationError: string | null = null;
    if (body.narrate !== false) {
      try {
        narration = await narrateClassification(classification);
      } catch (err) {
        // Same reasoning as /analogs above: the classifier's real computed
        // probabilities are already valid on their own — don't discard them
        // because narration specifically failed.
        narrationError = err instanceof Error ? err.message : String(err);
        console.error(`[pattern-lab:classify] narration failed: ${narrationError}`);
      }
    }

    res.json({ ...classification, narration, narrationError });
  } catch (err) {
    handleError("classify", err, res);
  }
});

interface DevilsAdvocateRequestBody {
  chartDescription: string;
  userThesis: string;
}

// Feature 2: devil's advocate counter-thesis, displayed alongside (never
// replacing) the user's own stated thesis.
patternLabRouter.post("/devils-advocate", async (req, res) => {
  const body = req.body as DevilsAdvocateRequestBody;
  if (!body.chartDescription || !body.userThesis) {
    res.status(400).json({ error: "chartDescription and userThesis are both required" });
    return;
  }

  try {
    const counterThesis = await generateDevilsAdvocate({
      chartDescription: body.chartDescription,
      userThesis: body.userThesis,
    });
    res.json({ yourThesis: body.userThesis, devilsAdvocate: counterThesis });
  } catch (err) {
    // This route has no fallback data of its own — its whole output is the
    // AI counter-thesis — so unlike /analogs and /classify, failing the
    // request here is correct. It only ever calls Anthropic (no pattern-
    // engine call at all), so it gets its own error branch rather than
    // handleError's generic "pattern engine" wording, which would be wrong
    // here.
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[pattern-lab:devils-advocate] ${error.name}: ${error.message}`);
    if (error instanceof AnthropicNotConfiguredError) {
      res.status(503).json({ error: error.message, code: "anthropic_not_configured" });
    } else {
      res.status(502).json({ error: `AI narration is unavailable right now: ${error.message}` });
    }
  }
});
