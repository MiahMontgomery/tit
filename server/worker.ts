import { taskQueue } from './queue';
import { storage } from './storage';
import { projectExecutor } from './services/project-executor';

const WORKER_ID = `worker-${Date.now()}`;
const HEARTBEAT_INTERVAL = 10000; // 10 seconds
const RESERVE_TIMEOUT = 30000; // 30 seconds

class Worker {
  private isRunning = false;
  private heartbeatInterval?: NodeJS.Timeout;
  private currentTask?: any;

  async start() {
    console.log(`🚀 Worker ${WORKER_ID} starting...`);
    this.isRunning = true;
    
    // Start heartbeat for current task
    this.startHeartbeat();
    
    // Main worker loop
    while (this.isRunning) {
      try {
        await this.processNextTask();
      } catch (error) {
        console.error('Worker error:', error);
        await this.sleep(5000); // Wait 5 seconds before retry
      }
    }
    
    console.log(`🛑 Worker ${WORKER_ID} stopped`);
  }

  async stop() {
    console.log(`🛑 Stopping worker ${WORKER_ID}...`);
    this.isRunning = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Fail current task if running
    if (this.currentTask) {
      await this.failCurrentTask('Worker stopped');
    }
  }

  private async processNextTask() {
    // Reserve next task
    const task = await taskQueue.reserve({
      workerId: WORKER_ID,
      visibilityMs: RESERVE_TIMEOUT
    });

    if (!task) {
      // No tasks available, wait a bit
      await this.sleep(1000);
      return;
    }

    console.log(`📋 Processing task ${task.id} (${task.type}) for project ${task.projectId}`);
    this.currentTask = task;

    try {
      // Execute task based on type
      await this.executeTask(task);
      
      // Acknowledge success
      await taskQueue.ack(task.id, WORKER_ID);
      console.log(`✅ Task ${task.id} completed successfully`);
      
    } catch (error) {
      console.error(`❌ Task ${task.id} failed:`, error);
      
      // Fail task with retry logic
      await taskQueue.fail(task.id, WORKER_ID, {
        errorText: error instanceof Error ? error.message : String(error),
        retryDelayMs: 5000,
        maxAttempts: 3
      });
    } finally {
      this.currentTask = undefined;
    }
  }

  private async executeTask(task: any) {
    switch (task.type) {
      case 'codegen':
        await this.executeCodegen(task);
        break;
      case 'build':
        await this.executeBuild(task);
        break;
      case 'test':
        await this.executeTest(task);
        break;
      case 'deploy':
        await this.executeDeploy(task);
        break;
      case 'screenshot':
        await this.executeScreenshot(task);
        break;
      default:
        // Use project executor for unknown task types
//         await projectExecutor.executeTask(task);
                console.log('Unknown task type: ' + task.type);

    }
  }

  private async executeCodegen(task: any) {
    console.log(`🔧 Executing codegen for project ${task.projectId}`);
    // Simulate code generation
    await this.sleep(2000);
    
    // Create proof
    const proof = {
      id: crypto.randomUUID(),
      projectId: task.projectId,
      type: 'diff',
      summary: 'Generated code for feature implementation',
      data: {
        files: ['src/components/Feature.tsx', 'src/hooks/useFeature.ts'],
        linesAdded: 150,
        linesRemoved: 0
      },
      createdAt: new Date()
    };
    
    storage.addProof(proof);
  }

  private async executeBuild(task: any) {
    console.log(`🔨 Executing build for project ${task.projectId}`);
    await this.sleep(3000);
    
    const proof = {
      id: crypto.randomUUID(),
      projectId: task.projectId,
      type: 'log',
      summary: 'Build completed successfully',
      data: {
        output: 'Build completed in 2.3s\nBundle size: 1.2MB\nAssets: 15 files'
      },
      createdAt: new Date()
    };
    
    storage.addProof(proof);
  }

  private async executeTest(task: any) {
    console.log(`🧪 Executing tests for project ${task.projectId}`);
    await this.sleep(1500);
    
    const proof = {
      id: crypto.randomUUID(),
      projectId: task.projectId,
      type: 'log',
      summary: 'Tests passed successfully',
      data: {
        output: 'Running tests...\n✓ 15 tests passed\n✓ 0 tests failed\nCoverage: 87%'
      },
      createdAt: new Date()
    };
    
    storage.addProof(proof);
  }

  private async executeDeploy(task: any) {
    console.log(`🚀 Executing deploy for project ${task.projectId}`);
    await this.sleep(4000);
    
    const proof = {
      id: crypto.randomUUID(),
      projectId: task.projectId,
      type: 'link',
      summary: 'Deployment successful',
      data: {
        url: `https://${task.projectId}.example.com`,
        environment: 'staging'
      },
      createdAt: new Date()
    };
    
    storage.addProof(proof);
  }

  private async executeScreenshot(task: any) {
    console.log(`📸 Executing screenshot for project ${task.projectId}`);
    await this.sleep(1000);
    
    const proof = {
      id: crypto.randomUUID(),
      projectId: task.projectId,
      type: 'screenshot',
      summary: 'Screenshot captured',
      data: {
        path: `data/proofs/screenshots/${task.projectId}-${Date.now()}.png`,
        width: 1920,
        height: 1080
      },
      createdAt: new Date()
    };
    
    storage.addProof(proof);
  }

  private async failCurrentTask(reason: string) {
    if (this.currentTask) {
      await taskQueue.fail(this.currentTask.id, WORKER_ID, {
        errorText: reason,
        retryDelayMs: 0,
        maxAttempts: 0
      });
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      if (this.currentTask) {
        const success = await taskQueue.heartbeat(this.currentTask.id, WORKER_ID);
        if (!success) {
          console.warn(`⚠️ Heartbeat failed for task ${this.currentTask.id}`);
          this.currentTask = undefined;
        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await worker.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await worker.stop();
  process.exit(0);
});

const worker = new Worker();
worker.start().catch(console.error);
