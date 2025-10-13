/**
 * Health monitoring API routes for Titan
 * Provides system health status and monitoring
 */

import { Router } from 'express';
import { healthService } from '../services/health';

const router = Router();

/**
 * Get system health status
 * GET /health
 */
router.get('/', async (req, res) => {
  try {
    const health = await healthService.getHealth();
    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'down',
      loop: false,
      queueDepth: 0,
      lastTick: new Date(),
      causes: ['health_check_failed']
    });
  }
});

export default router;
