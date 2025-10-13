import { getDb } from '../db/drizzle.js';
import { runs, attempts, tasks } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { writeProof } from '../proofs/writer.js';
import { emitStatus, emitQuestion } from '../events/publish.js';
import { top3 } from '../tasks/priority.js';
import { scheduleAutoDecision, cancelAutoDecision } from '../workers/watchdog.js';
import { runCodegen } from '../workers/codegen.js';
import { applyUnifiedDiff } from '../workspace/patch.js';
import { runBuild } from '../workers/build.js';
import { emitArtifactCreated } from '../events/publish.js';
import { startPreview, getPreviewUrl } from '../preview/runtime.js';
import { runEvaluator } from '../workers/evaluator.js';
import { checkBudget } from './budget.js';
import { runReflection } from '../workers/reflection.js';
import { nanoid } from 'nanoid';

export type RunState = 'INTAKE' | 'PLAN' | 'SELECT_TASK' | 'CODEGEN' | 'TEST' | 'BUILD' | 'DEPLOY_PREVIEW' | 'EVAL' | 'REVIEW' | 'TEARDOWN' | 'DONE' | 'FAILED';

export function nextState(current: RunState): RunState {
  switch (current) {
    case 'INTAKE': return 'PLAN';
    case 'PLAN': return 'SELECT_TASK';
    case 'SELECT_TASK': return 'CODEGEN';
    case 'CODEGEN': return 'TEST';
    case 'TEST': return 'BUILD';
    case 'BUILD': return 'DEPLOY_PREVIEW';
    case 'DEPLOY_PREVIEW': return 'EVAL';
    case 'EVAL': return 'REVIEW';
    case 'REVIEW': return 'REVIEW'; // Manual transition required
    case 'TEARDOWN': return 'DONE';
    case 'DONE': return 'DONE';
    case 'FAILED': return 'FAILED';
    default: return 'FAILED';
  }
}

export async function ensureRun(projectId: string): Promise<{ runId: string }> {
  const db = getDb();
  
  // Check for existing active run
  const [existingRun] = await db
    .select()
    .from(runs)
    .where(and(
      eq(runs.projectId, projectId),
      eq(runs.state, 'REVIEW')
    ))
    .limit(1);
  
  if (existingRun) {
    return { runId: existingRun.id };
  }
  
  // Create new run
  const runId = nanoid();
  await db.insert(runs).values({
    id: runId,
    projectId,
    state: 'INTAKE'
  });
  
  return { runId };
}

export async function tick(runId: string): Promise<{ runId: string; state: string }> {
  const db = getDb();
  
  const [run] = await db
    .select()
    .from(runs)
    .where(eq(runs.id, runId))
    .limit(1);
  
  if (!run) {
    throw new Error('Run not found');
  }
  
  // Check if already in terminal state or REVIEW (manual gate)
  if (run.state === 'DONE' || run.state === 'FAILED' || run.state === 'REVIEW') {
    return { runId, state: run.state };
  }
  
  let nextStateValue = nextState(run.state);
  let updateData: any = { updatedAt: new Date() };
  
  // Handle PLAN state
  if (run.state === 'PLAN') {
    // Ensure hierarchy exists
    const { ensureHierarchy } = await import('../workers/planner.js');
    await ensureHierarchy({ projectId: run.projectId });
    
    // Write log proof
    await writeProof({
      projectId: run.projectId,
      runId,
      type: 'log',
      summary: 'Hierarchy ensured',
    });
    
    nextStateValue = 'SELECT_TASK';
  } else if (run.state === 'SELECT_TASK') {
    // Load all tasks for the project
    const allTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, run.projectId));
    
    // Compute Top-3 using existing helper
    const top3Tasks = top3(allTasks);
    
    if (top3Tasks.length === 0) {
      // No runnable tasks
      await writeProof({
        projectId: run.projectId,
        runId,
        type: 'log',
        content: JSON.stringify({
          state: 'SELECT_TASK',
          chosenTaskId: null,
          message: 'no runnable tasks'
        }),
        summary: 'No runnable tasks found'
      });
      
      emitQuestion(run.projectId, runId, 'no runnable tasks', { state: 'SELECT_TASK' });
      
      nextStateValue = 'REVIEW';
    } else {
      // Select the top task
      const chosenTask = top3Tasks[0];
      updateData.currentTaskId = chosenTask.id;
      
      await writeProof({
        projectId: run.projectId,
        runId,
        type: 'log',
        content: JSON.stringify({
          state: 'SELECT_TASK',
          chosenTaskId: chosenTask.id,
          taskTitle: chosenTask.title,
          taskScore: chosenTask.score
        }),
        summary: `Selected task: ${chosenTask.title}`
      });
      
      emitStatus(run.projectId, 'SELECT_TASK chosen', { taskId: chosenTask.id });
      
      nextStateValue = 'CODEGEN';
    }
  } else {
    // Handle CODEGEN/TEST/BUILD/DEPLOY_PREVIEW/EVAL with try/catch
    if (['CODEGEN', 'TEST', 'BUILD', 'DEPLOY_PREVIEW', 'EVAL'].includes(run.state)) {
      try {
        if (run.state === 'CODEGEN') {
          // Check budget first
          const costTokens = 500;
          const costUsd = 0.05;
          
          const budgetCheck = checkBudget(run, costTokens, costUsd);
          if (!budgetCheck.ok) {
            await writeProof({
              projectId: run.projectId,
              runId,
              type: 'log',
              content: JSON.stringify({
                state: 'CODEGEN',
                message: 'Budget exceeded',
                error: budgetCheck.error,
                costTokens,
                costUsd,
                spentTokens: run.spentTokens,
                spentUsd: run.spentUsd,
                budgetTokens: run.budgetTokens,
                budgetUsd: run.budgetUsd,
                timestamp: new Date().toISOString()
              }),
              summary: 'Budget exceeded'
            });
            
            emitQuestion(run.projectId, runId, 'Budget exceeded');
            nextStateValue = 'REVIEW';
          } else {
            // Update spent amounts
            await db.update(runs)
              .set({
                spentTokens: run.spentTokens + costTokens,
                spentUsd: run.spentUsd + costUsd,
                updatedAt: new Date()
              })
              .where(eq(runs.id, runId));
            
            // Run codegen
            const repoRoot = `/data/workspaces/${run.projectId}/${runId}`;
            const { patch } = await runCodegen({
              projectId: run.projectId,
              runId,
              taskId: run.currentTaskId || '',
              repoRoot
            });
            
            // Apply patch
            const { changed } = await applyUnifiedDiff(repoRoot, patch);
            
            // Write diff proof
            await writeProof({
              projectId: run.projectId,
              runId,
              type: 'diff',
              content: patch,
              summary: `Codegen patch applied, ${changed} files changed`
            });
            
            nextStateValue = 'TEST';
          }
        } else if (run.state === 'BUILD') {
          // Run build
          const repoRoot = `/data/workspaces/${run.projectId}/${runId}`;
          const { artifacts, logs } = await runBuild({
            projectId: run.projectId,
            runId,
            repoRoot
          });
          
          // Write build log proof
          await writeProof({
            projectId: run.projectId,
            runId,
            type: 'log',
            content: logs,
            summary: 'Build completed'
          });
          
          // Emit artifact created events
          for (const artifactPath of artifacts) {
            const artifactId = artifactPath.split('/').pop() || 'unknown';
            emitArtifactCreated(run.projectId, runId, artifactId);
          }
          
          nextStateValue = 'DEPLOY_PREVIEW';
        } else if (run.state === 'DEPLOY_PREVIEW') {
          // Start preview
          const repoRoot = `/data/workspaces/${run.projectId}/${runId}`;
          const { url } = await startPreview({
            projectId: run.projectId,
            runId,
            repoRoot
          });
          
          // Write link proof
          await writeProof({
            projectId: run.projectId,
            runId,
            type: 'link',
            content: url,
            summary: 'Preview URL'
          });
          
          nextStateValue = 'EVAL';
        } else if (run.state === 'EVAL') {
          // Run evaluator
          const previewUrl = getPreviewUrl(runId);
          if (!previewUrl) {
            throw new Error('No preview URL found for evaluation');
          }
          
          const { screenshotPath } = await runEvaluator({
            projectId: run.projectId,
            runId,
            url: previewUrl
          });
          
          // Write screenshot proof
          await writeProof({
            projectId: run.projectId,
            runId,
            type: 'screenshot',
            content: screenshotPath,
            summary: 'Evaluator screenshot'
          });
          
          nextStateValue = 'REVIEW';
        } else if (run.state === 'TEARDOWN') {
          // Teardown state
          await writeProof({
            projectId: run.projectId,
            runId,
            type: 'log',
            content: JSON.stringify({
              state: 'TEARDOWN',
              message: 'Teardown complete',
              timestamp: new Date().toISOString()
            }),
            summary: 'Teardown complete'
          });
          
          nextStateValue = 'DONE';
        } else {
          // Execute other state logic (stub for now)
          nextStateValue = nextState(run.state);
        }
        
        // Handle DONE state reflection
        if (nextStateValue === 'DONE') {
          const { summary } = await runReflection({ projectId: run.projectId, runId });
          
          await writeProof({
            projectId: run.projectId,
            runId,
            type: 'log',
            content: summary,
            summary: 'Reflection summary'
          });
          
          emitStatus(run.projectId, 'Run reflection complete', { runId });
        }
        
        // Cancel any pending auto-decision on success
        cancelAutoDecision(runId);
      } catch (e) {
        // Handle exception
        await writeProof({
          projectId: run.projectId,
          runId,
          type: 'log',
          content: JSON.stringify({ error: String(e) }),
          summary: `blocked at ${run.state}`
        });
        
        emitQuestion(run.projectId, runId, `blocked at ${run.state}`);
        scheduleAutoDecision(runId, run.projectId, 2 * 60 * 60 * 1000, `retry from ${run.state} after timeout`);
        
        nextStateValue = 'REVIEW';
      }
    } else {
      // Default behavior for other states
      nextStateValue = nextState(run.state);
    }
  }
  
  // Record attempt
  await db.insert(attempts).values({
    id: nanoid(),
    runId,
    state: nextStateValue,
    status: 'ok',
    message: `${nextStateValue} executed`
  });
  
  // Emit status event
  emitStatus(run.projectId, `run ${runId} -> ${nextStateValue}`);
  
  // Write log proof for non-SELECT_TASK states
  if (run.state !== 'SELECT_TASK') {
    await writeProof({
      projectId: run.projectId,
      runId,
      type: 'log',
      content: JSON.stringify({
        state: nextStateValue,
        message: `${nextStateValue} executed`,
        ts: new Date().toISOString()
      }),
      summary: `Run ${runId} -> ${nextStateValue}`
    });
  }
  
  // Update run state
  await db.update(runs)
    .set({ 
      state: nextStateValue,
      ...updateData
    })
    .where(eq(runs.id, runId));
  
  return { runId, state: nextStateValue };
}
