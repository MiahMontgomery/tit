import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../lib/logger.js';
import { artifactsRepo } from '../../../server/src/lib/repos/ArtifactsRepo.js';

const execAsync = promisify(exec);

export async function opsTest(job: any): Promise<void> {
  const { payload } = job;
  const { title, description, branch, commitSha } = payload;
  
  logger.info('Starting ops.test job', { jobId: job.id, branch, commitSha });
  
  try {
    // Run npm ci && npm run build
    const startTime = Date.now();
    
    logger.info('Running npm ci', { jobId: job.id });
    const { stdout: ciOutput, stderr: ciError } = await execAsync('npm ci');
    
    logger.info('Running npm run build', { jobId: job.id });
    const { stdout: buildOutput, stderr: buildError } = await execAsync('npm run build');
    
    const duration = Date.now() - startTime;
    
    // Create test results
    const testResults = {
      timestamp: new Date().toISOString(),
      jobId: job.id,
      branch,
      commitSha,
      duration,
      status: 'passed',
      ciOutput,
      ciError,
      buildOutput,
      buildError
    };
    
    // Store as artifact
    await artifactsRepo.add({
      projectId: 'ops',
      kind: 'test-results',
      path: `test-${job.id}.json`,
      meta: testResults
    });
    
    logger.info('Ops.test completed successfully', { 
      jobId: job.id, 
      duration,
      status: 'passed'
    });
    
    // Enqueue next step: ops.pr
    const { enqueue } = await import('../lib/queue.js');
    await enqueue({
      projectId: 'ops',
      kind: 'ops.pr',
      payload: {
        title,
        description,
        branch,
        commitSha,
        testResults
      }
    });
    
  } catch (error) {
    logger.error('Ops.test job failed', { 
      jobId: job.id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    // Store failed test results
    const testResults = {
      timestamp: new Date().toISOString(),
      jobId: job.id,
      branch,
      commitSha,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    await artifactsRepo.add({
      projectId: 'ops',
      kind: 'test-results',
      path: `test-${job.id}-failed.json`,
      meta: testResults
    });
    
    throw error;
  }
}
