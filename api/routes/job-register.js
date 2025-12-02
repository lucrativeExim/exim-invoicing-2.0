const express = require('express');
const router = express.Router();
const { JobRegister } = require('../models');
const { authenticate, requireRole } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Get all job registers - Only Super Admin and Admin can access
router.get('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const jobRegisters = await JobRegister.findAll({ 
      activeOnly: activeOnly === 'true',
      includeDeleted: false 
    });
    res.json(jobRegisters);
  } catch (error) {
    console.error('Error fetching job registers:', error);
    res.status(500).json({ error: 'Failed to fetch job registers' });
  }
});

// Get job register by ID - Only Super Admin and Admin can access
router.get('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const jobRegister = await JobRegister.findById(id);
    
    if (!jobRegister) {
      return res.status(404).json({ error: 'Job register not found' });
    }
    
    res.json(jobRegister);
  } catch (error) {
    console.error('Error fetching job register:', error);
    res.status(500).json({ error: 'Failed to fetch job register' });
  }
});

// Create new job register - Only Super Admin and Admin can create
router.post('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const {
      job_code,
      job_title,
      job_type,
      gst_rate_id,
      remi_one_desc,
      remi_two_desc,
      remi_three_desc,
      remi_four_desc,
      remi_five_desc,
      status,
    } = req.body;
    
    // Validate required fields
    if (!job_title) {
      return res.status(400).json({ error: 'Job title is required' });
    }
    if (!job_type) {
      return res.status(400).json({ error: 'Job type is required' });
    }
    if (!gst_rate_id) {
      return res.status(400).json({ error: 'GST Rate (SAC Number) is required' });
    }

    // Check if job title already exists
    const jobTitleExists = await JobRegister.jobTitleExists(job_title);
    if (jobTitleExists) {
      return res.status(400).json({ error: 'Job register with this job title already exists' });
    }

    // Check if job code already exists (if provided)
    if (job_code) {
      const jobCodeExists = await JobRegister.jobCodeExists(job_code);
      if (jobCodeExists) {
        return res.status(400).json({ error: 'Job register with this job code already exists' });
      }
    }

    const jobRegister = await JobRegister.create({
      job_code,
      job_title,
      job_type,
      gst_rate_id,
      remi_one_desc,
      remi_two_desc,
      remi_three_desc,
      remi_four_desc,
      remi_five_desc,
      status,
      added_by: req.user.id, // Track who created this job register
    });
    
    res.status(201).json({ 
      ...jobRegister,
      message: 'Job register created successfully' 
    });
  } catch (error) {
    console.error('Error creating job register:', error);
    res.status(500).json({ error: 'Failed to create job register' });
  }
});

// Update job register - Only Super Admin and Admin can update
router.put('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      job_code,
      job_title,
      job_type,
      gst_rate_id,
      remi_one_desc,
      remi_two_desc,
      remi_three_desc,
      remi_four_desc,
      remi_five_desc,
      status,
    } = req.body;
    
    // Check if job register exists
    const existingJobRegister = await JobRegister.findById(id);
    if (!existingJobRegister) {
      return res.status(404).json({ error: 'Job register not found' });
    }

    // Validate required fields
    if (job_title !== undefined && !job_title) {
      return res.status(400).json({ error: 'Job title is required' });
    }
    if (job_type !== undefined && !job_type) {
      return res.status(400).json({ error: 'Job type is required' });
    }
    if (gst_rate_id !== undefined && !gst_rate_id) {
      return res.status(400).json({ error: 'GST Rate (SAC Number) is required' });
    }

    // Check if job title is being changed and already exists
    if (job_title && job_title !== existingJobRegister.job_title) {
      const jobTitleExists = await JobRegister.jobTitleExists(job_title, id);
      if (jobTitleExists) {
        return res.status(400).json({ error: 'Job title already in use' });
      }
    }

    // Check if job code is being changed and already exists
    if (job_code && job_code !== existingJobRegister.job_code) {
      const jobCodeExists = await JobRegister.jobCodeExists(job_code, id);
      if (jobCodeExists) {
        return res.status(400).json({ error: 'Job code already in use' });
      }
    }
    
    const jobRegister = await JobRegister.update(id, {
      job_code,
      job_title,
      job_type,
      gst_rate_id,
      remi_one_desc,
      remi_two_desc,
      remi_three_desc,
      remi_four_desc,
      remi_five_desc,
      status,
    });
    
    res.json({ 
      ...jobRegister,
      message: 'Job register updated successfully' 
    });
  } catch (error) {
    console.error('Error updating job register:', error);
    res.status(500).json({ error: 'Failed to update job register' });
  }
});

// Delete job register - Only Super Admin can delete
router.delete('/:id', requireRole(['Super_Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if job register exists
    const existingJobRegister = await JobRegister.findById(id);
    if (!existingJobRegister) {
      return res.status(404).json({ error: 'Job register not found' });
    }

    await JobRegister.softDelete(id, req.user.id);
    
    res.json({ message: 'Job register deleted successfully' });
  } catch (error) {
    console.error('Error deleting job register:', error);
    res.status(500).json({ error: 'Failed to delete job register' });
  }
});

module.exports = router;

