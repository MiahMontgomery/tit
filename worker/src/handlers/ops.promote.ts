import { Octokit } from 'octokit';
import { logger } from '../../server/src/lib/logger.js';

export async function opsPromote(job: any) {
  const { payload } = job;
  const { title, description, branch, prNumber, prUrl } = payload;
  
  logger.info('Starting ops.promote job', { jobId: job.id, title, branch, prNumber });
  
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;
    
    if (!githubToken || !githubRepo) {
      throw new Error('GITHUB_TOKEN and GITHUB_REPO must be configured');
    }
    
    const [owner, repo] = githubRepo.split('/');
    const octokit = new Octokit({ auth: githubToken });
    
    // Merge the pull request
    const mergeResult = await octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
      merge_method: 'merge'
    });
    
    logger.info('Pull request merged successfully', { 
      jobId: job.id, 
      prNumber, 
      prUrl,
      mergeSha: mergeResult.data.sha
    });
    
    // Clean up branch
    try {
      await octokit.rest.git.deleteRef({
        owner,
        repo,
        ref: `heads/${branch}`
      });
      
      logger.info('Branch cleaned up', { jobId: job.id, branch });
    } catch (error) {
      logger.warn('Failed to delete branch', { jobId: job.id, branch, error });
    }
    
    logger.info('Ops.promote job completed successfully', { jobId: job.id });
    
  } catch (error) {
    logger.error('Ops.promote job failed', { jobId: job.id, error });
    throw error;
  }
}