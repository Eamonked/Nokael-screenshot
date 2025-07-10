#!/usr/bin/env node

/**
 * Electron to Backend Integration Test Script
 * Tests the complete flow: Screenshot Capture → Metadata Input → Local Storage → Sync to Backend
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Test Configuration
const TEST_CONFIG = {
  backendUrl: 'http://localhost:3001',
  testImagePath: path.join(__dirname, '../test-assets/test-screenshot.png'),
  testMetadata: {
    area: 'Test Area A1',
    description: 'Automated test incident from Electron app',
    operator: 'test-user',
    timestamp: new Date().toISOString()
  },
  timeout: 30000, // 30 seconds
  retries: 3
};

// Test Results
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    log(`✅ ${testName}`, 'green');
  } else {
    testResults.failed++;
    log(`❌ ${testName}`, 'red');
  }
  if (details) {
    log(`   ${details}`, 'yellow');
  }
  testResults.details.push({ name: testName, passed, details });
}

// Utility Functions
async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${TEST_CONFIG.backendUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: TEST_CONFIG.timeout
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status 
    };
  }
}

// Test Functions
async function testBackendHealth() {
  log('\n🔍 Testing Backend Health...', 'blue');
  
  const result = await makeRequest('GET', '/health');
  const passed = result.success && result.status === 200;
  
  logTest('Backend Health Check', passed, 
    passed ? 'Backend is running' : `Backend not responding: ${result.error}`);
  
  return passed;
}

async function testDatabaseConnection() {
  log('\n🗄️ Testing Database Connection...', 'blue');
  
  const result = await makeRequest('GET', '/api/health/db');
  const passed = result.success && result.status === 200;
  
  logTest('Database Connection', passed,
    passed ? 'Database is accessible' : `Database error: ${result.error}`);
  
  return passed;
}

async function testAuthentication() {
  log('\n🔐 Testing Authentication...', 'blue');
  
  // Test login
  const loginResult = await makeRequest('POST', '/api/auth/login', {
    username: 'admin',
    password: 'Admin123!'
  });
  
  const loginPassed = loginResult.success && loginResult.status === 200;
  logTest('Admin Login', loginPassed,
    loginPassed ? 'Login successful' : `Login failed: ${loginResult.error}`);
  
  if (!loginPassed) {
    return false;
  }
  
  // Test with JWT token
  const token = loginResult.data.token;
  const authResult = await makeRequest('GET', '/api/auth/verify', null, {
    'Authorization': `Bearer ${token}`
  });
  
  const authPassed = authResult.success && authResult.status === 200;
  logTest('JWT Token Validation', authPassed,
    authPassed ? 'Token is valid' : `Token validation failed: ${authResult.error}`);
  
  return loginPassed && authPassed;
}

async function testLicenseActivation() {
  log('\n📜 Testing License Activation...', 'blue');
  
  const result = await makeRequest('POST', '/api/license/activate', {
    license_key: 'TEST-XXXX-YYYY-ZZZZ-1234',
    workstation_id: 'TEST-WORKSTATION-001',
    hostname: 'test-host-01'
  });
  
  const passed = result.success && result.status === 200;
  logTest('License Activation', passed,
    passed ? 'License activated' : `License activation failed: ${result.error}`);
  
  return passed;
}

async function testFileUpload() {
  log('\n📤 Testing File Upload...', 'blue');
  
  // Create a test image if it doesn't exist
  if (!fs.existsSync(TEST_CONFIG.testImagePath)) {
    const testImageDir = path.dirname(TEST_CONFIG.testImagePath);
    if (!fs.existsSync(testImageDir)) {
      fs.mkdirSync(testImageDir, { recursive: true });
    }
    
    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    fs.writeFileSync(TEST_CONFIG.testImagePath, testImageBuffer);
  }
  
  // Test file upload using FormData
  const FormData = require('form-data');
  const form = new FormData();
  form.append('area', TEST_CONFIG.testMetadata.area);
  form.append('description', TEST_CONFIG.testMetadata.description);
  form.append('screenshot', fs.createReadStream(TEST_CONFIG.testImagePath));
  
  try {
    const response = await axios.post(`${TEST_CONFIG.backendUrl}/api/incidents`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${global.testToken}`
      },
      timeout: TEST_CONFIG.timeout
    });
    
    const passed = response.status === 201;
    logTest('File Upload', passed,
      passed ? `File uploaded successfully (ID: ${response.data.id})` : 'Upload failed');
    
    if (passed) {
      global.uploadedIncidentId = response.data.id;
    }
    
    return passed;
  } catch (error) {
    logTest('File Upload', false, `Upload error: ${error.message}`);
    return false;
  }
}

async function testIncidentRetrieval() {
  log('\n📋 Testing Incident Retrieval...', 'blue');
  
  if (!global.uploadedIncidentId) {
    logTest('Incident Retrieval', false, 'No incident ID available');
    return false;
  }
  
  const result = await makeRequest('GET', `/api/incidents/${global.uploadedIncidentId}`, null, {
    'Authorization': `Bearer ${global.testToken}`
  });
  
  const passed = result.success && result.status === 200;
  logTest('Incident Retrieval', passed,
    passed ? 'Incident retrieved successfully' : `Retrieval failed: ${result.error}`);
  
  return passed;
}

async function testSQLiteIntegration() {
  log('\n💾 Testing SQLite Integration...', 'blue');
  
  // This would require the Electron app to be running
  // For now, we'll test the SQLite service directly
  try {
    const SQLiteService = require('../electron/src/main/sqliteService');
    const tempPath = path.join(__dirname, '../test-temp');
    
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }
    
    const sqliteService = new SQLiteService(tempPath);
    
    // Test adding an incident
    const incidentId = await sqliteService.addIncident({
      imageFileName: 'test-screenshot.png',
      imagePath: TEST_CONFIG.testImagePath,
      remarks: TEST_CONFIG.testMetadata.description,
      incident: 'Test Incident',
      area: TEST_CONFIG.testMetadata.area,
      operator: TEST_CONFIG.testMetadata.operator,
      timestamp: TEST_CONFIG.testMetadata.timestamp
    });
    
    const passed = !!incidentId;
    logTest('SQLite Incident Creation', passed,
      passed ? `Incident created with ID: ${incidentId}` : 'Failed to create incident');
    
    // Test retrieving incidents
    const incidents = await sqliteService.getIncidents({ limit: 10 });
    const retrievalPassed = incidents.length > 0;
    logTest('SQLite Incident Retrieval', retrievalPassed,
      retrievalPassed ? `Retrieved ${incidents.length} incidents` : 'No incidents found');
    
    // Cleanup
    sqliteService.close();
    fs.rmSync(tempPath, { recursive: true, force: true });
    
    return passed && retrievalPassed;
  } catch (error) {
    logTest('SQLite Integration', false, `SQLite error: ${error.message}`);
    return false;
  }
}

async function testSyncFunctionality() {
  log('\n🔄 Testing Sync Functionality...', 'blue');
  
  // Test sync status endpoint
  const result = await makeRequest('GET', '/api/sync/status', null, {
    'Authorization': `Bearer ${global.testToken}`
  });
  
  const passed = result.success && result.status === 200;
  logTest('Sync Status Check', passed,
    passed ? 'Sync status available' : `Sync status failed: ${result.error}`);
  
  return passed;
}

async function testErrorHandling() {
  log('\n⚠️ Testing Error Handling...', 'blue');
  
  // Test invalid authentication
  const authResult = await makeRequest('GET', '/api/incidents', null, {
    'Authorization': 'Bearer invalid-token'
  });
  
  const authPassed = !authResult.success && authResult.status === 401;
  logTest('Invalid Auth Handling', authPassed,
    authPassed ? 'Properly rejected invalid token' : 'Failed to reject invalid token');
  
  // Test invalid file upload
  const uploadResult = await makeRequest('POST', '/api/incidents', {
    area: 'Test',
    description: 'Test'
    // Missing file
  }, {
    'Authorization': `Bearer ${global.testToken}`
  });
  
  const uploadPassed = !uploadResult.success && uploadResult.status === 400;
  logTest('Invalid Upload Handling', uploadPassed,
    uploadPassed ? 'Properly rejected invalid upload' : 'Failed to reject invalid upload');
  
  return authPassed && uploadPassed;
}

// Main Test Runner
async function runTests() {
  log('\n🚀 Starting Electron to Backend Integration Tests', 'bold');
  log('=' .repeat(60), 'blue');
  
  try {
    // Step 1: Backend Health
    const backendHealthy = await testBackendHealth();
    if (!backendHealthy) {
      log('\n❌ Backend is not running. Please start the backend first.', 'red');
      process.exit(1);
    }
    
    // Step 2: Database Connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      log('\n❌ Database connection failed. Please check database configuration.', 'red');
      process.exit(1);
    }
    
    // Step 3: Authentication
    const authPassed = await testAuthentication();
    if (!authPassed) {
      log('\n❌ Authentication failed. Please check credentials.', 'red');
      process.exit(1);
    }
    
    // Step 4: License Activation
    const licenseActivated = await testLicenseActivation();
    if (!licenseActivated) {
      log('\n❌ License activation failed. Please check license configuration.', 'red');
      process.exit(1);
    }
    
    // Step 5: File Upload
    const uploadPassed = await testFileUpload();
    if (!uploadPassed) {
      log('\n❌ File upload failed. Please check upload configuration.', 'red');
      process.exit(1);
    }
    
    // Step 6: Incident Retrieval
    await testIncidentRetrieval();
    
    // Step 7: SQLite Integration
    await testSQLiteIntegration();
    
    // Step 8: Sync Functionality
    await testSyncFunctionality();
    
    // Step 9: Error Handling
    await testErrorHandling();
    
  } catch (error) {
    log(`\n💥 Test execution failed: ${error.message}`, 'red');
    process.exit(1);
  }
  
  // Generate Report
  generateReport();
}

function generateReport() {
  log('\n' + '=' .repeat(60), 'blue');
  log('📊 TEST RESULTS SUMMARY', 'bold');
  log('=' .repeat(60), 'blue');
  
  log(`\nTotal Tests: ${testResults.total}`, 'blue');
  log(`Passed: ${colors.green}${testResults.passed}${colors.reset}`, 'blue');
  log(`Failed: ${colors.red}${testResults.failed}${colors.reset}`, 'blue');
  log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`, 'blue');
  
  if (testResults.failed > 0) {
    log('\n❌ FAILED TESTS:', 'red');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        log(`   • ${test.name}: ${test.details}`, 'red');
      });
  }
  
  log('\n✅ PASSED TESTS:', 'green');
  testResults.details
    .filter(test => test.passed)
    .forEach(test => {
      log(`   • ${test.name}`, 'green');
    });
  
  // Overall result
  const allPassed = testResults.failed === 0;
  log('\n' + '=' .repeat(60), 'blue');
  if (allPassed) {
    log('🎉 ALL TESTS PASSED! Integration is working correctly.', 'green');
  } else {
    log('⚠️ SOME TESTS FAILED. Please review the failed tests above.', 'yellow');
  }
  log('=' .repeat(60), 'blue');
  
  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\n⚠️ Test interrupted by user', 'yellow');
  generateReport();
});

process.on('unhandledRejection', (reason, promise) => {
  log(`\n💥 Unhandled Rejection at: ${promise}, reason: ${reason}`, 'red');
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testResults,
  TEST_CONFIG
}; 