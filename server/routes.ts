import { Router } from "express";
import projectsRouter from "./api/projects.js";
import messagesRouter from "./api/messages.js";
import proofsRouter from "./api/proofs.js";

const router = Router();

// API routes
router.use("/api/projects", projectsRouter);
router.use("/api/messages", messagesRouter);
router.use("/api/proofs", proofsRouter);

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Health check for uptime monitoring
router.get("/healthz", (req, res) => {
  res.json({ 
    ok: true, 
    ts: Date.now() 
  });
});

// Root endpoint
router.get("/", (req, res) => {
  res.json({
    message: "Titan Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

export default router;