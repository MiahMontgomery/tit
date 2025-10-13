import { projectsRepo } from "./repos/projectsRepo.js";
import { stateMachine } from "./stateMachine.js";
import { logger } from "./tools/logger.js";

export class Runner {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly TICK_INTERVAL = 60000; // 60 seconds

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.systemInfo("Runner is already running");
      return;
    }

    this.isRunning = true;
    logger.systemInfo("Starting Titan runner", { interval: this.TICK_INTERVAL });

    // Start the main loop
    this.intervalId = setInterval(async () => {
      await this.tick();
    }, this.TICK_INTERVAL);

    // Run initial tick
    await this.tick();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.systemInfo("Runner is not running");
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.systemInfo("Titan runner stopped");
  }

  private async tick(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.systemInfo("Starting runner tick");

      // Get all active projects
      const projects = await projectsRepo.getAll();
      const activeProjects = projects.filter(p => p.status === 'active');

      logger.systemInfo(`Found ${activeProjects.length} active projects`);

      if (activeProjects.length === 0) {
        logger.systemInfo("No active projects to process");
        return;
      }

      // Process each project
      const results = await Promise.allSettled(
        activeProjects.map(project => this.tickProject(project.id))
      );

      // Log results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const failed = results.filter(r => r.status === 'rejected').length;

      const duration = Date.now() - startTime;
      logger.systemInfo(`Runner tick completed`, {
        total: activeProjects.length,
        successful,
        failed,
        duration
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.systemError("Runner tick failed", { 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration 
      });
    }
  }

  private async tickProject(projectId: string): Promise<boolean> {
    try {
      logger.projectInfo(projectId, "Processing project");
      
      const processed = await stateMachine.tickProject(projectId);
      
      if (processed) {
        logger.projectInfo(projectId, "Project processed successfully");
      } else {
        logger.projectInfo(projectId, "No tasks to process");
      }
      
      return processed;
    } catch (error) {
      logger.projectError(projectId, "Project processing failed", {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Manual tick for testing
  async manualTick(projectId?: string): Promise<void> {
    if (projectId) {
      logger.systemInfo(`Manual tick for project: ${projectId}`);
      await this.tickProject(projectId);
    } else {
      logger.systemInfo("Manual tick for all projects");
      await this.tick();
    }
  }

  // Get runner status
  getStatus(): {
    isRunning: boolean;
    interval: number;
    nextTick?: Date;
  } {
    return {
      isRunning: this.isRunning,
      interval: this.TICK_INTERVAL,
      nextTick: this.isRunning ? new Date(Date.now() + this.TICK_INTERVAL) : undefined
    };
  }
}

export const runner = new Runner();
