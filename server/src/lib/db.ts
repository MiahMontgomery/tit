import { PrismaClient } from '@prisma/client';

// Validate DATABASE_URL at module load time
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    const errorMsg = `❌ [PRISMA] Invalid DATABASE_URL format: ${dbUrl.substring(0, 50)}...`;
    const helpMsg = `❌ [PRISMA] DATABASE_URL must start with 'postgresql://' or 'postgres://'`;
    console.error(errorMsg);
    console.error(helpMsg);
    process.stderr.write(errorMsg + '\n');
    process.stderr.write(helpMsg + '\n');
    
    // Fail fast in production
    if (process.env.NODE_ENV === 'production') {
      process.stderr.write('❌ [PRISMA] Failing fast in production due to invalid DATABASE_URL\n');
      process.exit(1);
    }
  } else {
    const successMsg = `✅ [PRISMA] DATABASE_URL format is valid`;
    console.log(successMsg);
    process.stdout.write(successMsg + '\n');
  }
} else {
  const warnMsg = `⚠️  [PRISMA] DATABASE_URL not set - Prisma will fail to connect`;
  console.warn(warnMsg);
  process.stderr.write(warnMsg + '\n');
  
  // Fail fast in production if DATABASE_URL is missing
  if (process.env.NODE_ENV === 'production') {
    process.stderr.write('❌ [PRISMA] DATABASE_URL is required in production\n');
    process.exit(1);
  }
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function getDb(): Promise<PrismaClient> {
  return prisma;
}

export async function closeDb(): Promise<void> {
  await prisma.$disconnect();
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
