const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Checking and adding reward_amount and discount_amount columns...');
    
    // Check if reward_amount exists, if not add it
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE invoices 
        ADD COLUMN reward_amount DECIMAL(10,2) DEFAULT 0
      `);
      console.log('✓ Added reward_amount column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('✓ reward_amount column already exists');
      } else {
        throw error;
      }
    }
    
    // Check if discount_amount exists, if not add it
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE invoices 
        ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0
      `);
      console.log('✓ Added discount_amount column');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('✓ discount_amount column already exists');
      } else {
        throw error;
      }
    }
    
    // Drop old columns if they exist
    const columnsToDrop = ['reward_penalty_input', 'reward_penalty_amount', 'reward_discount_input'];
    
    for (const columnName of columnsToDrop) {
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE invoices 
          DROP COLUMN ${columnName}
        `);
        console.log(`✓ Dropped ${columnName} column`);
      } catch (error) {
        if (error.message.includes('doesn\'t exist') || error.message.includes('Unknown column')) {
          console.log(`✓ ${columnName} column doesn't exist (already removed)`);
        } else {
          console.error(`Error dropping ${columnName}:`, error.message);
        }
      }
    }
    
    console.log('\nMigration completed successfully!');
    console.log('Please regenerate Prisma client: npx prisma generate');
  } catch (error) {
    console.error('Error applying migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
