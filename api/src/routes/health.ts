import { Router } from "express";
export const health = Router();
health.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true, ts: Date.now() });
});
