const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'screenshot_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Read and execute the seed SQL file
    const seedPath = path.join(__dirname, 'seed', '001_initial_data.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf-8');
    
    await pool.query(seedSQL);
    console.log('Database seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase(); 