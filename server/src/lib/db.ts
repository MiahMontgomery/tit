import { PrismaClient } from '@prisma/client';

let db: PrismaClient | null = null;

export async function getDb(): Promise<PrismaClient> {
  if (!db) {
    db = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
    
    // Test connection
    try {
      await db.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }
  
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.$disconnect();
    db = null;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDb();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDb();
  process.exit(0);
});
