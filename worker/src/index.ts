import http from 'http';
import { claimNext, markDone, markErrorOrRetry, enqueue } from '../../server/src/lib/queue.js';
import { logger } from '../../server/src/lib/logger.js';
import { prisma } from '../../server/src/lib/db.js';
import { ProjectsRepo } from '../../server/src/lib/repos/ProjectsRepo.js';
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
const IDLE_CHECK_INTERVAL = 30000; // Check for idle state every 30 seconds
let isRunning = false;
let healthServer: http.Server | null = null;
let lastIdleCheck = 0;

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

/**
 * Check if Titan is idle (no active jobs) and create a new project if so
 */
async function checkIdleAndSpawn(): Promise<void> {
  const now = Date.now();
  
  // Only check every IDLE_CHECK_INTERVAL to avoid excessive DB queries
  if (now - lastIdleCheck < IDLE_CHECK_INTERVAL) {
    return;
  }
  
  lastIdleCheck = now;
  
  try {
    // Check if there are any active jobs
    const hasActiveJobs = await ProjectsRepo.hasActiveJobs();
    
    if (hasActiveJobs) {
      // There are jobs to process, don't spawn new projects
      return;
    }
    
    logger.info('Titan is idle - checking for projects to spawn');
    
    // Check for idle projects that might need jobs
    const idleProjects = await ProjectsRepo.getIdleProjects(5);
    
    if (idleProjects.length === 0) {
      // No projects exist yet, create a new one
      logger.info('No projects found - creating new autonomous project');
      await spawnNewProject();
    } else {
      // We have projects but they're idle - check if any need pipeline jobs
      logger.info(`Found ${idleProjects.length} idle projects - checking if they need pipeline jobs`);
      
      for (const project of idleProjects) {
        // Check if this project has any jobs at all
        const jobCount = await prisma.job.count({
          where: { projectId: String(project.id) }
        });
        
        if (jobCount === 0) {
          // Project exists but has no jobs - start the pipeline
          logger.info(`Project ${project.id} (${project.name}) has no jobs - starting pipeline`);
          await startProjectPipeline(project.id, project.name);
          break; // Only start one at a time
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error in idle check/spawn', { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

/**
 * Create a new autonomous project
 */
async function spawnNewProject(): Promise<void> {
  try {
    const projectName = `Autonomous Project ${new Date().toISOString().split('T')[0]}`;
    const projectDescription = `Auto-created by Titan worker on ${new Date().toISOString()}`;
    
    logger.info('Creating new autonomous project', { name: projectName });
    
    const project = await ProjectsRepo.create({
      name: projectName,
      description: projectDescription
    });
    
    logger.info('New project created', { projectId: project.id, name: project.name });
    
    // Start the pipeline for this new project
    await startProjectPipeline(project.id, project.name);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to spawn new project', { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

/**
 * Start the pipeline for a project (scaffold → build → deploy → verify → publish)
 */
async function startProjectPipeline(projectId: number, projectName: string): Promise<void> {
  try {
    const projectIdStr = String(projectId);
    
    logger.info('Starting pipeline for project', { projectId, projectName });
    
    // Enqueue the first job in the pipeline: scaffold
    await enqueue({
      projectId: projectIdStr,
      kind: 'scaffold',
      payload: {
        templateRef: 'basic', // Default template
        spec: {
          name: projectName,
          description: `Pipeline for ${projectName}`
        }
      }
    });
    
    logger.info('Pipeline started - scaffold job enqueued', { projectId, projectName });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to start project pipeline', { 
      projectId,
      projectName,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

async function mainLoop(): Promise<void> {
  while (isRunning) {
    try {
      const job = await claimNext();
      
      if (job) {
        await processJob(job);
      } else {
        // No jobs available - check if we should spawn new projects
        await checkIdleAndSpawn();
        
        // Wait before polling again
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

    // Start health check HTTP server only in standalone mode to avoid port conflicts
    const enableWorkerHttp = process.env.WORKER_HTTP === '1';
    if (enableWorkerHttp) {
      const port = Number(process.env.PORT) || 10000;
      await startHealthServer(port);
    }

    isRunning = true;
    logger.info('Starting Titan worker');
    
    // Start heartbeat with detailed logging
    setInterval(() => {
      const timestamp = new Date().toISOString();
      logger.info('Worker heartbeat', {
        timestamp,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        isRunning
      });
      console.log(`[${timestamp}] Worker heartbeat - Uptime: ${Math.floor(process.uptime())}s, Running: ${isRunning}`);
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
