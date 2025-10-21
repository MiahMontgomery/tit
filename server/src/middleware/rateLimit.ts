import rateLimit from "express-rate-limit";
import { logger } from "../lib/logger.js";

export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
  handler: (req, res, next, options) => {
    logger.warn("Rate limit exceeded", { ip: req.ip, path: req.path });
    res.status(options.statusCode).send(options.message);
  }
});

export const taskRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit to 30 tasks per minute per project
  keyGenerator: (req) => {
    return req.params.id; // Use project ID as key
  },
  message: "Too many tasks for this project, please try again after a minute",
  handler: (req, res, next, options) => {
    logger.warn("Task rate limit exceeded", { ip: req.ip, projectId: req.params.id });
    res.status(options.statusCode).send(options.message);
  }
});
