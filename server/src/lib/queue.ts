import { JobsRepo } from './repos/JobsRepo.js';

export interface EnqueueData {
  projectId: string;
  kind: string;
  payload: any;
}

export async function enqueue(data: EnqueueData) {
  return await JobsRepo.enqueue({
    projectId: data.projectId,
    kind: data.kind,
    payload: data.payload
  });
}

export async function claimNext() {
  return await JobsRepo.claimNext();
}

export async function markDone(jobId: string) {
  return await JobsRepo.markDone(jobId);
}

export async function markErrorOrRetry(job: any) {
  return await JobsRepo.markErrorOrRetry(job);
}