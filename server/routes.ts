import { Router } from "express";

// Log route imports
console.log('📦 Loading route modules...');
process.stdout.write('📦 Loading route modules...\n');

import projectsRouter from "./api/projects.js";
import messagesRouter from "./api/messages.js";
import proofsRouter from "./api/proofs.js";
import hierarchyRouter from "./routes/projects-hierarchy.js";
import reiterateRouter from "./src/routes/reiterate.js";

console.log('✅ Route modules loaded');
process.stdout.write('✅ Route modules loaded\n');

const router = Router();

// API routes
console.log('🔗 Mounting /api/projects');
process.stdout.write('🔗 Mounting /api/projects\n');
router.use("/api/projects", projectsRouter);

console.log('🔗 Mounting /api/projects/reiterate');
process.stdout.write('🔗 Mounting /api/projects/reiterate\n');
router.use("/api/projects/reiterate", reiterateRouter);

console.log('🔗 Mounting /api/messages');
process.stdout.write('🔗 Mounting /api/messages\n');
router.use("/api/messages", messagesRouter);

console.log('🔗 Mounting /api/proofs');
process.stdout.write('🔗 Mounting /api/proofs\n');
router.use("/api/proofs", proofsRouter);

console.log('🔗 Mounting /api (hierarchy)');
process.stdout.write('🔗 Mounting /api (hierarchy)\n');
router.use("/api", hierarchyRouter);

// Health check endpoint
router.get("/health", (req, res) => {
  const requestId = (req as any).requestId || 'NO-ID';
  console.log(`[${requestId}] [GET /health] Health check hit`);
  process.stdout.write(`[${requestId}] [GET /health] Health check hit\n`);
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Health check for uptime monitoring
router.get("/healthz", (req, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
  });
});

// Added API-prefixed health endpoints for proxies expecting /api/health* paths
router.get("/api/healthz", (req, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
  });
});

router.get("/api/health", (req, res) => {
  const requestId = (req as any).requestId || 'NO-ID';
  console.log(`[${requestId}] [GET /api/health] Health check hit`);
  process.stdout.write(`[${requestId}] [GET /api/health] Health check hit\n`);
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint
router.get("/", (req, res) => {
  res.json({
    message: "Titan Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

export default router;
