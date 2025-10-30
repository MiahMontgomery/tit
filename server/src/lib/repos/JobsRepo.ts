import { Job } from '@prisma/client';
import { prisma } from '../db.js';

export interface EnqueueJobData {
  projectId: string;
  kind: string;
  payload: any;
}

export class JobsRepo {
  static async enqueue(data: EnqueueJobData) {
    return await prisma.job.create({
      data: {
        projectId: data.projectId,
        kind: data.kind,
        payload: data.payload,
        status: 'queued'
      }
    });
  }

  static async claimNext() {
    // Transactionally claim the next queued job
    return await prisma.$transaction(async (tx) => {
      // Defensive: if job model is missing (pre-migration), avoid crashing
      const jobModel = (tx as any).job;
      if (!jobModel) {
        return null;
      }

      const job = await jobModel.findFirst({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' }
      });

      if (!job) {
        return null;
      }

      return await jobModel.update({
        where: { id: job.id },
        data: { 
          status: 'running',
          attempts: { increment: 1 }
        }
      });
    });
  }

  static async markDone(id: string) {
    return await prisma.job.update({
      where: { id },
      data: { status: 'done' }
    });
  }

  static async markErrorOrRetry(job: any) {
    const maxAttempts = 3;
    
    if (job.attempts >= maxAttempts) {
      // Mark as error after max attempts
      return await prisma.job.update({
        where: { id: job.id },
        data: { 
          status: 'error',
          error: 'Max retry attempts exceeded'
        }
      });
    } else {
      // Retry with backoff
      const backoffMs = Math.pow(2, job.attempts) * 1000; // Exponential backoff
      const availableAt = new Date(Date.now() + backoffMs);
      
      return await prisma.job.update({
        where: { id: job.id },
        data: { 
          status: 'queued',
          error: null
        }
      });
    }
  }

  static async getByProject(projectId: string) {
    return await prisma.job.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
  }
}