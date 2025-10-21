import { Router } from "express";
import { z } from "zod";
import { enqueue } from "../lib/queue.js";
import { logger } from "../lib/logger.js";

const router = Router();

// Validation schema
const proposeOpsSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  branch: z.string().optional(),
  patches: z.array(z.object({
    path: z.string(),
    content: z.string().optional(),
    delete: z.boolean().optional(),
    diff: z.string().optional()
  }))
});

// Middleware to check OPS_TOKEN
const opsAuth = (req: any, res: any, next: any) => {
  const token = req.headers['x-ops-token'];
  const expectedToken = process.env.OPS_TOKEN;
  
  if (!expectedToken) {
    return res.status(500).json({
      success: false,
      error: "OPS_TOKEN not configured"
    });
  }
  
  if (token !== expectedToken) {
    logger.warn("Invalid OPS token", { ip: req.ip });
    return res.status(401).json({
      success: false,
      error: "Unauthorized"
    });
  }
  
  next();
};

// POST /api/ops/propose
router.post("/propose", opsAuth, async (req, res) => {
  try {
    const data = proposeOpsSchema.parse(req.body);
    
    // Generate branch name if not provided
    const branch = data.branch || `titan/ops/${Date.now()}`;
    
    // Enqueue ops.diff job
    await enqueue({
      projectId: 'ops', // Special project ID for ops
      kind: 'ops.diff',
      payload: {
        title: data.title,
        description: data.description,
        branch,
        patches: data.patches
      }
    });
    
    logger.info("Ops proposal enqueued", {
      title: data.title,
      branch,
      patchCount: data.patches.length
    });
    
    res.json({
      success: true,
      data: {
        branch,
        status: 'enqueued'
      }
    });
  } catch (error) {
    logger.error("Failed to propose ops", { error });
    res.status(500).json({
      success: false,
      error: "Failed to propose ops"
    });
  }
});

export default router;
