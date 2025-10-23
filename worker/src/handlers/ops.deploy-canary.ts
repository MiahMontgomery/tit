import { enqueue } from '../../../server/src/lib/queue.js';
import { logger } from '../../../server/src/lib/logger.js';

export async function opsDeployCanary(job: any) {
  const { payload } = job;
  const { title, description, branch, prNumber, prUrl } = payload;
  
  logger.info('Starting ops.deploy-canary job', { jobId: job.id, title, branch, prNumber });
  
  try {
    const renderApiHook = process.env.RENDER_DEPLOY_HOOK_API;
    const renderWorkerHook = process.env.RENDER_DEPLOY_HOOK_WORKER;
    
    if (!renderApiHook || !renderWorkerHook) {
      throw new Error('RENDER_DEPLOY_HOOK_API and RENDER_DEPLOY_HOOK_WORKER must be configured');
    }
    
    // Trigger Render deployments
    const deployPromises = [];
    
    if (renderApiHook) {
      deployPromises.push(
        fetch(renderApiHook, { method: 'POST' })
          .then(res => res.json())
          .then(data => ({ service: 'api', data }))
      );
    }
    
    if (renderWorkerHook) {
      deployPromises.push(
        fetch(renderWorkerHook, { method: 'POST' })
          .then(res => res.json())
          .then(data => ({ service: 'worker', data }))
      );
    }
    
    const deployResults = await Promise.all(deployPromises);
    
    logger.info('Canary deployments triggered', { 
      jobId: job.id, 
      results: deployResults 
    });
    
    // Poll health endpoints to verify deployment
    const healthCheckPromises = [
      fetch(`${process.env.API_URL || 'http://localhost:3000'}/api/health`)
        .then(res => res.json())
        .then(data => ({ service: 'api', health: data }))
    ];
    
    const healthResults = await Promise.all(healthCheckPromises);
    
    // Check if deployments are healthy
    const allHealthy = healthResults.every(result => result.health?.ok === true);
    
    if (allHealthy) {
      logger.info('Canary deployment health check passed', { jobId: job.id });
      
      // Enqueue promotion
      await enqueue({
        projectId: 'ops',
        kind: 'ops.promote',
        payload: { title, description, branch, prNumber, prUrl }
      });
    } else {
      logger.error('Canary deployment health check failed', { 
        jobId: job.id, 
        healthResults 
      });
      
      // Enqueue rollback
      await enqueue({
        projectId: 'ops',
        kind: 'ops.rollback',
        payload: { title, description, branch, reason: 'Health check failed' }
      });
    }
    
    logger.info('Ops.deploy-canary job completed', { jobId: job.id });
    
  } catch (error) {
    logger.error('Ops.deploy-canary job failed', { jobId: job.id, error });
    
    // Enqueue rollback on deployment failure
    await enqueue({
      projectId: 'ops',
      kind: 'ops.rollback',
      payload: { title, description, branch, reason: 'Deployment failed' }
    });
    
    throw error;
  }
}