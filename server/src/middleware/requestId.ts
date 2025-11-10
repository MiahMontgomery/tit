import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger.js";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export const requestId = () => (req: Request, res: Response, next: NextFunction) => {
  req.requestId = randomUUID();
  next();
};

export const logRequest = () => (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request start - ensure it's flushed
  const startLog = `[${req.requestId || 'NO-ID'}] ${req.method} ${req.path} - ${req.get('origin') || 'no origin'}`;
  console.log(startLog);
  // Force flush in production environments
  if (process.stdout.isTTY === false) {
    process.stdout.write(startLog + '\n');
  }
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    // Console log for immediate visibility
    const finishLog = `[${req.requestId || 'NO-ID'}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`;
    console.log(finishLog);
    // Force flush in production environments
    if (process.stdout.isTTY === false) {
      process.stdout.write(finishLog + '\n');
    }
    
    // Also use structured logger
    logger[logLevel]("Request completed", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.requestId,
      origin: req.get('origin')
    });
  });
  next();
};
