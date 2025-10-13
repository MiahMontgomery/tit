import { emit } from './bus.js';

let eventCounter = 0;

function getNextId(): string {
  return (++eventCounter).toString();
}

export function emitStatus(projectId: string, summary: string, extra?: any) {
  const event = {
    id: getNextId(),
    ts: new Date().toISOString(),
    kind: 'status' as const,
    projectId,
    summary,
    data: extra
  };
  emit(event);
}

export function emitProofCreated(projectId: string, runId: string, proofId: string) {
  const event = {
    id: getNextId(),
    ts: new Date().toISOString(),
    kind: 'proof.created' as const,
    projectId,
    runId,
    summary: `Proof created: ${proofId}`,
    data: { proofId }
  };
  emit(event);
}

export function emitArtifactCreated(projectId: string, runId: string, artifactId: string) {
  const event = {
    id: getNextId(),
    ts: new Date().toISOString(),
    kind: 'artifact.created' as const,
    projectId,
    runId,
    summary: `Artifact created: ${artifactId}`,
    data: { artifactId }
  };
  emit(event);
}

export function emitDecisionAuto(projectId: string, runId: string, decision: string, context?: any) {
  const event = {
    id: getNextId(),
    ts: new Date().toISOString(),
    kind: 'decision.auto' as const,
    projectId,
    runId,
    summary: `Auto decision: ${decision}`,
    data: { decision, context }
  };
  emit(event);
}

export function emitQuestion(projectId: string, runId: string, question: string, context?: any) {
  const event = {
    id: getNextId(),
    ts: new Date().toISOString(),
    kind: 'question' as const,
    projectId,
    runId,
    summary: `Question: ${question}`,
    data: { question, context }
  };
  emit(event);
}

export function emitHierarchyUpdated(projectId: string) {
  emitStatus(projectId, 'hierarchy.updated');
}

export function emitMilestoneUpdated(projectId: string, milestoneId: string, state: string) {
  emitStatus(projectId, 'milestone.updated', { milestoneId, state });
}

export function emitGoalUpdated(projectId: string, goalId: string, state: string) {
  emitStatus(projectId, 'goal.updated', { goalId, state });
}
