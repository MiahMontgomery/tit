import { Router } from "express";
import { db } from "../core/repos/db.js";
import { tasks, proofs, messages, projects } from "../drizzle/schema.js";
import { sql, count, eq, gte } from "drizzle-orm";

const router = Router();

// Simple in-memory metrics store
const metrics = {
  requests: 0,
  errors: 0,
  tasksProcessed: 0,
  proofsCreated: 0,
  messagesCreated: 0,
  startTime: Date.now()
};

export function incrementMetric(name: keyof typeof metrics) {
  if (name in metrics && typeof metrics[name] === 'number') {
    (metrics[name] as number)++;
  }
}

// GET /api/metrics - Get system metrics
router.get("/", async (req, res) => {
  try {
    const uptime = Date.now() - metrics.startTime;
    
    // Get database metrics if available
    let dbMetrics = {};
    if (db) {
      try {
        const [taskStats] = await db
          .select({
            total: count(),
            queued: sql<number>`count(case when status = 'queued' then 1 end)`,
            running: sql<number>`count(case when status = 'running' then 1 end)`,
            completed: sql<number>`count(case when status = 'completed' then 1 end)`,
            failed: sql<number>`count(case when status = 'failed' then 1 end)`
          })
          .from(tasks);

        const [proofStats] = await db
          .select({
            total: count(),
            today: sql<number>`count(case when created_at >= current_date then 1 end)`
          })
          .from(proofs);

        const [messageStats] = await db
          .select({
            total: count(),
            today: sql<number>`count(case when created_at >= current_date then 1 end)`
          })
          .from(messages);

        const [projectStats] = await db
          .select({
            total: count(),
            active: sql<number>`count(case when status = 'active' then 1 end)`
          })
          .from(projects);

        dbMetrics = {
          tasks: taskStats,
          proofs: proofStats,
          messages: messageStats,
          projects: projectStats
        };
      } catch (error) {
        console.error("Failed to fetch database metrics:", error);
      }
    }

    res.json({
      success: true,
      data: {
        system: {
          uptime,
          requests: metrics.requests,
          errors: metrics.errors,
          tasksProcessed: metrics.tasksProcessed,
          proofsCreated: metrics.proofsCreated,
          messagesCreated: metrics.messagesCreated,
          memory: process.memoryUsage(),
          uptimeSeconds: Math.floor(uptime / 1000)
        },
        database: dbMetrics
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch metrics"
    });
  }
});

export default router;
