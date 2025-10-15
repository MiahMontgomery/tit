import { personaCreator } from '../services/personaCreator';
import { taskQueue } from '../queue';
import { logger } from '../core/tools/logger';

/**
 * Scheduler service
 *
 * Periodically enqueues tasks for each active persona based on daily quotas.  A tick
 * runs every hour by default and creates a set of tasks for posts, DMs,
 * proposals and deliverables.  Quotas can be tuned via environment variables
 * (PERSONA_POSTS_PER_DAY, PERSONA_DMS_PER_DAY, PERSONA_PROPOSALS_PER_DAY,
 * PERSONA_DELIVERABLES_PER_DAY).  This scheduler intentionally does not
 * attempt to back‑calculate remaining quotas; it simply enqueues one task per
 * category per tick.  Downstream task executors are responsible for rate
 * limiting and respecting the Active Personas cap.
 */
const POSTS_PER_DAY = parseInt(process.env.PERSONA_POSTS_PER_DAY || '2', 10);
const DMS_PER_DAY = parseInt(process.env.PERSONA_DMS_PER_DAY || '200', 10);
const PROPOSALS_PER_DAY = parseInt(process.env.PERSONA_PROPOSALS_PER_DAY || '10', 10);
const DELIVERABLES_PER_DAY = parseInt(process.env.PERSONA_DELIVERABLES_PER_DAY || '1', 10);

// Convert daily quotas into per‑tick counts.  With a 24h day and hourly ticks,
// dividing by 24 yields approximately the number of tasks per persona to
// schedule each hour.  Fractions are rounded up to ensure quotas are met.
const TICKS_PER_DAY = 24;
const postsPerTick = Math.ceil(POSTS_PER_DAY / TICKS_PER_DAY);
const dmsPerTick = Math.ceil(DMS_PER_DAY / TICKS_PER_DAY);
const proposalsPerTick = Math.ceil(PROPOSALS_PER_DAY / TICKS_PER_DAY);
const deliverablesPerTick = Math.ceil(DELIVERABLES_PER_DAY / TICKS_PER_DAY);

export class Scheduler {
  private interval: NodeJS.Timeout | null = null;
  private readonly TICK_INTERVAL_MS: number;

  constructor() {
    // default to hourly ticks unless overridden
    const hours = parseInt(process.env.PERSONA_SCHEDULER_INTERVAL_HOURS || '1', 10);
    this.TICK_INTERVAL_MS = hours * 60 * 60 * 1000;
  }

  /**
   * Start the scheduler.  Runs an immediate tick and then schedules recurring ticks.
   */
  async start(): Promise<void> {
    logger.systemInfo('Starting persona scheduler', {
      tickIntervalMs: this.TICK_INTERVAL_MS,
      postsPerTick,
      dmsPerTick,
      proposalsPerTick,
      deliverablesPerTick
    });
    await this.tick();
    this.interval = setInterval(() => {
      void this.tick();
    }, this.TICK_INTERVAL_MS);
  }

  /**
   * Stop the scheduler and clear any pending timers.
   */
  async stop(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    logger.systemInfo('Persona scheduler stopped');
  }

  /**
   * Execute a single scheduling tick: load all personas and enqueue tasks for each.
   */
  private async tick(): Promise<void> {
    try {
      logger.systemInfo('Scheduler tick started');
      const personas = await personaCreator.listPersonas();
      if (!personas || personas.length === 0) {
        logger.systemInfo('No personas to schedule tasks for');
        return;
      }
      for (const persona of personas) {
        await this.scheduleForPersona(persona.id);
      }
      logger.systemInfo('Scheduler tick completed', { personasScheduled: personas.length });
    } catch (error) {
      logger.systemError('Scheduler tick failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Enqueue tasks for a specific persona.  A personaId is used as the projectId
   * when enqueuing tasks so they are grouped by persona in the task queue.
   */
  private async scheduleForPersona(personaId: string): Promise<void> {
    try {
      // Schedule posts
      for (let i = 0; i < postsPerTick; i++) {
        await taskQueue.enqueue({
          projectId: personaId,
          type: 'persona.post',
          payload: { personaId }
        });
      }
      // Schedule DMs
      for (let i = 0; i < dmsPerTick; i++) {
        await taskQueue.enqueue({
          projectId: personaId,
          type: 'persona.dm',
          payload: { personaId }
        });
      }
      // Schedule proposals
      for (let i = 0; i < proposalsPerTick; i++) {
        await taskQueue.enqueue({
          projectId: personaId,
          type: 'persona.proposal',
          payload: { personaId }
        });
      }
      // Schedule deliverables
      for (let i = 0; i < deliverablesPerTick; i++) {
        await taskQueue.enqueue({
          projectId: personaId,
          type: 'persona.deliverable',
          payload: { personaId }
        });
      }
      logger.projectInfo(personaId, 'Scheduled tasks for persona', {
        posts: postsPerTick,
        dms: dmsPerTick,
        proposals: proposalsPerTick,
        deliverables: deliverablesPerTick
      });
    } catch (error) {
      logger.projectError(personaId, 'Failed to schedule tasks for persona', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const scheduler = new Scheduler();
