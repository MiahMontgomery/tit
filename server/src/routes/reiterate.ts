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

    // Check if LLM API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      console.error(`[POST /api/projects/reiterate] OPENROUTER_API_KEY not configured`);
      process.stderr.write(`[POST /api/projects/reiterate] OPENROUTER_API_KEY not configured\n`);
      return res.status(500).json({
        ok: false,
        error: 'AI service not configured',
        errorCode: 'ERR_LLM_NOT_CONFIGURED',
        message: 'AI planning is not available. Please use "Create Project" to create a project without AI planning, or configure OPENROUTER_API_KEY in the environment.'
      });
    }

    // Generate draft using LLM with timeout
    console.log(`[POST /api/projects/reiterate] Generating draft v${nextVersion} for "${parsed.title}"`);
    process.stdout.write(`[POST /api/projects/reiterate] Generating draft v${nextVersion} for "${parsed.title}"\n`);
    
    let draft;
    try {
      const startTime = Date.now();
      
      // Add timeout wrapper - LLM call should complete within 2.5 minutes
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('LLM generation timed out after 2.5 minutes')), 150000);
      });
      
      const draftPromise = llmClient.generateReiterationDraft({
        title: parsed.title,
        context: parsed.context,
        previousVersion,
        userEdits: parsed.userEdits,
      });
      
      draft = await Promise.race([draftPromise, timeoutPromise]) as any;
      
      const duration = Date.now() - startTime;
      console.log(`[POST /api/projects/reiterate] Draft generated in ${duration}ms`);
      process.stdout.write(`[POST /api/projects/reiterate] Draft generated in ${duration}ms\n`);
    } catch (llmError: any) {
      console.error(`[POST /api/projects/reiterate] LLM generation error:`, llmError);
      process.stderr.write(`[POST /api/projects/reiterate] LLM generation error: ${llmError?.message || 'Unknown error'}\n`);
      
      // Check for specific error types
      let errorMessage = llmError?.message || 'LLM service error';
      let errorCode = 'ERR_LLM_GENERATION';
      
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        errorCode = 'ERR_LLM_TIMEOUT';
        errorMessage = 'The AI plan generation took too long. Please try again or use "Create Project" to skip AI planning.';
      } else if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
        errorCode = 'ERR_LLM_AUTH';
        errorMessage = 'AI service authentication failed. Please check API key configuration.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorCode = 'ERR_LLM_NETWORK';
        errorMessage = 'Network error connecting to AI service. Please check your connection.';
      }
      
      return res.status(500).json({
        ok: false,
        error: 'Failed to generate project draft',
        errorCode,
        message: errorMessage,
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
        message: 'The AI returned an invalid response format. Please try again or use "Create Project" to skip AI planning.'
      });
    }
    
    // Ensure new fields exist with defaults
    if (!draft.resourcesAndGaps) {
      draft.resourcesAndGaps = { hardware: [], infrastructure: [], skills: [], other: [] };
    }
    if (!Array.isArray(draft.assumptions)) {
      draft.assumptions = [];
    }
    if (!Array.isArray(draft.questionsForUser)) {
      draft.questionsForUser = [];
    }

    // Try to save draft to database, but don't fail if table doesn't exist yet
    let savedDraft = null;
    try {
      // Save draft with new fields (store as JSON in context or create new fields if schema supports)
      savedDraft = await prisma.reiterationDraft.create({
        data: {
          version: nextVersion,
          title: parsed.title,
          context: {
            ...(parsed.context || {}),
            resourcesAndGaps: draft.resourcesAndGaps,
            assumptions: draft.assumptions,
            questionsForUser: draft.questionsForUser,
          } as any,
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
          context: {
            ...(parsed.context || {}),
            resourcesAndGaps: draft.resourcesAndGaps,
            assumptions: draft.assumptions,
            questionsForUser: draft.questionsForUser,
          } as any,
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
    process.stdout.write(`[POST /api/projects/reiterate] Draft v${nextVersion} created (ID: ${savedDraft.id}), Status: 201\n`);
    
    // Extract new fields from context if stored there
    const contextData = savedDraft.context as any || {};
    const resourcesAndGaps = contextData.resourcesAndGaps || draft.resourcesAndGaps || { hardware: [], infrastructure: [], skills: [], other: [] };
    const assumptions = contextData.assumptions || draft.assumptions || [];
    const questionsForUser = contextData.questionsForUser || draft.questionsForUser || [];
    
    const responseData = {
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
        resourcesAndGaps,
        assumptions,
        questionsForUser,
        userEdits: savedDraft.userEdits,
        createdAt: savedDraft.createdAt || new Date().toISOString(),
      }
    };
    
    console.log(`[POST /api/projects/reiterate] Sending response to client`);
    process.stdout.write(`[POST /api/projects/reiterate] Sending response to client\n`);
    console.log(`[POST /api/projects/reiterate] Response data:`, JSON.stringify({
      ok: responseData.ok,
      draftId: responseData.draft?.draftId,
      version: responseData.draft?.version,
      title: responseData.draft?.title
    }));
    
    // Set headers explicitly and send response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.status(201).json(responseData);
    
    // Ensure response is flushed
    if (res.flush) {
      res.flush();
    }
    
    // Log after response is sent
    console.log(`[POST /api/projects/reiterate] Response sent successfully (status: 201)`);
    process.stdout.write(`[POST /api/projects/reiterate] Response sent successfully (status: 201)\n`);
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

