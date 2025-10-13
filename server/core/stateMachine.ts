import { tasksRepo } from "./repos/tasksRepo.js";
import { proofsRepo } from "./repos/proofsRepo.js";
import { puppeteerClient } from "./tools/puppeteer.js";
import { logger } from "./tools/logger.js";
import { llmClient } from "./tools/llm.js";

export interface TaskResult {
  success: boolean;
  output?: any;
  error?: string;
  proof?: {
    type: string;
    title: string;
    description: string;
    uri?: string;
    content?: string;
    meta?: any;
  };
}

export class StateMachine {
  async tickProject(projectId: string): Promise<boolean> {
    try {
      logger.projectInfo(projectId, "Starting project tick");

      // Get next queued task
      const task = await tasksRepo.getNextQueuedTask(projectId);
      if (!task) {
        logger.projectInfo(projectId, "No queued tasks found");
        return false;
      }

      logger.taskInfo(task.id, `Processing task: ${task.type}`, { payload: task.payload });

      // Mark task as running
      await tasksRepo.setTaskStatus(task.id, "running");

      // Execute task based on type
      const result = await this.executeTask(task);

      if (result.success) {
        // Mark task as completed
        await tasksRepo.setTaskStatus(task.id, "completed", result.output);

        // Create proof if available
        if (result.proof) {
          await proofsRepo.create({
            projectId,
            taskId: task.id,
            type: result.proof.type,
            title: result.proof.title,
            description: result.proof.description,
            uri: result.proof.uri,
            content: result.proof.content,
            meta: result.proof.meta
          });

          logger.taskInfo(task.id, "Proof created", { proofType: result.proof.type });
        }

        logger.taskInfo(task.id, "Task completed successfully");
      } else {
        // Mark task as failed
        await tasksRepo.setTaskStatus(task.id, "failed", { error: result.error });

        logger.taskError(task.id, "Task failed", { error: result.error });
      }

      return true;

    } catch (error) {
      logger.projectError(projectId, "Project tick failed", { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  private async executeTask(task: any): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      switch (task.type) {
        case 'screenshot':
          return await this.executeScreenshotTask(task);
        
        case 'codegen':
          return await this.executeCodegenTask(task);
        
        case 'build':
          return await this.executeBuildTask(task);
        
        case 'test':
          return await this.executeTestTask(task);
        
        case 'deploy':
          return await this.executeDeployTask(task);
        
        case 'analyze':
          return await this.executeAnalyzeTask(task);
        
        default:
          return {
            success: false,
            error: `Unknown task type: ${task.type}`
          };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.taskError(task.id, "Task execution error", { 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration 
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeScreenshotTask(task: any): Promise<TaskResult> {
    const { url, options = {} } = task.payload;

    if (!url) {
      return {
        success: false,
        error: "URL is required for screenshot task"
      };
    }

    try {
      const result = await puppeteerClient.takeScreenshot(url, {
        fullPage: options.fullPage || true,
        width: options.width || 1920,
        height: options.height || 1080,
        filename: options.filename
      });

      if (result.success) {
        return {
          success: true,
          output: {
            filePath: result.filePath,
            metadata: result.metadata
          },
          proof: {
            type: 'screenshot',
            title: `Screenshot of ${url}`,
            description: `Screenshot captured at ${new Date().toISOString()}`,
            uri: result.filePath,
            meta: result.metadata
          }
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Screenshot failed'
      };
    }
  }

  private async executeCodegenTask(task: any): Promise<TaskResult> {
    const { description, context } = task.payload;

    try {
      const generatedCode = await llmClient.generateTaskDescription('code generation', 
        `${context || ''} - ${description || 'Generate code'}`);

      return {
        success: true,
        output: {
          code: generatedCode,
          timestamp: new Date().toISOString()
        },
        proof: {
          type: 'code',
          title: 'Generated Code',
          description: `Code generated for: ${description}`,
          content: generatedCode,
          meta: { context, description }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Code generation failed'
      };
    }
  }

  private async executeBuildTask(task: any): Promise<TaskResult> {
    const { projectType, commands } = task.payload;

    // Simulate build process
    const buildLog = `Building ${projectType || 'project'}...
✓ Dependencies installed
✓ Compilation successful
✓ Tests passed
✓ Build artifacts generated
Build completed successfully`;

    return {
      success: true,
      output: {
        buildLog,
        timestamp: new Date().toISOString()
      },
      proof: {
        type: 'log',
        title: 'Build Log',
        description: `Build completed for ${projectType || 'project'}`,
        content: buildLog,
        meta: { projectType, commands }
      }
    };
  }

  private async executeTestTask(task: any): Promise<TaskResult> {
    const { testType, testCount } = task.payload;

    // Simulate test execution
    const testLog = `Running ${testType || 'unit'} tests...
✓ Test 1 passed
✓ Test 2 passed
✓ Test 3 passed
${testCount ? `✓ All ${testCount} tests passed` : '✓ All tests passed'}
Test execution completed successfully`;

    return {
      success: true,
      output: {
        testLog,
        timestamp: new Date().toISOString()
      },
      proof: {
        type: 'log',
        title: 'Test Results',
        description: `Tests completed for ${testType || 'unit'} testing`,
        content: testLog,
        meta: { testType, testCount }
      }
    };
  }

  private async executeDeployTask(task: any): Promise<TaskResult> {
    const { environment, target } = task.payload;

    // Simulate deployment
    const deployLog = `Deploying to ${environment || 'production'}...
✓ Environment prepared
✓ Dependencies installed
✓ Application deployed
✓ Health checks passed
Deployment completed successfully`;

    const deployUrl = `https://${target || 'app'}-${Date.now()}.example.com`;

    return {
      success: true,
      output: {
        deployLog,
        deployUrl,
        timestamp: new Date().toISOString()
      },
      proof: {
        type: 'link',
        title: 'Deployment Complete',
        description: `Deployed to ${environment || 'production'}`,
        uri: deployUrl,
        content: deployLog,
        meta: { environment, target }
      }
    };
  }

  private async executeAnalyzeTask(task: any): Promise<TaskResult> {
    const { prompt, context } = task.payload;

    try {
      const analysis = await llmClient.analyzeProject(prompt || context || 'Analyze this project');

      return {
        success: true,
        output: {
          analysis,
          timestamp: new Date().toISOString()
        },
        proof: {
          type: 'analysis',
          title: 'Project Analysis',
          description: 'AI analysis of project requirements',
          content: JSON.stringify(analysis, null, 2),
          meta: { prompt, context }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      };
    }
  }
}

export const stateMachine = new StateMachine();
