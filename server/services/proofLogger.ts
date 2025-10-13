/**
 * Proof logger service for Titan
 * Handles logging and storing various types of proofs to database and filesystem
 */

import { database } from '../database';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ProofData {
  [key: string]: any;
}

export class ProofLogger {
  private readonly PROOFS_DIR = process.env.FILE_STORAGE_ROOT || './proofs';

  constructor() {
    // Ensure proofs directory exists
    if (!existsSync(this.PROOFS_DIR)) {
      mkdirSync(this.PROOFS_DIR, { recursive: true });
    }
  }

  /**
   * Log file creation
   */
  async logFileCreation(projectId: string, taskId: number, data: ProofData): Promise<string> {
    const proofId = uuidv4();
    
    // Save to database
    await database.query(
      `INSERT INTO proofs (id, project_id, task_id, type, data_json, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [proofId, projectId, taskId, 'file', JSON.stringify(data), new Date()]
    );

    // Save file to filesystem
    if (data.filePath && data.content) {
      const filePath = join(this.PROOFS_DIR, `${proofId}.txt`);
      writeFileSync(filePath, data.content);
      data.filePath = filePath;
    }

    console.log(`📁 Proof logged: file creation for project ${projectId}`);
    return proofId;
  }

  /**
   * Log code change
   */
  async logCodeChange(projectId: string, taskId: number, data: ProofData): Promise<string> {
    const proofId = uuidv4();
    
    // Save to database
    await database.query(
      `INSERT INTO proofs (id, project_id, task_id, type, data_json, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [proofId, projectId, taskId, 'code_diff', JSON.stringify(data), new Date()]
    );

    // Save diff to filesystem
    const diffPath = join(this.PROOFS_DIR, `${proofId}.diff`);
    const diffContent = this.generateDiff(data.before, data.after);
    writeFileSync(diffPath, diffContent);
    data.diffPath = diffPath;

    console.log(`📝 Proof logged: code change for project ${projectId}`);
    return proofId;
  }

  /**
   * Log screenshot
   */
  async logScreenshot(projectId: string, taskId: number, data: ProofData): Promise<string> {
    const proofId = uuidv4();
    
    // Save to database
    await database.query(
      `INSERT INTO proofs (id, project_id, task_id, type, data_json, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [proofId, projectId, taskId, 'screenshot', JSON.stringify(data), new Date()]
    );

    console.log(`📸 Proof logged: screenshot for project ${projectId}`);
    return proofId;
  }

  /**
   * Log execution result
   */
  async logExecution(projectId: string, taskId: number, phase: string, data: ProofData): Promise<string> {
    const proofId = uuidv4();
    
    // Save to database
    await database.query(
      `INSERT INTO proofs (id, project_id, task_id, type, data_json, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [proofId, projectId, taskId, 'exec', JSON.stringify({ phase, ...data }), new Date()]
    );

    console.log(`⚡ Proof logged: execution ${phase} for project ${projectId}`);
    return proofId;
  }

  /**
   * Get proofs for a project
   */
  async getProofs(projectId: string, limit: number = 100): Promise<any[]> {
    const result = await database.query(
      `SELECT * FROM proofs 
       WHERE project_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [projectId, limit]
    );

    return result.rows.map(proof => ({
      id: proof.id,
      projectId: proof.project_id,
      taskId: proof.task_id,
      type: proof.type,
      data: proof.data_json,
      createdAt: proof.created_at
    }));
  }

  /**
   * Get proofs for a specific task
   */
  async getTaskProofs(taskId: number): Promise<any[]> {
    const result = await database.query(
      `SELECT * FROM proofs 
       WHERE task_id = $1 
       ORDER BY created_at ASC`,
      [taskId]
    );

    return result.rows.map(proof => ({
      id: proof.id,
      projectId: proof.project_id,
      taskId: proof.task_id,
      type: proof.type,
      data: proof.data_json,
      createdAt: proof.created_at
    }));
  }

  /**
   * Generate diff between two strings
   */
  private generateDiff(before: string, after: string): string {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    
    let diff = '';
    const maxLines = Math.max(beforeLines.length, afterLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const beforeLine = beforeLines[i] || '';
      const afterLine = afterLines[i] || '';
      
      if (beforeLine !== afterLine) {
        diff += `- ${beforeLine}\n`;
        diff += `+ ${afterLine}\n`;
      } else {
        diff += `  ${beforeLine}\n`;
      }
    }
    
    return diff;
  }
}

export const proofLogger = new ProofLogger();
