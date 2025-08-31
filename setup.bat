@echo off
REM Balloon'd Setup Script for Windows
REM This script sets up the development environment for Balloon'd

echo.
echo 🎈 Welcome to Balloon'd Setup!
echo ===============================
echo.

REM Check Node.js version
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%
echo ✅ Please ensure Node.js 20+ is installed
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

echo.
echo 📦 Installing backend dependencies...
cd backend
call npm install

echo.
echo 📦 Installing frontend dependencies...
cd ..\frontend
call npm install
cd ..

REM Copy environment file
echo.
echo 🔧 Setting up environment variables...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo ✅ Created backend\.env file
    echo ⚠️  Please update backend\.env with your configuration
) else (
    echo ✅ backend\.env already exists
)

REM Database setup instructions
echo.
echo 🗄️  Database Setup
echo ==================
echo 1. Make sure PostgreSQL is running
echo 2. Create a database named 'balloond'
echo 3. Enable PostGIS extension
echo.
echo Run these commands in psql:
echo   CREATE DATABASE balloond;
echo   \c balloond
echo   CREATE EXTENSION IF NOT EXISTS postgis;
echo.
pause

REM Run migrations
echo.
echo 🔄 Running database migrations...
cd backend
call npx prisma generate
call npx prisma migrate dev --name init
cd ..

REM Success message
echo.
echo ✨ Setup Complete!
echo ==================
echo.
echo To start development servers:
echo   npm run dev
echo.
echo Or run separately:
echo   Backend: npm run dev:backend
echo   Frontend: npm run dev:frontend
echo.
echo Access the app at:
echo   Backend API: http://localhost:3000
echo   API Docs: http://localhost:3000/api/docs
echo   Frontend: http://localhost:8081
echo.
echo Happy coding! 🚀
pause
