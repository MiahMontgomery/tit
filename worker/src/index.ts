import http from 'http';
import { claimNext, markDone, markErrorOrRetry } from '../../server/src/lib/queue.js';
import { logger } from '../../server/src/lib/logger.js';
import { prisma } from '../../server/src/lib/db.js';
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
let healthServer: http.Server | null = null;

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Error in main loop', { 
        error: errorMessage,
        stack: errorStack,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      await sleep(POLL_INTERVAL);
    }
  }
}

async function startHealthServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    healthServer = http.createServer((req, res) => {
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'ok', 
          service: 'titan-worker',
          timestamp: new Date().toISOString()
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    healthServer.listen(port, '0.0.0.0', () => {
      logger.info(`Health check server listening on port ${port}`);
      resolve();
    });

    healthServer.on('error', (error) => {
      logger.error('Health server error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      reject(error);
    });
  });
}

async function start(): Promise<void> {
  if (isRunning) {
    logger.warn('Worker already running');
    return;
  }

  try {
    // Initialize database connection
    logger.info('Testing database connection...');
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection established');

    // Start health check HTTP server (required for Render deployment)
    const port = Number(process.env.PORT) || 10000;
    await startHealthServer(port);

    isRunning = true;
    logger.info('Starting Titan worker');
    
    // Start heartbeat
    setInterval(() => {
      logger.info('Worker heartbeat');
    }, 60000); // Every minute
    
    // Start main loop (non-blocking)
    mainLoop().catch((error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Main loop exited with error', { 
        error: errorMessage,
        stack: errorStack
      });
      process.exit(1);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Failed to start worker', { 
      error: errorMessage,
      stack: errorStack
    });
    throw error;
  }
}

async function stop(): Promise<void> {
  if (!isRunning) {
    logger.warn('Worker not running');
    return;
  }

  logger.info('Stopping Titan worker');
  isRunning = false;
  
  // Close health server
  if (healthServer) {
    await new Promise<void>((resolve) => {
      healthServer!.close(() => {
        logger.info('Health server closed');
        resolve();
      });
    });
  }
  
  // Close database connection
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.warn('Error closing database connection', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
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
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;
  logger.error('Failed to start worker', { 
    error: errorMessage,
    stack: errorStack
  });
  process.exit(1);
});
