#!/bin/bash
# Script to fix build errors on the server
# Run this on your server after pulling latest changes from GitHub

set -e  # Exit on error

echo "🔧 Fixing server build..."

# Navigate to web directory
cd /var/www/html/breakoutStudyTool/src/web || cd src/web

echo "📦 Pulling latest changes from GitHub..."
git pull origin main

echo "🗑️  Clearing Next.js build cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "📥 Installing dependencies (if needed)..."
npm install

echo "🏗️  Building the application..."
npm run build

echo "✅ Build completed successfully!"
echo "🚀 You can now restart your application server if needed."

