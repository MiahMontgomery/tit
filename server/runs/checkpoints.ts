import { getDb } from '../db/drizzle.js';
import { checkpoints } from '../../shared/schema.js';

export interface CreateCheckpointData {
  projectId: string;
  runId: string;
  label?: string;
}

export async function createCheckpoint(data: CreateCheckpointData) {
  const db = getDb();
  
  const checkpoint = await db.insert(checkpoints).values({
    projectId: data.projectId,
    runId: data.runId,
    label: data.label || 'checkpoint'
  }).returning();
  
  return checkpoint[0];
}

export async function diffFromCheckpoint(projectId: string, checkpointId: string): Promise<string> {
  // For now, return empty string as requested
  // This would implement actual diff logic in the future
  return '';
}




