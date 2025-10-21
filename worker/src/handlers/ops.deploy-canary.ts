import { logger } from '../lib/logger.js';

export async function opsDeployCanary(job: any): Promise<void> {
  const { payload } = job;
  const { title, description, branch, commitSha, prNumber, prUrl, testResults } = payload;
  
  logger.info('Starting ops.deploy-canary job', { jobId: job.id, branch, prNumber });
  
  try {
    const deployHookApi = process.env.RENDER_DEPLOY_HOOK_API;
    const deployHookWorker = process.env.RENDER_DEPLOY_HOOK_WORKER;
    
    if (!deployHookApi || !deployHookWorker) {
      logger.warn('Deploy hooks not configured, skipping canary deploy', { jobId: job.id });
      
      // Skip to promote if no deploy hooks
      const { enqueue } = await import('../lib/queue.js');
      await enqueue({
        projectId: 'ops',
        kind: 'ops.promote',
        payload: {
          title,
          description,
          branch,
          commitSha,
          prNumber,
          prUrl,
          testResults,
          canarySkipped: true
        }
      });
      return;
    }
    
    // Trigger canary deployments
    const responses = await Promise.allSettled([
      fetch(deployHookApi, { method: 'POST' }),
      fetch(deployHookWorker, { method: 'POST' })
    ]);
    
    const results = responses.map((response, index) => ({
      hook: index === 0 ? 'API' : 'Worker',
      status: response.status === 'fulfilled' ? 'success' : 'failed',
      error: response.status === 'rejected' ? response.reason : null
    }));
    
    logger.info('Canary deployment triggered', { 
      jobId: job.id, 
      results 
    });
    
    // Wait a bit for deployment to start
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check health endpoints (simplified)
    const healthChecks = await Promise.allSettled([
      fetch(`${process.env.API_URL || 'http://localhost:3000'}/api/health`),
      fetch(`${process.env.WORKER_URL || 'http://localhost:3001'}/health`)
    ]);
    
    const healthResults = healthChecks.map((response, index) => ({
      service: index === 0 ? 'API' : 'Worker',
      status: response.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      error: response.status === 'rejected' ? response.reason : null
    }));
    
    logger.info('Health checks completed', { 
      jobId: job.id, 
      healthResults 
    });
    
    // Enqueue next step: ops.promote
    const { enqueue } = await import('../lib/queue.js');
    await enqueue({
      projectId: 'ops',
      kind: 'ops.promote',
      payload: {
        title,
        description,
        branch,
        commitSha,
        prNumber,
        prUrl,
        testResults,
        canaryResults: results,
        healthResults
      }
    });
    
  } catch (error) {
    logger.error('Ops.deploy-canary job failed', { 
      jobId: job.id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    // Enqueue rollback on failure
    const { enqueue } = await import('../lib/queue.js');
    await enqueue({
      projectId: 'ops',
      kind: 'ops.rollback',
      payload: {
        title,
        description,
        branch,
        commitSha,
        prNumber,
        prUrl,
        reason: 'Canary deployment failed'
      }
    });
    
    throw error;
  }
}
