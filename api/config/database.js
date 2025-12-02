const mysql = require('mysql2');
const prisma = require('../lib/prisma');

// Create connection pool (kept for migration scripts)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'exim_user',
  password: process.env.DB_PASSWORD || 'your_secure_password_here',
  database: process.env.DB_NAME || 'exim_invoicing',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Get a Promise based pool
const promisePool = pool.promise();

// Export both Prisma client and MySQL pool
// Use Prisma for all new code, MySQL pool is kept for migrations
module.exports = prisma;
module.exports.pool = pool;
module.exports.promise = promisePool;

