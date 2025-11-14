import { PrismaClient } from '@prisma/client';

// CRITICAL: Log the DATABASE_URL source BEFORE Prisma loads anything
// This helps debug if Prisma is loading a .env file that overrides environment variables
if (process.env.NODE_ENV === 'production') {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const masked = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`[PRISMA-INIT] DATABASE_URL from process.env (masked): ${masked.substring(0, 80)}...`);
    process.stdout.write(`[PRISMA-INIT] DATABASE_URL from process.env (masked): ${masked.substring(0, 80)}...\n`);
  } else {
    console.warn('[PRISMA-INIT] DATABASE_URL not found in process.env');
    process.stderr.write('[PRISMA-INIT] DATABASE_URL not found in process.env\n');
  }
}

// Validate DATABASE_URL at module load time (BEFORE PrismaClient is instantiated)
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
    // Parse and validate the URL structure
    try {
      // Log the actual DATABASE_URL value (masked for security)
      const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@'); // Mask password
      console.log(`[PRISMA] Validating DATABASE_URL (masked): ${maskedUrl.substring(0, 80)}...`);
      process.stdout.write(`[PRISMA] Validating DATABASE_URL (masked): ${maskedUrl.substring(0, 80)}...\n`);
      
      const url = new URL(dbUrl);
      const database = url.pathname.slice(1); // Remove leading slash
      
      // Log parsed components for debugging
      console.log(`[PRISMA] Parsed URL components:`, {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        pathname: url.pathname,
        database: database
      });
      process.stdout.write(`[PRISMA] Parsed database name: "${database}"\n`);
      process.stdout.write(`[PRISMA] Database name length: ${database.length}\n`);
      
      // If database name is suspiciously long, log the full URL structure for debugging
      if (database.length > 50) {
        process.stderr.write(`[PRISMA] WARNING: Database name is unusually long (${database.length} chars)\n`);
        process.stderr.write(`[PRISMA] This suggests the DATABASE_URL in Render may be malformed\n`);
        process.stderr.write(`[PRISMA] Expected format: postgresql://user:pass@host:port/database_name\n`);
        process.stderr.write(`[PRISMA] The database_name should be a simple name like 'titan_db', not a connection string\n`);
      }
      
      // Check for malformed database names (like containing connection strings)
      if (database.includes('://') || database.includes('@') || database.includes('postgresql')) {
        const errorMsg = `❌ [PRISMA] Invalid database name in DATABASE_URL: "${database}"`;
        const helpMsg = `❌ [PRISMA] Database name appears to contain connection string fragments. Check your DATABASE_URL environment variable.`;
        console.error(errorMsg);
        console.error(helpMsg);
        process.stderr.write(errorMsg + '\n');
        process.stderr.write(helpMsg + '\n');
        process.stderr.write(`❌ [PRISMA] Full URL (first 100 chars): ${dbUrl.substring(0, 100)}\n`);
        process.stderr.write(`❌ [PRISMA] Parsed database name length: ${database.length}\n`);
        process.stderr.write(`❌ [PRISMA] Database name starts with: "${database.substring(0, 50)}"\n`);
        
        if (process.env.NODE_ENV === 'production') {
          process.stderr.write('❌ [PRISMA] Failing fast in production due to malformed database name\n');
          process.exit(1);
        }
      } else {
        const successMsg = `✅ [PRISMA] DATABASE_URL format is valid (database: ${database || '(not specified)'})`;
        console.log(successMsg);
        process.stdout.write(successMsg + '\n');
      }
    } catch (parseError) {
      const errorMsg = `❌ [PRISMA] Failed to parse DATABASE_URL: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`;
      console.error(errorMsg);
      process.stderr.write(errorMsg + '\n');
      process.stderr.write(`❌ [PRISMA] URL (first 100 chars): ${dbUrl.substring(0, 100)}\n`);
      
      if (process.env.NODE_ENV === 'production') {
        process.stderr.write('❌ [PRISMA] Failing fast in production due to unparseable DATABASE_URL\n');
        process.exit(1);
      }
    }
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
