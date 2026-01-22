#!/usr/bin/env node

/**
 * Script to resolve missing migration and create new migration
 * Run: node scripts/resolve_and_migrate.js
 */

const { execSync } = require('child_process');
const path = require('path');

const API_DIR = path.join(__dirname, '..');

console.log('🔧 Resolving migration state...\n');

try {
  // Change to api directory
  process.chdir(API_DIR);

  // Resolve the missing migration
  console.log('Step 1: Resolving missing migration...');
  execSync('npx prisma migrate resolve --applied 20260119122841_update_invoice_decimal_fields', {
    stdio: 'inherit',
    cwd: API_DIR
  });

  console.log('\n✅ Migration resolved successfully!\n');

  // Create new migration
  console.log('Step 2: Creating new migration...');
  console.log('Note: You will need to run this interactively:');
  console.log('npx prisma migrate dev --name rename_reward_penalty_to_reward_discount_and_add_discount_amount\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

