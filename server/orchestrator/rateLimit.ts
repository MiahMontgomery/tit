import { Run } from '../../shared/schema.js';

export function checkRateLimit(run: Run, nowMs: number): { ok: boolean; updated: number[]; error?: string } {
  const windowMs = run.rateLimitWindow * 1000;
  const cutoff = nowMs - windowMs;
  
  // Filter to keep only actions within the window
  const filtered = (run.lastActions || []).filter(timestamp => timestamp >= cutoff);
  
  if (filtered.length >= run.rateLimitMax) {
    return {
      ok: false,
      error: 'Rate limit exceeded',
      updated: filtered
    };
  }
  
  // Add current timestamp
  const updated = [...filtered, nowMs];
  
  return {
    ok: true,
    updated
  };
}




