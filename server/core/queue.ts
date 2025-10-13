/**
 * Persistent task queue system for Titan
 * Handles task queuing, reservation, acknowledgment, and failure tracking
 */

import { database } from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Task {
  id: number;
  projectId: string;
  type: 'exec' | 'code' | 'screenshot';
  state: 'queued' | 'running' | 'succeeded' | 'failed';
  payload: any;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  heartbeatAt?: Date;
  errorText?: string;
}

export interface TaskPayload {
  command?: string;
  filePath?: string;
  content?: string;
  url?: string;
  [key: string]: any;
}

export class TaskQueue {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Enqueue a new task
   */
  async enqueue(projectId: string, type: 'exec' | 'code' | 'screenshot', payload: TaskPayload): Promise<number> {
    const result = await database.query(
      `INSERT INTO tasks (project_id, type, state, payload_json, created_at) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [projectId, type, 'queued', JSON.stringify(payload), new Date()]
    );

    const taskId = result.rows[0].id;
    console.log(`📋 Task queued: ${type} for project ${projectId}`);
    return taskId;
  }

  /**
   * Reserve a task for execution
   */
  async reserve(): Promise<Task | null> {
    const result = await database.query(
      `UPDATE tasks 
       SET state = 'running', started_at = $1, heartbeat_at = $1
       WHERE id = (
         SELECT id FROM tasks 
         WHERE state = 'queued' 
         ORDER BY created_at ASC 
         LIMIT 1
       )
       RETURNING *`,
      [new Date()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const task = result.rows[0];
    return {
      id: task.id,
      projectId: task.project_id,
      type: task.type,
      state: task.state,
      payload: task.payload_json,
      createdAt: task.created_at,
      startedAt: task.started_at,
      finishedAt: task.finished_at,
      heartbeatAt: task.heartbeat_at,
      errorText: task.error_text
    };
  }

  /**
   * Update task heartbeat
   */
  async heartbeat(taskId: number): Promise<void> {
    await database.query(
      `UPDATE tasks SET heartbeat_at = $1 WHERE id = $2`,
      [new Date(), taskId]
    );
  }

  /**
   * Mark task as succeeded
   */
  async succeed(taskId: number): Promise<void> {
    await database.query(
      `UPDATE tasks 
       SET state = 'succeeded', finished_at = $1 
       WHERE id = $2`,
      [new Date(), taskId]
    );
  }

  /**
   * Mark task as failed
   */
  async fail(taskId: number, error: string): Promise<void> {
    await database.query(
      `UPDATE tasks 
       SET state = 'failed', finished_at = $1, error_text = $2 
       WHERE id = $3`,
      [new Date(), error, taskId]
    );
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: number): Promise<Task | null> {
    const result = await database.query(
      `SELECT * FROM tasks WHERE id = $1`,
      [taskId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const task = result.rows[0];
    return {
      id: task.id,
      projectId: task.project_id,
      type: task.type,
      state: task.state,
      payload: task.payload_json,
      createdAt: task.created_at,
      startedAt: task.started_at,
      finishedAt: task.finished_at,
      heartbeatAt: task.heartbeat_at,
      errorText: task.error_text
    };
  }

  /**
   * Get tasks by project ID
   */
  async getTasksByProject(projectId: string, limit: number = 100): Promise<Task[]> {
    const result = await database.query(
      `SELECT * FROM tasks 
       WHERE project_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [projectId, limit]
    );

    return result.rows.map(task => ({
      id: task.id,
      projectId: task.project_id,
      type: task.type,
      state: task.state,
      payload: task.payload_json,
      createdAt: task.created_at,
      startedAt: task.started_at,
      finishedAt: task.finished_at,
      heartbeatAt: task.heartbeat_at,
      errorText: task.error_text
    }));
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{ queued: number; running: number; succeeded: number; failed: number }> {
    const result = await database.query(
      `SELECT state, COUNT(*) as count 
       FROM tasks 
       GROUP BY state`
    );

    const stats = { queued: 0, running: 0, succeeded: 0, failed: 0 };
    
    for (const row of result.rows) {
      stats[row.state as keyof typeof stats] = parseInt(row.count);
    }

    return stats;
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        // Update heartbeat for running tasks
        await database.query(
          `UPDATE tasks 
           SET heartbeat_at = $1 
           WHERE state = 'running' AND heartbeat_at < $2`,
          [new Date(), new Date(Date.now() - 60000)] // 1 minute ago
        );
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat monitoring
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const taskQueue = new TaskQueue();
