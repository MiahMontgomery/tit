import { WebSocketServer } from 'ws';
import { broadcastAgentEvent } from '../websocket';
import { storage } from '../storage';
import { ProjectExecutor } from '../services/project-executor';

interface Task {
  id: string;
  type: string;
  projectId: string;
  data: any;
}

interface TaskResult {
  success: boolean;
  output: any;
  error?: string;
}

export class AutonomousAgent {
  private wsServer: WebSocketServer;
  private isRunning: boolean = false;
  private activeProjects: Set<string> = new Set();

  constructor(wsServer: WebSocketServer) {
    this.wsServer = wsServer;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.log('Autonomous agent started');
    
    // Start monitoring active projects
    this.monitorActiveProjects();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('Autonomous agent stopped');
  }

  private async monitorActiveProjects(): Promise<void> {
    while (this.isRunning) {
      try {
        const projects = await storage.getProjects();
        
        for (const project of projects) {
          if (project.status === 'Active' && !this.activeProjects.has(project.id)) {
            await this.startProjectExecution(project.id);
          }
        }
        
        // Wait before next check
        await this.sleep(30000); // 30 seconds
      } catch (error) {
        console.error('Project monitoring error:', error);
        await this.sleep(30000);
      }
    }
  }

  private async startProjectExecution(projectId: string): Promise<void> {
    try {
      this.activeProjects.add(projectId);
      
      console.log(`Starting autonomous execution for project: ${projectId}`);
      
      // Emit project started event
      broadcastAgentEvent({
        type: 'project.started',
        projectId,
        timestamp: Date.now()
      });

      // Start the autonomous development loop
      this.executeProjectLoop(projectId);
      
    } catch (error) {
      console.error(`Failed to start project execution for ${projectId}:`, error);
      this.activeProjects.delete(projectId);
    }
  }

  private async executeProjectLoop(projectId: string): Promise<void> {
    try {
      while (this.isRunning && this.activeProjects.has(projectId)) {
        // Process any pending tasks for this project
        await this.processPendingTasks(projectId);
        
        // Get project features
        const features = await storage.getFeaturesByProject(projectId);
        const pendingFeatures = features.filter(f => f.status === 'pending');
        
        if (pendingFeatures.length === 0) {
          // All features completed, transition to optimization mode
          await this.optimizeProject(projectId);
          break;
        }
        
        // Work on next pending feature
        const nextFeature = pendingFeatures[0];
        await this.workOnFeature(projectId, nextFeature);
        
        // Wait before next iteration
        await this.sleep(5000); // 5 seconds
      }
    } catch (error) {
      console.error(`Project execution loop error for ${projectId}:`, error);
    } finally {
      this.activeProjects.delete(projectId);
    }
  }

  private async workOnFeature(projectId: string, feature: any): Promise<void> {
    try {
      console.log(`Working on feature: ${feature.name} for project: ${projectId}`);
      
      // Emit feature work started
      broadcastAgentEvent({
        type: 'feature.work.started',
        projectId,
        featureId: feature.id,
        featureName: feature.name,
        timestamp: Date.now()
      });

      // Update feature status to in-progress
      await storage.updateFeature(feature.id, { status: 'in-progress' });
      
      // Emit feature work progress
      broadcastAgentEvent({
        type: 'feature.work.progress',
        projectId,
        featureId: feature.id,
        featureName: feature.name,
        progress: 25,
        timestamp: Date.now()
      });

      // Execute the feature using the real project executor
      const executor = new ProjectExecutor(projectId);
      const result = await executor.executeFeature(feature.id, feature.name);
      
      // Emit feature work progress
      broadcastAgentEvent({
        type: 'feature.work.progress',
        projectId,
        featureId: feature.id,
        featureName: feature.name,
        progress: 75,
        timestamp: Date.now()
      });
      
      if (result.success) {
        // Complete the feature
        await storage.updateFeature(feature.id, { status: 'completed' });
        
        // Create output items for each file created
        if (result.filesCreated && result.filesCreated.length > 0) {
          for (const filePath of result.filesCreated) {
            await storage.createOutputItem({
              projectId,
              type: 'file',
              title: `Created: ${filePath}`,
              description: `File created during ${feature.name} execution`,
              content: `File: ${filePath}\nFeature: ${feature.name}\nStatus: Created successfully`,
              url: `/projects/${projectId}/files/${filePath}`,
              status: 'approved'
            });
          }
        }

        // Create output item for commands executed
        if (result.commandsExecuted && result.commandsExecuted.length > 0) {
          await storage.createOutputItem({
            projectId,
            type: 'content',
            title: `Commands Executed: ${feature.name}`,
            description: `Commands run during ${feature.name} execution`,
            content: `Commands executed:\n${result.commandsExecuted.join('\n')}\n\nOutput:\n${result.output}`,
            status: 'approved'
          });
        }

        // Create summary output item
        await storage.createOutputItem({
          projectId,
          type: 'content',
          title: `Feature Completed: ${feature.name}`,
          description: `Summary of ${feature.name} execution`,
          content: `Feature: ${feature.name}\nStatus: Completed successfully\nFiles Created: ${result.filesCreated?.length || 0}\nCommands Executed: ${result.commandsExecuted?.length || 0}\n\nOutput:\n${result.output}`,
          status: 'approved'
        });
        
        // Emit feature completed
        broadcastAgentEvent({
          type: 'feature.work.completed',
          projectId,
          featureId: feature.id,
          featureName: feature.name,
          timestamp: Date.now()
        });

        // Create detailed log entry
        await storage.createLog(projectId, "Feature Completed", 
          `Feature "${feature.name}" has been completed successfully. Files created: ${result.filesCreated?.join(', ') || 'none'}. Commands executed: ${result.commandsExecuted?.join(', ') || 'none'}.`);
      } else {
        // Mark feature as failed
        await storage.updateFeature(feature.id, { status: 'failed' });
        
        // Emit feature work error
        broadcastAgentEvent({
          type: 'feature.work.error',
          projectId,
          featureId: feature.id,
          featureName: feature.name,
          error: result.error || 'Unknown error',
          timestamp: Date.now()
        });

        // Create error log entry
        await storage.createLog(projectId, "Feature Failed", 
          `Feature "${feature.name}" failed to execute: ${result.error}`);
      }
      
    } catch (error) {
      console.error(`Feature work error for ${feature.name}:`, error);
      
      // Mark feature as failed
      await storage.updateFeature(feature.id, { status: 'failed' });
      
      // Emit feature work error
      broadcastAgentEvent({
        type: 'feature.work.error',
        projectId,
        featureId: feature.id,
        featureName: feature.name,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });

      // Create error log entry
      await storage.createLog(projectId, "Feature Error", 
        `Feature "${feature.name}" encountered an error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async optimizeProject(projectId: string): Promise<void> {
    try {
      console.log(`Project ${projectId} completed, starting optimization phase`);
      
      // Emit optimization started
      broadcastAgentEvent({
        type: 'project.optimization.started',
        projectId,
        timestamp: Date.now()
      });

      // Create optimization log
      await storage.createLog(projectId, "Optimization Started", "Project completed, beginning optimization phase");
      
      // Mark project as completed to prevent re-execution
      await storage.updateProject(projectId, { status: 'Completed' });
      
      // Emit project completed
      broadcastAgentEvent({
        type: 'project.completed',
        projectId,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error(`Project optimization error for ${projectId}:`, error);
    }
  }

  private async executeTask(task: Task): Promise<TaskResult> {
    try {
      console.log(`Executing task: ${task.type} for project: ${task.projectId}`);
      
      switch (task.type) {
        case 'service:input.injectPrompt':
          const { executeInjectPrompt } = await import('../services/input.injectPrompt');
          const result = await executeInjectPrompt({
            projectId: task.data.projectId,
            taskId: task.id,
            prompt: task.data.prompt
          });
          return {
            success: true,
            output: result
          };
          
        default:
          console.log(`Unknown task type: ${task.type}`);
          return {
            success: false,
            output: null,
            error: `Unknown task type: ${task.type}`
          };
      }
    } catch (error) {
      console.error(`Task execution error:`, error);
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async processPendingTasks(projectId: string): Promise<void> {
    try {
      const { getPendingTasks, markTaskAsRunning, markTaskAsCompleted, markTaskAsFailed } = await import('../queue');
      const pendingTasks = await getPendingTasks();
      const projectTasks = pendingTasks.filter(task => task.projectId === projectId);
      
      for (const task of projectTasks) {
        try {
          console.log(`🔄 Processing task: ${task.type} for project: ${projectId}`);
          
          // Mark task as running
          await markTaskAsRunning(task.id);
          
          // Execute the task
          const result = await this.executeTask(task);
          
          if (result.success) {
            await markTaskAsCompleted(task.id);
            console.log(`✅ Task completed: ${task.type} for project: ${projectId}`);
          } else {
            await markTaskAsFailed(task.id, result.error || 'Unknown error');
            console.log(`❌ Task failed: ${task.type} for project: ${projectId} - ${result.error}`);
          }
        } catch (error) {
          console.error(`Task processing error:`, error);
          await markTaskAsFailed(task.id, error instanceof Error ? error.message : 'Unknown error');
        }
      }
    } catch (error) {
      console.error('Error processing pending tasks:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
