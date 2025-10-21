import { Octokit } from 'octokit';
import { logger } from '../lib/logger.js';

export async function opsPromote(job: any): Promise<void> {
  const { payload } = job;
  const { title, description, branch, commitSha, prNumber, prUrl, testResults, canaryResults, healthResults } = payload;
  
  logger.info('Starting ops.promote job', { jobId: job.id, prNumber });
  
  try {
    const githubRepo = process.env.GITHUB_REPO;
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubRepo || !githubToken) {
      throw new Error('GitHub configuration missing');
    }
    
    const [owner, repo] = githubRepo.split('/');
    const octokit = new Octokit({ auth: githubToken });
    
    // Merge the PR
    const mergeResult = await octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
      merge_method: 'squash'
    });
    
    logger.info('PR merged successfully', { 
      jobId: job.id, 
      prNumber,
      mergeSha: mergeResult.data.sha
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
    
    // Create a summary artifact
    const summary = {
      timestamp: new Date().toISOString(),
      jobId: job.id,
      title,
      description,
      branch,
      commitSha,
      prNumber,
      prUrl,
      mergeSha: mergeResult.data.sha,
      testResults,
      canaryResults,
      healthResults,
      status: 'promoted'
    };
    
    const { artifactsRepo } = await import('../../server/src/lib/repos/ArtifactsRepo.js');
    await artifactsRepo.add({
      projectId: 'ops',
      kind: 'ops-summary',
      path: `ops-summary-${job.id}.json`,
      meta: summary
    });
    
    logger.info('Ops.promote completed successfully', { 
      jobId: job.id, 
      prNumber,
      mergeSha: mergeResult.data.sha
    });
    
  } catch (error) {
    logger.error('Ops.promote job failed', { 
      jobId: job.id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}
