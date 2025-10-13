import { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}) {
  const { windowMs, max, keyGenerator = (req) => req.ip || 'unknown' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    Object.keys(store).forEach(k => {
      if (store[k].resetTime < windowStart) {
        delete store[k];
      }
    });

    // Get or create entry for this key
    if (!store[key]) {
      store[key] = { count: 0, resetTime: now + windowMs };
    }

    const entry = store[key];

    // Check if we're in a new window
    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + windowMs;
    }

    // Check if limit exceeded
    if (entry.count >= max) {
      return res.status(429).json({
        success: false,
        error: "Too many requests",
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      });
    }

    // Increment counter
    entry.count++;

    // Add headers
    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': Math.max(0, max - entry.count).toString(),
      'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
    });

    next();
  };
}

// Specific rate limiters
export const taskRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  keyGenerator: (req) => `${req.ip}-${req.params.id}` // per IP + project
});

export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100 // 100 requests per minute per IP
});
