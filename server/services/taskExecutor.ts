/**
 * Task executor service for Titan
 * Handles execution of different task types: exec, code, screenshot
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { taskQueue } from '../core/queue';
import { proofLogger } from './proofLogger';
import { v4 as uuidv4 } from 'uuid';

export interface TaskResult {
  success: boolean;
  output?: any;
  error?: string;
  proof?: any;
}

export class TaskExecutor {
  private readonly PROOFS_DIR = process.env.FILE_STORAGE_ROOT || './proofs';

  constructor() {
    // Ensure proofs directory exists
    if (!existsSync(this.PROOFS_DIR)) {
      mkdirSync(this.PROOFS_DIR, { recursive: true });
    }
  }

  /**
   * Execute a task based on its type
   */
  async executeTask(task: any): Promise<TaskResult> {
    const { id, projectId, type, payload } = task;
    
    console.log(`🔧 Executing task: ${type} for project: ${projectId}`);

    try {
      // Log before execution
      await proofLogger.logExecution(projectId, id, 'before_exec', {
        taskType: type,
        payload,
        timestamp: new Date().toISOString()
      });

      let result: TaskResult;

      switch (type) {
        case 'exec':
          result = await this.executeCommand(payload, projectId, id);
          break;
        case 'code':
          result = await this.executeCodeChange(payload, projectId, id);
          break;
        case 'screenshot':
          result = await this.executeScreenshot(payload, projectId, id);
          break;
        default:
          throw new Error(`Unknown task type: ${type}`);
      }

      // Log after execution
      await proofLogger.logExecution(projectId, id, 'after_exec', {
        success: result.success,
        output: result.output,
        error: result.error,
        timestamp: new Date().toISOString()
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log error
      await proofLogger.logExecution(projectId, id, 'on_error', {
        error: errorMessage,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Execute a shell command
   */
  private async executeCommand(payload: any, projectId: string, taskId: number): Promise<TaskResult> {
    const { command, args = [], cwd = process.cwd() } = payload;
    
    if (!command) {
      throw new Error('Command is required for exec tasks');
    }

    return new Promise((resolve) => {
      const child = spawn(command, args, { 
        cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', async (code) => {
        const success = code === 0;
        const output = { stdout, stderr, exitCode: code };
        
        // Save execution log to file
        const logId = uuidv4();
        const logPath = join(this.PROOFS_DIR, `${logId}.log`);
        writeFileSync(logPath, JSON.stringify(output, null, 2));

        // Log file creation
        await proofLogger.logFileCreation(projectId, taskId, {
          filePath: logPath,
          content: JSON.stringify(output, null, 2),
          description: `Execution log for command: ${command}`,
          logId
        });

        resolve({
          success,
          output,
          proof: {
            type: 'exec',
            logPath,
            logId
          }
        });
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });
    });
  }

  /**
   * Execute code change (file modification)
   */
  private async executeCodeChange(payload: any, projectId: string, taskId: number): Promise<TaskResult> {
    const { filePath, content, before, after, description } = payload;
    
    if (!filePath || !content) {
      throw new Error('filePath and content are required for code tasks');
    }

    try {
      // Read current file content
      const currentContent = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
      
      // Write new content
      writeFileSync(filePath, content);
      
      // Log code change
      await proofLogger.logCodeChange(projectId, taskId, {
        filePath,
        before: before || currentContent,
        after: after || content,
        description: description || 'Code change applied'
      });

      return {
        success: true,
        output: { filePath, content },
        proof: {
          type: 'code_diff',
          filePath,
          before: before || currentContent,
          after: after || content
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute screenshot capture
   */
  private async executeScreenshot(payload: any, projectId: string, taskId: number): Promise<TaskResult> {
    const { url, selector, description } = payload;
    
    if (!url) {
      throw new Error('URL is required for screenshot tasks');
    }

    try {
      // For now, create a placeholder screenshot
      // In a real implementation, this would use Puppeteer
      const screenshotId = uuidv4();
      const screenshotPath = join(this.PROOFS_DIR, `${screenshotId}.png`);
      
      // Create a placeholder file
      writeFileSync(screenshotPath, 'placeholder screenshot data');

      // Log screenshot
      await proofLogger.logScreenshot(projectId, taskId, {
        url,
        selector,
        screenshotPath,
        description: description || 'Screenshot captured'
      });

      return {
        success: true,
        output: { url, screenshotPath },
        proof: {
          type: 'screenshot',
          url,
          screenshotPath
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const taskExecutor = new TaskExecutor();
