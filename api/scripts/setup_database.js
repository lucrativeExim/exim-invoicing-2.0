const mysql = require('mysql2/promise');
const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🚀 Starting database setup for leo_munimji...\n');

    // Get database credentials from environment
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'leo_munimji';

    console.log(`📊 Database Configuration:`);
    console.log(`   Host: ${dbHost}`);
    console.log(`   User: ${dbUser}`);
    console.log(`   Database: ${dbName}\n`);

    // Connect to MySQL server (without selecting a database)
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
    });

    console.log('✅ Connected to MySQL server');

    // Create database if it doesn't exist
    console.log(`\n📦 Creating database '${dbName}' if it doesn't exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database '${dbName}' is ready`);

    await connection.end();

    // Run Prisma migrations
    console.log('\n🔄 Running Prisma migrations...');
    try {
      process.chdir(path.join(__dirname, '..'));
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Prisma migrations completed successfully');
    } catch (error) {
      console.error('❌ Error running Prisma migrations:', error.message);
      // Try alternative: prisma migrate dev
      console.log('\n🔄 Trying prisma migrate dev...');
      try {
        execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
        console.log('✅ Prisma migrations completed successfully');
      } catch (devError) {
        console.error('❌ Error with migrate dev:', devError.message);
        throw devError;
      }
    }

    // Generate Prisma Client
    console.log('\n🔨 Generating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma Client generated');

    console.log('\n✅ Database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: node scripts/create_admin_user.js');
    console.log('   2. Start the server: npm run dev');

  } catch (error) {
    console.error('\n❌ Error during database setup:', error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

setupDatabase();

