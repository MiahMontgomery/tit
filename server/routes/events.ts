import express from 'express';
import { subscribe } from '../events/bus.js';
import { authenticatePatFromRequest } from '../auth/pat.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const auth = await authenticatePatFromRequest(req);
    if (!auth.ok) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const projectId = req.query.projectId as string;
    const lastId = req.headers['last-event-id'] as string | undefined;

    const unsubscribe = subscribe({ projectId, lastId }, (event) => {
      res.write(`id: ${event.id}\n`);
      res.write(`event: message\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    const heartbeat = setInterval(() => {
      res.write(':keepalive\n\n');
    }, 15000);

    const cleanup = () => {
      clearInterval(heartbeat);
      unsubscribe();
    };

    req.on('close', cleanup);
    req.on('error', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);

  } catch (error) {
    console.error('Events route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
