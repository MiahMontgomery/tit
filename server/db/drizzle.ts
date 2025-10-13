import { drizzle } from 'drizzle-orm/node-postgres';
import { getPool } from './pool.js';
import * as schema from '../../shared/schema.js';

const pool = getPool();
export const db = drizzle(pool, { schema });

export function getDb() {
  return db;
}
