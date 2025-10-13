import { storage } from '../storage';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface ProofEntry {
  id: string;
  projectId: string;
  taskId: string;
  type: 'code_change' | 'screenshot' | 'execution' | 'file_creation' | 'file_modification' | 'rollback';
  title: string;
  description: string;
  timestamp: string;
  data: {
    before?: any;
    after?: any;
    diff?: string;
    screenshotPath?: string;
    filePath?: string;
    codeBlock?: string;
    executionResult?: any;
    rollbackId?: string;
  };
  metadata: {
    author: string;
    action: string;
    status: 'success' | 'error' | 'pending';
    duration?: number;
  };
}

export class ProofLogger {
  private proofDir: string;

  constructor() {
    this.proofDir = join(process.cwd(), 'data', 'proofs');
    mkdirSync(this.proofDir, { recursive: true });
  }

  async logCodeChange(
    projectId: string,
    taskId: string,
    filePath: string,
    before: string,
    after: string,
    description: string
  ): Promise<ProofEntry> {
    const diff = this.generateDiff(before, after);
    
    const proof: ProofEntry = {
      id: randomUUID(),
      projectId,
      taskId,
      type: 'code_change',
      title: `Code Change: ${filePath}`,
      description,
      timestamp: new Date().toISOString(),
      data: {
        filePath,
        before,
        after,
        diff
      },
      metadata: {
        author: 'Jason',
        action: 'code_modification',
        status: 'success'
      }
    };

    await this.saveProof(proof);
    return proof;
  }

  async logScreenshot(
    projectId: string,
    taskId: string,
    screenshotPath: string,
    description: string
  ): Promise<ProofEntry> {
    const proof: ProofEntry = {
      id: randomUUID(),
      projectId,
      taskId,
      type: 'screenshot',
      title: `Screenshot: ${new Date().toLocaleTimeString()}`,
      description,
      timestamp: new Date().toISOString(),
      data: {
        screenshotPath
      },
      metadata: {
        author: 'Jason',
        action: 'screenshot_capture',
        status: 'success'
      }
    };

    await this.saveProof(proof);
    return proof;
  }

  async logExecution(
    projectId: string,
    taskId: string,
    action: string,
    result: any,
    status: 'success' | 'error' | 'pending',
    duration?: number
  ): Promise<ProofEntry> {
    const proof: ProofEntry = {
      id: randomUUID(),
      projectId,
      taskId,
      type: 'execution',
      title: `Execution: ${action}`,
      description: `Executed ${action} with status: ${status}`,
      timestamp: new Date().toISOString(),
      data: {
        executionResult: result
      },
      metadata: {
        author: 'Jason',
        action,
        status,
        duration
      }
    };

    await this.saveProof(proof);
    return proof;
  }

  async logFileCreation(
    projectId: string,
    taskId: string,
    filePath: string,
    content: string,
    description: string
  ): Promise<ProofEntry> {
    const proof: ProofEntry = {
      id: randomUUID(),
      projectId,
      taskId,
      type: 'file_creation',
      title: `File Created: ${filePath}`,
      description,
      timestamp: new Date().toISOString(),
      data: {
        filePath,
        codeBlock: content
      },
      metadata: {
        author: 'Jason',
        action: 'file_creation',
        status: 'success'
      }
    };

    await this.saveProof(proof);
    return proof;
  }

  async logFileModification(
    projectId: string,
    taskId: string,
    filePath: string,
    before: string,
    after: string,
    description: string
  ): Promise<ProofEntry> {
    const diff = this.generateDiff(before, after);
    
    const proof: ProofEntry = {
      id: randomUUID(),
      projectId,
      taskId,
      type: 'file_modification',
      title: `File Modified: ${filePath}`,
      description,
      timestamp: new Date().toISOString(),
      data: {
        filePath,
        before,
        after,
        diff
      },
      metadata: {
        author: 'Jason',
        action: 'file_modification',
        status: 'success'
      }
    };

    await this.saveProof(proof);
    return proof;
  }

  async logRollback(
    projectId: string,
    taskId: string,
    rollbackId: string,
    description: string,
    originalProofId: string
  ): Promise<ProofEntry> {
    const proof: ProofEntry = {
      id: randomUUID(),
      projectId,
      taskId,
      type: 'rollback',
      title: `Rollback: ${rollbackId}`,
      description,
      timestamp: new Date().toISOString(),
      data: {
        rollbackId,
        originalProofId
      },
      metadata: {
        author: 'Jason',
        action: 'rollback',
        status: 'success'
      }
    };

    await this.saveProof(proof);
    return proof;
  }

  async getProofsByProject(projectId: string): Promise<ProofEntry[]> {
    try {
      const proofFile = join(this.proofDir, `${projectId}.json`);
      const content = await import('fs').then(fs => fs.promises.readFile(proofFile, 'utf-8'));
      return JSON.parse(content);
    } catch (error) {
      return [];
    }
  }

  async getProofById(proofId: string): Promise<ProofEntry | null> {
    try {
      // Search through all project proof files
      const projects = await storage.getProjects();
      for (const project of projects) {
        const proofs = await this.getProofsByProject(project.id);
        const proof = proofs.find(p => p.id === proofId);
        if (proof) return proof;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private async saveProof(proof: ProofEntry): Promise<void> {
    const projectProofs = await this.getProofsByProject(proof.projectId);
    projectProofs.push(proof);
    
    const proofFile = join(this.proofDir, `${proof.projectId}.json`);
    writeFileSync(proofFile, JSON.stringify(projectProofs, null, 2));
  }

  private generateDiff(before: string, after: string): string {
    // Simple diff generation - in a real implementation, you'd use a proper diff library
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    
    let diff = '';
    const maxLines = Math.max(beforeLines.length, afterLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const beforeLine = beforeLines[i] || '';
      const afterLine = afterLines[i] || '';
      
      if (beforeLine === afterLine) {
        diff += `  ${beforeLine}\n`;
      } else {
        if (beforeLine) {
          diff += `- ${beforeLine}\n`;
        }
        if (afterLine) {
          diff += `+ ${afterLine}\n`;
        }
      }
    }
    
    return diff;
  }

  async createProofSummary(projectId: string): Promise<any> {
    const proofs = await this.getProofsByProject(projectId);
    
    const summary = {
      totalProofs: proofs.length,
      byType: proofs.reduce((acc, proof) => {
        acc[proof.type] = (acc[proof.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentProofs: proofs
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10),
      successRate: proofs.filter(p => p.metadata.status === 'success').length / proofs.length * 100
    };
    
    return summary;
  }
}

export const proofLogger = new ProofLogger();
