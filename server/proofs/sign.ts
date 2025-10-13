import { createHmac } from 'crypto';

interface SignOptions {
  id: string;
  exp: number;
}

export function signProofUrl({ id, exp }: SignOptions): string {
  const secret = process.env.PROOF_URL_SECRET || 'default-secret';
  const payload = `${id}:${exp}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return `${id}:${exp}:${signature}`;
}

export function verifyProofUrl(token: string): { id: string; exp: number } | null {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) return null;
    
    const [id, expStr, signature] = parts;
    const exp = parseInt(expStr, 10);
    
    if (isNaN(exp)) return null;
    
    const secret = process.env.PROOF_URL_SECRET || 'default-secret';
    const payload = `${id}:${exp}`;
    const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');
    
    if (signature !== expectedSignature) return null;
    
    return { id, exp };
  } catch {
    return null;
  }
}




