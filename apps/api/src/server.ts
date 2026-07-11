import "./loadEnv";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import morgan from "morgan";
import { stocksRouter } from "./routes/stocks";
import { patternLabRouter } from "./routes/patternLab";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/stocks", stocksRouter);
app.use("/api/pattern-lab", patternLabRouter);

// Unknown routes return JSON, not Express's default HTML "Cannot GET /x".
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler (must be last, and 4-arg to register as one). The
// default Express handler dumps the full stack trace AND absolute file
// paths into the HTTP response — an info leak. This returns clean JSON and
// logs the detail server-side only. A malformed-JSON body throws a
// body-parser SyntaxError that lands here too; that's a client mistake, so
// it's a 400, not a 500.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const isBadJson = err instanceof SyntaxError && "body" in err;
  console.error(`[api:error] ${err instanceof Error ? err.stack || err.message : String(err)}`);
  if (res.headersSent) return;
  res
    .status(isBadJson ? 400 : 500)
    .json({ error: isBadJson ? "Invalid JSON in request body." : "Something went wrong on the server." });
});

// Last-resort process guards. The route handlers already try/catch, so
// these should rarely fire — but if a stray rejection or throw escapes, log
// it instead of letting the process die and trigger a cold-start restart
// (this is a stateless proxy, so there's no corrupt in-memory state to fear
// from continuing to serve).
process.on("unhandledRejection", (reason) => {
  console.error(
    `[api:unhandledRejection] ${reason instanceof Error ? reason.stack || reason.message : String(reason)}`
  );
});
process.on("uncaughtException", (err) => {
  console.error(`[api:uncaughtException] ${err.stack || err.message}`);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Summit API listening on port ${port}`);
});
