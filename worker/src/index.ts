import { claimNext, markDone, markErrorOrRetry } from '../../server/src/lib/queue.js';
import { logger } from '../../server/src/lib/logger.js';
import { scaffold } from './handlers/scaffold.js';
import { build } from './handlers/build.js';
import { deploy } from './handlers/deploy.js';
import { verify } from './handlers/verify.js';
import { publish } from './handlers/publish.js';
import { opsDiff } from './handlers/ops.diff.js';
import { opsPatch } from './handlers/ops.patch.js';
import { opsTest } from './handlers/ops.test.js';
import { opsPr } from './handlers/ops.pr.js';
import { opsDeployCanary } from './handlers/ops.deploy-canary.js';
import { opsPromote } from './handlers/ops.promote.js';
import { opsRollback } from './handlers/ops.rollback.js';

const POLL_INTERVAL = 500; // 500ms
let isRunning = false;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processJob(job: any): Promise<void> {
  const startTime = Date.now();
  
  try {
    logger.info('Processing job', {
      jobId: job.id,
      projectId: job.projectId,
      kind: job.kind
    });

    // Route to appropriate handler
    switch (job.kind) {
      case 'scaffold':
        await scaffold(job);
        break;
      case 'build':
        await build(job);
        break;
      case 'deploy':
        await deploy(job);
        break;
      case 'verify':
        await verify(job);
        break;
      case 'publish':
        await publish(job);
        break;
      case 'ops.diff':
        await opsDiff(job);
        break;
      case 'ops.patch':
        await opsPatch(job);
        break;
      case 'ops.test':
        await opsTest(job);
        break;
      case 'ops.pr':
        await opsPr(job);
        break;
      case 'ops.deploy-canary':
        await opsDeployCanary(job);
        break;
      case 'ops.promote':
        await opsPromote(job);
        break;
      case 'ops.rollback':
        await opsRollback(job);
        break;
      default:
        throw new Error(`Unknown job kind: ${job.kind}`);
    }

    await markDone(job.id);
    
    const duration = Date.now() - startTime;
    logger.info('Job completed successfully', {
      jobId: job.id,
      projectId: job.projectId,
      kind: job.kind,
      durationMs: duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Job failed', {
      jobId: job.id,
      projectId: job.projectId,
      kind: job.kind,
      error: errorMessage,
      durationMs: duration
    });

    await markErrorOrRetry(job);
  }
}

async function mainLoop(): Promise<void> {
  while (isRunning) {
    try {
      const job = await claimNext();
      
      if (job) {
        await processJob(job);
      } else {
        // No jobs available, wait before polling again
        await sleep(POLL_INTERVAL);
      }
    } catch (error) {
      logger.error('Error in main loop', { error });
      await sleep(POLL_INTERVAL);
    }
  }
}

async function start(): Promise<void> {
  if (isRunning) {
    logger.warn('Worker already running');
    return;
  }

  isRunning = true;
  logger.info('Starting Titan worker');
  
  // Start heartbeat
  setInterval(() => {
    logger.info('Worker heartbeat');
  }, 60000); // Every minute
  
  await mainLoop();
}

async function stop(): Promise<void> {
  if (!isRunning) {
    logger.warn('Worker not running');
    return;
  }

  logger.info('Stopping Titan worker');
  isRunning = false;
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await stop();
  process.exit(0);
});

// Start the worker
start().catch((error) => {
  logger.error('Failed to start worker', { error });
  process.exit(1);
});
