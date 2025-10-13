import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "../../drizzle/schema.js";

if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL not set - running in mock mode");
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
