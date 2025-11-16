import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { projectsRepo } from "../core/repos/projectsRepo.js";
import { treeRepo } from "../core/repos/treeRepo.js";
import { tasksRepo } from "../core/repos/tasksRepo.js";
import { llmClient } from "../core/tools/llm.js";
import { logger } from "../core/tools/logger.js";
import { db } from "../core/repos/db.js";
import { goals } from "../drizzle/schema.js";
import { sql, and, eq, inArray } from "drizzle-orm";
import { scoringEngine } from "../core/tools/scoring.js";
import { taskRateLimit } from "../middleware/rateLimit.js";
import { incrementMetric } from "./metrics.js";
import { mockStore } from "../core/mockData.ts";

const router = Router();

// Create Prisma client instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  prompt: z.string().optional(),
  description: z.string().optional(),
  charter: z.object({
    narrative: z.string(),
    prominentFeatures: z.any(),
    modes: z.any().optional(),
    milestones: z.any(),
    risks: z.any().optional(),
    dependencies: z.any().optional(),
    instrumentation: z.any().optional(),
    acceptanceCriteria: z.any(),
  }).optional(),
});

const analyzeProjectSchema = z.object({
  prompt: z.string().min(1, "Prompt is required")
});

const createTaskSchema = z.object({
  goalId: z.string().nullable().optional(),
  type: z.string().min(1, "Type is required"),
  payload: z.record(z.any()).default({})
});

/**
 * POST /api/projects - Create a new project
 * 
 * This endpoint is intentionally AI-independent and non-blocking.
 * It creates a project row in the database with basic fields (name, description).
 * 
 * If a charter is provided, it creates the charter in the same transaction.
 * 
 * AI planning, if re-enabled, must always be optional and non-blocking.
 * Any AI-related operations should happen asynchronously after project creation.
 */
router.post("/", async (req, res) => {
  const requestId = (req as any).requestId || 'NO-ID';
  try {
    console.log(`[${requestId}] [POST /api/projects] Request received`, {
      origin: req.get('origin') || 'none',
      bodyKeys: Object.keys(req.body || {})
    });
    
    const parsed = createProjectSchema.parse(req.body);
    const { name, prompt, description, charter } = parsed;

    console.log(`[${requestId}] [POST /api/projects] Creating project "${name}"`, {
      hasCharter: !!charter,
      hasPrompt: !!prompt
    });

    // Check if AI planning is disabled via feature flag
    const planningDisabled = process.env.DISABLE_AI_PLANNING === "true";
    if (planningDisabled && charter) {
      console.log(`[${requestId}] [POST /api/projects] AI planning disabled, creating project without charter`);
    }

    let project;
    try {
      if (charter && !planningDisabled) {
        // Create project and charter in a single transaction
        console.log(`[${requestId}] [POST /api/projects] Creating project with charter in transaction`);
        project = await prisma.$transaction(async (tx) => {
          // Create project first
          const newProject = await tx.project.create({
            data: {
              name: name || 'Untitled Project',
              description: description || null,
            }
          });
          
          console.log(`[${requestId}] [POST /api/projects] Project ${newProject.id} created, creating charter`);
          
          // Create charter
          await tx.projectCharter.create({
            data: {
              projectId: newProject.id,
              narrative: charter.narrative,
              prominentFeatures: charter.prominentFeatures,
              modes: charter.modes || null,
              milestones: charter.milestones,
              risks: charter.risks || null,
              dependencies: charter.dependencies || null,
              instrumentation: charter.instrumentation || null,
              acceptanceCriteria: charter.acceptanceCriteria,
            }
          });
          
          console.log(`[${requestId}] [POST /api/projects] Charter created for project ${newProject.id}`);
          
          return newProject;
        });
        console.log(`[${requestId}] [POST /api/projects] Project ${project.id} created successfully with charter`);
      } else {
        // Simple project creation - no charter, no AI planning
        console.log(`[${requestId}] [POST /api/projects] Creating simple project (no charter)`);
        project = await prisma.project.create({
          data: {
            name: name || 'Untitled Project',
            description: description || null,
          }
        });
        console.log(`[${requestId}] [POST /api/projects] Project ${project.id} created successfully`);
      }

      logger.systemInfo("Project created successfully", { projectId: project.id });

      // Return in format expected by frontend
      res.status(201).json({
        ok: true,
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          hasCharter: !!charter && !planningDisabled
        },
        planningStatus: planningDisabled ? "disabled" : (charter ? "included" : "skipped")
      });

    } catch (dbError: any) {
      console.error(`[${requestId}] [POST /api/projects] Database error:`, {
        code: dbError.code,
        message: dbError.message,
        meta: dbError.meta,
        stack: dbError.stack
      });
      
      // Force flush error to stderr with full details
      const errorDetails = {
        code: dbError.code,
        message: dbError.message,
        meta: dbError.meta,
        stack: dbError.stack,
        name: dbError.name
      };
      process.stderr.write(`[${requestId}] [POST /api/projects] Database error: ${JSON.stringify(errorDetails, null, 2)}\n`);
      
      logger.systemError("Database error creating project", { 
        error: dbError.message,
        code: dbError.code,
        meta: dbError.meta
      });
      
      if (dbError.code === 'P1001') {
        return res.status(500).json({
          ok: false,
          error: 'Cannot reach database server',
          errorCode: 'ERR_DB_CONNECTION',
          message: dbError.message || 'Database server is unreachable'
        });
      }
      
      if (dbError.code === 'P2002') {
        return res.status(409).json({
          ok: false,
          error: 'Project name already exists',
          errorCode: 'ERR_DB_DUPLICATE',
          message: `A project with name "${name}" already exists`,
          field: dbError.meta?.target?.[0] || 'name'
        });
      }
      
      if (dbError.code && dbError.code.startsWith('P')) {
        return res.status(500).json({
          ok: false,
          error: 'Database error',
          errorCode: `ERR_DB_${dbError.code}`,
          message: dbError.message,
          prismaCode: dbError.code
        });
      }
      
      throw dbError;
    }

  } catch (error: any) {
    console.error(`[${requestId}] [POST /api/projects] Error:`, {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code
    });
    
    // Force flush error to stderr
    process.stderr.write(`[${requestId}] [POST /api/projects] Error: ${error?.message || 'Unknown error'}\n`);
    
    logger.systemError("Failed to create project", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        ok: false,
        error: "Validation failed",
        errorCode: 'ERR_VALIDATION',
        details: error.errors
      });
    }

    res.status(500).json({
      ok: false,
      error: error?.message || "Failed to create project",
      errorCode: 'ERR_SERVER_INTERNAL'
    });
  }
});

// GET /api/projects - Get all projects
router.get("/", async (req, res) => {
  const requestId = (req as any).requestId || 'NO-ID';
  try {
    console.log(`[${requestId}] [GET /api/projects] Fetching projects`);
    
    // Use Prisma directly to get projects with charters
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
      orderBy: { id: 'desc' },
      take: 50,
    });
    
    console.log(`[${requestId}] [GET /api/projects] Found ${projects.length} projects`);
    
    // Return in format expected by frontend
    res.json({
      ok: true,
      projects: projects
    });

  } catch (error: any) {
    console.error(`[${requestId}] [GET /api/projects] Error:`, {
      message: error?.message,
      stack: error?.stack,
      code: error?.code
    });
    
    // Force flush error to stderr
    process.stderr.write(`[${requestId}] [GET /api/projects] Error: ${error?.message || 'Unknown error'}\n`);
    
    logger.systemError("Failed to get projects", { error: error instanceof Error ? error.message : 'Unknown error' });
    
    res.status(500).json({
      ok: false,
      error: error?.message || "Failed to get projects",
      errorCode: 'ERR_SERVER_INTERNAL'
    });
  }
});

// GET /api/projects/overview - Get projects overview
router.get("/overview", async (req, res) => {
  try {
    const overview = await projectsRepo.getOverview();
    
    res.json({
      success: true,
      data: overview
    });

  } catch (error) {
    logger.systemError("Failed to get projects overview", { error: error instanceof Error ? error.message : 'Unknown error' });
    
    res.status(500).json({
      success: false,
      error: "Failed to get projects overview"
    });
  }
});

// GET /api/projects/:id - Get project by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const project = await projectsRepo.getById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found"
      });
    }

    res.json({
      success: true,
      data: project
    });

  } catch (error) {
    logger.systemError("Failed to get project", { 
      projectId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: "Failed to get project"
    });
  }
});

// POST /api/projects/:id/analyze - Analyze project prompt
router.post("/:id/analyze", async (req, res) => {
  try {
    const { id } = req.params;
    const { prompt } = analyzeProjectSchema.parse(req.body);

    logger.projectInfo(id, "Analyzing project prompt", { prompt });

    const analysis = await llmClient.analyzeProject(prompt);

    // Create features, milestones, and goals based on analysis
    const features = [];
    const milestones = [];
    const goals = [];

    for (const featureName of analysis.features) {
      const feature = await treeRepo.createFeature(id, featureName, `Feature: ${featureName}`);
      features.push(feature);

      // Create milestones for this feature
      for (const milestoneName of analysis.milestones) {
        const milestone = await treeRepo.createMilestone(id, feature.id, milestoneName, `Milestone: ${milestoneName}`);
        milestones.push(milestone);

        // Create goals for this milestone
        for (const goalName of analysis.goals) {
          const goal = await treeRepo.createGoal(id, milestone.id, goalName, `Goal: ${goalName}`);
          goals.push(goal);
        }
      }
    }

    logger.projectInfo(id, "Project analysis completed", { 
      features: features.length,
      milestones: milestones.length,
      goals: goals.length
    });

    res.json({
      success: true,
      data: {
        analysis,
        created: {
          features: features.length,
          milestones: milestones.length,
          goals: goals.length
        }
      }
    });

  } catch (error) {
    logger.projectError(req.params.id, "Failed to analyze project", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to analyze project"
    });
  }
});

// POST /api/projects/:id/plan - Generate and insert plan tree
router.post("/:id/plan", async (req, res) => {
  try {
    const { id } = req.params;
    const project = await projectsRepo.getById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found"
      });
    }

    logger.projectInfo(id, "Generating project plan", { prompt: project.prompt });

    const plan = await llmClient.llmPlanJson(project.prompt);
    const inserted = await treeRepo.insertPlanTree(id, plan);

    logger.projectInfo(id, "Project plan generated and inserted", { 
      features: inserted.features,
      milestones: inserted.milestones,
      goals: inserted.goals
    });

    res.json({
      success: true,
      data: {
        plan,
        inserted
      }
    });

  } catch (error) {
    logger.projectError(req.params.id, "Failed to generate project plan", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    res.status(500).json({
      success: false,
      error: "Failed to generate project plan"
    });
  }
});

// GET /api/projects/:id/tree - Get project tree structure
router.get("/:id/tree", async (req, res) => {
  try {
    const { id } = req.params;
    const tree = await treeRepo.getProjectTree(id);

    res.json({
      success: true,
      data: tree
    });

  } catch (error) {
    logger.projectError(req.params.id, "Failed to get project tree", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: "Failed to get project tree"
    });
  }
});

// POST /api/projects/:id/tasks - Create a new task
router.post("/:id/tasks", taskRateLimit, async (req, res) => {
  const requestId = (req as any).requestId || 'NO-ID';
  try {
    const { id } = req.params;
    console.log(`[${requestId}] [POST /api/projects/:id/tasks] Request received`, {
      projectId: id,
      body: req.body,
      bodyKeys: Object.keys(req.body || {})
    });
    
    const { goalId, type, payload } = createTaskSchema.parse(req.body);
    
    console.log(`[${requestId}] [POST /api/projects/:id/tasks] Parsed request:`, {
      projectId: id,
      type,
      goalId,
      payloadKeys: Object.keys(payload || {})
    });

    logger.projectInfo(id, "Creating new task", { type, goalId, payload });

    const task = await tasksRepo.enqueueTask(id, goalId || null, type, payload);
    incrementMetric('tasksProcessed');

    console.log(`[${requestId}] [POST /api/projects/:id/tasks] Task created successfully:`, {
      taskId: task.id,
      projectId: id,
      type,
      status: task.status
    });
    
    logger.projectInfo(id, "Task created successfully", { taskId: task.id });

    res.status(201).json({
      success: true,
      data: task
    });

  } catch (error) {
    const projectId = req.params.id;
    console.error(`[${requestId}] [POST /api/projects/:id/tasks] Error:`, {
      projectId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      isZodError: error instanceof z.ZodError
    });
    
    logger.projectError(projectId, "Failed to create task", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    if (error instanceof z.ZodError) {
      console.error(`[${requestId}] [POST /api/projects/:id/tasks] Validation errors:`, error.errors);
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
        message: `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task",
      message: error instanceof Error ? error.message : "Failed to create task"
    });
  }
});

// GET /api/projects/:id/tasks - Get project tasks
router.get("/:id/tasks", async (req, res) => {
  try {
    const { id } = req.params;
    const tasks = await tasksRepo.getTasksByProject(id);

    res.json({
      success: true,
      data: tasks
    });

  } catch (error) {
    logger.projectError(req.params.id, "Failed to get project tasks", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: "Failed to get project tasks"
    });
  }
});

// GET /api/projects/:id/runs - Get project runs
router.get("/:id/runs", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to use RunsRepo if available, otherwise return empty array
    try {
      const { RunsRepo } = await import("../src/lib/repos/RunsRepo.js");
      const runs = await RunsRepo.getByProject(id);
      res.json({
        success: true,
        data: runs
      });
    } catch (importError) {
      // If RunsRepo doesn't exist or schema doesn't match, return empty array
      logger.projectInfo(id, "Runs endpoint - returning empty (not implemented)", {});
      res.json({
        success: true,
        data: []
      });
    }

  } catch (error) {
    logger.projectError(req.params.id, "Failed to get project runs", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: "Failed to get project runs"
    });
  }
});

// GET /api/projects/:id/logs - Get project logs
router.get("/:id/logs", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Logs are typically stored in messages or a separate logs table
    // For now, return empty array until logs table is implemented
    logger.projectInfo(id, "Logs endpoint - returning empty (not implemented)", {});
    res.json({
      success: true,
      data: []
    });

  } catch (error) {
    logger.projectError(req.params.id, "Failed to get project logs", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: "Failed to get project logs"
    });
  }
});

// POST /api/projects/:id/score-goals - Score and get top 3 goals
router.post("/:id/score-goals", async (req, res) => {
  try {
    const { id } = req.params;

    logger.projectInfo(id, "Scoring project goals");

    if (!db) {
      // Mock mode - use mock store
      const projectGoals = mockStore.getGoalsByProject(id).filter(g => 
        g.status === "pending" || g.status === "in_progress" || g.status === "blocked"
      );

      // Score each goal
      for (const goal of projectGoals) {
        if (goal.status === "completed" || goal.status === "failed") continue;
        
        // Simple scoring based on basic factors
        const newScore = scoringEngine.scoreGoal({
          urgency: 5, // Default urgency
          impact: 5,  // Default impact
          unblock: 0, // No dependencies for now
          risk: 2,    // Low risk
          cost: 2,    // Low cost
          age: 0      // No age factor for now
        });

        goal.score = newScore;
        goal.updatedAt = new Date();
      }

      // Get top 3 goals by score
      const topGoals = projectGoals
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      logger.projectInfo(id, "Goals scored successfully (mock mode)", { 
        totalGoals: projectGoals.length,
        topGoals: topGoals.length
      });

      res.json({
        success: true,
        data: {
          next3: topGoals,
          totalScored: projectGoals.length
        }
      });
      return;
    }

    // Get all goals for this project
    const projectGoals = await db
      .select()
      .from(goals)
      .where(
        sql`${goals.projectId} = ${id} AND ${goals.status} IN ('pending', 'in_progress', 'blocked')`
      );

    // Score each goal
    for (const goal of projectGoals) {
      if (goal.status === "completed" || goal.status === "failed") continue;
      
      // Simple scoring based on basic factors
      const newScore = scoringEngine.scoreGoal({
        urgency: 5, // Default urgency
        impact: 5,  // Default impact
        unblock: 0, // No dependencies for now
        risk: 2,    // Low risk
        cost: 2,    // Low cost
        age: 0      // No age factor for now
      });

      await db
        .update(goals)
        .set({ score: newScore, updatedAt: new Date() })
        .where(eq(goals.id, goal.id));
    }

    // Get top 3 goals by score
    const topGoals = await db
      .select()
      .from(goals)
      .where(
        sql`${goals.projectId} = ${id} AND ${goals.status} IN ('pending', 'in_progress', 'blocked')`
      )
      .orderBy(sql`${goals.score} DESC`)
      .limit(3);

    logger.projectInfo(id, "Goals scored successfully", { 
      totalGoals: projectGoals.length,
      topGoals: topGoals.length
    });

    res.json({
      success: true,
      data: {
        next3: topGoals,
        totalScored: projectGoals.length
      }
    });
  // GET /api/projects/:id/sales - Get sales metrics
  router.get("/:id/sales", async (req, res) => {
    try {
      const { id } = req.params;
      // Compute real sales metrics here; defaulting to zeros for now
      const metrics = {
        daily: {
          messagesSent: 0,
          contentCreated: 0,
          revenueGenerated: 0,
          contactsReached: 0,
          responseRate: 0,
        },
        weekly: {
          totalRevenue: 0,
          growthRate: 0,
          activeProjects: 0,
          completedMilestones: 0,
        },
        monthly: {
          projectedRevenue: 0,
          targetRevenue: 0,
          completionRate: 0,
          efficiencyScore: 0,
        },
      };
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to get sales metrics" });
    }
  });

  // GET /api/projects/:id/revenue-actions - Get revenue actions
  router.get("/:id/revenue-actions", async (req, res) => {
    try {
      const { id } = req.params;
      // Retrieve revenue actions; default to empty array for now
      const actions: any[] = [];
      res.json(actions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get revenue actions" });
    }
  });


  } catch (error) {
    logger.projectError(req.params.id, "Failed to score goals", { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      success: false,
      error: "Failed to score goals"
    });
  }
});

export default router;
