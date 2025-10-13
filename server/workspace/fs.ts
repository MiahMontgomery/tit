import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';

export async function ensureFileDir(currentFile: string) {
  await mkdir(dirname(currentFile), { recursive: true });
}
