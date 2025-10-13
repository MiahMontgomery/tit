/**
 * Health monitoring service for Titan
 * Tracks system health, queue depth, and identifies issues
 */

import { database } from '../database';
import { taskQueue } from '../queue';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  loop: boolean;
  queueDepth: number;
  lastTick: Date;
  causes: string[];
}

export class HealthService {
  private lastTick: Date = new Date();
  private tickInterval: NodeJS.Timeout | null = null;
  private readonly TICK_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.startTicker();
  }

  /**
   * Get current health status
   */
  async getHealth(): Promise<HealthStatus> {
    const causes: string[] = [];
    let status: 'ok' | 'degraded' | 'down' = 'ok';

    try {
      // Check database connection
      const dbConnected = await database.isConnected();
      if (!dbConnected) {
        status = 'degraded'; // Don't fail completely, just degrade
        causes.push('database_disconnected');
      }

      // Check queue depth
      let queueDepth = 0;
      try {
        queueDepth = await taskQueue.depth();
        if (queueDepth > 100) {
          status = status === 'down' ? 'down' : 'degraded';
          causes.push('queue_backlog');
        }
      } catch (error) {
        // Queue not available, but don't fail health check
        console.warn('Queue depth check failed:', error);
      }

      // Check if ticker is running
      const now = new Date();
      const timeSinceLastTick = now.getTime() - this.lastTick.getTime();
      
      if (timeSinceLastTick > 60000) { // 1 minute
        status = status === 'down' ? 'down' : 'degraded';
        causes.push('tick_stale');
      }

      // Check worker heartbeat
      const workerHeartbeat = this.getLastWorkerHeartbeat();
      if (workerHeartbeat && Date.now() - workerHeartbeat.getTime() > 30000) {
        status = status === 'down' ? 'down' : 'degraded';
        causes.push('worker_down');
      }

      // Check environment variables (warn only, don't fail)
      const missingEnvVars = this.checkEnvironmentVariables();
      if (missingEnvVars.length > 0) {
        causes.push(`env_missing:${missingEnvVars.join(',')}`);
      }

      return {
        status,
        loop: this.tickInterval !== null,
        queueDepth,
        lastTick: this.lastTick,
        causes
      };

    } catch (error) {
      console.error('Health check error:', error);
      return {
        status: 'down',
        loop: false,
        queueDepth: 0,
        lastTick: this.lastTick,
        causes: ['health_check_failed']
      };
    }
  }

  /**
   * Start the health ticker
   */
  private startTicker(): void {
    this.tickInterval = setInterval(() => {
      this.lastTick = new Date();
    }, this.TICK_INTERVAL);
  }

  /**
   * Stop the health ticker
   */
  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * Get last worker heartbeat
   */
  private getLastWorkerHeartbeat(): Date | null {
    // In a real implementation, this would check worker heartbeat from storage
    // For now, return a recent timestamp to indicate worker is active
    return new Date(Date.now() - 10000); // 10 seconds ago
  }

  /**
   * Check for missing environment variables
   */
  private checkEnvironmentVariables(): string[] {
    const required = ['DB_HOST', 'DB_NAME', 'DB_USER'];
    const missing: string[] = [];

    for (const envVar of required) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }

    return missing;
  }
}

export const healthService = new HealthService();
