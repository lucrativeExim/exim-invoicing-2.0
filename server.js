const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection with Prisma
(async () => {
  try {
    await db.$connect();
    console.log('✅ Connected to MySQL database via Prisma');
  } catch (error) {
    console.error('Error connecting to MySQL:', error);
  }
})();

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to EXIM Invoicing API 2.0' });
});

// Import routes
const usersRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

