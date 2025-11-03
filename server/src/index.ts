import express from "express";
import cors from "cors";
import { prisma } from "./lib/db.js";
import { z } from "zod";
import reiterateRouter from "./routes/reiterate.js";

const app = express();

// CORS configuration
const allowed = [
  'https://morteliv.com',
  'https://www.morteliv.com',
  'https://tit-heaw.onrender.com',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow curl/postman
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));

// Request logging middleware (must be before routes)
import { requestId, logRequest } from "./middleware/requestId.js";
app.use(requestId());
app.use(logRequest());

// Routes
app.use("/api/projects/reiterate", reiterateRouter);

// Validation schema
const CreateProject = z.object({
  name: z.string().min(1, 'Project name is required'),
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

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Create project
app.post("/api/projects", async (req, res, next) => {
  try {
    console.log(`[POST /api/projects] Origin: ${req.get('origin') || 'none'}, Method: ${req.method}, Body:`, JSON.stringify(req.body));
    
    let parsed;
    try {
      parsed = CreateProject.parse(req.body);
    } catch (validationError: any) {
      if (validationError.name === 'ZodError') {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          errorCode: 'ERR_VALIDATION',
          validation: validationError.flatten(),
          message: 'Request data did not pass validation'
        });
      }
      throw validationError;
    }
    
    // Create project
    let project;
    try {
      // Only include fields that exist in the current schema
      // Check if schema has new fields by trying a minimal create first
      const projectData: any = {
        name: parsed.name || 'Untitled Project',
      };
      
      // Only add description if it's provided
      if (parsed.description) {
        projectData.description = parsed.description;
      }
      
      project = await prisma.project.create({
        data: projectData,
      });
    } catch (dbError: any) {
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
          message: `A project with name "${parsed.name || parsed.title}" already exists`,
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

    // Create project, charter, and initial log in a transaction
    if (parsed.charter) {
      try {
        // Use transaction to ensure all-or-nothing creation
        const result = await prisma.$transaction(async (tx) => {
          // Create charter
          await tx.projectCharter.create({
            data: {
              projectId: project.id,
              narrative: parsed.charter.narrative,
              prominentFeatures: parsed.charter.prominentFeatures,
              modes: parsed.charter.modes || null,
              milestones: parsed.charter.milestones,
              risks: parsed.charter.risks || null,
              dependencies: parsed.charter.dependencies || null,
              instrumentation: parsed.charter.instrumentation || null,
              acceptanceCriteria: parsed.charter.acceptanceCriteria,
            }
          });
          
          // Note: Initial log creation would go here if we had a Log model
          // For now, we'll just log to console
          console.log(`[POST /api/projects] Created charter for project ${project.id} in transaction`);
          
          return project;
        });
        
        project = result;
        console.log(`[POST /api/projects] Project ${project.id} created successfully with charter, Status: 201`);
      } catch (charterError: any) {
        console.error(`[POST /api/projects] Transaction error (charter/log creation):`, charterError);
        // If transaction fails, rollback project (it was created outside transaction)
        // For now, we'll keep the project but log the error
        // TODO: Wrap entire creation in transaction when Log model exists
        throw charterError;
      }
    } else {
      console.log(`[POST /api/projects] Project ${project.id} created successfully (no charter), Status: 201`);
    }
    
    return res.status(201).json({ 
      ok: true, 
      project: {
        ...project,
        hasCharter: !!parsed.charter
      }
    });
  } catch (err: any) {
    console.error(`[POST /api/projects] Unexpected error:`, err);
    return res.status(500).json({
      ok: false,
      error: 'Internal server error',
      errorCode: 'ERR_SERVER_INTERNAL',
      message: err?.message || 'An unexpected error occurred'
    });
  }
});

// List projects
app.get("/api/projects", async (req, res, next) => {
  try {
    console.log(`[GET /api/projects] Origin: ${req.get('origin') || 'none'}, Method: ${req.method}`);
    
    // Check if Prisma client is initialized
    if (!prisma) {
      return res.status(500).json({
        ok: false,
        error: 'Database client not initialized',
        errorCode: 'ERR_DB_CLIENT_MISSING',
        message: 'Prisma client is not available'
      });
    }

    // Attempt to query database
    // Only select fields that exist in current database schema
    let projects;
    try {
      projects = await prisma.project.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
        },
        orderBy: { id: 'desc' },
        take: 50,
      });
    } catch (dbError: any) {
      // Handle specific Prisma errors
      if (dbError.code === 'P1001') {
        return res.status(500).json({
          ok: false,
          error: 'Cannot reach database server',
          errorCode: 'ERR_DB_CONNECTION',
          message: dbError.message || 'Database server is unreachable',
          details: 'Check DATABASE_URL and ensure database is running'
        });
      }
      
      if (dbError.code === 'P2002') {
        return res.status(500).json({
          ok: false,
          error: 'Database constraint violation',
          errorCode: 'ERR_DB_CONSTRAINT',
          message: dbError.meta?.target ? `Unique constraint on ${dbError.meta.target.join(', ')}` : dbError.message
        });
      }
      
      if (dbError.code === 'P2025') {
        return res.status(404).json({
          ok: false,
          error: 'Record not found',
          errorCode: 'ERR_DB_NOT_FOUND',
          message: dbError.message
        });
      }
      
      // Generic Prisma error
      if (dbError.code && dbError.code.startsWith('P')) {
        return res.status(500).json({
          ok: false,
          error: 'Database query error',
          errorCode: `ERR_DB_${dbError.code}`,
          message: dbError.message,
          prismaCode: dbError.code,
          meta: dbError.meta
        });
      }
      
      // Unknown database error
      return res.status(500).json({
        ok: false,
        error: 'Database operation failed',
        errorCode: 'ERR_DB_UNKNOWN',
        message: dbError.message || 'Unknown database error',
        details: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
      });
    }
    
    console.log(`[GET /api/projects] Found ${projects.length} projects, Status: 200`);
    return res.json({ ok: true, projects });
  } catch (err: any) {
    console.error(`[GET /api/projects] Unexpected error:`, err);
    
    // Non-database errors
    return res.status(500).json({
      ok: false,
      error: 'Internal server error',
      errorCode: 'ERR_SERVER_INTERNAL',
      message: err?.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? err?.stack : undefined
    });
  }
});

// Delete project
app.delete("/api/projects/:id", async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      console.error(`[DELETE /api/projects/:id] Invalid project ID: ${req.params.id}`);
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid project ID',
        errorCode: 'ERR_VALIDATION',
        message: 'Project ID must be a valid number'
      });
    }
    
    console.log(`[DELETE /api/projects/:id] Attempting to delete project ${projectId}, Request ID: ${req.requestId || 'none'}`);
    
    // Check if project exists first
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: { charter: true }
    });
    
    if (!existingProject) {
      console.log(`[DELETE /api/projects/:id] Project ${projectId} not found`);
      return res.status(404).json({ 
        ok: false, 
        error: 'Project not found',
        errorCode: 'ERR_DB_NOT_FOUND',
        message: `Project with ID ${projectId} does not exist`
      });
    }
    
    // Delete project (charter will be cascade deleted if foreign key constraint exists)
    // If cascade doesn't exist, delete charter first
    try {
      await prisma.$transaction(async (tx) => {
        // Delete charter if it exists
        if (existingProject.charter) {
          await tx.projectCharter.delete({
            where: { projectId: projectId }
          }).catch(() => {
            // Ignore if already deleted or doesn't exist
          });
        }
        
        // Delete project
        await tx.project.delete({
          where: { id: projectId }
        });
      });
      
      console.log(`[DELETE /api/projects/:id] Project ${projectId} deleted successfully, Status: 204`);
      return res.status(204).end();
    } catch (dbError: any) {
      console.error(`[DELETE /api/projects/:id] Database error deleting project ${projectId}:`, dbError);
      
      if (dbError.code === 'P1001') {
        return res.status(500).json({
          ok: false,
          error: 'Cannot reach database server',
          errorCode: 'ERR_DB_CONNECTION',
          message: dbError.message || 'Database server is unreachable'
        });
      }
      
      if (dbError.code === 'P2025') {
        return res.status(404).json({
          ok: false,
          error: 'Project not found',
          errorCode: 'ERR_DB_NOT_FOUND',
          message: `Project with ID ${projectId} does not exist`
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
  } catch (err: any) {
    console.error(`[DELETE /api/projects/:id] Unexpected error:`, err);
    return res.status(500).json({
      ok: false,
      error: 'Internal server error',
      errorCode: 'ERR_SERVER_INTERNAL',
      message: err?.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? err?.stack : undefined
    });
  }
});

// Get project charter
app.get("/api/projects/:id/charter", async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ ok: false, error: 'Invalid project ID' });
    }
    
    const charter = await prisma.projectCharter.findUnique({
      where: { projectId }
    });
    
    if (!charter) {
      return res.status(404).json({ ok: false, error: 'Charter not found' });
    }
    
    return res.json({ ok: true, charter });
  } catch (err) {
    console.error(`[GET /api/projects/:id/charter] Error:`, err);
    return next(err);
  }
});

// Stub endpoints for project-related data - return empty arrays to prevent frontend errors
// These will be implemented fully as features are added

// GET /api/projects/:id/messages
app.get("/api/projects/:id/messages", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ ok: false, error: 'Invalid project ID' });
    }
    // Return empty array - messages feature not implemented yet
    return res.json([]);
  } catch (err) {
    console.error(`[GET /api/projects/:id/messages] Error:`, err);
    return res.json([]); // Return empty array even on error
  }
});

// GET /api/projects/:id/memory
app.get("/api/projects/:id/memory", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ ok: false, error: 'Invalid project ID' });
    }
    // Return empty array - memory feature not implemented yet
    return res.json([]);
  } catch (err) {
    console.error(`[GET /api/projects/:id/memory] Error:`, err);
    return res.json([]);
  }
});

// GET /api/projects/:id/tasks
app.get("/api/projects/:id/tasks", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ ok: false, error: 'Invalid project ID' });
    }
    // Return empty array - tasks feature not implemented yet
    return res.json([]);
  } catch (err) {
    console.error(`[GET /api/projects/:id/tasks] Error:`, err);
    return res.json([]);
  }
});

// POST /api/projects/:id/tasks
app.post("/api/projects/:id/tasks", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ ok: false, error: 'Invalid project ID' });
    }
    // Stub implementation - tasks feature not fully implemented yet
    return res.status(201).json({ 
      ok: true, 
      id: `task-${Date.now()}`,
      projectId,
      content: req.body.content || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error(`[POST /api/projects/:id/tasks] Error:`, err);
    return res.status(500).json({ ok: false, error: 'Failed to create task' });
  }
});

// GET /api/projects/:id/runs
app.get("/api/projects/:id/runs", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ ok: false, error: 'Invalid project ID' });
    }
    // Return empty array - runs feature not implemented yet
    return res.json([]);
  } catch (err) {
    console.error(`[GET /api/projects/:id/runs] Error:`, err);
    return res.json([]);
  }
});

// GET /api/projects/:id/logs
app.get("/api/projects/:id/logs", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ ok: false, error: 'Invalid project ID' });
    }
    // Return empty array - logs feature not implemented yet
    return res.json([]);
  } catch (err) {
    console.error(`[GET /api/projects/:id/logs] Error:`, err);
    return res.json([]);
  }
});

// GET /api/projects/:id/proofs
app.get("/api/projects/:id/proofs", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ ok: false, error: 'Invalid project ID' });
    }
    // Return empty array - proofs feature not implemented yet
    return res.json([]);
  } catch (err) {
    console.error(`[GET /api/projects/:id/proofs] Error:`, err);
    return res.json([]);
  }
});

// GET /api/projects/:id/sales
app.get("/api/projects/:id/sales", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ ok: false, error: 'Invalid project ID' });
    }
    // Return empty sales data - sales feature not implemented yet
    return res.json({
      revenue: 0,
      transactions: 0,
      period: 'daily',
      metrics: []
    });
  } catch (err) {
    console.error(`[GET /api/projects/:id/sales] Error:`, err);
    return res.json({ revenue: 0, transactions: 0, period: 'daily', metrics: [] });
  }
});

// GET /api/projects/:id/revenue-actions
app.get("/api/projects/:id/revenue-actions", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ ok: false, error: 'Invalid project ID' });
    }
    // Return empty array - revenue actions feature not implemented yet
    return res.json([]);
  } catch (err) {
    console.error(`[GET /api/projects/:id/revenue-actions] Error:`, err);
    return res.json([]);
  }
});

// GET /api/projects/:id/live-actions
app.get("/api/projects/:id/live-actions", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ ok: false, error: 'Invalid project ID' });
    }
    // Return empty array - live actions feature not implemented yet
    return res.json([]);
  } catch (err) {
    console.error(`[GET /api/projects/:id/live-actions] Error:`, err);
    return res.json([]);
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Titan Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Error handler with logging
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requestId = (req as any).requestId || 'NO-ID';
  console.error(`[${requestId}] API Error:`, {
    message: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    origin: req.get('origin')
  });
  
  res.status(500).json({
    ok: false,
    error: 'Internal Server Error',
    errorCode: 'ERR_SERVER_INTERNAL',
    message: error.message || 'Internal Server Error',
    requestId: requestId,
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Not found"
  });
});

// Start server
const port = Number(process.env.PORT) || 10000;
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server listening on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
});