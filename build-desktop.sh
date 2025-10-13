#!/bin/bash

# Titan Desktop App Build Script
echo "🚀 Building Titan Desktop Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the web application
echo "🔨 Building web application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Web build failed. Please fix the errors and try again."
    exit 1
fi

# Build the desktop application
echo "🖥️ Building desktop application..."
npm run electron:build

# Check if desktop build was successful
if [ $? -ne 0 ]; then
    echo "❌ Desktop build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Desktop application built successfully!"
echo "📁 Output directory: dist-electron/"
echo ""
echo "Available packages:"
ls -la dist-electron/

echo ""
echo "🎉 Build complete! You can now distribute the desktop application."
