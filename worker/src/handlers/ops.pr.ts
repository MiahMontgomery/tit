import { Octokit } from 'octokit';
import { logger } from '../lib/logger.js';

export async function opsPr(job: any): Promise<void> {
  const { payload } = job;
  const { title, description, branch, commitSha, testResults } = payload;
  
  logger.info('Starting ops.pr job', { jobId: job.id, branch });
  
  try {
    const githubRepo = process.env.GITHUB_REPO;
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubRepo || !githubToken) {
      throw new Error('GitHub configuration missing');
    }
    
    const [owner, repo] = githubRepo.split('/');
    const octokit = new Octokit({ auth: githubToken });
    
    // Create PR
    const pr = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      head: branch,
      base: 'main',
      body: description || `Automated PR created by Titan Ops\n\nCommit: ${commitSha}\nTest Status: ${testResults?.status || 'unknown'}`
    });
    
    // Add titan-ops label
    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: pr.data.number,
      labels: ['titan-ops']
    });
    
    logger.info('Ops.pr completed, created PR', { 
      jobId: job.id, 
      prNumber: pr.data.number,
      prUrl: pr.data.html_url
    });
    
    // Enqueue next step: ops.deploy-canary
    const { enqueue } = await import('../lib/queue.js');
    await enqueue({
      projectId: 'ops',
      kind: 'ops.deploy-canary',
      payload: {
        title,
        description,
        branch,
        commitSha,
        prNumber: pr.data.number,
        prUrl: pr.data.html_url,
        testResults
      }
    });
    
  } catch (error) {
    logger.error('Ops.pr job failed', { 
      jobId: job.id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}
