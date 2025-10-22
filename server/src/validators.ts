import { z } from 'zod';

// Project validation schemas
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1),
  templateRef: z.string().optional(),
  spec: z.record(z.any()).optional()
});

export const getProjectsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()
});

// Ops validation schemas
export const proposeOpsSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  branch: z.string().optional(),
  patches: z.array(z.object({
    path: z.string(),
    content: z.string().optional(),
    delete: z.boolean().optional(),
    diff: z.string().optional()
  }))
});

// Job validation schemas
export const enqueueJobSchema = z.object({
  projectId: z.string(),
  kind: z.string(),
  payload: z.record(z.any())
});

// Run validation schemas
export const startRunSchema = z.object({
  projectId: z.string(),
  pipeline: z.string().optional()
});

export const finishRunSchema = z.object({
  status: z.enum(['done', 'error']),
  details: z.record(z.any()).optional()
});

// Artifact validation schemas
export const addArtifactSchema = z.object({
  projectId: z.string(),
  kind: z.string(),
  path: z.string(),
  meta: z.record(z.any()).optional()
});
