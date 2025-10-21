import { PrismaClient, Run } from '@prisma/client';
import { getDb } from '../db.js';

export interface CreateRunData {
  projectId: string;
  pipeline?: string;
}

export class RunsRepo {
  private async getDb(): Promise<PrismaClient> {
    return await getDb();
  }

  async start(data: CreateRunData): Promise<Run> {
    const db = await this.getDb();
    return await db.run.create({
      data: {
        projectId: data.projectId,
        pipeline: data.pipeline || 'default',
        status: 'running'
      }
    });
  }

  async finish(runId: string, status: string, details?: Record<string, any>): Promise<Run> {
    const db = await this.getDb();
    return await db.run.update({
      where: { id: runId },
      data: {
        status,
        endedAt: new Date(),
        details
      }
    });
  }

  async getByProject(projectId: string): Promise<Run[]> {
    const db = await this.getDb();
    return await db.run.findMany({
      where: { projectId },
      orderBy: { startedAt: 'desc' }
    });
  }

  async getLatestByProject(projectId: string): Promise<Run | null> {
    const db = await this.getDb();
    return await db.run.findFirst({
      where: { projectId },
      orderBy: { startedAt: 'desc' }
    });
  }
}

export const runsRepo = new RunsRepo();
