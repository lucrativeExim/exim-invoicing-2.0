const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authenticate, requireRole } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Get all users - Only Super Admin and Admin can access
router.get('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID - Only Super Admin and Admin can access
router.get('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user - Only Super Admin and Admin can create users
router.post('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { first_name, last_name, email, password, mobile, user_role, authority, job_register_ids } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user already exists
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const user = await User.create({
      first_name,
      last_name,
      email,
      password,
      mobile,
      user_role,
      authority,
      job_register_ids,
      added_by: req.user.id, // Track who created this user
    });
    
    res.status(201).json({ 
      ...user,
      message: 'User created successfully' 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user - Only Super Admin and Admin can update users
router.put('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, password, mobile, user_role, authority, job_register_ids, status } = req.body;
    
    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being changed and already exists
    if (email && email !== existingUser.email) {
      const emailExists = await User.emailExists(email, id);
      if (emailExists) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }
    
    const user = await User.update(id, {
      first_name,
      last_name,
      email,
      password,
      mobile,
      user_role,
      authority,
      job_register_ids,
      status,
    });
    
    res.json({ 
      ...user,
      message: 'User updated successfully' 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (soft delete) - Only Super Admin can delete users
router.delete('/:id', requireRole(['Super_Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const existingUser = await User.findById(id, { includeDeleted: true });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.softDelete(id);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;

