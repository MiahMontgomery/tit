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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
