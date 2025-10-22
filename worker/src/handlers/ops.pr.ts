import { Octokit } from 'octokit';
import { enqueue } from '../../server/src/lib/queue.js';
import { logger } from '../../server/src/lib/logger.js';

export async function opsPr(job: any) {
  const { payload } = job;
  const { title, description, branch } = payload;
  
  logger.info('Starting ops.pr job', { jobId: job.id, title, branch });
  
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;
    
    if (!githubToken || !githubRepo) {
      throw new Error('GITHUB_TOKEN and GITHUB_REPO must be configured');
    }
    
    const [owner, repo] = githubRepo.split('/');
    const octokit = new Octokit({ auth: githubToken });
    
    // Create pull request
    const pr = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      head: branch,
      base: 'main',
      body: description || `Automated PR created by Titan ops system.\n\nBranch: ${branch}`
    });
    
    const prNumber = pr.data.number;
    const prUrl = pr.data.html_url;
    
    logger.info('Pull request created successfully', { 
      jobId: job.id, 
      prNumber, 
      prUrl,
      branch 
    });
    
    // Enqueue next step
    await enqueue({
      projectId: 'ops',
      kind: 'ops.deploy-canary',
      payload: { 
        title, 
        description, 
        branch, 
        prNumber,
        prUrl,
        patches: payload.patches 
      }
    });
    
    logger.info('Ops.pr job completed', { jobId: job.id });
    
  } catch (error) {
    logger.error('Ops.pr job failed', { jobId: job.id, error });
    throw error;
  }
}