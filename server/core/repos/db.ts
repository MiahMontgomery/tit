import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "../../drizzle/schema.js";

if (!process.env.DATABASE_URL) {
  const warnMsg = "⚠️  [DRIZZLE] DATABASE_URL not set - running in mock mode";
  console.warn(warnMsg);
  process.stderr.write(warnMsg + '\n');
  
  // Fail fast in production if DATABASE_URL is missing
  if (process.env.NODE_ENV === 'production') {
    const errorMsg = '❌ [DRIZZLE] DATABASE_URL is required in production';
    console.error(errorMsg);
    process.stderr.write(errorMsg + '\n');
    process.exit(1);
  }
} else {
  // Validate DATABASE_URL format and parse it
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    const errorMsg = `❌ [DRIZZLE] Invalid DATABASE_URL format: ${dbUrl.substring(0, 50)}...`;
    const helpMsg = `❌ [DRIZZLE] DATABASE_URL must start with 'postgresql://' or 'postgres://'`;
    console.error(errorMsg);
    console.error(helpMsg);
    process.stderr.write(errorMsg + '\n');
    process.stderr.write(helpMsg + '\n');
    
    // Fail fast in production
    if (process.env.NODE_ENV === 'production') {
      const failMsg = '❌ [DRIZZLE] Failing fast in production due to invalid DATABASE_URL';
      console.error(failMsg);
      process.stderr.write(failMsg + '\n');
      process.exit(1);
    }
  } else {
    // Parse and validate the URL structure
    try {
      const url = new URL(dbUrl);
      const database = url.pathname.slice(1); // Remove leading slash
      
      // Check for malformed database names (like containing connection strings)
      if (database.includes('://') || database.includes('@') || database.includes('postgresql')) {
        const errorMsg = `❌ [DRIZZLE] Invalid database name in DATABASE_URL: "${database}"`;
        const helpMsg = `❌ [DRIZZLE] Database name appears to contain connection string fragments. Check your DATABASE_URL environment variable.`;
        console.error(errorMsg);
        console.error(helpMsg);
        process.stderr.write(errorMsg + '\n');
        process.stderr.write(helpMsg + '\n');
        process.stderr.write(`❌ [DRIZZLE] Full URL (first 100 chars): ${dbUrl.substring(0, 100)}\n`);
        
        if (process.env.NODE_ENV === 'production') {
          process.stderr.write('❌ [DRIZZLE] Failing fast in production due to malformed database name\n');
          process.exit(1);
        }
      } else {
        const successMsg = `✅ [DRIZZLE] DATABASE_URL format is valid (database: ${database || '(not specified)'})`;
        console.log(successMsg);
        process.stdout.write(successMsg + '\n');
      }
    } catch (parseError) {
      const errorMsg = `❌ [DRIZZLE] Failed to parse DATABASE_URL: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`;
      console.error(errorMsg);
      process.stderr.write(errorMsg + '\n');
      process.stderr.write(`❌ [DRIZZLE] URL (first 100 chars): ${dbUrl.substring(0, 100)}\n`);
      
      if (process.env.NODE_ENV === 'production') {
        process.stderr.write('❌ [DRIZZLE] Failing fast in production due to unparseable DATABASE_URL\n');
        process.exit(1);
      }
    }
  }
}

const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
}) : null;

export const db = pool ? drizzle(pool, { schema }) : null;

export async function testConnection() {
  if (!pool) {
    console.warn("⚠️  Database not configured - skipping connection test");
    return true;
  }
  
  try {
    await pool.query("SELECT 1");
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    // In production, we should fail fast
    if (process.env.NODE_ENV === "production") {
      throw new Error("Database connection required in production");
    }
    return false;
  }
}
