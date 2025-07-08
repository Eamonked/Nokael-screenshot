#!/bin/bash

# Frontend Test Script for Security Incident Reporting System
# This script tests the React frontend functionality

set -e

echo "🔍 Frontend Test Suite - Security Incident Reporting System"
echo "=========================================================="

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
        "PASS")
            echo -e "${GREEN}✅ PASS${NC}: $message"
            ;;
        "FAIL")
            echo -e "${RED}❌ FAIL${NC}: $message"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  INFO${NC}: $message"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  WARN${NC}: $message"
            ;;
    esac
}

# Function to check if a service is running
check_service() {
    local port=$1
    local service_name=$2
    if lsof -i :$port > /dev/null 2>&1; then
        print_status "PASS" "$service_name is running on port $port"
        return 0
    else
        print_status "FAIL" "$service_name is not running on port $port"
        return 1
    fi
}

# Function to test HTTP endpoint
test_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$status_code" = "$expected_status" ]; then
        print_status "PASS" "$description (Status: $status_code)"
        return 0
    else
        print_status "FAIL" "$description (Expected: $expected_status, Got: $status_code)"
        return 1
    fi
}

echo ""
print_status "INFO" "Starting frontend tests..."

# Test 1: Check if frontend is running
echo ""
print_status "INFO" "Testing service availability..."
check_service 3001 "React Frontend"

# Test 2: Check if backend is running
check_service 3000 "Backend API"

# Test 3: Test frontend accessibility
echo ""
print_status "INFO" "Testing frontend endpoints..."
test_endpoint "http://localhost:3001" "200" "Frontend main page"
test_endpoint "http://localhost:3001/static/js/main.js" "200" "Frontend JavaScript bundle"

# Test 4: Test backend API endpoints
echo ""
print_status "INFO" "Testing backend API endpoints..."
test_endpoint "http://localhost:3000/health" "200" "Backend health check"
test_endpoint "http://localhost:3000/api/auth/login" "405" "Backend auth endpoint (method not allowed for GET)"

# Test 5: Check frontend build
echo ""
print_status "INFO" "Testing frontend build..."
if [ -d "frontend/build" ]; then
    print_status "PASS" "Frontend build directory exists"
else
    print_status "WARN" "Frontend build directory not found (run 'npm run build' to create)"
fi

# Test 6: Check environment configuration
echo ""
print_status "INFO" "Testing environment configuration..."
if [ -f "frontend/.env.local" ]; then
    print_status "PASS" "Frontend environment file exists"
elif [ -f "frontend/env.example" ]; then
    print_status "WARN" "Frontend environment file not found, but example exists"
    print_status "INFO" "Copy env.example to .env.local and configure"
else
    print_status "FAIL" "Frontend environment configuration missing"
fi

# Test 7: Check dependencies
echo ""
print_status "INFO" "Testing dependencies..."
if [ -f "frontend/node_modules/.package-lock.json" ]; then
    print_status "PASS" "Frontend dependencies installed"
else
    print_status "FAIL" "Frontend dependencies not installed (run 'npm install')"
fi

# Test 8: Check TypeScript compilation
echo ""
print_status "INFO" "Testing TypeScript compilation..."
cd frontend
if npm run type-check > /dev/null 2>&1; then
    print_status "PASS" "TypeScript compilation successful"
else
    print_status "FAIL" "TypeScript compilation failed"
fi
cd ..

# Test 9: Check linting
echo ""
print_status "INFO" "Testing code quality..."
cd frontend
if npm run lint > /dev/null 2>&1; then
    print_status "PASS" "ESLint passed"
else
    print_status "WARN" "ESLint found issues (run 'npm run lint:fix' to auto-fix)"
fi
cd ..

# Test 10: Test API connectivity
echo ""
print_status "INFO" "Testing API connectivity..."
if curl -s "http://localhost:3000/health" | grep -q "status"; then
    print_status "PASS" "Backend API is responding correctly"
else
    print_status "FAIL" "Backend API is not responding correctly"
fi

echo ""
print_status "INFO" "Frontend test summary:"
echo "=========================================================="
print_status "INFO" "Frontend URL: http://localhost:3001"
print_status "INFO" "Backend URL: http://localhost:3000"
print_status "INFO" "API Health: http://localhost:3000/health"

echo ""
print_status "INFO" "Manual testing steps:"
echo "1. Open http://localhost:3001 in your browser"
echo "2. You should see the login page"
echo "3. Use default credentials: admin / admin123"
echo "4. Navigate through the dashboard, incidents, and areas pages"
echo "5. Test responsive design on different screen sizes"

echo ""
print_status "INFO" "Frontend test suite completed!"
echo "==========================================================" 