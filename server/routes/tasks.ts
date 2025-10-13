/**
 * Task management API routes for Titan
 * Handles task creation, status checking, and proof retrieval
 */

import { Router } from 'express';
import { taskQueue } from '../core/queue';
import { proofLogger } from '../services/proofLogger';

const router = Router();

/**
 * Create a new task
 * POST /api/tasks
 */
router.post('/', async (req, res) => {
  try {
    const { projectId, type, payload } = req.body;

    if (!projectId || !type || !payload) {
      return res.status(400).json({ error: 'Missing required fields: projectId, type, payload' });
    }

    if (!['exec', 'code', 'screenshot'].includes(type)) {
      return res.status(400).json({ error: 'Invalid task type. Must be: exec, code, screenshot' });
    }

    const taskId = await taskQueue.enqueue(projectId, type, payload);

    res.json({
      taskId,
      status: 'queued',
      message: 'Task queued successfully'
    });

  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * Get task status
 * GET /api/tasks/:id/status
 */
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await taskQueue.getTask(id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      id: task.id,
      projectId: task.projectId,
      type: task.type,
      state: task.state,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      finishedAt: task.finishedAt,
      heartbeatAt: task.heartbeatAt,
      errorText: task.errorText
    });

  } catch (error) {
    console.error('Task status error:', error);
    res.status(500).json({ error: 'Failed to get task status' });
  }
});

/**
 * Get task proofs
 * GET /api/tasks/:id/proofs
 */
router.get('/:id/proofs', async (req, res) => {
  try {
    const { id } = req.params;
    const proofs = await proofLogger.getTaskProofs(id);

    res.json({
      taskId: id,
      proofs: proofs.map(proof => ({
        id: proof.id,
        type: proof.type,
        data: proof.data,
        createdAt: proof.createdAt
      }))
    });

  } catch (error) {
    console.error('Task proofs error:', error);
    res.status(500).json({ error: 'Failed to get task proofs' });
  }
});

/**
 * Get project tasks
 * GET /api/projects/:id/tasks
 */
router.get('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;
    
    const tasks = await taskQueue.getTasksByProject(id, parseInt(limit as string));

    res.json({
      projectId: id,
      tasks: tasks.map(task => ({
        id: task.id,
        type: task.type,
        state: task.state,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        finishedAt: task.finishedAt,
        errorText: task.errorText
      }))
    });

  } catch (error) {
    console.error('Project tasks error:', error);
    res.status(500).json({ error: 'Failed to get project tasks' });
  }
});

export default router;
