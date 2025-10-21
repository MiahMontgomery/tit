import { Octokit } from 'octokit';
import { logger } from '../lib/logger.js';

export async function opsPatch(job: any): Promise<void> {
  const { payload } = job;
  const { title, description, branch, patches } = payload;
  
  logger.info('Starting ops.patch job', { jobId: job.id, title, branch });
  
  try {
    const githubRepo = process.env.GITHUB_REPO;
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubRepo || !githubToken) {
      throw new Error('GitHub configuration missing');
    }
    
    const [owner, repo] = githubRepo.split('/');
    const octokit = new Octokit({ auth: githubToken });
    
    // Get main branch
    const mainBranch = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch: 'main'
    });
    
    // Create new branch
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: mainBranch.data.commit.sha
    }).catch(() => {
      // Branch might already exist, that's ok
    });
    
    // Create blobs for all files
    const blobs = await Promise.all(patches.map(async (patch: any) => {
      if (patch.delete) {
        return null; // Will be handled as deletion
      }
      
      const content = patch.content || patch.diff || '';
      const blob = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: Buffer.from(content).toString('base64'),
        encoding: 'base64'
      });
      
      return {
        path: patch.path,
        mode: '100644',
        type: 'blob',
        sha: blob.data.sha
      };
    }));
    
    // Create tree
    const tree = await octokit.rest.git.createTree({
      owner,
      repo,
      tree: blobs.filter(Boolean),
      base_tree: mainBranch.data.commit.sha
    });
    
    // Create commit
    const commit = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: title,
      tree: tree.data.sha,
      parents: [mainBranch.data.commit.sha]
    });
    
    // Update branch reference
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commit.data.sha
    });
    
    logger.info('Ops.patch completed, created branch and commit', { 
      jobId: job.id, 
      branch,
      commitSha: commit.data.sha 
    });
    
    // Enqueue next step: ops.test
    const { enqueue } = await import('../lib/queue.js');
    await enqueue({
      projectId: 'ops',
      kind: 'ops.test',
      payload: {
        title,
        description,
        branch,
        commitSha: commit.data.sha
      }
    });
    
  } catch (error) {
    logger.error('Ops.patch job failed', { 
      jobId: job.id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}
