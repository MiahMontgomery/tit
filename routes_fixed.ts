import { Router } from "express";
import projectsRouter from "./api/projects.js";
import messagesRouter from "./api/messages.js";
import personasRouter from "./api/personas.js";
import proofsRouter from "./api/proofs.js";

const router = Router();

// API routes
router.use("/api/projects", projectsRouter);
router.use("/api/messages", messagesRouter);
router.use("/api/proofs", proofsRouter);
router.use("/api/personas", personasRouter);

// Health check endpoint
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Health check for uptime monitoring
router.get("/healthz", (_req, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
  });
});

// Added API-prefixed health endpoints for proxies expecting /api/health* paths
router.get("/api/healthz", (_req, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
  });
});

router.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
