#!/usr/bin/env node

/**
 * Database Migration Runner
 * Runs SQL migration files using the database configuration from .env
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'exim_invoicing',
  multipleStatements: true
};

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

// Get all migration files sorted
function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
  return files;
}

// Read and execute SQL file
async function runMigration(connection, filePath) {
  return new Promise((resolve, reject) => {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    connection.query(sql, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

// Main execution
async function main() {
  console.log('🚀 Starting database migration...\n');
  console.log(`Database: ${DB_CONFIG.database}`);
  console.log(`Host: ${DB_CONFIG.host}`);
  console.log(`User: ${DB_CONFIG.user}\n`);

  const connection = mysql.createConnection(DB_CONFIG);

  try {
    // Connect to database
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('✅ Connected to database\n');

    // Get migration files
    const migrationFiles = getMigrationFiles();
    console.log(`Found ${migrationFiles.length} migration file(s):\n`);

    // Run each migration
    for (const file of migrationFiles) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      console.log(`Running: ${file}...`);
      
      try {
        await runMigration(connection, filePath);
        console.log(`✅ ${file} completed successfully\n`);
      } catch (error) {
        console.error(`❌ Error running ${file}:`);
        console.error(error.message);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    connection.end();
  }
}

// Run migrations
main().catch(console.error);

