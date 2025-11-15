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
    
    // Fetch project with features, milestones, and goals
    const project = await prisma.project.findUnique({
      where: { id: projectIdInt },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        features: {
          include: {
            milestones: {
              include: {
                goals: {
                  orderBy: { orderIndex: 'asc' }
                }
              },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });
    
    if (!project) {
      console.error(`[${requestId}] [GET /api/hierarchy/:id] Project ${projectId} not found`);
      return res.status(404).json({ ok: false, error: "Project not found" });
    }

    // Transform Prisma data to match expected frontend format
    const features = project.features.map(feature => ({
      featureId: feature.id,
      name: feature.name,
      description: feature.description || "",
      status: feature.status,
      milestones: feature.milestones.map(milestone => ({
        milestoneId: milestone.id,
        title: milestone.title,
        state: milestone.state,
        goals: milestone.goals.map(goal => ({
          goalId: goal.id,
          title: goal.title,
          state: goal.state,
        }))
      }))
    }));

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
    
    // Verify project exists - use select to avoid querying non-existent fields
    const project = await prisma.project.findUnique({
      where: { id: projectIdInt },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        charter: {
          select: {
            id: true,
            projectId: true,
            narrative: true,
            prominentFeatures: true,
            modes: true,
            milestones: true,
            risks: true,
            dependencies: true,
            instrumentation: true,
            acceptanceCriteria: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    });
    
    if (!project) {
      console.error(`[${requestId}] [POST /api/hierarchy/:id/plan] Project ${projectId} not found`);
      return res.status(404).json({ ok: false, error: "Project not found" });
    }

    console.log(`[${requestId}] [POST /api/hierarchy/:id/plan] Plan generation initiated for project ${projectId}`);
    
    // Generate hierarchy using Prisma
    const result = await ensureHierarchy({ projectId: String(projectIdInt) });
    
    if (result.created) {
      emitHierarchyUpdated(String(projectIdInt));
      console.log(`[${requestId}] [POST /api/hierarchy/:id/plan] Hierarchy created for project ${projectId}`);
    } else {
      console.log(`[${requestId}] [POST /api/hierarchy/:id/plan] Hierarchy already exists for project ${projectId}`);
    }
    
    res.json({ ok: true, created: result.created });
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

    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: { state: state as any },
    });

    console.log(`[${requestId}] [PATCH /api/goals/:goalId/state] Goal ${goalId} updated to ${state}`);
    
    // Emit event for real-time updates
    emitGoalUpdated(goal.projectId.toString(), goalId);
    
    res.json({ ok: true, success: true, goal });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, error: "Goal not found" });
    }
    console.error(`[${requestId}] [PATCH /api/goals/:goalId/state] Goal state update error:`, {
      message: error?.message,
      stack: error?.stack,
      goalId: req.params.goalId
    });
    process.stderr.write(`[${requestId}] [PATCH /api/goals/:goalId/state] Error: ${error?.message}\n`);
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

    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: { state: state as any },
    });

    console.log(`[${requestId}] [PATCH /api/milestones/:milestoneId/state] Milestone ${milestoneId} updated to ${state}`);
    
    // Emit event for real-time updates
    emitMilestoneUpdated(milestone.projectId.toString(), milestoneId, state);
    
    res.json({ ok: true, success: true, milestone });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, error: "Milestone not found" });
    }
    console.error(`[${requestId}] [PATCH /api/milestones/:milestoneId/state] Milestone state update error:`, {
      message: error?.message,
      stack: error?.stack,
      milestoneId: req.params.milestoneId
    });
    process.stderr.write(`[${requestId}] [PATCH /api/milestones/:milestoneId/state] Error: ${error?.message}\n`);
    res.status(500).json({ ok: false, error: "Failed to update milestone state" });
  }
});

export default router;
