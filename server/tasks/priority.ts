import type { Task } from '../../shared/schema.js';

export function isRunnable(task: Task, doneSet: Set<string>): boolean {
  const deps = Array.isArray(task.dependsOn) ? task.dependsOn : [];
  return deps.every(d => doneSet.has(d));
}

export function score(task: Task): number {
  const base = (task.priority ?? 0) * 3;
  const criticalPathWeight = 1; // stub
  return base + criticalPathWeight;
}

export function top3(all: Task[]): { id: string; title: string; score: number }[] {
  const doneSet = new Set(all.filter(t => t.state === 'DONE').map(t => t.id));
  const candidates = all.filter(t =>
    t.state !== 'DONE' && t.state !== 'BLOCKED' && isRunnable(t, doneSet)
  );
  return candidates
    .map(t => ({ id: t.id, title: t.title, score: score(t), createdAt: t.createdAt as unknown as Date }))
    .sort((a, b) => b.score - a.score || (a.createdAt?.getTime?.() ?? 0) - (b.createdAt?.getTime?.() ?? 0))
    .slice(0, 3)
    .map(({ id, title, score }) => ({ id, title, score }));
}