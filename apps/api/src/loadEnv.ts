import path from "node:path";
import dotenv from "dotenv";

// Side-effect-only module, imported (not called) so its execution is
// subject to the same hoisting rules as every other import — a plain
// function call sitting between two import statements isn't safe here,
// because tsx/esbuild's CommonJS output hoists imports differently than
// tsc's does, and this needs to run before ./routes/stocks, which
// transitively requires finnhub.ts, which reads FINNHUB_API_KEY at
// module-load time and throws immediately if it isn't already set.
//
// Loads the monorepo root .env first (ANTHROPIC_API_KEY lives there), then
// this app's own apps/api/.env. dotenv never overrides a variable that's
// already set in process.env, so the root value wins for any key defined
// in both — and apps/api/.env still supplies its own keys (FINNHUB_API_KEY
// etc.) that only live there. npm workspace scripts run with cwd set to
// the workspace package dir, so a plain "dotenv/config" import only ever
// finds apps/api/.env on its own — it never sees the root file.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();
