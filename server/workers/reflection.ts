import { getDb } from '../db/drizzle.js';
import { attempts, proofs, runs } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

export async function runReflection({ projectId, runId }: { projectId: string; runId: string }): Promise<{ summary: string }> {
  const db = getDb();

  // Query run details
  const [run] = await db
    .select()
    .from(runs)
    .where(eq(runs.id, runId))
    .limit(1);

  if (!run) {
    throw new Error('Run not found');
  }

  // Query attempts
  const runAttempts = await db
    .select()
    .from(attempts)
    .where(eq(attempts.runId, runId));

  // Query proofs
  const runProofs = await db
    .select()
    .from(proofs)
    .where(eq(proofs.runId, runId));

  // Count attempts by status
  const successCount = runAttempts.filter(a => a.status === 'ok').length;
  const errorCount = runAttempts.filter(a => a.status === 'error').length;
  const skippedCount = runAttempts.filter(a => a.status === 'skipped').length;
  const totalAttempts = runAttempts.length;

  // Count proofs by type
  const proofCounts = runProofs.reduce((acc, proof) => {
    acc[proof.type] = (acc[proof.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Build summary
  const summary = `Run Reflection Summary:
- Run ID: ${runId}
- Project ID: ${projectId}
- State: ${run.state}
- Duration: ${run.createdAt ? new Date().getTime() - new Date(run.createdAt).getTime() : 0}ms
- Budget: ${run.budgetTokens} tokens, $${(run.budgetUsd / 100).toFixed(2)} USD
- Spent: ${run.spentTokens} tokens, $${(run.spentUsd / 100).toFixed(2)} USD
- Attempts: ${totalAttempts} total (${successCount} success, ${errorCount} error, ${skippedCount} skipped)
- Proofs: ${runProofs.length} total
  ${Object.entries(proofCounts).map(([type, count]) => `  - ${type}: ${count}`).join('\n')}
- Created: ${run.createdAt}
- Updated: ${run.updatedAt}`;

  return { summary };
}




