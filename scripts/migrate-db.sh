#!/bin/sh
# Database migration script for Render deployment

set -e  # Exit on any error

echo "=========================================="
echo "🔄 Starting database migration process..."
echo "=========================================="

# Debug: Print environment
echo "Debug: NODE_ENV=$NODE_ENV"
echo "Debug: DATABASE_URL length=${#DATABASE_URL}"

# Ensure DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "✅ DATABASE_URL is set"

# Check if migrations directory exists
if [ ! -d "prisma/migrations" ]; then
  echo "❌ ERROR: prisma/migrations directory not found"
  exit 1
fi

echo "✅ Migrations directory exists"

# List migrations
echo "📋 Available migrations:"
ls -la prisma/migrations/

# Generate Prisma client
echo "=========================================="
echo "📦 Generating Prisma client..."
echo "=========================================="
npx prisma generate || {
  echo "❌ ERROR: Failed to generate Prisma client"
  exit 1
}

# Run migrations
echo "=========================================="
echo "🚀 Running database migrations..."
echo "=========================================="
npx prisma migrate deploy || {
  echo "❌ ERROR: Migration failed"
  exit 1
}

echo "=========================================="
echo "✅ Migrations completed successfully!"
echo "=========================================="
