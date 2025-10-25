#!/usr/bin/env node

/**
 * Database setup script for Titan deployment
 * Run this after setting DATABASE_URL environment variable
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 Setting up Titan database...');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.log('Set it like: DATABASE_URL=postgresql://user:password@host:5432/titan');
  process.exit(1);
}

try {
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('🗄️  Running database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  console.log('✅ Database setup complete!');
  console.log('📊 You can now start the server with: npm start');
  
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  process.exit(1);
}
