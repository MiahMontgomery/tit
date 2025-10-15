import { Task } from "../queue";
import { logger } from "../core/tools/logger";
import * as proofLogger from "../services/proofLogger";

// Helper function to simulate asynchronous work with variable duration.
function waitRandom(min: number = 1000, max: number = 5000): Promise<void> {
  const delay = Math.floor(min + Math.random() * (max - min));
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Execute a persona task. Dispatches based on task.type and logs evidence.
 */
export async function executeTask(task: Task): Promise<void> {
  // Log start of task execution
  try {
    await proofLogger.logExecution({
      personaId: task.personaId,
      goalId: task.id,
      summary: `Starting task ${task.type}`,
      data: { task }
    });
  } catch (err) {
    // proceed even if logging fails
    logger.warn({ err, task }, "Failed to log start of task");
  }

  logger.info({ task }, "Executing persona task");

  try {
    switch (task.type) {
      case "persona.post":
        await handlePostTask(task);
        break;
      case "persona.dm":
        await handleDmTask(task);
        break;
      case "persona.proposal":
        await handleProposalTask(task);
        break;
      case "persona.deliverable":
        await handleDeliverableTask(task);
        break;
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
    // Log successful completion
    await proofLogger.logExecution({
      personaId: task.personaId,
      goalId: task.id,
      summary: `Finished task ${task.type}`,
      data: { task }
    });
    logger.info({ task }, "Persona task completed successfully");
  } catch (err) {
    // Log failure and rethrow to let runner handle retries
    await proofLogger.logExecution({
      personaId: task.personaId,
      goalId: task.id,
      summary: `Error executing task ${task.type}`,
      data: { error: err?.message || String(err), task }
    });
    logger.error({ err, task }, "Error executing persona task");
    throw err;
  }
}

// Stub implementations for different task types. These functions can be replaced
// with real logic (Playwright scripts, API calls, etc.)
async function handlePostTask(task: Task): Promise<void> {
  // Simulate creating a social media post or similar deliverable
  await waitRandom();
}

async function handleDmTask(task: Task): Promise<void> {
  // Simulate sending a direct message or outreach
  await waitRandom();
}

async function handleProposalTask(task: Task): Promise<void> {
  // Simulate drafting and submitting a proposal for a job or gig
  await waitRandom();
}

async function handleDeliverableTask(task: Task): Promise<void> {
  // Simulate producing and uploading a final deliverable
  await waitRandom();
}
