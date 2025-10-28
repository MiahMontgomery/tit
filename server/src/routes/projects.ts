import { Router } from "express";
import { prisma } from "../lib/db.js";
import { z } from "zod";

const router = Router();

const CreateProject = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
});

router.post('/', async (req, res, next) => {
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
    // Prisma known errors get clear messages
    if (err.code && err.meta) {
      return res.status(400).json({ ok: false, code: err.code, meta: err.meta });
    }
    if (err.name === 'ZodError') {
      return res.status(400).json({ ok: false, validation: err.flatten() });
    }
    return next(err);
  }
});

router.get('/', async (_req, res, next) => {
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

export default router;