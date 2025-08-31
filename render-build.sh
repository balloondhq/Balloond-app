#!/bin/bash

# Render.com Build Script for Balloon'd

echo "Starting Balloon'd build for Render..."

# Navigate to backend directory
cd backend

# Install dependencies
echo "Installing backend dependencies..."
npm install

# Install NestJS CLI globally for the build
npm install -g @nestjs/cli

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Build the backend
echo "Building backend..."
npm run build

echo "Build complete!"
