# Security Incident Reporting System - Quick Start Script (PowerShell)
# This script automatically starts all components: Database, Backend, Frontend, and Electron

param(
    [switch]$SkipTests = $false,
    [switch]$SkipIntegration = $false
)

# Colors for output
$Colors = @{
    Green = "Green"
    Red = "Red"
    Yellow = "Yellow"
    Blue = "Blue"
    Cyan = "Cyan"
    White = "White"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Write-Step {
    param(
        [string]$Step,
        [string]$Message
    )
    Write-ColorOutput "`n$Step $Message" "Blue"
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[SUCCESS] $Message" "Green"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" "Red"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARNING] $Message" "Yellow"
}

# Main script
Write-ColorOutput "`n========================================" "White"
Write-ColorOutput "  Security Incident Reporting System" "White"
Write-ColorOutput "  Quick Start Script (PowerShell)" "White"
Write-ColorOutput "========================================" "White"
Write-ColorOutput ""

# Check prerequisites
Write-Step "[CHECK]" "Checking prerequisites..."

# Check Docker
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not found"
    }
    Write-Success "Docker is available"
} catch {
    Write-Error "Docker is not installed or not running"
    Write-ColorOutput "Please install Docker Desktop from https://www.docker.com/products/docker-desktop/" "Yellow"
    Write-ColorOutput "Then start Docker Desktop and run this script again." "Yellow"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js not found"
    }
    Write-Success "Node.js is available ($nodeVersion)"
} catch {
    Write-Error "Node.js is not installed"
    Write-ColorOutput "Please install Node.js from https://nodejs.org/" "Yellow"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Success "Prerequisites check passed"

# Step 1: Start PostgreSQL Database
Write-Step "[DB]" "Starting PostgreSQL database..."
try {
    docker-compose -f devops/docker-compose.hybrid.yml up postgres -d
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start PostgreSQL"
    }
    Write-Success "Database started successfully"
} catch {
    Write-Error "Failed to start PostgreSQL database"
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 2: Setup Backend Environment
Write-Step "[BACKEND]" "Setting up backend environment..."
Set-Location backend

# Copy environment file if it doesn't exist
if (-not (Test-Path .env)) {
    Write-ColorOutput "[CONFIG] Creating environment configuration..." "Cyan"
    Copy-Item env.hybrid.example .env
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create environment file"
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Install backend dependencies if needed
if (-not (Test-Path node_modules)) {
    Write-ColorOutput "[INSTALL] Installing backend dependencies..." "Cyan"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install backend dependencies"
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Run database migrations
Write-ColorOutput "[MIGRATE] Running database migrations..." "Cyan"
npm run migrate
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Database migration failed, waiting for database to be ready..."
    Start-Sleep -Seconds 10
    npm run migrate
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Database migration still failed"
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Seed database
Write-ColorOutput "[SEED] Seeding database..." "Cyan"
npm run seed
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Database seeding failed (this might be normal if data already exists)"
}

Write-Success "Backend setup completed"

# Step 3: Start Backend Server
Write-Step "[SERVER]" "Starting backend server..."
$backendPath = Get-Location
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm start" -WindowStyle Normal
Write-Success "Backend server started in new window"

# Step 4: Setup and Start Frontend
Write-Step "[FRONTEND]" "Setting up frontend..."
Set-Location ..\frontend

# Install frontend dependencies if needed
if (-not (Test-Path node_modules)) {
    Write-ColorOutput "[INSTALL] Installing frontend dependencies..." "Cyan"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install frontend dependencies"
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Create public directory if it doesn't exist
if (-not (Test-Path public)) {
    Write-ColorOutput "[CREATE] Creating public directory..." "Cyan"
    New-Item -ItemType Directory -Path public -Force | Out-Null
}

# Create index.html if it doesn't exist
if (-not (Test-Path public\index.html)) {
    Write-ColorOutput "[CREATE] Creating index.html..." "Cyan"
    $indexHtml = @"
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Security Incident Reporting System</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
"@
    $indexHtml | Out-File -FilePath public\index.html -Encoding UTF8
}

# Create manifest.json if it doesn't exist
if (-not (Test-Path public\manifest.json)) {
    Write-ColorOutput "[CREATE] Creating manifest.json..." "Cyan"
    $manifestJson = @"
{
  "short_name": "Security Incident System",
  "name": "Security Incident Reporting System",
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}
"@
    $manifestJson | Out-File -FilePath public\manifest.json -Encoding UTF8
}

Write-ColorOutput "[START] Starting frontend server..." "Cyan"
$frontendPath = Get-Location
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm start" -WindowStyle Normal
Write-Success "Frontend server started in new window"

# Step 5: Setup and Start Electron App
Write-Step "[ELECTRON]" "Setting up Electron app..."
Set-Location ..\electron

# Install electron dependencies if needed
if (-not (Test-Path node_modules)) {
    Write-ColorOutput "[INSTALL] Installing Electron dependencies..." "Cyan"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install Electron dependencies"
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-ColorOutput "[START] Starting Electron app..." "Cyan"
$electronPath = Get-Location
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$electronPath'; npm start" -WindowStyle Normal
Write-Success "Electron app started in new window"

# Step 6: Wait for services to be ready
Write-Step "[WAIT]" "Waiting for services to be ready..."
Start-Sleep -Seconds 15

# Step 7: Test the integration (optional)
if (-not $SkipIntegration) {
    Write-Step "[TEST]" "Testing application integration..."
    Set-Location ..\scripts
    if (Test-Path run-integration-test.bat) {
        Write-ColorOutput "Running integration test..." "Cyan"
        & .\run-integration-test.bat
    } else {
        Write-Warning "Integration test script not found, skipping test"
    }
}

# Step 8: Show final status
Write-ColorOutput "`n========================================" "White"
Write-ColorOutput "[SUCCESS] APPLICATION STARTED SUCCESSFULLY!" "Green"
Write-ColorOutput "========================================" "White"
Write-ColorOutput ""

Write-ColorOutput "[STATUS] Service Status:" "Cyan"
Write-ColorOutput "  • Database: PostgreSQL running in Docker" "White"
Write-ColorOutput "  • Backend: http://localhost:3001" "White"
Write-ColorOutput "  • Frontend: http://localhost:3000" "White"
Write-ColorOutput "  • Electron: Desktop app window opened" "White"

Write-ColorOutput "`n[LINKS] Quick Links:" "Cyan"
Write-ColorOutput "  • Backend Health: http://localhost:3001/health" "White"
Write-ColorOutput "  • Frontend App: http://localhost:3000" "White"
Write-ColorOutput "  • Integration Test: scripts/run-integration-test.bat" "White"

Write-ColorOutput "`n[TIPS] Tips:" "Cyan"
Write-ColorOutput "  • Keep all terminal windows open" "White"
Write-ColorOutput "  • Use Ctrl+C in each window to stop services" "White"
Write-ColorOutput "  • Check the logs in each window for any errors" "White"

Write-ColorOutput "`nPress any key to exit this script (services will continue running)..." "Yellow"
Read-Host 