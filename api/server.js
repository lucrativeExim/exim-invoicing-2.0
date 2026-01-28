// Set application default timezone to IST (Asia/Kolkata)
// Database stores dates in UTC, but application uses IST for display/logging
process.env.TZ = 'Asia/Kolkata';

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

// Body parsing middleware - skip for multipart/form-data (multer handles it)
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    // Skip body parsing for multipart - multer will handle it
    return next();
  }
  next();
});

// Apply body parsers for non-multipart requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Store original methods
  const originalEnd = res.end;
  const originalWrite = res.write;
  let responseSize = 0;
  
  // Override write method to capture response chunks
  res.write = function(chunk, encoding) {
    if (chunk) {
      responseSize += Buffer.byteLength(chunk, encoding);
    }
    return originalWrite.call(this, chunk, encoding);
  };
  
  // Override end method to capture final response size and log
  res.end = function(chunk, encoding) {
    if (chunk) {
      responseSize += Buffer.byteLength(chunk, encoding);
    }
    
    // Calculate time taken
    const timeTaken = Date.now() - startTime;
    
    // Format timestamp in IST without timezone indicator
    const now = new Date();
    // Get IST time string and parse it
    const istString = now.toLocaleString('en-US', { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    // Format: MM/DD/YYYY, HH:MM:SS -> YYYY-MM-DDTHH:MM:SS
    const [datePart, timePart] = istString.split(', ');
    const [month, day, year] = datePart.split('/');
    const timestamp = `${year}-${month}-${day}T${timePart}`;
    
    // Format response size
    const sizeStr = responseSize < 1024 ? `${responseSize}b` : `${(responseSize / 1024).toFixed(1)}kb`;
    
    // Log in format: timestamp method url timeTaken size
    const method = req.method.toLowerCase();
    const url = req.originalUrl || req.url;
    console.log(`${timestamp} ${method} ${url} ${timeTaken}ms ${sizeStr}`);
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
});

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
const clientInfoRoutes = require('./routes/client-info');
const clientBuRoutes = require('./routes/client-bu');
const clientServiceChargesRoutes = require('./routes/client-service-charges');
const statesRoutes = require('./routes/states');
const jobsRoutes = require('./routes/jobs');
const jobAttachmentsRoutes = require('./routes/job-attachments');
const jobAttachmentsFilesRoutes = require('./routes/job-attachments-files');

// Log route registration for debugging
console.log('📦 Loading routes...');

// Load invoices route with error handling
let invoicesRoutes;
try {
  invoicesRoutes = require('./routes/invoices');
  console.log('✅ Invoices route loaded successfully');
} catch (error) {
  console.error('❌ Error loading invoices route:', error);
  console.error(error.stack);
}

app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/job-register', jobRegisterRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/gst-rates', gstRatesRoutes);
app.use('/api/fields-master', fieldsMasterRoutes);
app.use('/api/job-register-fields', jobRegisterFieldsRoutes);
app.use('/api/client-info', clientInfoRoutes);
app.use('/api/client-bu', clientBuRoutes);
app.use('/api/client-service-charges', clientServiceChargesRoutes);
app.use('/api/states', statesRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/job-attachments', jobAttachmentsRoutes);
app.use('/api/job-attachments-files', jobAttachmentsFilesRoutes);

// Register invoices route with error handling
if (invoicesRoutes && typeof invoicesRoutes === 'function') {
  app.use('/api/invoices', invoicesRoutes);
  console.log('✅ Invoices route registered at /api/invoices');
} else {
  console.error('❌ Invoices route not registered - route must export a router');
}

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

