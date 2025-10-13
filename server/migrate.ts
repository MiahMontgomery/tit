/**
 * Database migration script for Titan
 * Runs database migrations and sets up the schema
 */

import { database } from './database';

async function migrate() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Check database connection
    const connected = await database.isConnected();
    if (!connected) {
      console.error('❌ Database not connected');
      process.exit(1);
    }

    // Run migrations
    await database.migrate();
    
    console.log('✅ Migrations completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
