import express from 'express';
import { patMiddleware } from '../auth/pat.js';
import { cancelAutoDecision } from '../workers/watchdog.js';
import { getDb } from '../db/drizzle.js';
import { runs, attempts, proofs } from '../../shared/schema.js';
import { eq, asc } from 'drizzle-orm';
import { getPreviewUrl } from '../preview/runtime.js';
import { runActions } from '../workers/actions.js';
import { writeProof } from '../proofs/writer.js';
import { emitStatus } from '../events/publish.js';
import { checkRateLimit } from '../orchestrator/rateLimit.js';

const router = express.Router();

// Apply PAT middleware to all routes
router.use(patMiddleware);

router.post('/:runId/cancel-auto', async (req, res) => {
  try {
    const { runId } = req.params;
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    cancelAutoDecision(runId);
    res.json({ success: true });
  } catch (error) {
    console.error('Cancel auto-decision error:', error);
    res.status(500).json({ error: 'Failed to cancel auto-decision' });
  }
});

router.patch('/:id/budget', async (req, res) => {
  try {
    const { id } = req.params;
    const { budgetTokens, budgetUsd } = req.body;

    if (budgetTokens === undefined && budgetUsd === undefined) {
      return res.status(400).json({ error: 'At least one budget field is required' });
    }

    const db = getDb();
    const updateData: any = { updatedAt: new Date() };
    
    if (budgetTokens !== undefined) {
      updateData.budgetTokens = budgetTokens;
    }
    if (budgetUsd !== undefined) {
      updateData.budgetUsd = budgetUsd;
    }

    await db.update(runs)
      .set(updateData)
      .where(eq(runs.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

router.get('/:id/report', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // Query run by id
    const [run] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, id))
      .limit(1);

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // Query attempts
    const runAttempts = await db
      .select()
      .from(attempts)
      .where(eq(attempts.runId, id))
      .orderBy(asc(attempts.createdAt));

    // Query proofs
    const runProofs = await db
      .select()
      .from(proofs)
      .where(eq(proofs.runId, id))
      .orderBy(asc(proofs.createdAt));

    res.json({
      run: {
        id: run.id,
        projectId: run.projectId,
        state: run.state,
        budgetTokens: run.budgetTokens,
        budgetUsd: run.budgetUsd,
        spentTokens: run.spentTokens,
        spentUsd: run.spentUsd,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt
      },
      attempts: runAttempts,
      proofs: runProofs
    });
  } catch (error) {
    console.error('Get run report error:', error);
    res.status(500).json({ error: 'Failed to get run report' });
  }
});

router.post('/:id/actions', async (req, res) => {
  try {
    const { id } = req.params;
    const { actions } = req.body;

    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({ error: 'actions array is required' });
    }

    const db = getDb();

    // Lookup run
    const [run] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, id))
      .limit(1);

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // Check rate limit
    const nowMs = Date.now();
    const rateLimitCheck = checkRateLimit(run, nowMs);
    if (!rateLimitCheck.ok) {
      await writeProof({
        projectId: run.projectId,
        runId: id,
        type: 'log',
        summary: 'Rate limit exceeded',
        content: rateLimitCheck.error
      });
      
      emitStatus(run.projectId, 'Rate limit exceeded', { runId: id });
      
      return res.status(429).json({ error: rateLimitCheck.error });
    }

    // Update lastActions in database
    await db.update(runs)
      .set({
        lastActions: rateLimitCheck.updated,
        updatedAt: new Date()
      })
      .where(eq(runs.id, id));

    // Get preview URL
    const previewUrl = getPreviewUrl(id);
    if (!previewUrl) {
      return res.status(400).json({ error: 'No preview URL available for this run' });
    }

    // Run actions
    const { screenshots } = await runActions({
      projectId: run.projectId,
      runId: id,
      url: previewUrl,
      actions
    });

    // Write proof for each screenshot
    for (const screenshotPath of screenshots) {
      await writeProof({
        projectId: run.projectId,
        runId: id,
        type: 'screenshot',
        summary: 'Action screenshot',
        content: screenshotPath
      });
    }

    res.json({ success: true, screenshots });
  } catch (error) {
    console.error('Run actions error:', error);
    res.status(500).json({ error: 'Failed to run actions' });
  }
});

router.post('/:id/kill', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // Lookup run
    const [run] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, id))
      .limit(1);

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // Update run state to FAILED
    await db.update(runs)
      .set({
        state: 'FAILED',
        updatedAt: new Date()
      })
      .where(eq(runs.id, id));

    // Write kill proof
    await writeProof({
      projectId: run.projectId,
      runId: id,
      type: 'log',
      summary: 'Run killed',
      content: JSON.stringify({
        runId: id,
        reason: 'manual kill',
        timestamp: new Date().toISOString()
      })
    });

    // Emit status event
    emitStatus(run.projectId, 'Run killed', { runId: id });

    res.json({ success: true, state: 'FAILED' });
  } catch (error) {
    console.error('Kill run error:', error);
    res.status(500).json({ error: 'Failed to kill run' });
  }
});

export default router;
