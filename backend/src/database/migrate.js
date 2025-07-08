const fs = require('fs');
const path = require('path');
const { query, testConnection } = require('./connection');
const logger = require('../utils/logger');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const SEEDS_DIR = path.join(__dirname, 'seed');

// Create migrations table if it doesn't exist
const createMigrationsTable = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await query(createTableSQL);
    logger.info('Migrations table created/verified');
  } catch (error) {
    logger.error('Error creating migrations table:', error);
    throw error;
  }
};

// Get list of executed migrations
const getExecutedMigrations = async () => {
  try {
    const result = await query('SELECT filename FROM migrations ORDER BY id');
    return result.rows.map(row => row.filename);
  } catch (error) {
    logger.error('Error getting executed migrations:', error);
    return [];
  }
};

// Execute a migration file
const executeMigration = async (filename) => {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await query(sql);
    
    // Record the migration
    await query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
    
    logger.info(`Migration executed: ${filename}`);
  } catch (error) {
    logger.error(`Error executing migration ${filename}:`, error);
    throw error;
  }
};

// Execute a seed file
const executeSeed = async (filename) => {
  const filePath = path.join(SEEDS_DIR, filename);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await query(sql);
    
    logger.info(`Seed executed: ${filename}`);
  } catch (error) {
    logger.error(`Error executing seed ${filename}:`, error);
    throw error;
  }
};

// Run migrations
const runMigrations = async () => {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Create migrations table
    await createMigrationsTable();

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();

    // Get all migration files
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Execute pending migrations
    for (const filename of migrationFiles) {
      if (!executedMigrations.includes(filename)) {
        await executeMigration(filename);
      } else {
        logger.info(`Migration already executed: ${filename}`);
      }
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run seeds
const runSeeds = async () => {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Get all seed files
    const seedFiles = fs.readdirSync(SEEDS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Execute seed files
    for (const filename of seedFiles) {
      await executeSeed(filename);
    }

    logger.info('All seeds completed successfully');
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  const command = process.argv[2];

  switch (command) {
    case 'migrate':
      await runMigrations();
      break;
    case 'seed':
      await runSeeds();
      break;
    case 'reset':
      logger.info('Running migrations and seeds...');
      await runMigrations();
      await runSeeds();
      break;
    default:
      logger.error('Usage: node migrate.js [migrate|seed|reset]');
      process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main().then(() => {
    process.exit(0);
  }).catch((error) => {
    logger.error('Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runMigrations,
  runSeeds
}; 