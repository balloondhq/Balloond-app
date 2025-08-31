#!/bin/bash

# Balloon'd Phase 3 Setup Script
echo "🎈 Setting up Balloon'd Phase 3..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${RED}PostgreSQL is not installed. Please install PostgreSQL 14+${NC}"
    exit 1
fi

# Check FFmpeg (required for video processing)
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}FFmpeg is not installed. Installing...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install ffmpeg
    else
        sudo apt-get update && sudo apt-get install -y ffmpeg
    fi
fi

echo -e "${GREEN}Prerequisites check complete!${NC}"

# Install pgvector extension
echo -e "${YELLOW}Installing pgvector extension for PostgreSQL...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install pgvector
else
    sudo apt-get install -y postgresql-14-pgvector
fi

# Create database if not exists
echo -e "${YELLOW}Setting up database...${NC}"
createdb balloond 2>/dev/null || echo "Database already exists"

# Enable pgvector extension
psql -d balloond -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Backend setup
echo -e "${YELLOW}Setting up backend...${NC}"
cd backend

# Install dependencies
npm install

# Install Phase 3 specific dependencies
npm install \
    @tensorflow/tfjs-node \
    @tensorflow-models/universal-sentence-encoder \
    @google-cloud/speech \
    fluent-ffmpeg \
    sharp \
    aws-sdk \
    three

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
npx prisma migrate dev
npx prisma generate

# Run Phase 3 migration
psql -U ${DB_USER:-balloond_user} -d balloond -f ../database/003_phase3_migration.sql

# Create models directory
mkdir -p models/compatibility

# Frontend setup
echo -e "${YELLOW}Setting up frontend...${NC}"
cd ../frontend

# Install dependencies
npm install

# Install Phase 3 specific dependencies
npm install \
    three \
    expo-three \
    expo-gl \
    expo-gl-cpp \
    expo-av \
    expo-camera \
    date-fns

# Create environment files if not exist
if [ ! -f "../backend/.env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp ../backend/.env.example ../backend/.env
    echo -e "${RED}Please update backend/.env with your credentials${NC}"
fi

# Initialize ML models
echo -e "${YELLOW}Initializing ML models...${NC}"
cd ../backend
npm run init:models 2>/dev/null || echo "Models initialization script not found, skipping..."

# Create necessary directories
echo -e "${YELLOW}Creating directory structure...${NC}"
mkdir -p uploads/videos
mkdir -p uploads/thumbnails
mkdir -p uploads/voice-messages
mkdir -p models/compatibility
mkdir -p models/nlp

# Success message
echo -e "${GREEN}✅ Phase 3 setup complete!${NC}"
echo -e "${GREEN}Next steps:${NC}"
echo "1. Update backend/.env with your API keys and credentials"
echo "2. Start the backend: cd backend && npm run start:dev"
echo "3. Start the frontend: cd frontend && npm start"
echo "4. (Optional) Train ML models: cd backend && npm run train:matching"

echo -e "${YELLOW}Required API keys for Phase 3:${NC}"
echo "- Google Cloud (Speech-to-Text, Vision API)"
echo "- AWS (S3, CloudFront)"
echo "- Firebase (Push Notifications)"
echo "- Stripe (Payments)"

echo -e "${GREEN}🎈 Happy matching!${NC}"