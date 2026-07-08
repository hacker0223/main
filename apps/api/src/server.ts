import "dotenv/config";
import cors from "cors";
import express from "express";
import { stocksRouter } from "./routes/stocks";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/stocks", stocksRouter);

app.listen(port, "0.0.0.0", () => {
  console.log(`Summit API listening on port ${port}`);
});
