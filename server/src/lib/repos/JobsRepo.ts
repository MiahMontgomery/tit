import { PrismaClient, Job } from '@prisma/client';
import { getDb } from '../db.js';

export interface CreateJobData {
  projectId: string;
  kind: string;
  payload: Record<string, any>;
}

export class JobsRepo {
  private async getDb(): Promise<PrismaClient> {
    return await getDb();
  }

  async enqueue(data: CreateJobData): Promise<Job> {
    const db = await this.getDb();
    return await db.job.create({
      data: {
        projectId: data.projectId,
        kind: data.kind,
        payload: data.payload,
        status: 'queued'
      }
    });
  }

  async getNextQueued(): Promise<Job | null> {
    const db = await this.getDb();
    
    // Use a transaction to atomically claim the next job
    return await db.$transaction(async (tx) => {
      const job = await tx.job.findFirst({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' }
      });

      if (!job) {
        return null;
      }

      // Claim the job
      const updatedJob = await tx.job.update({
        where: { id: job.id },
        data: { 
          status: 'running',
          updatedAt: new Date()
        }
      });

      return updatedJob;
    });
  }

  async markRunning(id: string): Promise<Job> {
    const db = await this.getDb();
    return await db.job.update({
      where: { id },
      data: { 
        status: 'running',
        updatedAt: new Date()
      }
    });
  }

  async markDone(id: string): Promise<Job> {
    const db = await this.getDb();
    return await db.job.update({
      where: { id },
      data: { 
        status: 'done',
        updatedAt: new Date()
      }
    });
  }

  async markError(id: string, error: string): Promise<Job> {
    const db = await this.getDb();
    return await db.job.update({
      where: { id },
      data: { 
        status: 'error',
        error,
        updatedAt: new Date()
      }
    });
  }

  async markErrorOrRetry(job: Job): Promise<Job> {
    const db = await this.getDb();
    
    if (job.attempts < 3) {
      // Retry with backoff
      const delay = Math.pow(2, job.attempts) * 1000; // 1s, 2s, 4s
      return await db.job.update({
        where: { id: job.id },
        data: { 
          status: 'queued',
          attempts: job.attempts + 1,
          updatedAt: new Date(Date.now() + delay)
        }
      });
    } else {
      // Max retries reached
      return await db.job.update({
        where: { id: job.id },
        data: { 
          status: 'error',
          error: 'Max retries exceeded',
          updatedAt: new Date()
        }
      });
    }
  }

  async getByProject(projectId: string): Promise<Job[]> {
    const db = await this.getDb();
    return await db.job.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
  }
}

export const jobsRepo = new JobsRepo();
