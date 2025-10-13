import express from 'express';
import { join, basename } from 'path';
import { readFile, statSync } from 'fs';
import { signProofUrl, verifyProofUrl } from '../proofs/sign.js';
import { getDb } from '../db/drizzle.js';
import { proofs } from '../../shared/schema.js';
import { patMiddleware } from '../auth/pat.js';
import { eq, and } from 'drizzle-orm';

const router = express.Router();

// Apply PAT middleware to all routes
router.use(patMiddleware);

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    const proof = await db
      .select()
      .from(proofs)
      .where(eq(proofs.id, id))
      .limit(1);
    
    if (proof.length === 0) {
      return res.status(404).json({ error: 'Proof not found' });
    }
    
    res.json(proof[0]);
  } catch (error) {
    console.error('Get proof error:', error);
    res.status(500).json({ error: 'Failed to get proof' });
  }
});

router.get('/projects/:projectId/runs/:runId', async (req, res) => {
  try {
    const { projectId, runId } = req.params;
    const db = getDb();
    
    const proofList = await db
      .select()
      .from(proofs)
      .where(
        and(
          eq(proofs.projectId, projectId),
          eq(proofs.runId, runId)
        )
      );
    
    res.json(proofList);
  } catch (error) {
    console.error('Get proofs for run error:', error);
    res.status(500).json({ error: 'Failed to get proofs' });
  }
});

router.get('/:id/content', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    const proof = await db
      .select()
      .from(proofs)
      .where(eq(proofs.id, id))
      .limit(1);
    
    if (proof.length === 0) {
      return res.status(404).json({ error: 'Proof not found' });
    }
    
    const proofData = proof[0];
    
    // Handle link type - return the URL
    if (proofData.type === 'link' && proofData.ref) {
      return res.json({ content: proofData.ref, type: 'link' });
    }
    
    // For file-based proofs, read the content
    if (proofData.filePath) {
      try {
        const content = await readFile(proofData.filePath, 'utf-8');
        res.json({ content, type: proofData.type });
      } catch (error) {
        res.status(404).json({ error: 'Proof file not found' });
      }
    } else {
      res.status(404).json({ error: 'No content available' });
    }
  } catch (error) {
    console.error('Get proof content error:', error);
    res.status(500).json({ error: 'Failed to get proof content' });
  }
});

router.get('/:id/url', async (req, res) => {
  try {
    const { id } = req.params;
    const ttl = parseInt(req.query.ttl as string) || 3600;
    
    const db = getDb();
    const proof = await db
      .select()
      .from(proofs)
      .where(eq(proofs.id, id))
      .limit(1);
    
    if (proof.length === 0) {
      return res.status(404).json({ error: 'Proof not found' });
    }
    
    const now = Math.floor(Date.now() / 1000);
    const token = signProofUrl({ id, exp: now + ttl });
    res.json({ url: `/api/proofs/${id}/download?token=${token}` });
  } catch (error) {
    console.error('Sign proof URL error:', error);
    res.status(500).json({ error: 'Failed to sign URL' });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query as { token?: string };
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token required' });
    }
    
    const verification = verifyProofUrl(token);
    if (!verification) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    if (verification.id !== id) {
      return res.status(403).json({ error: 'Token ID mismatch' });
    }
    
    if (verification.exp < Math.floor(Date.now() / 1000)) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    const db = getDb();
    const proof = await db
      .select()
      .from(proofs)
      .where(eq(proofs.id, id))
      .limit(1);
    
    if (proof.length === 0) {
      return res.status(404).json({ error: 'Proof not found' });
    }
    
    const proofData = proof[0];
    
    // Handle link type - redirect to ref
    if (proofData.type === 'link' && proofData.ref) {
      return res.redirect(302, proofData.ref);
    }
    
    const base = join(process.cwd(), 'data', 'proofs');
    const filePath = join(base, proofData.projectId, proofData.runId, basename(proofData.ref || ''));
    
    if (!filePath.startsWith(base)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Determine content type by file extension
    const ext = basename(proofData.ref || '').split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'png') contentType = 'image/png';
    else if (ext === 'diff') contentType = 'text/plain';
    else if (ext === 'log') contentType = 'text/plain';
    
    res.setHeader('Content-Type', contentType);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Download proof error:', error);
    res.status(500).json({ error: 'Failed to download proof' });
  }
});

export default router;
