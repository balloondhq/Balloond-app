#!/bin/bash

# Balloon'd Secure Setup Script
# This script helps you set up the project securely

echo "🎈 Balloon'd Secure Setup Script"
echo "================================"
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Copy example env file
echo "📝 Creating .env file from template..."
cp .env.example .env

# Generate secure secrets
echo "🔐 Generating secure secrets..."

# Generate JWT Secret
JWT_SECRET=$(openssl rand -base64 32)
sed -i.bak "s/GENERATE_A_STRONG_SECRET_HERE/$JWT_SECRET/" .env

# Generate JWT Refresh Secret
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
sed -i.bak "s/GENERATE_ANOTHER_STRONG_SECRET_HERE/$JWT_REFRESH_SECRET/" .env

# Generate Encryption Key (32 chars)
ENCRYPTION_KEY=$(openssl rand -hex 16)
sed -i.bak "s/your_32_character_encryption_key_here/$ENCRYPTION_KEY/" .env

# Generate Session Secret
SESSION_SECRET=$(openssl rand -base64 32)

echo ""
echo "✅ Secrets generated successfully!"
echo ""

# Prompt for database credentials
echo "📊 Database Configuration"
echo "-------------------------"
read -p "Database host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Database port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Database name (default: balloond): " DB_NAME
DB_NAME=${DB_NAME:-balloond}

read -p "Database username: " DB_USER
read -sp "Database password: " DB_PASS
echo ""

# Update database URL
DB_URL="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME"
sed -i.bak "s|postgresql://username:password@localhost:5432/balloond|$DB_URL|" .env

# Check for required services
echo ""
echo "🔍 Checking required services..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js installed: $NODE_VERSION"
else
    echo "❌ Node.js not found. Please install Node.js 18+"
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL client installed"
else
    echo "⚠️  PostgreSQL client not found. Make sure PostgreSQL is installed"
fi

# Check Redis
if command -v redis-cli &> /dev/null; then
    echo "✅ Redis client installed"
else
    echo "⚠️  Redis client not found. Make sure Redis is installed"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Setup database
echo ""
echo "🗄️ Setting up database..."
cd backend
npx prisma generate
npx prisma migrate dev --name init
cd ..

# Create necessary directories
echo ""
echo "📁 Creating required directories..."
mkdir -p uploads
mkdir -p logs
mkdir -p certs

# Set permissions
echo ""
echo "🔒 Setting secure permissions..."
chmod 600 .env
chmod 700 uploads
chmod 700 logs
chmod 700 certs

# Git setup
echo ""
echo "📝 Configuring Git..."
git config --local core.excludesfile .gitignore

# Security check
echo ""
echo "🔍 Running security audit..."
npm audit

echo ""
echo "✨ Setup complete!"
echo ""
echo "⚠️  IMPORTANT REMINDERS:"
echo "1. Never commit .env file to Git"
echo "2. Add your API keys to .env file"
echo "3. Configure AWS credentials"
echo "4. Set up Stripe keys"
echo "5. Run 'npm run test' to verify setup"
echo ""
echo "📚 Next steps:"
echo "1. npm run dev - Start development servers"
echo "2. npm test - Run tests"
echo "3. npm run build - Build for production"
echo ""
echo "🚀 Happy coding!"
