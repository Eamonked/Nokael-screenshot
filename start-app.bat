@echo off
REM Security Incident Reporting System - Quick Start Script
REM This script automatically starts all components: Database, Backend, Frontend, and Electron

echo.
echo ========================================
echo   Security Incident Reporting System
echo   Quick Start Script
echo ========================================
echo.

REM Check if Docker is running
echo 🔍 Checking Docker status...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed or not running
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop/
    echo Then start Docker Desktop and run this script again.
    pause
    exit /b 1
)

REM Check if Node.js is installed
echo 🔍 Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed
echo.

REM Step 1: Start PostgreSQL Database
echo 🗄️ Starting PostgreSQL database...
docker-compose -f devops/docker-compose.hybrid.yml up postgres -d
if errorlevel 1 (
    echo ❌ Failed to start PostgreSQL database
    pause
    exit /b 1
)
echo ✅ Database started successfully
echo.

REM Step 2: Setup Backend Environment
echo ⚙️ Setting up backend environment...
cd backend

REM Copy environment file if it doesn't exist
if not exist .env (
    echo 📋 Creating environment configuration...
    copy env.hybrid.example .env
    if errorlevel 1 (
        echo ❌ Failed to create environment file
        pause
        exit /b 1
    )
)

REM Install backend dependencies if needed
if not exist node_modules (
    echo 📦 Installing backend dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install backend dependencies
        pause
        exit /b 1
    )
)

REM Run database migrations
echo 🗄️ Running database migrations...
npm run migrate
if errorlevel 1 (
    echo ❌ Database migration failed
    echo Waiting for database to be ready...
    timeout /t 10 /nobreak >nul
    npm run migrate
    if errorlevel 1 (
        echo ❌ Database migration still failed
        pause
        exit /b 1
    )
)

REM Seed database
echo 🌱 Seeding database...
npm run seed
if errorlevel 1 (
    echo ⚠️ Database seeding failed (this might be normal if data already exists)
)

echo ✅ Backend setup completed
echo.

REM Step 3: Start Backend Server
echo 🚀 Starting backend server...
start "Backend Server" cmd /k "cd /d %CD% && npm start"
if errorlevel 1 (
    echo ❌ Failed to start backend server
    pause
    exit /b 1
)
echo ✅ Backend server started in new window
echo.

REM Step 4: Setup and Start Frontend
echo 🌐 Setting up frontend...
cd ..\frontend

REM Install frontend dependencies if needed
if not exist node_modules (
    echo 📦 Installing frontend dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

REM Create public directory if it doesn't exist
if not exist public (
    echo 📁 Creating public directory...
    mkdir public
)

REM Create index.html if it doesn't exist
if not exist public\index.html (
    echo 📄 Creating index.html...
    echo ^<!DOCTYPE html^> > public\index.html
    echo ^<html lang="en"^> >> public\index.html
    echo   ^<head^> >> public\index.html
    echo     ^<meta charset="utf-8" /^> >> public\index.html
    echo     ^<meta name="viewport" content="width=device-width, initial-scale=1" /^> >> public\index.html
    echo     ^<title^>Security Incident Reporting System^</title^> >> public\index.html
    echo   ^</head^> >> public\index.html
    echo   ^<body^> >> public\index.html
    echo     ^<div id="root"^>^</div^> >> public\index.html
    echo   ^</body^> >> public\index.html
    echo ^</html^> >> public\index.html
)

REM Create manifest.json if it doesn't exist
if not exist public\manifest.json (
    echo 📄 Creating manifest.json...
    echo { > public\manifest.json
    echo   "short_name": "Security Incident System", >> public\manifest.json
    echo   "name": "Security Incident Reporting System", >> public\manifest.json
    echo   "start_url": ".", >> public\manifest.json
    echo   "display": "standalone", >> public\manifest.json
    echo   "theme_color": "#000000", >> public\manifest.json
    echo   "background_color": "#ffffff" >> public\manifest.json
    echo } >> public\manifest.json
)

echo 🚀 Starting frontend server...
start "Frontend Server" cmd /k "cd /d %CD% && npm start"
if errorlevel 1 (
    echo ❌ Failed to start frontend server
    pause
    exit /b 1
)
echo ✅ Frontend server started in new window
echo.

REM Step 5: Setup and Start Electron App
echo 🖥️ Setting up Electron app...
cd ..\electron

REM Install electron dependencies if needed
if not exist node_modules (
    echo 📦 Installing Electron dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install Electron dependencies
        pause
        exit /b 1
    )
)

echo 🚀 Starting Electron app...
start "Electron App" cmd /k "cd /d %CD% && npm start"
if errorlevel 1 (
    echo ❌ Failed to start Electron app
    pause
    exit /b 1
)
echo ✅ Electron app started in new window
echo.

REM Step 6: Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 15 /nobreak >nul

REM Step 7: Test the integration
echo 🧪 Testing application integration...
cd ..\scripts
if exist run-integration-test.bat (
    echo Running integration test...
    call run-integration-test.bat
) else (
    echo ⚠️ Integration test script not found, skipping test
)

REM Step 8: Show final status
echo.
echo ========================================
echo 🎉 APPLICATION STARTED SUCCESSFULLY!
echo ========================================
echo.
echo 📊 Service Status:
echo   • Database: PostgreSQL running in Docker
echo   • Backend: http://localhost:3001
echo   • Frontend: http://localhost:3000
echo   • Electron: Desktop app window opened
echo.
echo 🔗 Quick Links:
echo   • Backend Health: http://localhost:3001/health
echo   • Frontend App: http://localhost:3000
echo   • Integration Test: scripts/run-integration-test.bat
echo.
echo 💡 Tips:
echo   • Keep all terminal windows open
echo   • Use Ctrl+C in each window to stop services
echo   • Check the logs in each window for any errors
echo.
echo Press any key to exit this script (services will continue running)...
pause >nul 