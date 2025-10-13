import { storage } from '../storage';

export interface Task {
  id: string;
  projectId: string;
  type: string;
  payload: any;
  state: 'queued' | 'running' | 'succeeded' | 'failed';
  attempts: number;
  reservedBy?: string;
  reservedUntil?: Date;
  heartbeatAt?: Date;
  startedAt?: Date;
  finishedAt?: Date;
  errorText?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnqueueInput {
  projectId: string;
  type: string;
  payload: any;
}

export interface ReserveOptions {
  workerId: string;
  visibilityMs: number;
}

export interface FailOptions {
  errorText: string;
  retryDelayMs: number;
  maxAttempts: number;
}

export class TaskQueue {
  async enqueue(input: EnqueueInput): Promise<string> {
    const taskId = crypto.randomUUID();
    const now = new Date();
    
    const task: Task = {
      id: taskId,
      projectId: input.projectId,
      type: input.type,
      payload: input.payload,
      state: 'queued',
      attempts: 0,
      createdAt: now,
      updatedAt: now
    };

    storage.addTask(task);
    return taskId;
  }

  async reserve(options: ReserveOptions): Promise<Task | null> {
    const now = new Date();
    const reservedUntil = new Date(now.getTime() + options.visibilityMs);
    
    // Find oldest queued task
    const tasks = storage.getTasksByProject('all');
    const queuedTask = tasks
      .filter(t => t.state === 'queued')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

    if (!queuedTask) {
      return null;
    }

    // Atomically update task
    const updatedTask: Task = {
      ...queuedTask,
      state: 'running',
      reservedBy: options.workerId,
      reservedUntil,
      startedAt: now,
      updatedAt: now
    };

    storage.updateTask(updatedTask);
    return updatedTask;
  }

  async heartbeat(taskId: string, workerId: string): Promise<boolean> {
    const task = storage.getTaskById(taskId);
    if (!task || task.reservedBy !== workerId || task.state !== 'running') {
      return false;
    }

    const updatedTask: Task = {
      ...task,
      heartbeatAt: new Date(),
      updatedAt: new Date()
    };

    storage.updateTask(updatedTask);
    return true;
  }

  async ack(taskId: string, workerId: string): Promise<boolean> {
    const task = storage.getTaskById(taskId);
    if (!task || task.reservedBy !== workerId || task.state !== 'running') {
      return false;
    }

    const updatedTask: Task = {
      ...task,
      state: 'succeeded',
      finishedAt: new Date(),
      updatedAt: new Date()
    };

    storage.updateTask(updatedTask);
    return true;
  }

  async fail(taskId: string, workerId: string, options: FailOptions): Promise<boolean> {
    const task = storage.getTaskById(taskId);
    if (!task || task.reservedBy !== workerId || task.state !== 'running') {
      return false;
    }

    const newAttempts = task.attempts + 1;
    const shouldRetry = newAttempts < options.maxAttempts;

    const updatedTask: Task = {
      ...task,
      attempts: newAttempts,
      errorText: options.errorText,
      state: shouldRetry ? 'queued' : 'failed',
      reservedBy: shouldRetry ? undefined : task.reservedBy,
      reservedUntil: shouldRetry ? undefined : task.reservedUntil,
      finishedAt: shouldRetry ? undefined : new Date(),
      updatedAt: new Date()
    };

    storage.updateTask(updatedTask);
    return true;
  }

  async depth(): Promise<number> {
    const tasks = storage.getTasksByProject('all');
    return tasks.filter(t => t.state === 'queued').length;
  }

  async getRunningTasks(workerId: string): Promise<Task[]> {
    const tasks = storage.getTasksByProject('all');
    return tasks.filter(t => t.reservedBy === workerId && t.state === 'running');
  }
}

export const taskQueue = new TaskQueue();