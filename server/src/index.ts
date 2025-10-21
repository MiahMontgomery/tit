import express from "express";
import { createServer } from "http";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./lib/logger.js";
import { requestId, logRequest } from "./middleware/requestId.js";
import { generalRateLimit } from "./middleware/rateLimit.js";
import routes from "./routes/index.js";
import metricsRouter from "./routes/metrics.js";
import { incrementMetric } from "./routes/metrics.js";

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

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

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

// Error handling
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  incrementMetric('errors');
  
  logger.error("Express error", { 
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
    // Initialize database connection
    const { db } = await import("./lib/db.js");
    if (!db) {
      throw new Error("Database connection failed");
    }

    // Start HTTP server
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      logger.info("Titan backend server started", { 
        port, 
        environment: process.env.NODE_ENV || "development" 
      });
      
      console.log(`🚀 Titan backend running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/api/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error("Failed to start server", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    process.exit(1);
  }
}

async function gracefulShutdown() {
  logger.info("Graceful shutdown initiated");
  
  try {
    // Stop accepting new connections
    server.close(() => {
      logger.info("HTTP server closed");
    });

    logger.info("Graceful shutdown completed");
    process.exit(0);

  } catch (error) {
    logger.error("Error during graceful shutdown", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    process.exit(1);
  }
}

// Start the server
startServer();
