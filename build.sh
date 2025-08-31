#!/bin/bash

# Render.com Build Script for Balloon'd

echo "🎈 Starting Balloon'd build for Render..."
echo "================================"

# Navigate to backend directory
cd backend

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist
rm -rf node_modules/.prisma

# Install dependencies
echo "Installing backend dependencies..."
npm ci || npm install

# Install NestJS CLI globally for the build
echo "Installing NestJS CLI..."
npm install -g @nestjs/cli

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run database migrations (only if DATABASE_URL is set)
if [ ! -z "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  npx prisma migrate deploy || echo "Migration deploy failed, continuing..."
fi

# Build the backend
echo "Building backend..."
npm run build

echo "✅ Build complete!"
echo "Files in dist directory:"
ls -la dist/

echo "Ready to start the application!"
