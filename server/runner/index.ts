import { taskQueue } from "../queue";
import { executeTask } from "./executor";
import { logger } from "../core/tools/logger";

const ACTIVE_PERSONAS: number = parseInt(process.env.ACTIVE_PERSONAS || "2", 10);

class Runner {
  private running: boolean;
  private interval: NodeJS.Timeout | null;

  constructor() {
    this.running = false;
    this.interval = null;
  }

  async start() {
    if (this.running) return;
    this.running = true;
    await this.tick();
    this.interval = setInterval(() => {
      this.tick();
    }, 10000);
  }

  async stop() {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private async tick() {
    while (this.running) {
      const tasks = await taskQueue.reserve(ACTIVE_PERSONAS);
      if (!tasks || tasks.length === 0) {
        break;
      }
      await Promise.all(
        tasks.map(async (task) => {
          try {
            await executeTask(task);
            await taskQueue.ack(task);
          } catch (error) {
            logger.error({ err: error, task }, "Error executing persona task");
            await taskQueue.fail(task);
          }
        })
      );
    }
  }
}

export const runner = new Runner();
export default runner;
