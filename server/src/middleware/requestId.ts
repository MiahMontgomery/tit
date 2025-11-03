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
  
  // Log request start
  console.log(`[${req.requestId || 'NO-ID'}] ${req.method} ${req.path} - ${req.get('origin') || 'no origin'}`);
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    // Console log for immediate visibility
    console.log(`[${req.requestId || 'NO-ID'}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    
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
