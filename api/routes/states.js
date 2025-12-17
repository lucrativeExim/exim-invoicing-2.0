const express = require('express');
const router = express.Router();
const { State } = require('../models');
const { authenticate, requireRole } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Get all states - Accessible to all authenticated users
router.get('/', async (req, res) => {
  try {
    const states = await State.findAll();
    res.json(states);
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

// Get state by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const state = await State.findById(id);
    
    if (!state) {
      return res.status(404).json({ error: 'State not found' });
    }
    
    res.json(state);
  } catch (error) {
    console.error('Error fetching state:', error);
    res.status(500).json({ error: 'Failed to fetch state' });
  }
});

module.exports = router;







