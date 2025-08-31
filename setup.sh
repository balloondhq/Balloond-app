#!/bin/bash

# Balloon'd Setup Script
# This script sets up the development environment for Balloon'd

echo "🎈 Welcome to Balloon'd Setup!"
echo "==============================="

# Check Node.js version
required_node_version="20"
node_version=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)

if [ "$node_version" -lt "$required_node_version" ]; then
    echo "❌ Node.js version $required_node_version or higher is required"
    echo "   Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version check passed"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed"
    echo "   Please install PostgreSQL with PostGIS extension"
    echo "   Or use Docker: docker-compose up -d postgres"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install

echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install
cd ..

# Copy environment file
echo ""
echo "🔧 Setting up environment variables..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env file"
    echo "⚠️  Please update backend/.env with your configuration"
else
    echo "✅ backend/.env already exists"
fi

# Database setup
echo ""
echo "🗄️  Database Setup"
echo "=================="
echo "1. Make sure PostgreSQL is running"
echo "2. Create a database named 'balloond'"
echo "3. Enable PostGIS extension"
echo ""
echo "Run these commands:"
echo "  createdb balloond"
echo "  psql -d balloond -c 'CREATE EXTENSION IF NOT EXISTS postgis;'"
echo ""
read -p "Press Enter when database is ready..."

# Run migrations
echo ""
echo "🔄 Running database migrations..."
cd backend
npx prisma generate
npx prisma migrate dev --name init
cd ..

# Success message
echo ""
echo "✨ Setup Complete!"
echo "=================="
echo ""
echo "To start development servers:"
echo "  npm run dev"
echo ""
echo "Or run separately:"
echo "  Backend: npm run dev:backend"
echo "  Frontend: npm run dev:frontend"
echo ""
echo "Access the app at:"
echo "  Backend API: http://localhost:3000"
echo "  API Docs: http://localhost:3000/api/docs"
echo "  Frontend: http://localhost:8081"
echo ""
echo "Happy coding! 🚀"
