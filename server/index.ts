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

// Middleware
app.use(requestId());
app.use(logRequest());

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === "production" 
  ? [process.env.FRONTEND_URL || "https://titan-app.vercel.app"]
  : true;

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
app.use(generalRateLimit);

// Request metrics
app.use((req, res, next) => {
  incrementMetric('requests');
  next();
});

// Routes
app.use(routes);
app.use("/api/metrics", metricsRouter);

// Production static files serving
if (process.env.NODE_ENV === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const publicPath = path.join(__dirname, "public");
  // Only serve static files for non-API routes. Prevent /api/* from being intercepted by the
  // static file handler or index fallback. If the public directory or index.html are missing,
  // gracefully fall back to 404 instead of throwing.
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    express.static(publicPath)(req, res, (err) => {
      if (err) {
        // log error but continue
        logger.systemError('Static file error', { error: err.message, path: req.path });
      }
      next();
    });
  });
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      // API routes should not be handled here
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    const indexFile = path.join(publicPath, 'index.html');
    res.sendFile(indexFile, (err) => {
      if (err) {
        // if index.html missing, log and return generic message
        logger.systemError('Index file missing', { error: err.message });
        res.status(404).send('Titan backend');
      }
    });
  });
}

// Error handling
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  incrementMetric('errors');
  logger.systemError("Express error", { 
    error: error.message, 
    stack: error.stack,
    path: req.path,
    method: req.method,
    requestId: req.requestId
  });
  res.status(500).json({
    success: false,
    error: "Internal server error",
    requestId: req.requestId
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not found"
  });
});

// Initialize and start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error("Database connection failed");
    }
    // Initialize Puppeteer
    await puppeteerClient.initialize();
    // Initialize WebSocket
    startWs(server);
    // Start the runner
    await runner.start();
    // Start HTTP server
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      logger.systemInfo("Titan backend server started", { 
        port, 
        environment: process.env.NODE_ENV || "development" 
      });
      console.log(` Titan backend running on port ${port}`);
      console.log(` Health check: http://localhost:${port}/health`);
      console.log(` WebSocket: ws://localhost:${port}`);
    });
    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    logger.systemError("Failed to start server", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    process.exit(1);
  }
}

async function gracefulShutdown() {
  logger.systemInfo("Graceful shutdown initiated");
  try {
    // Stop accepting new connections
    server.close(() => {
      logger.systemInfo("HTTP server closed");
    });
    // Stop runner
    await runner.stop();
    // Close Puppeteer
    await puppeteerClient.close();
    // WebSocket will close automatically with server
    // Close logger
    logger.close();
    logger.systemInfo("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.systemError("Error during graceful shutdown", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    process.exit(1);
  }
}

// Start the server
startServer();
