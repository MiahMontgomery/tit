import express from 'express';
import { getDb } from '../db/drizzle.js';
import { runs, attempts } from '../../shared/schema.js';
import { eq, desc } from 'drizzle-orm';
import { ensureRun, tick } from '../orchestrator/orchestrator.js';
import { emitStatus } from '../events/publish.js';
import { writeProof } from '../proofs/writer.js';
import { patMiddleware } from '../auth/pat.js';

const router = express.Router();
router.use(patMiddleware);

// Start a new run
router.post('/start', async (req, res) => {
  try {
    const { projectId } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'projectId required' });
    }
    
    const { runId } = await ensureRun(projectId);
    
    // Get current state
    const db = getDb();
    const [run] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, runId))
      .limit(1);
    
    res.json({ runId, state: run?.state || 'INTAKE' });
  } catch (error) {
    console.error('Start run error:', error);
    res.status(500).json({ error: 'Failed to start run' });
  }
});

// Tick run (advance one step)
router.post('/:runId/tick', async (req, res) => {
  try {
    const { runId } = req.params;
    const result = await tick(runId);
    res.json(result);
  } catch (error) {
    console.error('Tick run error:', error);
    res.status(500).json({ error: 'Failed to tick run' });
  }
});

// Review run (approve/redo)
router.post('/:runId/review', async (req, res) => {
  try {
    const { runId } = req.params;
    const { action } = req.body;
    
    if (!action || !['approve', 'redo'].includes(action)) {
      return res.status(400).json({ error: 'action must be approve or redo' });
    }
    
    const db = getDb();
    const [run] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, runId))
      .limit(1);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    if (action === 'approve' && run.state === 'REVIEW') {
      // Move to TEARDOWN
      await db.update(runs)
        .set({ 
          state: 'TEARDOWN',
          updatedAt: new Date()
        })
        .where(eq(runs.id, runId));
      
      await writeProof({
        projectId: run.projectId,
        runId,
        type: 'log',
        content: JSON.stringify({
          state: 'TEARDOWN',
          message: 'Teardown complete',
          timestamp: new Date().toISOString()
        }),
        summary: 'Teardown complete'
      });
      
      // Move to DONE
      await db.update(runs)
        .set({ 
          state: 'DONE',
          updatedAt: new Date()
        })
        .where(eq(runs.id, runId));
      
      emitStatus(run.projectId, 'Run approved', { runId });
      
      res.json({ success: true, newState: 'DONE' });
    } else if (action === 'redo') {
      // Move back to SELECT_TASK and clear currentTaskId
      await db.update(runs)
        .set({ 
          state: 'SELECT_TASK',
          currentTaskId: null,
          updatedAt: new Date()
        })
        .where(eq(runs.id, runId));
      
      await writeProof({
        projectId: run.projectId,
        runId,
        type: 'log',
        content: JSON.stringify({
          state: 'SELECT_TASK',
          message: 'Run redo - reset to task selection',
          timestamp: new Date().toISOString()
        }),
        summary: 'Run redo'
      });
      
      emitStatus(run.projectId, 'Run redo', { runId });
      
      res.json({ success: true, newState: 'SELECT_TASK' });
    } else {
      res.status(400).json({ error: 'Invalid action for current state' });
    }
  } catch (error) {
    console.error('Review run error:', error);
    res.status(500).json({ error: 'Failed to review run' });
  }
});

// Advance run (approve/redo)
router.post('/:runId/advance', async (req, res) => {
  try {
    const { runId } = req.params;
    const { action } = req.body;
    
    if (!action || !['approve', 'redo'].includes(action)) {
      return res.status(400).json({ error: 'action must be approve or redo' });
    }
    
    const db = getDb();
    const [run] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, runId))
      .limit(1);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    if (action === 'approve' && run.state === 'REVIEW') {
      // Move to TEARDOWN then DONE
      await db.update(runs)
        .set({ 
          state: 'TEARDOWN',
          updatedAt: new Date()
        })
        .where(eq(runs.id, runId));
      
      emitStatus(run.projectId, `run ${runId} -> TEARDOWN`);
      
      await writeProof({
        projectId: run.projectId,
        runId,
        type: 'log',
        content: JSON.stringify({
          state: 'TEARDOWN',
          message: 'Teardown stub executed',
          timestamp: new Date().toISOString()
        }),
        summary: `Run ${runId} teardown completed`
      });
      
      // Move to DONE
      await db.update(runs)
        .set({ 
          state: 'DONE',
          updatedAt: new Date()
        })
        .where(eq(runs.id, runId));
      
      emitStatus(run.projectId, `run ${runId} -> DONE`);
      
      res.json({ runId, state: 'DONE' });
    } else if (action === 'redo') {
      // Move back to SELECT_TASK
      await db.update(runs)
        .set({ 
          state: 'SELECT_TASK',
          updatedAt: new Date()
        })
        .where(eq(runs.id, runId));
      
      emitStatus(run.projectId, `run ${runId} -> SELECT_TASK (redo)`);
      
      res.json({ runId, state: 'SELECT_TASK' });
    } else {
      res.status(400).json({ error: 'Invalid action for current state' });
    }
  } catch (error) {
    console.error('Advance run error:', error);
    res.status(500).json({ error: 'Failed to advance run' });
  }
});

// Get run status
router.get('/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    
    const db = getDb();
    const [run] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, runId))
      .limit(1);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    const recentAttempts = await db
      .select()
      .from(attempts)
      .where(eq(attempts.runId, runId))
      .orderBy(desc(attempts.createdAt))
      .limit(10);
    
    res.json({
      ...run,
      attempts: recentAttempts
    });
  } catch (error) {
    console.error('Get run error:', error);
    res.status(500).json({ error: 'Failed to get run' });
  }
});

export default router;
