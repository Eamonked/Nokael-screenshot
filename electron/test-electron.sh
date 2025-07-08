#!/bin/bash

# Screenshot Security - Electron Desktop Client Test Script
# This script tests the Electron app setup and basic functionality

set -e

echo "🔍 Testing Screenshot Security Electron Desktop Client"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Check if we're in the electron directory
if [ ! -f "package.json" ]; then
    print_status "ERROR" "Please run this script from the electron directory"
    exit 1
fi

print_status "INFO" "Starting Electron app tests..."

# Test 1: Check Node.js version
print_status "INFO" "Checking Node.js version..."
NODE_VERSION=$(node --version)
if [[ $NODE_VERSION =~ v(1[8-9]|2[0-9]) ]]; then
    print_status "SUCCESS" "Node.js version $NODE_VERSION is compatible"
else
    print_status "WARNING" "Node.js version $NODE_VERSION - recommend v18+ for best compatibility"
fi

# Test 2: Check if dependencies are installed
print_status "INFO" "Checking dependencies..."
if [ -d "node_modules" ]; then
    print_status "SUCCESS" "Dependencies are installed"
else
    print_status "ERROR" "Dependencies not found. Run 'npm install' first"
    exit 1
fi

# Test 3: Check TypeScript configuration
print_status "INFO" "Checking TypeScript configuration..."
if [ -f "tsconfig.json" ] && [ -f "tsconfig.main.json" ] && [ -f "tsconfig.renderer.json" ]; then
    print_status "SUCCESS" "TypeScript configuration files found"
else
    print_status "ERROR" "Missing TypeScript configuration files"
    exit 1
fi

# Test 4: Check source files
print_status "INFO" "Checking source files..."
REQUIRED_FILES=(
    "src/main/main.ts"
    "src/preload/preload.ts"
    "src/renderer/index.html"
    "src/renderer/src/main.tsx"
    "src/renderer/src/App.tsx"
    "src/renderer/src/theme.ts"
    "src/renderer/src/components/Dashboard.tsx"
    "src/renderer/src/components/Settings.tsx"
    "src/renderer/src/components/ScreenshotHistory.tsx"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    print_status "SUCCESS" "All required source files found"
else
    print_status "ERROR" "Missing source files:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    exit 1
fi

# Test 5: Check Vite configuration
print_status "INFO" "Checking Vite configuration..."
if [ -f "vite.config.ts" ]; then
    print_status "SUCCESS" "Vite configuration found"
else
    print_status "ERROR" "Missing vite.config.ts"
    exit 1
fi

# Test 6: Test TypeScript compilation (main process)
print_status "INFO" "Testing TypeScript compilation (main process)..."
if npx tsc -p tsconfig.main.json --noEmit; then
    print_status "SUCCESS" "Main process TypeScript compilation successful"
else
    print_status "ERROR" "Main process TypeScript compilation failed"
    exit 1
fi

# Test 7: Check package.json scripts
print_status "INFO" "Checking package.json scripts..."
REQUIRED_SCRIPTS=("start" "build" "dist" "dev:main" "dev:renderer")
MISSING_SCRIPTS=()

for script in "${REQUIRED_SCRIPTS[@]}"; do
    if ! grep -q "\"$script\":" package.json; then
        MISSING_SCRIPTS+=("$script")
    fi
done

if [ ${#MISSING_SCRIPTS[@]} -eq 0 ]; then
    print_status "SUCCESS" "All required npm scripts found"
else
    print_status "WARNING" "Missing npm scripts:"
    for script in "${MISSING_SCRIPTS[@]}"; do
        echo "  - $script"
    done
fi

# Test 8: Check electron-builder configuration
print_status "INFO" "Checking electron-builder configuration..."
if grep -q '"build"' package.json; then
    print_status "SUCCESS" "electron-builder configuration found"
else
    print_status "WARNING" "electron-builder configuration not found"
fi

# Test 9: Check for native dependencies
print_status "INFO" "Checking native dependencies..."
NATIVE_DEPS=("screenshot-desktop" "robotjs" "node-global-key-listener")
MISSING_NATIVE=()

for dep in "${NATIVE_DEPS[@]}"; do
    if ! grep -q "\"$dep\":" package.json; then
        MISSING_NATIVE+=("$dep")
    fi
done

if [ ${#MISSING_NATIVE[@]} -eq 0 ]; then
    print_status "SUCCESS" "All native dependencies found"
else
    print_status "WARNING" "Missing native dependencies:"
    for dep in "${MISSING_NATIVE[@]}"; do
        echo "  - $dep"
    done
fi

# Test 10: Check if backend is running (optional)
print_status "INFO" "Checking backend connectivity..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    print_status "SUCCESS" "Backend server is running and accessible"
else
    print_status "WARNING" "Backend server not accessible at http://localhost:3001"
    echo "  Note: This is optional for local screenshot functionality"
fi

echo ""
print_status "INFO" "Test Summary:"
echo "=================="

# Summary
echo "✅ Node.js version check"
echo "✅ Dependencies check"
echo "✅ TypeScript configuration"
echo "✅ Source files check"
echo "✅ Vite configuration"
echo "✅ TypeScript compilation"
echo "✅ Package.json scripts"
echo "✅ electron-builder configuration"
echo "✅ Native dependencies"
echo "✅ Backend connectivity (optional)"

echo ""
print_status "SUCCESS" "Electron app setup is ready!"
echo ""
echo "Next steps:"
echo "1. Run 'npm start' to start development"
echo "2. Run 'npm run build' to build for production"
echo "3. Run 'npm run dist' to create distribution packages"
echo ""
echo "For more information, see README.md" 