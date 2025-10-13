import { getDb } from '../db/drizzle.js';
import { runs } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { writeProof } from '../proofs/writer.js';
import { emitDecisionAuto } from '../events/publish.js';

const timers = new Map<string, NodeJS.Timeout>();

export function scheduleAutoDecision(runId: string, projectId: string, delayMs: number, reason: string): void {
  // Cancel existing timer if present
  cancelAutoDecision(runId);
  
  const timer = setTimeout(async () => {
    try {
      const db = getDb();
      
      // Update run state to PLAN
      await db.update(runs)
        .set({ 
          state: 'PLAN',
          updatedAt: new Date()
        })
        .where(eq(runs.id, runId));
      
      // Write proof log
      await writeProof({
        projectId,
        runId,
        type: 'log',
        content: JSON.stringify({ action: 'PLAN', reason }),
        summary: 'auto-decision'
      });
      
      // Emit decision event
      emitDecisionAuto(projectId, runId, reason);
      
      // Clean up timer
      timers.delete(runId);
    } catch (error) {
      console.error('Auto-decision execution error:', error);
    }
  }, delayMs);
  
  timers.set(runId, timer);
}

export function cancelAutoDecision(runId: string): void {
  const timer = timers.get(runId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(runId);
  }
}




