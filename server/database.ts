/**
 * Database connection and migration system for Titan
 * Handles PostgreSQL connection and schema migrations
 */

import pkg from 'pg';
const { Pool, PoolClient } = pkg;
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export class Database {
  private pool: Pool;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.pool = new Pool(config);
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Execute a query with parameters
   */
  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Run database migrations
   */
  async migrate(): Promise<void> {
    console.log('🔄 Running database migrations...');
    
    try {
      // Get __dirname equivalent for ES modules
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      
      // Read migration file
      const migrationPath = join(__dirname, 'migrations', '001_create_tables.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      // Execute migration
      await this.query(migrationSQL);
      
      console.log('✅ Database migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Default configuration
const defaultConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'titan',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
};

export const database = new Database(defaultConfig);
