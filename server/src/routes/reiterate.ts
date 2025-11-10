import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { llmClient } from "../../core/tools/llm.js";

// Create Prisma client instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

const router = Router();

const ReiterateRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  context: z.any().optional(),
  previousDraftId: z.string().optional(),
  userEdits: z.string().optional(),
});

// POST /api/projects/reiterate - Generate or update reiteration draft
router.post("/", async (req, res, next) => {
  try {
    console.log(`[POST /api/projects/reiterate] Origin: ${req.get('origin') || 'none'}, Body:`, JSON.stringify(req.body));
    
    // Validate request body
    let parsed;
    try {
      parsed = ReiterateRequestSchema.parse(req.body);
    } catch (validationError: any) {
      if (validationError.name === 'ZodError') {
        console.error(`[POST /api/projects/reiterate] Validation error:`, validationError.errors);
        return res.status(400).json({ 
          ok: false, 
          error: 'Validation failed',
          errorCode: 'ERR_VALIDATION',
          message: 'Request data did not pass validation',
          details: validationError.errors
        });
      }
      throw validationError;
    }
    
    // If previous draft exists, fetch it to inform the new generation
    let previousVersion = null;
    if (parsed.previousDraftId) {
      try {
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
      } catch (dbError: any) {
        // If table doesn't exist, skip previous version lookup
        if (dbError.code === 'P2021' || dbError.code === 'P2001' || dbError.message?.includes('does not exist')) {
          console.warn(`[POST /api/projects/reiterate] ReiterationDraft table not found, skipping previous draft lookup`);
        } else {
          throw dbError;
        }
      }
    }

    // Get the next version number
    let nextVersion = 1;
    try {
      const maxVersion = await prisma.reiterationDraft.findFirst({
        where: { title: parsed.title },
        orderBy: { version: 'desc' },
        select: { version: true }
      });
      nextVersion = (maxVersion?.version || 0) + 1;
    } catch (dbError: any) {
      // If table doesn't exist, default to version 1
      if (dbError.code === 'P2021' || dbError.code === 'P2001' || dbError.message?.includes('does not exist')) {
        console.warn(`[POST /api/projects/reiterate] ReiterationDraft table not found, using version 1`);
        nextVersion = 1;
      } else {
        throw dbError;
      }
    }

    // Generate draft using LLM
    console.log(`[POST /api/projects/reiterate] Generating draft v${nextVersion} for "${parsed.title}"`);
    let draft;
    try {
      draft = await llmClient.generateReiterationDraft({
        title: parsed.title,
        context: parsed.context,
        previousVersion,
        userEdits: parsed.userEdits,
      });
    } catch (llmError: any) {
      console.error(`[POST /api/projects/reiterate] LLM generation error:`, llmError);
      return res.status(500).json({
        ok: false,
        error: 'Failed to generate project draft',
        errorCode: 'ERR_LLM_GENERATION',
        message: llmError?.message || 'LLM service error',
        details: process.env.NODE_ENV === 'development' ? llmError?.stack : undefined
      });
    }
    
    // Validate draft structure
    if (!draft || !draft.narrative || !Array.isArray(draft.prominentFeatures)) {
      console.error(`[POST /api/projects/reiterate] Invalid draft structure:`, draft);
      return res.status(500).json({
        ok: false,
        error: 'Invalid draft structure returned from LLM',
        errorCode: 'ERR_LLM_INVALID_RESPONSE',
        message: 'The LLM returned an invalid draft structure'
      });
    }

    // Try to save draft to database, but don't fail if table doesn't exist yet
    let savedDraft = null;
    try {
      savedDraft = await prisma.reiterationDraft.create({
        data: {
          version: nextVersion,
          title: parsed.title,
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
      console.log(`[POST /api/projects/reiterate] Draft v${nextVersion} saved to database (ID: ${savedDraft.id})`);
    } catch (dbError: any) {
      // If table doesn't exist (migration not run), log warning but continue
      if (dbError.code === 'P2021' || dbError.code === 'P2001' || dbError.message?.includes('does not exist')) {
        console.warn(`[POST /api/projects/reiterate] ReiterationDraft table not found - migration may not be applied. Returning draft without saving.`);
        console.warn(`[POST /api/projects/reiterate] Error details:`, dbError.message);
        // Create a mock saved draft for response
        savedDraft = {
          id: `temp-${Date.now()}`,
          version: nextVersion,
          title: parsed.title,
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
          createdAt: new Date(),
        };
      } else {
        // Re-throw other database errors
        throw dbError;
      }
    }

    console.log(`[POST /api/projects/reiterate] Draft v${nextVersion} created (ID: ${savedDraft.id}), Status: 201`);
    
    return res.status(201).json({
      ok: true,
      draft: {
        draftId: savedDraft.id,
        version: savedDraft.version,
        title: savedDraft.title,
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
        createdAt: savedDraft.createdAt || new Date().toISOString(),
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
    
    // Handle table not found errors (migration not applied)
    if (err.code === 'P2021' || err.code === 'P2001' || err.message?.includes('does not exist')) {
      return res.status(500).json({
        ok: false,
        error: 'Database table not found',
        errorCode: 'ERR_DB_TABLE_MISSING',
        message: 'ReiterationDraft table does not exist. Please run database migrations.',
        details: err.message,
        prismaCode: err.code
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

