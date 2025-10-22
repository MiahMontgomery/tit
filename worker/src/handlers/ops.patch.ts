import { Octokit } from 'octokit';
import { enqueue } from '../../server/src/lib/queue.js';
import { logger } from '../../server/src/lib/logger.js';

export async function opsPatch(job: any) {
  const { payload } = job;
  const { title, description, branch, patches } = payload;
  
  logger.info('Starting ops.patch job', { jobId: job.id, title, branch });
  
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;
    
    if (!githubToken || !githubRepo) {
      throw new Error('GITHUB_TOKEN and GITHUB_REPO must be configured');
    }
    
    const [owner, repo] = githubRepo.split('/');
    const octokit = new Octokit({ auth: githubToken });
    
    // Get main branch reference
    const mainRef = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: 'heads/main'
    });
    
    // Create new branch from main
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: mainRef.data.object.sha
    });
    
    // Apply patches
    for (const patch of patches) {
      if (patch.delete) {
        // Delete file
        await octokit.rest.repos.deleteFile({
          owner,
          repo,
          path: patch.path,
          message: `Delete ${patch.path}`,
          branch,
          sha: (await octokit.rest.repos.getContent({
            owner,
            repo,
            path: patch.path,
            ref: branch
          })).data.sha
        });
      } else if (patch.content) {
        // Create or update file
        const content = Buffer.from(patch.content).toString('base64');
        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: patch.path,
          message: `Update ${patch.path}`,
          content,
          branch
        });
      }
    }
    
    logger.info('Ops patch applied successfully', { jobId: job.id, branch });
    
    // Enqueue next step
    await enqueue({
      projectId: 'ops',
      kind: 'ops.test',
      payload: { title, description, branch, patches }
    });
    
    logger.info('Ops.patch job completed', { jobId: job.id });
    
  } catch (error) {
    logger.error('Ops.patch job failed', { jobId: job.id, error });
    throw error;
  }
}