import { Run } from '../../shared/schema.js';

export function checkBudget(run: Run, costTokens: number, costUsd: number): { ok: boolean; error?: string } {
  // Check if budget would be exceeded
  if (run.spentTokens + costTokens > run.budgetTokens) {
    return { ok: false, error: 'Token budget exceeded' };
  }
  
  if (run.spentUsd + costUsd > run.budgetUsd) {
    return { ok: false, error: 'USD budget exceeded' };
  }
  
  return { ok: true };
}




