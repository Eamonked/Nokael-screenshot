@echo off
REM Electron to Backend Integration Test Runner
REM This script runs the complete integration test from Electron app to backend database

echo.
echo ========================================
echo   Electron to Backend Integration Test
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if backend is running
echo 🔍 Checking if backend is running...
curl -s http://localhost:3001/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend is not running on port 3001
    echo Please start the backend first:
    echo   cd backend
    echo   npm start
    echo.
    pause
    exit /b 1
)

echo ✅ Backend is running

REM Check if required dependencies are installed
echo 🔍 Checking dependencies...
cd backend
npm list axios >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing required dependencies...
    npm install axios
)

cd ..

REM Run the Node.js test script
echo 🚀 Running integration tests...
node scripts/test-electron-to-backend.js

REM Check the exit code
if errorlevel 1 (
    echo.
    echo ❌ Some tests failed. Check the output above for details.
    pause
    exit /b 1
) else (
    echo.
    echo ✅ All tests passed!
    echo.
    echo 🎉 Integration test completed successfully!
    echo The Electron app can successfully communicate with the backend.
    pause
) 