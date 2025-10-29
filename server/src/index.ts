import express from "express";
import cors from "cors";
import { prisma } from "./lib/db.js";
import { z } from "zod";

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

// Validation schema
const CreateProject = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
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
    const parsed = CreateProject.parse(req.body);
    const project = await prisma.project.create({
      data: {
        name: parsed.name,
        description: parsed.description ?? null,
      },
    });
    return res.status(201).json({ ok: true, project });
  } catch (err: any) {
    if (err.code && err.meta) {
      return res.status(400).json({ ok: false, code: err.code, meta: err.meta });
    }
    if (err.name === 'ZodError') {
      return res.status(400).json({ ok: false, validation: err.flatten() });
    }
    return next(err);
  }
});

// List projects
app.get("/api/projects", async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { id: 'desc' },
      take: 50,
    });
    return res.json({ ok: true, projects });
  } catch (err) {
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
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Titan backend running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
});