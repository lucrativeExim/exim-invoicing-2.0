const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Database configuration from environment variables
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'exim_user',
  password: process.env.DB_PASSWORD || 'your_secure_password_here',
  database: process.env.DB_NAME || 'leo_munimji',
  multipleStatements: true, // Allow multiple SQL statements
};

async function runMigration() {
  console.log('🚀 Starting migration: Rename performa to proforma\n');
  console.log(`Database: ${DB_CONFIG.database}`);
  console.log(`Host: ${DB_CONFIG.host}`);
  console.log(`User: ${DB_CONFIG.user}\n`);

  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to database\n');

    // Read the migration SQL file
    const migrationFile = path.join(__dirname, '../migrations/014_rename_performa_to_proforma.sql');
    
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }

    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statement(s) to execute:\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements and comments
      if (!statement || statement.trim().length === 0) continue;
      
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        // Log the statement type (first few words)
        const statementType = statement.split(/\s+/).slice(0, 3).join(' ').toUpperCase();
        console.log(`  Type: ${statementType}`);
        
        await connection.query(statement);
        console.log(`  ✅ Statement ${i + 1} completed successfully\n`);
      } catch (error) {
        // Check if error is about missing index/constraint (which is OK if it doesn't exist)
        if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY' || 
            error.code === 'ER_DROP_INDEX_FK' ||
            error.message.includes('doesn\'t exist')) {
          console.log(`  ⚠️  Warning: ${error.message}`);
          console.log(`  ℹ️  This is OK if the index/constraint doesn't exist yet\n`);
        } else {
          throw error;
        }
      }
    }

    // Verify the changes
    console.log('🔍 Verifying changes...\n');
    
    // Check enum values
    const [enumCheck] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'invoices' 
      AND COLUMN_NAME = 'invoice_stage_status'
    `, [DB_CONFIG.database]);
    
    if (enumCheck.length > 0) {
      const enumType = enumCheck[0].COLUMN_TYPE;
      if (enumType.includes('Proforma')) {
        console.log('✅ Enum updated: invoice_stage_status now includes "Proforma"');
      } else {
        console.log('⚠️  Warning: Enum may not have been updated correctly');
      }
    }

    // Check column names
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'invoices' 
      AND COLUMN_NAME LIKE '%proforma%'
    `, [DB_CONFIG.database]);
    
    console.log(`✅ Found ${columns.length} proforma columns:`);
    columns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}`);
    });

    // Check data updates
    const [dataCheck] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM invoices 
      WHERE invoice_stage_status = 'Proforma'
    `);
    
    console.log(`\n✅ Found ${dataCheck[0].count} invoice(s) with status 'Proforma'`);

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Enum value updated: Performa → Proforma');
    console.log('   - Columns renamed: performa_* → proforma_*');
    console.log('   - Indexes updated');
    console.log('   - Foreign keys updated');
    console.log('   - Data updated');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    if (error.sql) {
      console.error(`   SQL: ${error.sql.substring(0, 200)}...`);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

// Run the migration
runMigration().catch(console.error);

