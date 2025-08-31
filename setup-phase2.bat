@echo off
echo =================================================
echo        Balloon'd Phase 2 Setup Script
echo =================================================
echo.

echo [1/6] Checking prerequisites...

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

:: Check if PostgreSQL is installed
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: PostgreSQL is not detected. Make sure it's installed and accessible.
)

echo Prerequisites check completed.
echo.

echo [2/6] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies.
    exit /b 1
)

:: Install additional Phase 2 dependencies
call npm install aws-sdk firebase-admin stripe @google-cloud/vision multer sharp
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Phase 2 backend dependencies.
    exit /b 1
)

echo Backend dependencies installed successfully.
echo.

echo [3/6] Setting up environment configuration...
if not exist .env (
    copy .env.example .env
    echo Created .env file from .env.example
    echo IMPORTANT: Please update .env with your actual credentials!
) else (
    echo .env file already exists
)
cd ..
echo.

echo [4/6] Setting up database...
cd backend

:: Generate Prisma client
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate Prisma client.
    exit /b 1
)

echo.
echo Database setup completed. Run 'npx prisma migrate dev' to apply migrations.
cd ..
echo.

echo [5/6] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies.
    exit /b 1
)

:: Install additional Phase 2 dependencies
call npm install expo-notifications expo-device expo-constants expo-file-system
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Phase 2 frontend dependencies.
    exit /b 1
)

echo Frontend dependencies installed successfully.
cd ..
echo.

echo [6/6] Creating required directories...
if not exist "uploads" mkdir uploads
if not exist "logs" mkdir logs
if not exist "frontend\assets\sounds" mkdir frontend\assets\sounds

echo.
echo =================================================
echo     Phase 2 Setup Completed Successfully!
echo =================================================
echo.
echo Next steps:
echo 1. Update backend\.env with your credentials:
echo    - Database connection string
echo    - AWS S3 credentials
echo    - Firebase Admin SDK
echo    - Stripe API keys
echo    - Google Vision API
echo.
echo 2. Run database migrations:
echo    cd backend
echo    npx prisma migrate dev
echo.
echo 3. Configure push notifications:
echo    - Add google-services.json to frontend\android\app
echo    - Configure iOS certificates in Xcode
echo.
echo 4. Start the development servers:
echo.
echo    Backend:
echo    cd backend
echo    npm run start:dev
echo.
echo    Frontend:
echo    cd frontend
echo    npm start
echo.
echo 5. Test voice messages on physical devices (required for microphone)
echo.
echo Happy coding! 🎈
echo.
pause
