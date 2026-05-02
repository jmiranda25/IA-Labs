import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  let dbOk = false;
  let dbError: string | undefined;
  try {
    await pool.query("SELECT 1");
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  if (!dbOk) {
    res.status(503).json({ status: "error", db: "unreachable", error: dbError });
    return;
  }

  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json({ ...data, db: "ok" });
});

export default router;
