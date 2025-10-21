import { Octokit } from 'octokit';
import { logger } from '../lib/logger.js';

export async function opsRollback(job: any): Promise<void> {
  const { payload } = job;
  const { title, description, branch, commitSha, prNumber, prUrl, reason } = payload;
  
  logger.info('Starting ops.rollback job', { jobId: job.id, reason });
  
  try {
    const githubRepo = process.env.GITHUB_REPO;
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubRepo || !githubToken) {
      throw new Error('GitHub configuration missing');
    }
    
    const [owner, repo] = githubRepo.split('/');
    const octokit = new Octokit({ auth: githubToken });
    
    // Close the PR
    await octokit.rest.pulls.update({
      owner,
      repo,
      pull_number: prNumber,
      state: 'closed'
    });
    
    logger.info('PR closed', { 
      jobId: job.id, 
      prNumber
    });
    
    // Delete the branch
    await octokit.rest.git.deleteRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });
    
    logger.info('Branch deleted', { 
      jobId: job.id, 
      branch 
    });
    
    // Trigger rollback deployment
    const deployHookApi = process.env.RENDER_DEPLOY_HOOK_API;
    const deployHookWorker = process.env.RENDER_DEPLOY_HOOK_WORKER;
    
    if (deployHookApi && deployHookWorker) {
      const responses = await Promise.allSettled([
        fetch(deployHookApi, { method: 'POST' }),
        fetch(deployHookWorker, { method: 'POST' })
      ]);
      
      const results = responses.map((response, index) => ({
        hook: index === 0 ? 'API' : 'Worker',
        status: response.status === 'fulfilled' ? 'success' : 'failed',
        error: response.status === 'rejected' ? response.reason : null
      }));
      
      logger.info('Rollback deployment triggered', { 
        jobId: job.id, 
        results 
      });
    }
    
    // Create rollback summary
    const rollbackSummary = {
      timestamp: new Date().toISOString(),
      jobId: job.id,
      title,
      description,
      branch,
      commitSha,
      prNumber,
      prUrl,
      reason,
      status: 'rolled-back'
    };
    
    const { artifactsRepo } = await import('../../server/src/lib/repos/ArtifactsRepo.js');
    await artifactsRepo.add({
      projectId: 'ops',
      kind: 'ops-rollback',
      path: `ops-rollback-${job.id}.json`,
      meta: rollbackSummary
    });
    
    logger.info('Ops.rollback completed successfully', { 
      jobId: job.id, 
      reason
    });
    
  } catch (error) {
    logger.error('Ops.rollback job failed', { 
      jobId: job.id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}
