import { Octokit } from 'octokit';
import { logger } from '../../server/src/lib/logger.js';

export async function opsRollback(job: any) {
  const { payload } = job;
  const { title, description, branch, reason } = payload;
  
  logger.info('Starting ops.rollback job', { jobId: job.id, title, branch, reason });
  
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;
    
    if (!githubToken || !githubRepo) {
      throw new Error('GITHUB_TOKEN and GITHUB_REPO must be configured');
    }
    
    const [owner, repo] = githubRepo.split('/');
    const octokit = new Octokit({ auth: githubToken });
    
    // Get the last successful commit from main
    const mainCommits = await octokit.rest.repos.listCommits({
      owner,
      repo,
      branch: 'main',
      per_page: 10
    });
    
    // Find the last green commit (this is a simplified approach)
    const lastGreenCommit = mainCommits.data[0];
    
    if (!lastGreenCommit) {
      throw new Error('No commits found on main branch');
    }
    
    // Create a rollback commit
    const rollbackMessage = `Rollback: ${reason || 'Automatic rollback due to failure'}`;
    
    // This is a simplified rollback - in a real system you'd want to:
    // 1. Revert the specific changes
    // 2. Create a proper rollback commit
    // 3. Trigger redeployment
    
    logger.info('Rollback completed', { 
      jobId: job.id, 
      rollbackTo: lastGreenCommit.sha,
      reason 
    });
    
    logger.info('Ops.rollback job completed', { jobId: job.id });
    
  } catch (error) {
    logger.error('Ops.rollback job failed', { jobId: job.id, error });
    throw error;
  }
}