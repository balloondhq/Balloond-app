@echo off
REM Balloon'd Phase 3 Setup Script for Windows

echo Setting up Balloon'd Phase 3...

REM Check prerequisites
echo Checking prerequisites...

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js 18+
    pause
    exit /b 1
)

REM Check PostgreSQL
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo PostgreSQL is not installed. Please install PostgreSQL 14+
    pause
    exit /b 1
)

REM Check FFmpeg
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo FFmpeg is not installed. Please download from https://ffmpeg.org/download.html
    echo Add FFmpeg to your PATH after installation
    pause
)

echo Prerequisites check complete!

REM Create database
echo Setting up database...
createdb balloond 2>nul || echo Database already exists

REM Enable pgvector extension
echo Installing pgvector extension...
psql -d balloond -c "CREATE EXTENSION IF NOT EXISTS vector;"

REM Backend setup
echo Setting up backend...
cd backend

REM Install dependencies
call npm install

REM Install Phase 3 specific dependencies
echo Installing Phase 3 dependencies...
call npm install @tensorflow/tfjs-node @tensorflow-models/universal-sentence-encoder @google-cloud/speech fluent-ffmpeg sharp aws-sdk three

REM Run migrations
echo Running database migrations...
call npx prisma migrate dev
call npx prisma generate

REM Run Phase 3 migration
psql -U balloond_user -d balloond -f ..\database\003_phase3_migration.sql

REM Create models directory
if not exist "models\compatibility" mkdir "models\compatibility"

REM Frontend setup
echo Setting up frontend...
cd ..\frontend

REM Install dependencies
call npm install

REM Install Phase 3 specific dependencies
echo Installing Phase 3 frontend dependencies...
call npm install three expo-three expo-gl expo-gl-cpp expo-av expo-camera date-fns

REM Create environment file if not exists
cd ..\backend
if not exist ".env" (
    echo Creating .env file from template...
    copy .env.example .env
    echo Please update backend\.env with your credentials
)

REM Create necessary directories
echo Creating directory structure...
if not exist "uploads\videos" mkdir "uploads\videos"
if not exist "uploads\thumbnails" mkdir "uploads\thumbnails"
if not exist "uploads\voice-messages" mkdir "uploads\voice-messages"
if not exist "models\compatibility" mkdir "models\compatibility"
if not exist "models\nlp" mkdir "models\nlp"

cd ..

REM Success message
echo.
echo ======================================
echo Phase 3 setup complete!
echo ======================================
echo.
echo Next steps:
echo 1. Update backend\.env with your API keys and credentials
echo 2. Start the backend: cd backend ^&^& npm run start:dev
echo 3. Start the frontend: cd frontend ^&^& npm start
echo 4. (Optional) Train ML models: cd backend ^&^& npm run train:matching
echo.
echo Required API keys for Phase 3:
echo - Google Cloud (Speech-to-Text, Vision API)
echo - AWS (S3, CloudFront)
echo - Firebase (Push Notifications)
echo - Stripe (Payments)
echo.
echo Happy matching!
echo.
pause