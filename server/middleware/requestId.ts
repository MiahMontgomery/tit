import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

// Extend Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    req.requestId = randomUUID();
    res.set('X-Request-ID', req.requestId);
    next();
  };
}

export function logRequest() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[titan] ${req.method} ${req.path} ${res.statusCode} ${duration}ms [${req.requestId}]`);
    });
    
    next();
  };
}
