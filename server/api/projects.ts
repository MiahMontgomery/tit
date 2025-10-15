import { Router } from "express";
import { z } from "zod";
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

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  prompt: z.string().min(1, "Prompt is required"),
  description: z.string().optional()
});

const analyzeProjectSchema = z.object({
  prompt: z.string().min(1, "Prompt is required")
});

const createTaskSchema = z.object({
  goalId: z.string().nullable().optional(),
  type: z.string().min(1, "Type is required"),
  payload: z.record(z.any()).default({})
});

// POST /api/projects - Create a new project
router.post("/", async (req, res) => {
  try {
    const { name, prompt, description } = createProjectSchema.parse(req.body);

    logger.systemInfo("Creating new project", { name, prompt });

    const project = await projectsRepo.create({
      name,
      prompt,
      description: description || ""
    });

    logger.systemInfo("Project created successfully", { projectId: project.id });

    res.status(201).json({
      success: true,
      data: project
    });

  } catch (error) {
    logger.systemError("Failed to create project", { error: error instanceof Error ? error.message : 'Unknown error' });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create project"
    });
  }
});

// GET /api/projects - Get all projects
router.get("/", async (req, res) => {
  try {
    const projects = await projectsRepo.getAll();
    
    res.json({
      success: true,
      data: projects
    });

  } catch (error) {
    logger.systemError("Failed to get projects", { error: error instanceof Error ? error.message : 'Unknown error' });
    
    res.status(500).json({
      success: false,
      error: "Failed to get projects"
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
  try {
    const { id } = req.params;
    const { goalId, type, payload } = createTaskSchema.parse(req.body);

    logger.projectInfo(id, "Creating new task", { type, goalId, payload });

    const task = await tasksRepo.enqueueTask(id, goalId || null, type, payload);
    incrementMetric('tasksProcessed');

    logger.projectInfo(id, "Task created successfully", { taskId: task.id });

    res.status(201).json({
      success: true,
      data: task
    });

  } catch (error) {
    logger.projectError(req.params.id, "Failed to create task", { 
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
      error: "Failed to create task"
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
