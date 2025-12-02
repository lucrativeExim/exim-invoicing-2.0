const express = require('express');
const router = express.Router();
const { User } = require('../models');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Helper function to generate JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      user_role: user.user_role,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

/**
 * Helper function to sanitize user data (remove password)
 */
const sanitizeUser = (user) => {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * POST /api/auth/login
 * Login user with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    // Find user by email with password included
    const user = await User.findByEmail(email, {
      includePassword: true,
      activeOnly: true,
    });

    if (!user || !user.password) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    // Verify password
    const isPasswordValid = await User.verifyPassword(user, password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    // Generate token
    const token = generateToken(user);

    // Return user data (without password) and token
    res.json({
      message: 'Login successful',
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      error: 'An error occurred during login',
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify JWT token and return user data
 */
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid or expired token',
      });
    }

    // Get user from database
    const user = await User.findById(decoded.id);
    
    // Check if user exists and is active
    if (!user || user.status !== 'Active') {
      return res.status(401).json({
        error: 'User not found or inactive',
      });
    }

    res.json({
      message: 'Token verified',
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({
      error: 'An error occurred while verifying token',
    });
  }
});

/**
 * POST /api/auth/register
 * Register a new user (optional - for admin use)
 */
router.post('/register', async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      mobile,
      user_role,
      authority,
    } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    // Check if user already exists
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return res.status(400).json({
        error: 'User with this email already exists',
      });
    }

    // Create new user
    const newUser = await User.create({
      first_name,
      last_name,
      email,
      password,
      mobile,
      user_role,
      authority,
    });

    // Generate token
    const token = generateToken(newUser);

    res.status(201).json({
      message: 'User registered successfully',
      user: sanitizeUser(newUser),
      token,
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({
      error: 'An error occurred during registration',
    });
  }
});

module.exports = router;

