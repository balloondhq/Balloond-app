#!/bin/bash

# Balloon'd Quick Deploy Script for Railway + Supabase

echo "🎈 Balloon'd Quick Deploy Setup"
echo "================================"
echo ""

# Check for required tools
echo "Checking requirements..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Please install from nodejs.org"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git is required. Please install git"
    exit 1
fi

echo "✅ Requirements met"
echo ""

# Step 1: Generate secrets
echo "Generating secure secrets..."
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
JWT_REFRESH_SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo ""

# Step 2: Create .env file
echo "Creating .env file..."
cat > backend/.env << EOF
# Database (UPDATE WITH YOUR SUPABASE URL)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"

# JWT Secrets (auto-generated)
JWT_SECRET="$JWT_SECRET"
JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"

# Basic Config
NODE_ENV="production"
PORT="8000"

# Supabase (UPDATE WITH YOUR KEYS)
SUPABASE_URL="https://[PROJECT-ID].supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_KEY="your-service-key"
EOF

echo "✅ .env file created in backend/"
echo ""

# Step 3: Use MVP schema
echo "Setting up MVP database schema..."
cp backend/prisma/schema-mvp.prisma backend/prisma/schema.prisma
echo "✅ MVP schema configured"
echo ""

# Step 4: Install dependencies
echo "Installing dependencies..."
cd backend
npm install
npx prisma generate
cd ..
echo "✅ Dependencies installed"
echo ""

# Step 5: Install Railway CLI
echo "Installing Railway CLI..."
npm install -g @railway/cli 2>/dev/null || echo "Railway CLI may already be installed"
echo ""

# Step 6: Git commit
echo "Committing changes..."
git add .
git commit -m "Configure for Railway deployment" || echo "No changes to commit"
echo ""

echo "✅ Setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Create a Supabase account at https://supabase.com"
echo "2. Create a new project and get your database URL"
echo "3. Update backend/.env with your Supabase credentials"
echo "4. Create a Railway account at https://railway.app"
echo "5. Run: railway login"
echo "6. Run: railway init"
echo "7. Run: railway up"
echo ""
echo "Your app will be live in 30 minutes! 🚀"
