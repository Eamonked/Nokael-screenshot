require('dotenv').config();
const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'screenshot_db',
  user: process.env.DB_USER || 'screenshot_user',
  password: process.env.DB_PASSWORD || 'your_secure_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
};

// Debug: Log the configuration being used
console.log('Database Configuration:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  ssl: dbConfig.ssl
});

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    logger.info('Database connection established successfully');
    client.release();
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error.message);
    return false;
  }
};

// Execute query with error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Query error', { text, duration, error: error.message });
    throw error;
  }
};

// Get a client from the pool for transactions
const getClient = async () => {
  return await pool.connect();
};

// Execute transaction
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Close all connections in the pool
const closePool = async () => {
  await pool.end();
  logger.info('Database pool closed');
};

module.exports = {
  pool,
  query,
  getClient,
  transaction,
  testConnection,
  closePool
}; 