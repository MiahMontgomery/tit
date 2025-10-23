import { spawn } from 'child_process';
import { enqueue } from '../../../server/src/lib/queue.js';
import { logger } from '../../../server/src/lib/logger.js';

export async function opsTest(job: any) {
  const { payload } = job;
  const { title, description, branch } = payload;
  
  logger.info('Starting ops.test job', { jobId: job.id, title, branch });
  
  try {
    // Run npm ci && npm run build
    const testProcess = spawn('npm', ['ci'], { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    let stdout = '';
    let stderr = '';
    
    testProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    testProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    const installResult = await new Promise<number>((resolve) => {
      testProcess.on('close', (code) => resolve(code || 0));
    });
    
    if (installResult !== 0) {
      throw new Error(`npm ci failed with code ${installResult}: ${stderr}`);
    }
    
    // Run build
    const buildProcess = spawn('npm', ['run', 'build'], { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    let buildStdout = '';
    let buildStderr = '';
    
    buildProcess.stdout?.on('data', (data) => {
      buildStdout += data.toString();
    });
    
    buildProcess.stderr?.on('data', (data) => {
      buildStderr += data.toString();
    });
    
    const buildResult = await new Promise<number>((resolve) => {
      buildProcess.on('close', (code) => resolve(code || 0));
    });
    
    if (buildResult !== 0) {
      throw new Error(`npm run build failed with code ${buildResult}: ${buildStderr}`);
    }
    
    logger.info('Ops test passed successfully', { jobId: job.id, branch });
    
    // Enqueue next step
    await enqueue({
      projectId: 'ops',
      kind: 'ops.pr',
      payload: { title, description, branch, patches: payload.patches }
    });
    
    logger.info('Ops.test job completed', { jobId: job.id });
    
  } catch (error) {
    logger.error('Ops.test job failed', { jobId: job.id, error });
    
    // Enqueue rollback on test failure
    await enqueue({
      projectId: 'ops',
      kind: 'ops.rollback',
      payload: { title, description, branch, reason: 'Test failed' }
    });
    
    throw error;
  }
}