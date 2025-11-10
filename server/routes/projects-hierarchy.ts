import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { ensureHierarchy } from "../workers/planner";
import { emitHierarchyUpdated, emitMilestoneUpdated, emitGoalUpdated } from "../events/publish";

// Create Prisma client instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

const router = Router();

// Optional PAT middleware for development
const optionalPatMiddleware = (req: any, res: any, next: any) => {
  // Skip PAT validation in development
  next();
};

// GET /api/hierarchy/:id
router.get("/hierarchy/:id", optionalPatMiddleware, async (req, res) => {
  const requestId = (req as any).requestId || 'NO-ID';
  try {
    const projectId = req.params.id;
    const projectIdInt = parseInt(projectId, 10);
    
    console.log(`[${requestId}] [GET /api/hierarchy/:id] Fetching hierarchy for project ${projectId}`);
    
    if (isNaN(projectIdInt)) {
      console.error(`[${requestId}] [GET /api/hierarchy/:id] Invalid project ID: ${projectId}`);
      return res.status(400).json({ ok: false, error: "Invalid project ID" });
    }
    
    const project = await prisma.project.findUnique({
      where: { id: projectIdInt },
      include: { charter: true }
    });
    
    if (!project) {
      console.error(`[${requestId}] [GET /api/hierarchy/:id] Project ${projectId} not found`);
      return res.status(404).json({ ok: false, error: "Project not found" });
    }

    // For now, return empty features array since features/milestones/goals tables don't exist in Prisma schema
    // This will be populated once the hierarchy is generated via the plan endpoint
    // TODO: Add features/milestones/goals tables to Prisma schema or use JSON storage in charter
    const features: any[] = [];

    console.log(`[${requestId}] [GET /api/hierarchy/:id] Returning hierarchy for project ${projectId} with ${features.length} features`);
    process.stdout.write(`[${requestId}] [GET /api/hierarchy/:id] Returning hierarchy for project ${projectId} with ${features.length} features\n`);

    res.json({
      ok: true,
      project: {
        id: String(project.id),
        name: project.name,
        description: project.description || null,
      },
      features: features,
    });
  } catch (error: any) {
    const errorMsg = `[${requestId}] [GET /api/hierarchy/:id] Hierarchy fetch error: ${error?.message || 'Unknown error'}`;
    console.error(errorMsg, {
      message: error?.message,
      stack: error?.stack,
      projectId: req.params.id,
      code: error?.code
    });
    process.stderr.write(`${errorMsg}\n${error?.stack || ''}\n`);
    res.status(500).json({ 
      ok: false, 
      error: error?.message || "Failed to fetch hierarchy",
      errorCode: error?.code ? `ERR_${error.code}` : 'ERR_HIERARCHY_FETCH'
    });
  }
});

// POST /api/hierarchy/:id/plan
router.post("/hierarchy/:id/plan", optionalPatMiddleware, async (req, res) => {
  const requestId = (req as any).requestId || 'NO-ID';
  try {
    const projectId = req.params.id;
    const projectIdInt = parseInt(projectId, 10);
    
    console.log(`[${requestId}] [POST /api/hierarchy/:id/plan] Generating plan for project ${projectId}`);
    
    if (isNaN(projectIdInt)) {
      console.error(`[${requestId}] [POST /api/hierarchy/:id/plan] Invalid project ID: ${projectId}`);
      return res.status(400).json({ ok: false, error: "Invalid project ID" });
    }
    
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectIdInt },
      include: { charter: true }
    });
    
    if (!project) {
      console.error(`[${requestId}] [POST /api/hierarchy/:id/plan] Project ${projectId} not found`);
      return res.status(404).json({ ok: false, error: "Project not found" });
    }

    // For now, return success but note that hierarchy generation needs features/milestones/goals tables
    // The ensureHierarchy function uses storage which doesn't match Prisma schema
    // TODO: Implement Prisma-based hierarchy generation or migrate storage to use Prisma
    
    console.log(`[${requestId}] [POST /api/hierarchy/:id/plan] Plan generation initiated for project ${projectId}`);
    
    // Return success - actual hierarchy generation will be implemented once schema is updated
    res.json({ 
      ok: true,
      created: false,
      message: "Plan generation endpoint reached. Hierarchy tables need to be added to Prisma schema."
    });
    
    // TODO: Uncomment once hierarchy tables exist
    // const result = await ensureHierarchy({ projectId: String(projectIdInt) });
    // if (result.created) {
    //   emitHierarchyUpdated(String(projectIdInt));
    // }
    // res.json({ ok: true, created: result.created });
  } catch (error: any) {
    console.error(`[${requestId}] [POST /api/hierarchy/:id/plan] Plan generation error:`, {
      message: error?.message,
      stack: error?.stack,
      projectId: req.params.id
    });
    res.status(500).json({ ok: false, error: "Failed to generate plan" });
  }
});

// PATCH /api/goals/:goalId/state
router.patch("/goals/:goalId/state", optionalPatMiddleware, async (req, res) => {
  const requestId = (req as any).requestId || 'NO-ID';
  try {
    const goalId = req.params.goalId;
    const { state } = req.body;
    
    console.log(`[${requestId}] [PATCH /api/goals/:goalId/state] Updating goal ${goalId} to state ${state}`);
    
    if (!state || !["PLANNED", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"].includes(state)) {
      return res.status(400).json({ ok: false, error: "Invalid state" });
    }

    // TODO: Implement goal state update with Prisma once goals table exists
    console.log(`[${requestId}] [PATCH /api/goals/:goalId/state] Goal state update not yet implemented (needs goals table)`);
    
    res.json({ ok: true, success: true });
  } catch (error: any) {
    console.error(`[${requestId}] [PATCH /api/goals/:goalId/state] Goal state update error:`, {
      message: error?.message,
      stack: error?.stack,
      goalId: req.params.goalId
    });
    res.status(500).json({ ok: false, error: "Failed to update goal state" });
  }
});

// PATCH /api/milestones/:milestoneId/state
router.patch("/milestones/:milestoneId/state", optionalPatMiddleware, async (req, res) => {
  const requestId = (req as any).requestId || 'NO-ID';
  try {
    const milestoneId = req.params.milestoneId;
    const { state } = req.body;
    
    console.log(`[${requestId}] [PATCH /api/milestones/:milestoneId/state] Updating milestone ${milestoneId} to state ${state}`);
    
    if (!state || !["PLANNED", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"].includes(state)) {
      return res.status(400).json({ ok: false, error: "Invalid state" });
    }

    // TODO: Implement milestone state update with Prisma once milestones table exists
    console.log(`[${requestId}] [PATCH /api/milestones/:milestoneId/state] Milestone state update not yet implemented (needs milestones table)`);
    
    res.json({ ok: true, success: true });
  } catch (error: any) {
    console.error(`[${requestId}] [PATCH /api/milestones/:milestoneId/state] Milestone state update error:`, {
      message: error?.message,
      stack: error?.stack,
      milestoneId: req.params.milestoneId
    });
    res.status(500).json({ ok: false, error: "Failed to update milestone state" });
  }
});

export default router;
