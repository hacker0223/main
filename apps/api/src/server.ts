import "./loadEnv";
import cors from "cors";
import express from "express";
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

app.listen(port, "0.0.0.0", () => {
  console.log(`Summit API listening on port ${port}`);
});
