# 🔗 Electron to Backend Integration Test Guide

This guide explains how to run comprehensive integration tests that simulate the complete flow from the Electron app to backend database upload.

## 📋 Test Overview

The integration test covers the following flow:
1. **Screenshot Capture** → **Metadata Input** → **Local Storage** → **Sync to Backend**

### Test Components

- ✅ **Backend Health Check** - Verifies backend is running
- ✅ **Database Connection** - Tests PostgreSQL connectivity
- ✅ **Authentication** - Tests JWT login and token validation
- ✅ **License Activation** - Tests license system
- ✅ **File Upload** - Tests screenshot upload to backend
- ✅ **Incident Retrieval** - Tests fetching uploaded incidents
- ✅ **SQLite Integration** - Tests local storage functionality
- ✅ **Sync Functionality** - Tests offline-to-online sync
- ✅ **Error Handling** - Tests proper error responses

## 🚀 Quick Start

### Option 1: Windows Batch File (Recommended)
```bash
# Run the automated test
scripts/run-integration-test.bat
```

### Option 2: Node.js Script
```bash
# Install dependencies
cd backend
npm install axios

# Run the test
node scripts/test-electron-to-backend.js
```

### Option 3: PowerShell Script
```powershell
# Run PowerShell test
.\scripts\test-electron-to-backend.ps1
```

## 📋 Prerequisites

### 1. Backend Setup
```bash
# Start PostgreSQL database
docker-compose -f devops/docker-compose.hybrid.yml up postgres -d

# Start backend server
cd backend
npm start
```

### 2. Database Setup
```bash
# Run migrations
cd backend
npm run migrate

# Seed initial data
npm run seed
```

### 3. Environment Configuration
```bash
# Copy environment file
cd backend
copy env.hybrid.example .env
```

## 🧪 Test Details

### Backend Health Test
- **Endpoint**: `GET /health`
- **Expected**: 200 OK with server status
- **Purpose**: Verifies backend is running and responsive

### Database Connection Test
- **Endpoint**: `GET /api/health/db`
- **Expected**: 200 OK with database status
- **Purpose**: Verifies PostgreSQL connection

### Authentication Test
- **Endpoint**: `POST /api/auth/login`
- **Credentials**: admin / Admin123!
- **Expected**: 200 OK with JWT token
- **Purpose**: Tests user authentication and JWT generation

### License Activation Test
- **Endpoint**: `POST /api/license/activate`
- **License Key**: TEST-XXXX-YYYY-ZZZZ-1234
- **Expected**: 200 OK with license status
- **Purpose**: Tests license validation system

### File Upload Test
- **Endpoint**: `POST /api/incidents`
- **Method**: Multipart form data
- **File**: Test screenshot (1x1 pixel PNG)
- **Expected**: 201 Created with incident ID
- **Purpose**: Tests screenshot upload and incident creation

### Incident Retrieval Test
- **Endpoint**: `GET /api/incidents/{id}`
- **Expected**: 200 OK with incident data
- **Purpose**: Tests incident fetching and data integrity

### SQLite Integration Test
- **Component**: SQLiteService class
- **Operations**: Add incident, retrieve incidents
- **Expected**: Successful local storage operations
- **Purpose**: Tests offline storage functionality

### Sync Functionality Test
- **Endpoint**: `GET /api/sync/status`
- **Expected**: 200 OK with sync status
- **Purpose**: Tests sync system availability

### Error Handling Test
- **Invalid Auth**: Tests 401 response for invalid tokens
- **Invalid Upload**: Tests 400 response for missing files
- **Purpose**: Verifies proper error handling

## 📊 Expected Results

### Successful Test Run
```
🚀 Starting Electron to Backend Integration Tests
============================================================

🔍 Testing Backend Health...
✅ Backend Health Check
   Backend is running

🗄️ Testing Database Connection...
✅ Database Connection
   Database is accessible

🔐 Testing Authentication...
✅ Admin Login
   Login successful
✅ JWT Token Validation
   Token is valid

📜 Testing License Activation...
✅ License Activation
   License activated

📤 Testing File Upload...
✅ File Upload
   File uploaded successfully (ID: abc123)

📋 Testing Incident Retrieval...
✅ Incident Retrieval
   Incident retrieved successfully

💾 Testing SQLite Integration...
✅ SQLite Incident Creation
   Incident created with ID: def456
✅ SQLite Incident Retrieval
   Retrieved 1 incidents

🔄 Testing Sync Functionality...
✅ Sync Status Check
   Sync status available

⚠️ Testing Error Handling...
✅ Invalid Auth Handling
   Properly rejected invalid token
✅ Invalid Upload Handling
   Properly rejected invalid upload

============================================================
📊 TEST RESULTS SUMMARY
============================================================

Total Tests: 12
Passed: 12
Failed: 0
Success Rate: 100.0%

✅ PASSED TESTS:
   • Backend Health Check
   • Database Connection
   • Admin Login
   • JWT Token Validation
   • License Activation
   • File Upload
   • Incident Retrieval
   • SQLite Incident Creation
   • SQLite Incident Retrieval
   • Sync Status Check
   • Invalid Auth Handling
   • Invalid Upload Handling

============================================================
🎉 ALL TESTS PASSED! Integration is working correctly.
============================================================
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Backend Not Running
```
❌ Backend is not running on port 3001
```
**Solution**: Start the backend server
```bash
cd backend
npm start
```

#### 2. Database Connection Failed
```
❌ Database connection failed. Please check database configuration.
```
**Solution**: Start PostgreSQL and run migrations
```bash
# Start database
docker-compose -f devops/docker-compose.hybrid.yml up postgres -d

# Run migrations
cd backend
npm run migrate
```

#### 3. Authentication Failed
```
❌ Authentication failed. Please check credentials.
```
**Solution**: Verify admin credentials in database
```bash
# Check if admin user exists
cd backend
npm run seed
```

#### 4. File Upload Failed
```
❌ File upload failed. Please check upload configuration.
```
**Solution**: Check upload directory permissions
```bash
# Create uploads directory
mkdir backend/uploads
```

#### 5. SQLite Integration Failed
```
❌ SQLite error: Cannot find module 'better-sqlite3'
```
**Solution**: Install SQLite dependencies
```bash
cd electron
npm install better-sqlite3
```

## 🎯 Test Customization

### Environment Variables
```bash
# Backend URL
BACKEND_URL=http://localhost:3001

# Test timeout (ms)
TEST_TIMEOUT=30000

# Test retries
TEST_RETRIES=3
```

### Test Modes
```bash
# Full test suite
node scripts/test-electron-to-backend.js

# Quick test (skip some checks)
node scripts/test-electron-to-backend.js --quick

# Specific test
node scripts/test-electron-to-backend.js --test=upload
```

## 📈 Performance Testing

### Load Testing
```bash
# Test with multiple concurrent uploads
for i in {1..10}; do
  node scripts/test-electron-to-backend.js &
done
wait
```

### Memory Testing
```bash
# Monitor memory usage during tests
node --inspect scripts/test-electron-to-backend.js
```

## 🔒 Security Testing

### Authentication Tests
- [x] Valid credentials work
- [x] Invalid credentials rejected
- [x] JWT tokens validated
- [x] Expired tokens handled

### Authorization Tests
- [x] Admin access to all endpoints
- [x] User access restrictions
- [x] License validation

### Input Validation Tests
- [x] File type validation
- [x] File size limits
- [x] SQL injection prevention
- [x] XSS prevention

## 📝 Test Reports

### JSON Report
```bash
# Generate JSON report
node scripts/test-electron-to-backend.js --report=json > test-report.json
```

### HTML Report
```bash
# Generate HTML report
node scripts/test-electron-to-backend.js --report=html > test-report.html
```

## 🚀 Continuous Integration

### GitHub Actions
```yaml
name: Integration Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:integration
```

### Local CI
```bash
# Run tests before commit
npm run pre-commit

# Run tests in CI mode
npm run test:ci
```

## 📞 Support

If you encounter issues with the integration tests:

1. **Check the logs**: Look for detailed error messages
2. **Verify prerequisites**: Ensure all services are running
3. **Check configuration**: Verify environment variables
4. **Review documentation**: Check this guide and API docs

For additional help, create an issue with:
- Test output
- Error messages
- Environment details
- Steps to reproduce 