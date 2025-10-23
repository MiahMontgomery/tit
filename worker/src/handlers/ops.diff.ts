import { enqueue } from '../../../server/src/lib/queue.js';
import { logger } from '../../../server/src/lib/logger.js';

export async function opsDiff(job: any) {
  const { payload } = job;
  const { title, description, branch, patches } = payload;
  
  logger.info('Starting ops.diff job', { jobId: job.id, title, branch });
  
  try {
    // Validate allowed paths
    const allowedPaths = (process.env.ALLOWED_PATHS || 'client/**,server/**,worker/**,Dockerfile,package.json,tsconfig.json,vite.config.ts').split(',');
    const protectedPaths = (process.env.PROTECTED_PATHS || 'infra/**,secrets/**,database/migrations/**').split(',');
    
    for (const patch of patches) {
      const path = patch.path;
      
      // Check if path is in protected paths
      for (const protectedPath of protectedPaths) {
        if (path.includes(protectedPath.replace('**', ''))) {
          throw new Error(`Path ${path} is protected and cannot be modified`);
        }
      }
      
      // Check if path is in allowed paths
      let isAllowed = false;
      for (const allowedPath of allowedPaths) {
        if (path.includes(allowedPath.replace('**', ''))) {
          isAllowed = true;
          break;
        }
      }
      
      if (!isAllowed) {
        throw new Error(`Path ${path} is not in allowed paths`);
      }
    }
    
    logger.info('Ops diff validation passed', { jobId: job.id, patchCount: patches.length });
    
    // Enqueue next step
    await enqueue({
      projectId: 'ops',
      kind: 'ops.patch',
      payload: { title, description, branch, patches }
    });
    
    logger.info('Ops.diff job completed', { jobId: job.id });
    
  } catch (error) {
    logger.error('Ops.diff job failed', { jobId: job.id, error });
    throw error;
  }
}