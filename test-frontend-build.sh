#!/bin/bash

# Test Frontend Build Script
# This verifies that the frontend builds correctly for static site deployment

set -e

echo "🧪 Testing Frontend Build for Static Site Deployment"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run this script from the project root."
  exit 1
fi

echo "📦 Step 1: Installing dependencies..."
npm install

echo ""
echo "🔨 Step 2: Building frontend with STATIC_SITE_BUILD=true..."
STATIC_SITE_BUILD=true npm run build:static

echo ""
echo "📁 Step 3: Checking build output..."
if [ ! -d "dist" ]; then
  echo "❌ Error: dist/ directory not found!"
  exit 1
fi

echo "✅ dist/ directory exists"

# Check for index.html
if [ ! -f "dist/index.html" ]; then
  echo "❌ Error: dist/index.html not found!"
  exit 1
fi

echo "✅ dist/index.html exists"

# Check for assets directory
if [ ! -d "dist/assets" ]; then
  echo "⚠️  Warning: dist/assets/ directory not found (might be empty build)"
else
  echo "✅ dist/assets/ directory exists"
  ASSET_COUNT=$(find dist/assets -type f | wc -l)
  echo "   Found $ASSET_COUNT asset files"
fi

echo ""
echo "📊 Build Summary:"
echo "=================="
echo "Build directory: dist/"
echo "Index file: $(ls -lh dist/index.html | awk '{print $5}')"
if [ -d "dist/assets" ]; then
  echo "Assets: $ASSET_COUNT files"
  echo "Largest asset: $(find dist/assets -type f -exec ls -lh {} \; | sort -k5 -hr | head -1 | awk '{print $9 " (" $5 ")"}')"
fi

echo ""
echo "✅ Frontend build test PASSED!"
echo ""
echo "📝 Next Steps:"
echo "1. Verify Render static site build command:"
echo "   npm install && STATIC_SITE_BUILD=true npm run build:static"
echo ""
echo "2. Verify Render publish directory: dist"
echo ""
echo "3. Check that dist/index.html contains the new version indicator:"
echo "   grep -q 'DEPLOYMENT CHECK v3.0' dist/index.html && echo '✅ New code found!' || echo '❌ Old code still present'"
echo ""

# Quick check for version indicator
if grep -q "DEPLOYMENT CHECK v3.0" dist/index.html 2>/dev/null; then
  echo "✅ Version indicator (v3.0) found in build!"
else
  echo "⚠️  Warning: Version indicator not found in build (might be minified)"
fi

echo ""
echo "🎉 Build verification complete!"

