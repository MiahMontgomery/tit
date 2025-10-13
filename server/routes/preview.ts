import express from 'express';
import { patMiddleware } from '../auth/pat.js';
import { getPreviewUrl } from '../preview/runtime.js';

const router = express.Router();

// Apply PAT middleware to all routes
router.use(patMiddleware);

router.get('/:id/preview', async (req, res) => {
  try {
    const { id: runId } = req.params;
    
    const url = getPreviewUrl(runId);
    
    if (!url) {
      return res.status(404).json({ error: 'No preview running' });
    }
    
    res.json({ url });
  } catch (error) {
    console.error('Get preview error:', error);
    res.status(500).json({ error: 'Failed to get preview' });
  }
});

export default router;




