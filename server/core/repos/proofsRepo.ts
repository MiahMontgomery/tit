import { eq, desc, and, gte } from "drizzle-orm";
import { db } from "./db.js";
import { proofs, type Proof, type InsertProof } from "../../drizzle/schema.js";
import { getBroadcaster } from "../../ws/index.js";
import { incrementMetric } from "../../api/metrics.js";
import { mockStore } from "../mockData.ts";

export class ProofsRepo {
  async create(proof: InsertProof): Promise<Proof> {
    if (!db) {
      // Mock mode - use mock store
      const mockProof = mockStore.createProof({
        projectId: proof.projectId,
        taskId: proof.taskId,
        type: proof.type,
        title: proof.title,
        description: proof.description,
        uri: proof.uri,
        content: proof.content,
        meta: proof.meta
      });
      incrementMetric('proofsCreated');
      
      // Broadcast WebSocket event
      getBroadcaster().broadcast({
        type: "proof.created",
        projectId: proof.projectId,
        proof: mockProof,
        timestamp: new Date().toISOString()
      });
      
      return mockProof as Proof;
    }
    
    const [created] = await db.insert(proofs).values(proof).returning();
    incrementMetric('proofsCreated');
    
    // Broadcast WebSocket event
    getBroadcaster().broadcast({
      type: "proof.created",
      projectId: proof.projectId,
      proof: created,
      timestamp: new Date().toISOString()
    });
    
    return created;
  }

  async getByProject(projectId: string, limit: number = 50): Promise<Proof[]> {
    if (!db) {
      return mockStore.getProofsByProject(projectId).slice(0, limit) as Proof[];
    }
    
    return await db
      .select()
      .from(proofs)
      .where(eq(proofs.projectId, projectId))
      .orderBy(desc(proofs.createdAt))
      .limit(limit);
  }

  async getById(id: string): Promise<Proof | null> {
    const [proof] = await db
      .select()
      .from(proofs)
      .where(eq(proofs.id, id))
      .limit(1);
    
    return proof || null;
  }

  async getByTask(taskId: string): Promise<Proof[]> {
    return await db
      .select()
      .from(proofs)
      .where(eq(proofs.taskId, taskId))
      .orderBy(desc(proofs.createdAt));
  }

  async getByType(projectId: string, type: string): Promise<Proof[]> {
    return await db
      .select()
      .from(proofs)
      .where(
        and(
          eq(proofs.projectId, projectId),
          eq(proofs.type, type)
        )
      )
      .orderBy(desc(proofs.createdAt));
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(proofs).where(eq(proofs.id, id));
    return result.rowCount > 0;
  }

  async getRecentByProject(projectId: string, hours: number = 24): Promise<Proof[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await db
      .select()
      .from(proofs)
      .where(
        and(
          eq(proofs.projectId, projectId),
          gte(proofs.createdAt, cutoff)
        )
      )
      .orderBy(desc(proofs.createdAt));
  }
}

export const proofsRepo = new ProofsRepo();
