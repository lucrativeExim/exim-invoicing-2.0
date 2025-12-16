const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authenticate, requireRole } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Get current user's profile - Accessible to the current user only
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return only the fields the user should see
    res.json({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      mobile: user.mobile,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update current user's profile - Accessible to the current user only
router.put('/profile', async (req, res) => {
  try {
    const { first_name, last_name, mobile } = req.body;
    
    // Only allow updating first_name, last_name, and mobile
    const user = await User.update(req.user.id, {
      first_name,
      last_name,
      mobile,
    });
    
    // Update localStorage user data (will be handled on frontend)
    res.json({ 
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      mobile: user.mobile,
      message: 'Profile updated successfully' 
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update current user's password - Accessible to the current user only
router.put('/profile/password', async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    
    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }
    
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    // Get user with password
    const user = await User.findById(req.user.id, { includePassword: true });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify old password
    const isValidPassword = await User.verifyPassword(user, old_password);
    
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    await User.update(req.user.id, { password: new_password });
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Update user's password by Super Admin - Accessible to Super Admin only
router.put('/:id/password', requireRole(['Super_Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;
    
    if (!new_password) {
      return res.status(400).json({ error: 'New password is required' });
    }
    
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update password
    await User.update(id, { password: new_password });
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating user password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

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

