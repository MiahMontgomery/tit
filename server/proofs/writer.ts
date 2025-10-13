import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getDb } from '../db/drizzle.js';
import { proofs } from '../../shared/schema.js';
import { emitProofCreated } from '../events/publish.js';

export interface ProofData {
  projectId: string;
  runId?: string;
  type: 'log' | 'code' | 'test' | 'build' | 'deploy';
  content: string;
  summary: string;
}

export async function writeProof(data: ProofData): Promise<void> {
  try {
    const db = getDb();
    const proofId = `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const runId = data.runId || 'default';
    
    // Create directory structure
    const proofDir = join(process.cwd(), 'data', 'proofs', data.projectId, runId);
    await mkdir(proofDir, { recursive: true });
    
    // Determine file extension based on type
    let extension = 'txt';
    if (data.type === 'code') extension = 'js';
    else if (data.type === 'log') extension = 'log';
    else if (data.type === 'test') extension = 'test';
    else if (data.type === 'build') extension = 'build';
    else if (data.type === 'deploy') extension = 'deploy';
    
    // Write file for non-link types
    if (data.type !== 'link') {
      const filePath = join(proofDir, `${proofId}.${extension}`);
      await writeFile(filePath, data.content, 'utf8');
    }
    
    // Insert into database
    await db.insert(proofs).values({
      id: proofId,
      projectId: data.projectId,
      runId: runId,
      type: data.type,
      ref: data.type === 'link' ? data.content : undefined,
      summary: data.summary,
    });
    
    // Emit SSE event
    emitProofCreated(data.projectId, runId, proofId);
    
    console.log(`Proof [${data.type}]: ${data.summary} -> ${proofId}`);
  } catch (error) {
    console.error('Proof writing error:', error);
    throw error;
  }
}
