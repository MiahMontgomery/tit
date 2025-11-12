import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "../../drizzle/schema.js";

if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL not set - running in mock mode");
  process.stderr.write("⚠️  DATABASE_URL not set - running in mock mode\n");
} else {
  // Validate DATABASE_URL format
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    console.error(`❌ Invalid DATABASE_URL format: ${dbUrl.substring(0, 50)}...`);
    console.error(`❌ DATABASE_URL must start with 'postgresql://' or 'postgres://'`);
    process.stderr.write(`❌ Invalid DATABASE_URL format: ${dbUrl.substring(0, 50)}...\n`);
    process.stderr.write(`❌ DATABASE_URL must start with 'postgresql://' or 'postgres://'\n`);
    // Don't throw - allow mock mode to continue
  } else {
    console.log(`✅ DATABASE_URL format is valid`);
    process.stdout.write(`✅ DATABASE_URL format is valid\n`);
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
