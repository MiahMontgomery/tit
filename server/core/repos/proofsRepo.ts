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
    if (!db) {
      return mockStore.getProofById(id) as Proof | null;
    }
    
    try {
      const [proof] = await db
        .select()
        .from(proofs)
        .where(eq(proofs.id, id))
        .limit(1);
      
      return proof || null;
    } catch (error) {
      console.warn(`DB error fetching proof ${id}; falling back to mock store:`, (error as Error).message);
      return mockStore.getProofById(id) as Proof | null;
    }
  }

  async getByTask(taskId: string): Promise<Proof[]> {
    if (!db) {
      return mockStore.getProofsByTask(taskId) as Proof[];
    }
    
    try {
      return await db
        .select()
        .from(proofs)
        .where(eq(proofs.taskId, taskId))
        .orderBy(desc(proofs.createdAt));
    } catch (error) {
      console.warn(`DB error fetching proofs for task ${taskId}; falling back to mock store:`, (error as Error).message);
      return mockStore.getProofsByTask(taskId) as Proof[];
    }
  }

  async getByType(projectId: string, type: string): Promise<Proof[]> {
    if (!db) {
      const allProofs = mockStore.getProofsByProject(projectId);
      return allProofs.filter(p => p.type === type) as Proof[];
    }
    
    try {
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
    } catch (error) {
      console.warn(`DB error fetching proofs by type for project ${projectId}; falling back to mock store:`, (error as Error).message);
      const allProofs = mockStore.getProofsByProject(projectId);
      return allProofs.filter(p => p.type === type) as Proof[];
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!db) {
      return mockStore.deleteProof(id);
    }
    
    try {
      const result = await db.delete(proofs).where(eq(proofs.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.warn(`DB error deleting proof ${id}:`, (error as Error).message);
      return false;
    }
  }

  async getRecentByProject(projectId: string, hours: number = 24): Promise<Proof[]> {
    if (!db) {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      const allProofs = mockStore.getProofsByProject(projectId);
      return allProofs.filter(p => p.createdAt >= cutoff) as Proof[];
    }
    
    try {
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
    } catch (error) {
      console.warn(`DB error fetching recent proofs for project ${projectId}; falling back to mock store:`, (error as Error).message);
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      const allProofs = mockStore.getProofsByProject(projectId);
      return allProofs.filter(p => p.createdAt >= cutoff) as Proof[];
    }
  }
}

export const proofsRepo = new ProofsRepo();
