import { eq, desc, and, gte } from "drizzle-orm";
import { db } from "./db.js";
import { messages, type Message, type InsertMessage } from "../../drizzle/schema.js";
import { getBroadcaster } from "../../ws/index.js";
import { incrementMetric } from "../../api/metrics.js";
import { mockStore } from "../mockData.ts";

export class MessagesRepo {
  async create(message: InsertMessage): Promise<Message> {
    if (!db) {
      const mockMessage = mockStore.createMessage({
        projectId: message.projectId,
        role: message.role || "user",
        content: message.content,
        metadata: message.metadata || null
      });
      incrementMetric('messagesCreated');
      
      getBroadcaster().broadcast({
        type: "message.created",
        projectId: message.projectId,
        message: mockMessage,
        timestamp: new Date().toISOString()
      });
      
      return mockMessage as Message;
    }
    
    try {
      const [created] = await db.insert(messages).values(message).returning();
      incrementMetric('messagesCreated');
      
      getBroadcaster().broadcast({
        type: "message.created",
        projectId: message.projectId,
        message: created,
        timestamp: new Date().toISOString()
      });
      
      return created;
    } catch (error) {
      console.warn("DB error creating message; falling back to mock store:", (error as Error).message);
      const mockMessage = mockStore.createMessage({
        projectId: message.projectId,
        role: message.role || "user",
        content: message.content,
        metadata: message.metadata || null
      });
      incrementMetric('messagesCreated');
      return mockMessage as Message;
    }
  }

  async getByProject(projectId: string, limit: number = 50): Promise<Message[]> {
    if (!db) {
      return mockStore.getMessagesByProject(projectId).slice(0, limit) as Message[];
    }
    
    try {
      return await db
        .select()
        .from(messages)
        .where(eq(messages.projectId, projectId))
        .orderBy(desc(messages.createdAt))
        .limit(limit);
    } catch (error) {
      console.warn(`DB error fetching messages for project ${projectId}; falling back to mock store:`, (error as Error).message);
      return mockStore.getMessagesByProject(projectId).slice(0, limit) as Message[];
    }
  }

  async getById(id: string): Promise<Message | null> {
    if (!db) {
      return mockStore.getMessageById(id) as Message | null;
    }
    
    try {
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);
      
      return message || null;
    } catch (error) {
      console.warn(`DB error fetching message ${id}; falling back to mock store:`, (error as Error).message);
      return mockStore.getMessageById(id) as Message | null;
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!db) {
      return mockStore.deleteMessage(id);
    }
    
    try {
      const result = await db.delete(messages).where(eq(messages.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.warn(`DB error deleting message ${id}:`, (error as Error).message);
      return false;
    }
  }

  async getRecentByProject(projectId: string, hours: number = 24): Promise<Message[]> {
    if (!db) {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      const allMessages = mockStore.getMessagesByProject(projectId);
      return allMessages.filter(m => m.createdAt >= cutoff) as Message[];
    }
    
    try {
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
    } catch (error) {
      console.warn(`DB error fetching recent messages for project ${projectId}; falling back to mock store:`, (error as Error).message);
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      const allMessages = mockStore.getMessagesByProject(projectId);
      return allMessages.filter(m => m.createdAt >= cutoff) as Message[];
    }
  }
}

export const messagesRepo = new MessagesRepo();
