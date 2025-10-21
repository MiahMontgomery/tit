import { logger } from '../lib/logger.js';

export async function opsDiff(job: any): Promise<void> {
  const { payload } = job;
  const { title, description, branch, patches } = payload;
  
  logger.info('Starting ops.diff job', { jobId: job.id, title, branch });
  
  try {
    // Validate allowed paths
    const allowedPaths = process.env.ALLOWED_PATHS?.split(',') || [];
    const protectedPaths = process.env.PROTECTED_PATHS?.split(',') || [];
    
    for (const patch of patches) {
      const path = patch.path;
      
      // Check if path is allowed
      const isAllowed = allowedPaths.some(allowed => {
        const pattern = allowed.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
        return new RegExp(`^${pattern}$`).test(path);
      });
      
      if (!isAllowed) {
        throw new Error(`Path not allowed: ${path}`);
      }
      
      // Check if path is protected
      const isProtected = protectedPaths.some(protectedPath => {
        if (!protectedPath) return false;
        const pattern = protectedPath.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
        return new RegExp(`^${pattern}$`).test(path);
      });
      
      if (isProtected) {
        throw new Error(`Path is protected: ${path}`);
      }
    }
    
    logger.info('Ops.diff validation passed', { 
      jobId: job.id, 
      patchCount: patches.length 
    });
    
    // Enqueue next step: ops.patch
    const { enqueue } = await import('../lib/queue.js');
    await enqueue({
      projectId: 'ops',
      kind: 'ops.patch',
      payload: {
        title,
        description,
        branch,
        patches
      }
    });
    
    logger.info('Ops.diff job completed, enqueued ops.patch', { jobId: job.id });
    
  } catch (error) {
    logger.error('Ops.diff job failed', { 
      jobId: job.id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}
