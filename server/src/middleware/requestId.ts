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
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("Request completed", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.requestId
    });
  });
  next();
};
