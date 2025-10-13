import { eq, desc, and, gte } from "drizzle-orm";
import { db } from "./db.js";
import { messages, type Message, type InsertMessage } from "../../drizzle/schema.js";
import { getBroadcaster } from "../../ws/index.js";
import { incrementMetric } from "../../api/metrics.js";

export class MessagesRepo {
  async create(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    incrementMetric('messagesCreated');
    
    // Broadcast WebSocket event
    getBroadcaster().broadcast({
      type: "message.created",
      projectId: message.projectId,
      message: created,
      timestamp: new Date().toISOString()
    });
    
    return created;
  }

  async getByProject(projectId: string, limit: number = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.projectId, projectId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  async getById(id: string): Promise<Message | null> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);
    
    return message || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id));
    return result.rowCount > 0;
  }

  async getRecentByProject(projectId: string, hours: number = 24): Promise<Message[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.projectId, projectId),
          gte(messages.createdAt, cutoff)
        )
      )
      .orderBy(desc(messages.createdAt));
  }
}

export const messagesRepo = new MessagesRepo();
