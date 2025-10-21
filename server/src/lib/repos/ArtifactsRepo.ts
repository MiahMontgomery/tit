import { PrismaClient, Artifact } from '@prisma/client';
import { getDb } from '../db.js';

export interface CreateArtifactData {
  projectId: string;
  kind: string;
  path: string;
  meta?: Record<string, any>;
}

export class ArtifactsRepo {
  private async getDb(): Promise<PrismaClient> {
    return await getDb();
  }

  async add(data: CreateArtifactData): Promise<Artifact> {
    const db = await this.getDb();
    return await db.artifact.create({
      data: {
        projectId: data.projectId,
        kind: data.kind,
        path: data.path,
        meta: data.meta || {}
      }
    });
  }

  async getByProject(projectId: string): Promise<Artifact[]> {
    const db = await this.getDb();
    return await db.artifact.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getByProjectAndKind(projectId: string, kind: string): Promise<Artifact[]> {
    const db = await this.getDb();
    return await db.artifact.findMany({
      where: { 
        projectId,
        kind
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb();
    await db.artifact.delete({
      where: { id }
    });
  }
}

export const artifactsRepo = new ArtifactsRepo();
