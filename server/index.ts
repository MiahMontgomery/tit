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
  ? [
      process.env.FRONTEND_URL || "https://titan-app.vercel.app",
      "https://morteliv.com",
      "https://www.morteliv.com",
      "https://tit-heaw.onrender.com"
    ]
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

// Routes - Log route mounting
console.log('📋 Mounting routes...');
process.stdout.write('📋 Mounting routes...\n');

// Test route to verify server is running
app.get('/test', (req, res) => {
  const requestId = (req as any).requestId || 'NO-ID';
  console.log(`[${requestId}] [GET /test] Test route hit`);
  process.stdout.write(`[${requestId}] [GET /test] Test route hit\n`);
  res.json({ 
    ok: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    requestId 
  });
});

app.use(routes);
app.use("/api/metrics", metricsRouter);

console.log('✅ Routes mounted');
process.stdout.write('✅ Routes mounted\n');

// Production static files serving
if (process.env.NODE_ENV === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const publicPath = path.join(__dirname, "public");
  
  // Serve static files only for non-API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next(); // Skip static files for API routes
    }
    express.static(publicPath)(req, res, (err) => {
      if (err) {
        logger.systemError('Static file error', { error: err.message, path: req.path });
      }
      next();
    });
  });
  
  // Serve index.html for non-API routes only (SPA fallback)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next(); // Let API routes fall through to 404 handler
    }
    const indexFile = path.join(publicPath, 'index.html');
    res.sendFile(indexFile, (err) => {
      if (err) {
        logger.systemError('Index file missing', { error: err.message });
        res.status(404).send('Titan backend - index.html not found');
      }
    });
  });
}

// Error handling
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requestId = (req as any).requestId || 'NO-ID';
  incrementMetric('errors');
  
  // Log to console and stderr
  console.error(`[${requestId}] [ERROR] ${req.method} ${req.path}:`, {
    message: error.message,
    stack: error.stack,
    name: error.name
  });
  process.stderr.write(`[${requestId}] [ERROR] ${req.method} ${req.path}: ${error.message}\n${error.stack}\n`);
  
  logger.systemError("Express error", { 
    error: error.message, 
    stack: error.stack,
    path: req.path,
    method: req.method,
    requestId: requestId
  });
  
  res.status(500).json({
    ok: false,
    error: "Internal server error",
    errorCode: 'ERR_SERVER_INTERNAL',
    requestId: requestId
  });
});

// 404 handler - must be last
app.use((req, res) => {
  const requestId = (req as any).requestId || 'NO-ID';
  console.log(`[${requestId}] [404] ${req.method} ${req.path} - Not found`);
  process.stdout.write(`[${requestId}] [404] ${req.method} ${req.path} - Not found\n`);
  res.status(404).json({
    ok: false,
    error: "Not found",
    path: req.path,
    method: req.method
  });
});

// Initialize and start server
async function startServer() {
  // CRITICAL: Log startup immediately
  const startupLog = `🚀 [${new Date().toISOString()}] Starting Titan backend server...`;
  console.log(startupLog);
  process.stdout.write(startupLog + '\n');
  process.stderr.write(startupLog + '\n');
  
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    process.stdout.write('🔌 Testing database connection...\n');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      const errorMsg = '❌ Database connection failed';
      console.error(errorMsg);
      process.stderr.write(errorMsg + '\n');
      throw new Error("Database connection failed");
    }
    console.log('✅ Database connection successful');
    process.stdout.write('✅ Database connection successful\n');
    
    // Initialize Puppeteer
    console.log('🎭 Initializing Puppeteer...');
    process.stdout.write('🎭 Initializing Puppeteer...\n');
    await puppeteerClient.initialize();
    console.log('✅ Puppeteer initialized');
    process.stdout.write('✅ Puppeteer initialized\n');
    
    // Initialize WebSocket
    console.log('🔌 Initializing WebSocket...');
    process.stdout.write('🔌 Initializing WebSocket...\n');
    startWs(server);
    console.log('✅ WebSocket initialized');
    process.stdout.write('✅ WebSocket initialized\n');
    
    // Start the runner
    console.log('🏃 Starting runner...');
    process.stdout.write('🏃 Starting runner...\n');
    await runner.start();
    console.log('✅ Runner started');
    process.stdout.write('✅ Runner started\n');
    
    // Start HTTP server
    const port = process.env.PORT || 3000;
    server.listen(port, '0.0.0.0', () => {
      const startupMsg = `✅ [${new Date().toISOString()}] Titan backend server started on port ${port} (${process.env.NODE_ENV || "development"})`;
      console.log(startupMsg);
      process.stdout.write(startupMsg + '\n');
      process.stderr.write(startupMsg + '\n');
      
      logger.systemInfo("Titan backend server started", { 
        port, 
        environment: process.env.NODE_ENV || "development" 
      });
      
      const healthMsg = `📊 Health check: http://localhost:${port}/api/health\n📊 Health check: http://localhost:${port}/health\n🔌 WebSocket: ws://localhost:${port}`;
      console.log(healthMsg);
      process.stdout.write(healthMsg + '\n');
    });
    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    const errorMsg = `❌ [${new Date().toISOString()}] Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    process.stderr.write(errorMsg + '\n');
    if (error instanceof Error && error.stack) {
      process.stderr.write(error.stack + '\n');
    }
    logger.systemError("Failed to start server", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
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
