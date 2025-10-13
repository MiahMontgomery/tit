import pkg from 'pg';
const { Pool } = pkg;

let pool: any = null;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      console.warn("DATABASE_URL not set, using mock database for development");
      // Return a mock pool for development
      return {
        query: () => Promise.resolve({ rows: [] }),
        connect: () => Promise.resolve({ release: () => {} }),
        end: () => Promise.resolve()
      };
    }
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}
