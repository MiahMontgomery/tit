import { eq, asc, and, desc, sql } from "drizzle-orm";
import { db } from "./db.js";
import { tasks, type Task, type InsertTask } from "../../drizzle/schema.js";
import { mockStore } from "../mockData.ts";

export class TasksRepo {
  async enqueueTask(
    projectId: string, 
    goalId: string | null, 
    type: string, 
    payload: Record<string, any>
  ): Promise<Task> {
    if (!db) {
      // Mock mode - use mock store
      const mockTask = mockStore.createTask({
        projectId,
        goalId,
        type,
        status: "queued",
        payload,
        result: null,
        error: null,
        startedAt: null,
        completedAt: null
      });
      return mockTask as Task;
    }
    
    const [task] = await db
      .insert(tasks)
      .values({
        projectId,
        goalId,
        type,
        status: "queued",
        payload
      })
      .returning();
    return task;
  }

  async getNextQueuedTask(projectId: string): Promise<Task | null> {
    if (!db) {
      return mockStore.getNextQueuedTask(projectId) as Task | null;
    }
    
    const [task] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          eq(tasks.status, "queued")
        )
      )
      .orderBy(asc(tasks.createdAt))
      .limit(1);
    
    return task || null;
  }

  async setTaskStatus(
    id: string, 
    status: string, 
    payload?: Record<string, any>
  ): Promise<Task | null> {
    if (!db) {
      return mockStore.updateTaskStatus(id, status, payload) as Task | null;
    }
    
    const updateData: any = { 
      status,
      updatedAt: new Date()
    };

    if (status === "running") {
      updateData.startedAt = new Date();
    } else if (status === "completed" || status === "failed") {
      updateData.completedAt = new Date();
    }

    if (payload) {
      updateData.result = payload;
    }

    const [updated] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    
    return updated || null;
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTaskById(id: string): Promise<Task | null> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    
    return task || null;
  }

  async getQueuedTasksCount(projectId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          eq(tasks.status, "queued")
        )
      );
    
    return result[0]?.count || 0;
  }

  async getRunningTasksCount(projectId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          eq(tasks.status, "running")
        )
      );
    
    return result[0]?.count || 0;
  }
}

export const tasksRepo = new TasksRepo();
