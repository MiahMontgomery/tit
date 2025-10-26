#!/bin/sh
# Database migration script for Render deployment

echo "🔄 Running database migrations..."

# Ensure DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable is not set"
  exit 1
fi

echo "✅ DATABASE_URL is set"

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Run migrations
echo "🚀 Running database migrations..."
npx prisma migrate deploy

echo "✅ Migrations completed successfully"
