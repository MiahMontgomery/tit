import express from "express";
import { createServer } from "http";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { testConnection } from "./core/repos/db.js";
import { runner } from "./core/runner.js";
import { startWs } from "./ws/index.js";
import { puppeteerClient } from "./core/tools/puppeteer.js";
import { logger } from "./core/tools/logger.js";
import { requestId, logRequest } from "./middleware/requestId.js";
import { generalRateLimit } from "./middleware/rateLimit.js";
import routes from "./routes.js";
import metricsRouter from "./api/metrics.js";
import { incrementMetric } from "./api/metrics.js";

const app = express();
const server = createServer(app);

/* ---------- global middleware ---------- */
app.use(requestId());
app.use(logRequest());

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL || "https://titan-app.vercel.app"]
    : true;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(generalRateLimit);

app.use((req, _res, next) => {
  incrementMetric("requests");
  next();
});

/* ---------- API routes ---------- */
app.use(routes);
app.use("/api/metrics", metricsRouter);

/* ---------- explicit health before any static ---------- */
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/healthz", (_req, res) => res.json({ ok: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));

/* ---------- static serving with API guard ---------- */
if (process.env.NODE_ENV === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const publicPath = path.join(__dirname, "public");

  // never let static or SPA fallback catch /api/*
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    return express.static(publicPath)(req, res, next);
  });

  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ success: false, error: "Not found" });
    }
    res.sendFile(path.join(publicPath, "index.html"), (err) => {
      if (err) {
        logger.systemError("index.html missing or unreadable", { err: err.message });
        res.status(404).send("Titan backend");
      }
    });
  });
}

/* ---------- error/404 ---------- */
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  incrementMetric("errors");
  logger.systemError("Express error", {
    error: err.message,
    path: req.path,
    method: req.method,
    requestId: (req as any).requestId,
  });
  res.status(500).json({ success: false, error: "Internal server error" });
});

app.use((_req, res) => res.status(404).json({ success: false, error: "Not found" }));

/* ---------- boot ---------- */
async function startServer() {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) logger.systemWarn?.("DB not connected – mock store fallback active");

    await puppeteerClient.initialize();
    startWs(server);
    await runner.start();

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      logger.systemInfo("Titan backend server started", { port, env: process.env.NODE_ENV });
      console.log(`Health: http://localhost:${port}/api/health`);
    });

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (e) {
    logger.systemError("Failed to start server", {
      error: e instanceof Error ? e.message : String(e),
    });
    process.exit(1);
  }
}

async function gracefulShutdown() {
  logger.systemInfo("Graceful shutdown");
  try {
    server.close(() => logger.systemInfo("HTTP server closed"));
    await runner.stop();
    await puppeteerClient.close();
    logger.close?.();
    process.exit(0);
  } catch (e) {
    logger.systemError("Shutdown error", {
      error: e instanceof Error ? e.message : String(e),
    });
    process.exit(1);
  }
}

startServer();
