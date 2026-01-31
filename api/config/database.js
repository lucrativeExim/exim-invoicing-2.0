const mysql = require('mysql2');
const prisma = require('../lib/prisma');

// Create connection pool (kept for migration scripts)
// Database stores dates in UTC, application uses IST for display
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'leo_munimji',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00' // UTC - database always stores in UTC
});

// Get a Promise based pool
const promisePool = pool.promise();

// Export both Prisma client and MySQL pool
// Use Prisma for all new code, MySQL pool is kept for migrations
module.exports = prisma;
module.exports.pool = pool;
module.exports.promise = promisePool;

