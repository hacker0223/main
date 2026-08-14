import { Router, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import { NotFoundError } from "../services/errors";
import {
  SimulatorError,
  advanceRun,
  completeRun,
  createRun,
  executeTrade,
  getLeaderboard,
  getRunState,
  getRunWorld,
  listRuns,
  type AdvanceTarget,
  type SimulatorMode,
} from "../services/simulatorEngine";

export const simulatorRouter = Router();
simulatorRouter.use(requireAuth);

// A missing migration surfaced as the generic "try again shortly" message,
// which is actively misleading — retrying can never fix a schema that isn't
// there, and it cost a full debugging round-trip to discover that's all it
// was. Detect that specific case and say so plainly instead.
function isSchemaNotMigrated(message: string): boolean {
  const m = message.toLowerCase();
  return (
    (m.includes("seed") && (m.includes("column") || m.includes("schema cache"))) ||
    m.includes("simulator_runs_mode_check")
  );
}

function handleError(context: string, err: unknown, res: Response) {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error(`[simulator:${context}] ${error.name}: ${error.message}`);
  if (error instanceof SimulatorError) {
    res.status(400).json({ error: error.message });
  } else if (error instanceof NotFoundError) {
    res.status(404).json({ error: error.message });
  } else if (isSchemaNotMigrated(error.message)) {
    res.status(503).json({
      error:
        "Generated market isn't set up on this server yet — its database migration hasn't been run. (Nothing you did wrong; this needs a one-time setup step.)",
      code: "migration_required",
    });
  } else {
    res.status(502).json({ error: "Something went wrong running the simulator. Try again shortly." });
  }
}

simulatorRouter.get("/runs", async (req, res) => {
  try {
    const runs = await listRuns(req.userId!);
    res.json(runs);
  } catch (err) {
    handleError("list", err, res);
  }
});

interface CreateRunBody {
  mode: SimulatorMode;
  startDate: string;
  initialCash: number;
}

const VALID_MODES: SimulatorMode[] = ["single", "portfolio", "generated"];

simulatorRouter.post("/runs", async (req, res) => {
  const body = req.body as Partial<CreateRunBody>;
  if (!body.mode || !VALID_MODES.includes(body.mode)) {
    res.status(400).json({ error: "mode must be 'single', 'portfolio', or 'generated'" });
    return;
  }
  // Generated runs supply their own fixed start date, cash, and length —
  // the client doesn't get to choose any of it, so those fields are only
  // required for the real-market modes.
  if (body.mode !== "generated" && (!body.startDate || typeof body.initialCash !== "number")) {
    res.status(400).json({ error: "startDate and initialCash are required" });
    return;
  }
  try {
    const run = await createRun(req.userId!, {
      mode: body.mode,
      startDate: body.startDate,
      initialCash: body.initialCash,
    });
    res.status(201).json(run);
  } catch (err) {
    handleError("create", err, res);
  }
});

// The visible slice of a generated run's fictional market. Deliberately
// server-side: it withholds prices and headlines for days the player hasn't
// reached, which a client-side world could never guarantee.
simulatorRouter.get("/runs/:id/world", async (req, res) => {
  try {
    const world = await getRunWorld(req.userId!, req.params.id);
    res.json(world);
  } catch (err) {
    handleError("world", err, res);
  }
});

simulatorRouter.get("/runs/:id", async (req, res) => {
  try {
    const state = await getRunState(req.userId!, req.params.id);
    res.json(state);
  } catch (err) {
    handleError("state", err, res);
  }
});

interface TradeBody {
  symbol: string;
  side: "buy" | "sell";
  shares: number;
}

simulatorRouter.post("/runs/:id/trade", async (req, res) => {
  const body = req.body as Partial<TradeBody>;
  if (!body.symbol || (body.side !== "buy" && body.side !== "sell") || typeof body.shares !== "number") {
    res.status(400).json({ error: "symbol, side ('buy'|'sell'), and shares are required" });
    return;
  }
  try {
    const state = await executeTrade(req.userId!, req.params.id, { symbol: body.symbol, side: body.side, shares: body.shares });
    res.json(state);
  } catch (err) {
    handleError("trade", err, res);
  }
});

interface AdvanceBody {
  by?: "day" | "week" | "month" | "year";
  date?: string;
}

simulatorRouter.post("/runs/:id/advance", async (req, res) => {
  const body = req.body as AdvanceBody;
  const target: AdvanceTarget | null = body.date ? { date: body.date } : body.by ?? null;
  if (!target) {
    res.status(400).json({ error: "Provide either 'by' (day|week|month|year) or a specific 'date'" });
    return;
  }
  try {
    const state = await advanceRun(req.userId!, req.params.id, target);
    res.json(state);
  } catch (err) {
    handleError("advance", err, res);
  }
});

simulatorRouter.post("/runs/:id/complete", async (req, res) => {
  try {
    const state = await completeRun(req.userId!, req.params.id);
    res.json(state);
  } catch (err) {
    handleError("complete", err, res);
  }
});

// Public leaderboard data, but still behind requireAuth like the rest of
// this router — simplest consistent rule for the whole file, and Summit
// doesn't have any signed-out screen that would need this.
simulatorRouter.get("/leaderboard", async (req, res) => {
  try {
    const entries = await getLeaderboard(req.userId!);
    res.json(entries);
  } catch (err) {
    handleError("leaderboard", err, res);
  }
});
