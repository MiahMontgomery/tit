import { Router } from "express";
import { z } from "zod";
import { projectsRepo } from "../lib/repos/ProjectsRepo.js";
import { runsRepo } from "../lib/repos/RunsRepo.js";
import { jobsRepo } from "../lib/repos/JobsRepo.js";
import { artifactsRepo } from "../lib/repos/ArtifactsRepo.js";
import { enqueue } from "../lib/queue.js";
import { logger } from "../lib/logger.js";

const router = Router();

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1),
  templateRef: z.string().optional(),
  spec: z.record(z.any()).optional()
});

// GET /api/projects
router.get("/", async (req, res) => {
  try {
    const cursor = req.query.cursor as string;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const projects = await projectsRepo.getAll(cursor, limit);
    
    res.json({
      success: true,
      data: projects,
      cursor: projects.length > 0 ? projects[projects.length - 1].id : null
    });
  } catch (error) {
    logger.error("Failed to get projects", { error });
    res.status(500).json({
      success: false,
      error: "Failed to get projects"
    });
  }
});

// POST /api/projects
router.post("/", async (req, res) => {
  try {
    const data = createProjectSchema.parse(req.body);
    
    // Create project
    const project = await projectsRepo.create({
      name: data.name,
      type: data.type,
      templateRef: data.templateRef,
      spec: data.spec
    });
    
    // Start a run
    const run = await runsRepo.start({
      projectId: project.id,
      pipeline: 'default'
    });
    
    // Enqueue scaffold job
    await enqueue({
      projectId: project.id,
      kind: 'scaffold',
      payload: {
        templateRef: project.templateRef,
        spec: project.spec
      }
    });
    
    logger.info("Project created", {
      projectId: project.id,
      name: project.name,
      type: project.type
    });
    
    res.json({
      success: true,
      data: { id: project.id }
    });
  } catch (error) {
    logger.error("Failed to create project", { error });
    res.status(500).json({
      success: false,
      error: "Failed to create project"
    });
  }
});

// GET /api/projects/:id
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
    
    const latestRun = await runsRepo.getLatestByProject(id);
    const jobs = await jobsRepo.getByProject(id);
    const artifacts = await artifactsRepo.getByProject(id);
    
    res.json({
      success: true,
      data: {
        project,
        latestRun,
        jobs,
        artifacts
      }
    });
  } catch (error) {
    logger.error("Failed to get project", { error, projectId: req.params.id });
    res.status(500).json({
      success: false,
      error: "Failed to get project"
    });
  }
});

export default router;
