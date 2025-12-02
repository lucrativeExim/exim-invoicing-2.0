const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
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

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    res.status(500).json({
      error: 'An error occurred during authentication',
    });
  }
};

/**
 * Middleware to check if user has required role
 * @param {Array} allowedRoles - Array of allowed roles (e.g., ['Super_Admin', 'Admin'])
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.user_role)) {
      return res.status(403).json({
        error: 'Insufficient permissions. Required role: ' + allowedRoles.join(' or '),
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has required authority
 * @param {Array} allowedAuthorities - Array of allowed authorities (e.g., ['Job_Details', 'Invoicing'])
 */
const requireAuthority = (allowedAuthorities) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    // Super Admin has access to everything
    if (req.user.user_role === 'Super_Admin') {
      return next();
    }

    // Parse comma-separated authority string into array
    const userAuthorities = req.user.authority 
      ? req.user.authority.split(',').map(a => a.trim()).filter(Boolean)
      : [];

    // Check if user has any of the required authorities
    const hasAuthority = allowedAuthorities.some(auth => userAuthorities.includes(auth));

    if (!hasAuthority) {
      return res.status(403).json({
        error: 'Insufficient permissions. Required authority: ' + allowedAuthorities.join(' or '),
      });
    }

    next();
  };
};

/**
 * Combined middleware: Check role OR authority
 * @param {Object} options - { roles: [], authorities: [] }
 */
const requireAccess = (options = {}) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const { roles = [], authorities = [] } = options;

    // Super Admin has access to everything
    if (req.user.user_role === 'Super_Admin') {
      return next();
    }

    // Check role
    if (roles.length > 0 && roles.includes(req.user.user_role)) {
      return next();
    }

    // Check authority (handle comma-separated string)
    if (authorities.length > 0) {
      const userAuthorities = req.user.authority 
        ? req.user.authority.split(',').map(a => a.trim()).filter(Boolean)
        : [];
      const hasAuthority = authorities.some(auth => userAuthorities.includes(auth));
      if (hasAuthority) {
        return next();
      }
    }

    return res.status(403).json({
      error: 'Insufficient permissions',
    });
  };
};

module.exports = {
  authenticate,
  requireRole,
  requireAuthority,
  requireAccess,
};

