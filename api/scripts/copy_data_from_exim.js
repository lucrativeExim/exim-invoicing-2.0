const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuration
const SOURCE_DB = 'exim_invoicing';
const TARGET_DB = 'leo_munimji';

// Tables to copy in order (respecting foreign key dependencies)
const TABLES_TO_COPY = [
  'state',
  'gst_rates',
  'accounts',
  'client_info',
  'client_bu',
  'client_service_charges',
  'fields_master'
];

async function copyData() {
  let sourceConn, targetConn;
  
  try {
    console.log('🚀 Starting data copy from exim_invoicing to leo_munimji...\n');

    // Get database credentials from environment
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';

    console.log(`📊 Database Configuration:`);
    console.log(`   Host: ${dbHost}`);
    console.log(`   User: ${dbUser}`);
    console.log(`   Source DB: ${SOURCE_DB}`);
    console.log(`   Target DB: ${TARGET_DB}\n`);

    // Connect to source database
    console.log(`🔗 Connecting to source database '${SOURCE_DB}'...`);
    sourceConn = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: SOURCE_DB,
    });
    console.log('✅ Connected to source database\n');

    // Connect to target database
    console.log(`🔗 Connecting to target database '${TARGET_DB}'...`);
    targetConn = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: TARGET_DB,
    });
    console.log('✅ Connected to target database\n');

    // Copy each table
    for (const tableName of TABLES_TO_COPY) {
      await copyTable(sourceConn, targetConn, tableName);
    }

    console.log('\n✅ Data copy completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Tables copied: ${TABLES_TO_COPY.length}`);
    console.log(`   Tables: ${TABLES_TO_COPY.join(', ')}`);

  } catch (error) {
    console.error('\n❌ Error during data copy:', error);
    throw error;
  } finally {
    if (sourceConn) await sourceConn.end();
    if (targetConn) await targetConn.end();
  }
}

async function copyTable(sourceConn, targetConn, tableName) {
  try {
    console.log(`\n📋 Copying table: ${tableName}`);

    // Check if table exists in source
    const [sourceTables] = await sourceConn.query(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
      [SOURCE_DB, tableName]
    );

    if (sourceTables[0].count === 0) {
      console.log(`   ⚠️  Table '${tableName}' does not exist in source database. Skipping...`);
      return;
    }

    // Get all data from source table
    const [rows] = await sourceConn.query(`SELECT * FROM ??`, [tableName]);
    const rowCount = rows.length;

    if (rowCount === 0) {
      console.log(`   ℹ️  Table '${tableName}' is empty. Skipping...`);
      return;
    }

    console.log(`   📥 Found ${rowCount} rows in source table`);

    // Get column names
    const columns = Object.keys(rows[0]);
    const columnList = columns.map(col => `\`${col}\``).join(', ');

    // Check existing data in target
    const [existingRows] = await targetConn.query(`SELECT COUNT(*) as count FROM ??`, [tableName]);
    const existingCount = existingRows[0].count;

    if (existingCount > 0) {
      console.log(`   ⚠️  Target table already has ${existingCount} rows. Using INSERT IGNORE to avoid duplicates...`);
    }

    // Get foreign key columns for this table
    const fkColumns = getForeignKeyColumns(tableName);
    
    // Validate foreign keys before inserting
    if (fkColumns.length > 0) {
      console.log(`   🔍 Validating foreign key references...`);
      await validateForeignKeys(targetConn, tableName, rows, fkColumns);
    }

    // Prepare insert query with INSERT IGNORE to handle duplicates
    const placeholders = columns.map(() => '?').join(', ');
    const insertQuery = `INSERT IGNORE INTO ?? (${columnList}) VALUES (${placeholders})`;

    // Insert data in batches
    const batchSize = 100;
    let insertedCount = 0;
    let skippedCount = 0;
    let fkNullifiedCount = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      for (const row of batch) {
        try {
          // Clean foreign keys that don't exist in target
          const cleanedRow = await cleanForeignKeys(targetConn, tableName, row, fkColumns);
          const hadFkNullified = fkColumns.some(fk => 
            row[fk] !== null && row[fk] !== undefined && cleanedRow[fk] === null
          );
          
          if (hadFkNullified) {
            fkNullifiedCount++;
          }

          const values = columns.map(col => cleanedRow[col]);
          const [result] = await targetConn.query(insertQuery, [tableName, ...values]);
          
          if (result.affectedRows > 0) {
            insertedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          // Handle other errors
          skippedCount++;
          if (error.code !== 'ER_DUP_ENTRY') {
            console.log(`   ⚠️  Error inserting row ID ${row.id || 'unknown'}: ${error.message}`);
          }
        }
      }

      // Progress update
      const processed = Math.min(i + batchSize, rows.length);
      process.stdout.write(`   ⏳ Progress: ${processed}/${rowCount} rows processed...\r`);
    }

    console.log(`\n   ✅ Completed:`);
    console.log(`      - ${insertedCount} rows inserted`);
    console.log(`      - ${skippedCount} rows skipped (duplicates or errors)`);
    if (fkNullifiedCount > 0) {
      console.log(`      - ${fkNullifiedCount} rows had foreign keys set to null (referenced records don't exist)`);
    }

  } catch (error) {
    console.error(`\n   ❌ Error copying table '${tableName}':`, error.message);
    throw error;
  }
}

// Validate and clean foreign keys
async function cleanForeignKeys(targetConn, tableName, row, fkColumns) {
  const cleanedRow = { ...row };
  
  for (const fkCol of fkColumns) {
    const fkValue = row[fkCol];
    
    if (fkValue === null || fkValue === undefined) {
      continue;
    }

    // Get the referenced table for this foreign key
    const referencedTable = getReferencedTable(tableName, fkCol);
    
    if (referencedTable) {
      // Check if the referenced record exists
      try {
        const [refRows] = await targetConn.query(
          `SELECT COUNT(*) as count FROM ?? WHERE id = ?`,
          [referencedTable, fkValue]
        );
        
        if (refRows[0].count === 0) {
          // Referenced record doesn't exist, set FK to null
          cleanedRow[fkCol] = null;
        }
      } catch (error) {
        // If table doesn't exist or error, set to null
        cleanedRow[fkCol] = null;
      }
    }
  }
  
  return cleanedRow;
}

// Validate foreign keys (informational)
async function validateForeignKeys(targetConn, tableName, rows, fkColumns) {
  const fkStats = {};
  
  for (const fkCol of fkColumns) {
    const referencedTable = getReferencedTable(tableName, fkCol);
    if (!referencedTable) continue;
    
    const uniqueFkValues = [...new Set(rows.map(r => r[fkCol]).filter(v => v !== null && v !== undefined))];
    
    if (uniqueFkValues.length > 0) {
      const placeholders = uniqueFkValues.map(() => '?').join(',');
      try {
        const [refRows] = await targetConn.query(
          `SELECT COUNT(*) as count FROM ?? WHERE id IN (${placeholders})`,
          [referencedTable, ...uniqueFkValues]
        );
        
        const existingCount = refRows[0].count;
        const missingCount = uniqueFkValues.length - existingCount;
        
        if (missingCount > 0) {
          fkStats[fkCol] = { total: uniqueFkValues.length, existing: existingCount, missing: missingCount };
        }
      } catch (error) {
        // Table might not exist, that's okay
      }
    }
  }
  
  if (Object.keys(fkStats).length > 0) {
    console.log(`   ⚠️  Foreign key validation:`);
    for (const [fkCol, stats] of Object.entries(fkStats)) {
      console.log(`      - ${fkCol}: ${stats.missing} out of ${stats.total} referenced records don't exist (will be set to null)`);
    }
  }
}

// Get referenced table for a foreign key column
function getReferencedTable(tableName, fkColumn) {
  const fkMap = {
    'gst_rates': { 'added_by': 'users' },
    'accounts': { 'added_by': 'users', 'deleted_by': 'users' },
    'client_info': { 'account_id': 'accounts', 'added_by': 'users', 'deleted_by': 'users' },
    'client_bu': { 'client_info_id': 'client_info', 'state_id': 'state', 'added_by': 'users', 'deleted_by': 'users' },
    'client_service_charges': { 
      'account_id': 'accounts', 
      'client_info_id': 'client_info', 
      'client_bu_id': 'client_bu', 
      'job_register_id': 'job_register',
      'added_by': 'users', 
      'deleted_by': 'users' 
    },
    'fields_master': { 'added_by': 'users', 'deleted_by': 'users' }
  };
  
  return fkMap[tableName]?.[fkColumn] || null;
}

// Helper function to get foreign key columns for each table
function getForeignKeyColumns(tableName) {
  const fkMap = {
    'state': [],
    'gst_rates': ['added_by'],
    'accounts': ['added_by', 'deleted_by'],
    'client_info': ['account_id', 'added_by', 'deleted_by'],
    'client_bu': ['client_info_id', 'state_id', 'added_by', 'deleted_by'],
    'client_service_charges': ['account_id', 'client_info_id', 'client_bu_id', 'job_register_id', 'added_by', 'deleted_by'],
    'fields_master': ['added_by', 'deleted_by']
  };
  
  return fkMap[tableName] || [];
}

// Run the copy
copyData()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

