const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5002;
console.log(PORT);
// Middleware - CORS configuration
// For development, allow all origins from localhost
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200
}));

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
const jobRegisterRoutes = require('./routes/job-register');
const accountsRoutes = require('./routes/accounts');
const gstRatesRoutes = require('./routes/gst-rates');
const fieldsMasterRoutes = require('./routes/fields-master');
const jobRegisterFieldsRoutes = require('./routes/job-register-fields');
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/job-register', jobRegisterRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/gst-rates', gstRatesRoutes);
app.use('/api/fields-master', fieldsMasterRoutes);
app.use('/api/job-register-fields', jobRegisterFieldsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: Origin not allowed' });
  }
  
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

