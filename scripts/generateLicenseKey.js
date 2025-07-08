#!/usr/bin/env node

/**
 * License Key Generation Tool
 * Usage: node generateLicenseKey.js <customer_id> [max_activations] [expires_at]
 */

const { v4: uuidv4 } = require('uuid');
const readline = require('readline');
const { Pool } = require('pg');
require('dotenv').config({ path: '../backend/.env' });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'screenshot_db',
  user: process.env.DB_USER || 'screenshot_user',
  password: process.env.DB_PASSWORD || 'your_secure_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Logging functions
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const error = (message) => {
  console.error(`${colors.red}ERROR: ${message}${colors.reset}`);
};

const success = (message) => {
  console.log(`${colors.green}${message}${colors.reset}`);
};

const warning = (message) => {
  console.log(`${colors.yellow}${message}${colors.reset}`);
};

// Generate license key
const generateLicenseKey = () => {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(Math.random().toString(36).substring(2, 6).toUpperCase());
  }
  return segments.join('-');
};

// Validate UUID
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Validate date
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// Main function
const main = async () => {
  try {
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      error('Usage: node generateLicenseKey.js <customer_id> [max_activations] [expires_at]');
      error('Example: node generateLicenseKey.js 550e8400-e29b-41d4-a716-446655440006 5 2024-12-31');
      process.exit(1);
    }

    const customerId = args[0];
    const maxActivations = parseInt(args[1]) || 1;
    const expiresAt = args[2] || null;

    // Validate inputs
    if (!isValidUUID(customerId)) {
      error('Invalid customer ID format. Must be a valid UUID.');
      process.exit(1);
    }

    if (maxActivations < 1 || maxActivations > 1000) {
      error('Max activations must be between 1 and 1000.');
      process.exit(1);
    }

    if (expiresAt && !isValidDate(expiresAt)) {
      error('Invalid expiration date format. Use YYYY-MM-DD format.');
      process.exit(1);
    }

    // Connect to database
    log('Connecting to database...', 'blue');
    const pool = new Pool(dbConfig);

    // Test connection
    try {
      await pool.query('SELECT NOW()');
      success('Database connection successful!');
    } catch (err) {
      error(`Database connection failed: ${err.message}`);
      process.exit(1);
    }

    // Check if customer exists
    log('Verifying customer...', 'blue');
    const customerResult = await pool.query(
      'SELECT id, name, email FROM customers WHERE id = $1 AND is_active = true',
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      error('Customer not found or inactive.');
      process.exit(1);
    }

    const customer = customerResult.rows[0];
    success(`Customer found: ${customer.name} (${customer.email})`);

    // Generate unique license key
    log('Generating license key...', 'blue');
    let licenseKey;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      licenseKey = generateLicenseKey();
      const existingResult = await pool.query(
        'SELECT id FROM license_keys WHERE license_key = $1',
        [licenseKey]
      );
      isUnique = existingResult.rows.length === 0;
      attempts++;
    }

    if (!isUnique) {
      error('Failed to generate unique license key after 10 attempts.');
      process.exit(1);
    }

    // Create license key
    log('Creating license key in database...', 'blue');
    const licenseResult = await pool.query(
      `INSERT INTO license_keys 
       (license_key, customer_id, max_activations, expires_at, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, license_key, created_at`,
      [licenseKey, customerId, maxActivations, expiresAt]
    );

    const license = licenseResult.rows[0];

    // Log the creation
    await pool.query(
      `INSERT INTO audit_logs 
       (action, resource, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [
        'license_generated',
        'license',
        license.id,
        JSON.stringify({
          licenseKey: license.license_key,
          customerId,
          customerName: customer.name,
          maxActivations,
          expiresAt
        })
      ]
    );

    // Display results
    console.log('\n' + '='.repeat(60));
    success('LICENSE KEY GENERATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`License Key: ${colors.bright}${license.license_key}${colors.reset}`);
    console.log(`Customer: ${customer.name}`);
    console.log(`Email: ${customer.email}`);
    console.log(`Max Activations: ${maxActivations}`);
    console.log(`Expires At: ${expiresAt || 'Never'}`);
    console.log(`Created At: ${license.created_at}`);
    console.log(`License ID: ${license.id}`);
    console.log('='.repeat(60));

    // Close database connection
    await pool.end();
    success('License key generation completed!');

  } catch (err) {
    error(`An error occurred: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
};

// Interactive mode
const interactiveMode = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  try {
    log('License Key Generation Tool (Interactive Mode)', 'bright');
    log('='.repeat(50), 'blue');

    // Get customer ID
    const customerId = await question('Enter customer ID (UUID): ');
    if (!isValidUUID(customerId)) {
      error('Invalid customer ID format.');
      rl.close();
      return;
    }

    // Get max activations
    const maxActivationsInput = await question('Enter max activations (default: 1): ');
    const maxActivations = parseInt(maxActivationsInput) || 1;
    if (maxActivations < 1 || maxActivations > 1000) {
      error('Max activations must be between 1 and 1000.');
      rl.close();
      return;
    }

    // Get expiration date
    const expiresAtInput = await question('Enter expiration date (YYYY-MM-DD, optional): ');
    const expiresAt = expiresAtInput || null;
    if (expiresAt && !isValidDate(expiresAt)) {
      error('Invalid expiration date format.');
      rl.close();
      return;
    }

    // Confirm
    console.log('\nLicense Key Details:');
    console.log(`Customer ID: ${customerId}`);
    console.log(`Max Activations: ${maxActivations}`);
    console.log(`Expires At: ${expiresAt || 'Never'}`);
    
    const confirm = await question('\nProceed with license key generation? (y/N): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      log('Operation cancelled.', 'yellow');
      rl.close();
      return;
    }

    // Generate license key
    process.argv = ['node', 'generateLicenseKey.js', customerId, maxActivations.toString(), expiresAt];
    await main();

  } catch (err) {
    error(`An error occurred: ${err.message}`);
  } finally {
    rl.close();
  }
};

// Check if running in interactive mode
if (process.argv.includes('--interactive') || process.argv.includes('-i')) {
  interactiveMode();
} else {
  main();
} 