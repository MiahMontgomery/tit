import { Router } from "express";
import { storage } from "../storage";
import { ensureHierarchy } from "../workers/planner";
import { emitHierarchyUpdated, emitMilestoneUpdated, emitGoalUpdated } from "../events/publish";

const router = Router();

// Optional PAT middleware for development
const optionalPatMiddleware = (req: any, res: any, next: any) => {
  // Skip PAT validation in development
  next();
};

// GET /api/hierarchy/:id
router.get("/hierarchy/:id", optionalPatMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const features = await storage.getFeaturesByProject(projectId);
    const featuresWithHierarchy = await Promise.all(
      features.map(async (feature) => {
        const milestones = await storage.getMilestonesByFeature(feature.id);
        const milestonesWithGoals = await Promise.all(
          milestones.map(async (milestone) => {
            const goals = await storage.getGoalsByMilestone(milestone.id);
            return {
              id: milestone.id,
              title: milestone.title,
              state: milestone.state,
              orderIndex: milestone.orderIndex,
              goals: goals.map(goal => ({
                id: goal.id,
                title: goal.title,
                state: goal.state,
                orderIndex: goal.orderIndex,
              })),
            };
          })
        );
        
        return {
          id: feature.id,
          title: feature.name,
          state: feature.status,
          orderIndex: 0,
          milestones: milestonesWithGoals,
        };
      })
    );

    res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
      },
      features: featuresWithHierarchy,
    });
  } catch (error) {
    console.error("Hierarchy fetch error:", error);
    res.status(500).json({ error: "Failed to fetch hierarchy" });
  }
});

// POST /api/hierarchy/:id/plan
router.post("/hierarchy/:id/plan", optionalPatMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const result = await ensureHierarchy({ projectId });
    
    if (result.created) {
      emitHierarchyUpdated(projectId);
    }
    
    res.json({ created: result.created });
  } catch (error) {
    console.error("Plan generation error:", error);
    res.status(500).json({ error: "Failed to generate plan" });
  }
});

// PATCH /api/goals/:goalId/state
router.patch("/goals/:goalId/state", optionalPatMiddleware, async (req, res) => {
  try {
    const goalId = req.params.goalId;
    const { state } = req.body;
    
    if (!state || !["PLANNED", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"].includes(state)) {
      return res.status(400).json({ error: "Invalid state" });
    }

    const goal = await storage.getGoal(goalId);
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    await storage.updateGoalState(goalId, state);
    emitGoalUpdated(goal.projectId, goalId, state);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Goal state update error:", error);
    res.status(500).json({ error: "Failed to update goal state" });
  }
});

// PATCH /api/milestones/:milestoneId/state
router.patch("/milestones/:milestoneId/state", optionalPatMiddleware, async (req, res) => {
  try {
    const milestoneId = req.params.milestoneId;
    const { state } = req.body;
    
    if (!state || !["PLANNED", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"].includes(state)) {
      return res.status(400).json({ error: "Invalid state" });
    }

    const milestone = await storage.getMilestone(milestoneId);
    if (!milestone) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    await storage.updateMilestoneState(milestoneId, state);
    emitMilestoneUpdated(milestone.projectId, milestoneId, state);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Milestone state update error:", error);
    res.status(500).json({ error: "Failed to update milestone state" });
  }
});

export default router;
