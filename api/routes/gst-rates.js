const express = require('express');
const router = express.Router();
const { GstRate } = require('../models');
const { authenticate, requireRole } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Get all GST rates - Only Super Admin and Admin can access
router.get('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const gstRates = await GstRate.findAll();
    res.json(gstRates);
  } catch (error) {
    console.error('Error fetching GST rates:', error);
    res.status(500).json({ error: 'Failed to fetch GST rates' });
  }
});

// Get GST rate by ID - Only Super Admin and Admin can access
router.get('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const gstRate = await GstRate.findById(id);
    
    if (!gstRate) {
      return res.status(404).json({ error: 'GST rate not found' });
    }
    
    res.json(gstRate);
  } catch (error) {
    console.error('Error fetching GST rate:', error);
    res.status(500).json({ error: 'Failed to fetch GST rate' });
  }
});

// Create new GST rate - Only Super Admin and Admin can create GST rates
router.post('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const {
      sac_no,
      sgst,
      cgst,
      igst,
    } = req.body;
    
    if (!sac_no) {
      return res.status(400).json({ error: 'SAC number is required' });
    }

    // Check if SAC number already exists
    const sacExists = await GstRate.sacNoExists(sac_no);
    if (sacExists) {
      return res.status(400).json({ error: 'GST rate with this SAC number already exists' });
    }

    const gstRate = await GstRate.create({
      sac_no,
      sgst,
      cgst,
      igst,
      added_by: req.user.id, // Track who created this GST rate
    });
    
    res.status(201).json({ 
      ...gstRate,
      message: 'GST rate created successfully' 
    });
  } catch (error) {
    console.error('Error creating GST rate:', error);
    res.status(500).json({ error: 'Failed to create GST rate' });
  }
});

// Update GST rate - Only Super Admin and Admin can update GST rates
router.put('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sac_no,
      sgst,
      cgst,
      igst,
    } = req.body;
    
    // Check if GST rate exists
    const existingGstRate = await GstRate.findById(id);
    if (!existingGstRate) {
      return res.status(404).json({ error: 'GST rate not found' });
    }

    // Check if SAC number is being changed and already exists
    if (sac_no && sac_no !== existingGstRate.sac_no) {
      const sacExists = await GstRate.sacNoExists(sac_no, id);
      if (sacExists) {
        return res.status(400).json({ error: 'SAC number already in use' });
      }
    }
    
    const gstRate = await GstRate.update(id, {
      sac_no,
      sgst,
      cgst,
      igst,
    });
    
    res.json({ 
      ...gstRate,
      message: 'GST rate updated successfully' 
    });
  } catch (error) {
    console.error('Error updating GST rate:', error);
    res.status(500).json({ error: 'Failed to update GST rate' });
  }
});

// Delete GST rate - Only Super Admin can delete GST rates
router.delete('/:id', requireRole(['Super_Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if GST rate exists
    const existingGstRate = await GstRate.findById(id);
    if (!existingGstRate) {
      return res.status(404).json({ error: 'GST rate not found' });
    }

    await GstRate.delete(id);
    
    res.json({ message: 'GST rate deleted successfully' });
  } catch (error) {
    console.error('Error deleting GST rate:', error);
    res.status(500).json({ error: 'Failed to delete GST rate' });
  }
});

module.exports = router;

