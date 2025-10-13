import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '../db/drizzle.js';
import { apiTokens } from '../../shared/schema.js';

export async function authenticateToken(token: string): Promise<{projectId: string; role: string; tokenId: string} | null> {
  try {
    const db = getDb();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    
    const result = await db
      .select()
      .from(apiTokens)
      .where(
        and(
          eq(apiTokens.tokenHash, tokenHash),
          isNull(apiTokens.revokedAt)
        )
      )
      .limit(1);
    
    if (result.length === 0) {
      return null;
    }
    
    return {
      projectId: result[0].projectId || 'default',
      role: result[0].role || 'user',
      tokenId: result[0].id
    };
  } catch (error) {
    console.error('Token authentication error:', error);
    return null;
  }
}

export function patMiddleware(req: Request, res: Response, next: NextFunction) {
  // In development mode, allow requests without authentication
  if (process.env.NODE_ENV === 'development') {
    (req as any).auth = {
      projectId: 'default',
      role: 'user',
      tokenId: 'dev-token'
    };
    return next();
  }
  
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'PAT token required' });
  }
  
  const token = authHeader.substring(7);
  
  if (!token) {
    return res.status(401).json({ error: 'Invalid PAT token' });
  }
  
  // Authenticate token asynchronously
  authenticateToken(token).then(auth => {
    if (!auth) {
      return res.status(401).json({ error: 'Invalid PAT token' });
    }
    
    // Add auth to request
    (req as any).auth = auth;
    next();
  }).catch(error => {
    console.error('PAT middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  });
}

export async function authenticatePatFromRequest(req: Request): Promise<{ok: boolean; auth?: {projectId: string; role: string; tokenId: string}}> {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const auth = await authenticateToken(token);
    return { ok: !!auth, auth: auth || undefined };
  }
  
  // Check query parameter for SSE
  const patToken = req.query.pat as string;
  if (patToken) {
    const auth = await authenticateToken(patToken);
    return { ok: !!auth, auth: auth || undefined };
  }
  
  return { ok: false };
}
