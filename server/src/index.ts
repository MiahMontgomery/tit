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

    // Create charter if provided
    if (parsed.charter) {
      try {
        await prisma.projectCharter.create({
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
        console.log(`[POST /api/projects] Created charter for project ${project.id}`);
      } catch (charterError: any) {
        console.error(`[POST /api/projects] Charter creation error:`, charterError);
        // Continue even if charter creation fails - project is already created
      }
    }

    // Log project initialization
    console.log(`[POST /api/projects] Project ${project.id} created successfully, Status: 201`);
    
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
    let projects;
    try {
      projects = await prisma.project.findMany({
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

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Titan Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', error);
  res.status(500).json({
    ok: false,
    message: error.message || 'Internal Server Error',
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