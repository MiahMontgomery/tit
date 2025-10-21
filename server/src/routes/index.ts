import { Router } from "express";
import healthRouter from "./health.js";
import projectsRouter from "./projects.js";
import opsRouter from "./ops.js";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    version: process.env.APP_VERSION || 'dev',
    timestamp: new Date().toISOString()
  });
});

// API routes
router.use("/api/health", healthRouter);
router.use("/api/projects", projectsRouter);
router.use("/api/ops", opsRouter);

// Root endpoint
router.get("/", (req, res) => {
  res.json({
    message: "Titan Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

export default router;
