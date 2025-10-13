import express from 'express';
import { getDb } from '../db/drizzle.js';
import { tasks } from '../../shared/schema.js';
import { patMiddleware } from '../auth/pat.js';
import { eq } from 'drizzle-orm';
import { top3 } from '../tasks/priority.js';
import { emitStatus } from '../events/publish.js';

const router = express.Router();

// Apply PAT middleware to all routes
router.use(patMiddleware);

router.get('/projects/:projectId/top3', async (req, res) => {
  try {
    const { projectId } = req.params;
    const db = getDb();

    const allTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));

    const top3Tasks = top3(allTasks);
    res.json({ tasks: top3Tasks });
  } catch (error) {
    console.error('Get top3 tasks error:', error);
    res.status(500).json({ error: 'Failed to get top3 tasks' });
  }
});

router.post('/projects/:projectId/tasks', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, priority, dependsOn } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const db = getDb();

    // Get current top3 before mutation
    const allTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
    const previousTop3 = top3(allTasks);

    // Coerce dependsOn to string[] or []
    const normalizedDependsOn = Array.isArray(dependsOn) ? dependsOn : [];

    // Insert new task
    const newTask = await db
      .insert(tasks)
      .values({
        projectId,
        title,
        priority: priority ?? 0,
        dependsOn: normalizedDependsOn,
        state: 'PLANNED'
      })
      .returning({ id: tasks.id });

    // Recompute top3 after mutation
    const updatedTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
    const newTop3 = top3(updatedTasks);

    // Check if top3 changed
    const changed = JSON.stringify(previousTop3) !== JSON.stringify(newTop3);
    if (changed) {
      emitStatus(projectId, 'Top3 updated', { taskIds: newTop3.map(t => t.id) });
    }

    res.json({ id: newTask[0].id });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, state, priority, dependsOn } = req.body;

    const db = getDb();

    // Get current task to find projectId
    const currentTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (currentTask.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const projectId = currentTask[0].projectId;

    // Get current top3 before mutation
    const allTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
    const previousTop3 = top3(allTasks);

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (state !== undefined) updateData.state = state;
    if (priority !== undefined) updateData.priority = priority;
    if (dependsOn !== undefined) {
      updateData.dependsOn = Array.isArray(dependsOn) ? dependsOn : [];
    }

    // Update task
    await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id));

    // Recompute top3 after mutation
    const updatedTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
    const newTop3 = top3(updatedTasks);

    // Check if top3 changed
    const changed = JSON.stringify(previousTop3) !== JSON.stringify(newTop3);
    if (changed) {
      emitStatus(projectId, 'Top3 updated', { taskIds: newTop3.map(t => t.id) });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

export default router;