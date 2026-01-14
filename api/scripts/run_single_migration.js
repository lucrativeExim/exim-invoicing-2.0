#!/usr/bin/env node

/**
 * Run a single migration file
 * Usage: node scripts/run_single_migration.js <migration_file_name>
 * Example: node scripts/run_single_migration.js 012_add_billing_type_to_job.sql
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
require('dotenv').config();

const migrationFileName = process.argv[2];

if (!migrationFileName) {
  console.error('❌ Error: Please provide a migration file name');
  console.log('Usage: node scripts/run_single_migration.js <migration_file_name>');
  console.log('Example: node scripts/run_single_migration.js 012_add_billing_type_to_job.sql');
  process.exit(1);
}

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'exim_invoicing',
  multipleStatements: true
};

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const migrationFilePath = path.join(MIGRATIONS_DIR, migrationFileName);

// Check if file exists
if (!fs.existsSync(migrationFilePath)) {
  console.error(`❌ Error: Migration file not found: ${migrationFilePath}`);
  process.exit(1);
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
  console.log('🚀 Running single migration...\n');
  console.log(`Migration file: ${migrationFileName}`);
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

    // Run migration
    console.log(`Running: ${migrationFileName}...`);
    await runMigration(connection, migrationFilePath);
    console.log(`✅ ${migrationFileName} completed successfully\n`);

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    connection.end();
  }
}

// Run migration
main().catch(console.error);
