import { jobsRepo } from './repos/JobsRepo.js';
import { logger } from './logger.js';

export interface EnqueueData {
  projectId: string;
  kind: string;
  payload: Record<string, any>;
}

export async function enqueue(data: EnqueueData): Promise<void> {
  try {
    await jobsRepo.enqueue(data);
    logger.info('Job enqueued', {
      projectId: data.projectId,
      kind: data.kind
    });
  } catch (error) {
    logger.error('Failed to enqueue job', {
      error: error instanceof Error ? error.message : 'Unknown error',
      projectId: data.projectId,
      kind: data.kind
    });
    throw error;
  }
}

export async function claimNext(): Promise<any | null> {
  try {
    const job = await jobsRepo.getNextQueued();
    if (job) {
      logger.info('Job claimed', {
        jobId: job.id,
        projectId: job.projectId,
        kind: job.kind
      });
    }
    return job;
  } catch (error) {
    logger.error('Failed to claim next job', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

export async function markDone(jobId: string): Promise<void> {
  try {
    await jobsRepo.markDone(jobId);
    logger.info('Job marked as done', { jobId });
  } catch (error) {
    logger.error('Failed to mark job as done', {
      error: error instanceof Error ? error.message : 'Unknown error',
      jobId
    });
    throw error;
  }
}

export async function markError(jobId: string, error: string): Promise<void> {
  try {
    await jobsRepo.markError(jobId, error);
    logger.error('Job marked as error', { jobId, error });
  } catch (err) {
    logger.error('Failed to mark job as error', {
      error: err instanceof Error ? err.message : 'Unknown error',
      jobId
    });
    throw err;
  }
}

export async function markErrorOrRetry(job: any): Promise<void> {
  try {
    await jobsRepo.markErrorOrRetry(job);
    logger.info('Job marked for retry or error', {
      jobId: job.id,
      attempts: job.attempts
    });
  } catch (error) {
    logger.error('Failed to mark job for retry or error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      jobId: job.id
    });
    throw error;
  }
}
