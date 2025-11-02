import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { llmClient } from "../../core/tools/llm.js";

const router = Router();

const ReiterateRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  intent: z.string().optional(),
  context: z.any().optional(),
  previousDraftId: z.string().optional(),
  userEdits: z.string().optional(),
});

// POST /api/projects/reiterate - Generate or update reiteration draft
router.post("/", async (req, res, next) => {
  try {
    console.log(`[POST /api/projects/reiterate] Origin: ${req.get('origin') || 'none'}, Body:`, JSON.stringify(req.body));
    
    const parsed = ReiterateRequestSchema.parse(req.body);
    
    // If previous draft exists, fetch it to inform the new generation
    let previousVersion = null;
    if (parsed.previousDraftId) {
      const previousDraft = await prisma.reiterationDraft.findUnique({
        where: { id: parsed.previousDraftId }
      });
      if (previousDraft) {
        previousVersion = {
          version: previousDraft.version,
          narrative: previousDraft.narrative,
          prominentFeatures: previousDraft.prominentFeatures,
          modes: previousDraft.modes,
          milestones: previousDraft.milestones,
        };
      }
    }

    // Get the next version number
    const maxVersion = await prisma.reiterationDraft.findFirst({
      where: { title: parsed.title },
      orderBy: { version: 'desc' },
      select: { version: true }
    });
    const nextVersion = (maxVersion?.version || 0) + 1;

    // Generate draft using LLM
    console.log(`[POST /api/projects/reiterate] Generating draft v${nextVersion} for "${parsed.title}"`);
    const draft = await llmClient.generateReiterationDraft({
      title: parsed.title,
      intent: parsed.intent,
      context: parsed.context,
      previousVersion,
      userEdits: parsed.userEdits,
    });

    // Save draft to database
    const savedDraft = await prisma.reiterationDraft.create({
      data: {
        version: nextVersion,
        title: parsed.title,
        intent: parsed.intent || null,
        context: parsed.context || null,
        narrative: draft.narrative,
        prominentFeatures: draft.prominentFeatures,
        modes: draft.modes || null,
        milestones: draft.milestones,
        risks: draft.risks || null,
        dependencies: draft.dependencies || null,
        instrumentation: draft.instrumentation || null,
        acceptanceCriteria: draft.acceptanceCriteria,
        userEdits: parsed.userEdits || null,
      }
    });

    console.log(`[POST /api/projects/reiterate] Draft v${nextVersion} created (ID: ${savedDraft.id}), Status: 201`);
    
    return res.status(201).json({
      ok: true,
      draft: {
        draftId: savedDraft.id,
        version: savedDraft.version,
        title: savedDraft.title,
        intent: savedDraft.intent,
        context: savedDraft.context,
        narrative: savedDraft.narrative,
        prominentFeatures: savedDraft.prominentFeatures,
        modes: savedDraft.modes,
        milestones: savedDraft.milestones,
        risks: savedDraft.risks,
        dependencies: savedDraft.dependencies,
        instrumentation: savedDraft.instrumentation,
        acceptanceCriteria: savedDraft.acceptanceCriteria,
        userEdits: savedDraft.userEdits,
        createdAt: savedDraft.createdAt,
      }
    });
  } catch (err: any) {
    console.error(`[POST /api/projects/reiterate] Error:`, err);
    
    if (err.name === 'ZodError') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Validation failed',
        errorCode: 'ERR_VALIDATION',
        message: 'Request data did not pass validation',
        details: err.errors 
      });
    }
    
    // Handle database errors
    if (err.code === 'P1001') {
      return res.status(500).json({
        ok: false,
        error: 'Cannot reach database server',
        errorCode: 'ERR_DB_CONNECTION',
        message: err.message || 'Database server is unreachable'
      });
    }
    
    if (err.code && err.code.startsWith('P')) {
      return res.status(500).json({
        ok: false,
        error: 'Database error',
        errorCode: `ERR_DB_${err.code}`,
        message: err.message,
        prismaCode: err.code
      });
    }
    
    return res.status(500).json({
      ok: false,
      error: 'Internal server error',
      errorCode: 'ERR_SERVER_INTERNAL',
      message: err?.message || 'An unexpected error occurred'
    });
  }
});

export default router;

