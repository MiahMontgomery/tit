import { Run } from '@prisma/client';
import { prisma } from '../db.js';

export interface StartRunData {
  projectId: string;
  pipeline?: string;
}

export interface FinishRunData {
  status: string;
  details?: any;
}

export class RunsRepo {
  static async start(data: StartRunData) {
    return await prisma.run.create({
      data: {
        projectId: data.projectId,
        pipeline: data.pipeline || 'default',
        status: 'running'
      }
    });
  }

  static async finish(runId: string, data: FinishRunData) {
    return await prisma.run.update({
      where: { id: runId },
      data: {
        status: data.status,
        details: data.details,
        endedAt: new Date()
      }
    });
  }

  static async getLatestByProject(projectId: string) {
    return await prisma.run.findFirst({
      where: { projectId },
      orderBy: { startedAt: 'desc' }
    });
  }

  static async getByProject(projectId: string) {
    return await prisma.run.findMany({
      where: { projectId },
      orderBy: { startedAt: 'desc' }
    });
  }
}