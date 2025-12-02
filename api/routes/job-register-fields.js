const express = require('express');
const router = express.Router();
const { JobRegisterField, JobRegister } = require('../models');
const { authenticate, requireRole } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Get all job register fields - Only Super Admin and Admin can access
router.get('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { job_register_id, activeOnly } = req.query;
    const jobRegisterFields = await JobRegisterField.findAll({ 
      jobRegisterId: job_register_id || null,
      activeOnly: activeOnly === 'true',
    });
    res.json(jobRegisterFields);
  } catch (error) {
    console.error('Error fetching job register fields:', error);
    res.status(500).json({ error: 'Failed to fetch job register fields' });
  }
});

// Get job register field by ID - Only Super Admin and Admin can access
router.get('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const jobRegisterField = await JobRegisterField.findById(id);
    
    if (!jobRegisterField) {
      return res.status(404).json({ error: 'Job register field not found' });
    }
    
    res.json(jobRegisterField);
  } catch (error) {
    console.error('Error fetching job register field:', error);
    res.status(500).json({ error: 'Failed to fetch job register field' });
  }
});

// Get active job register field for a job register - Only Super Admin and Admin can access
router.get('/job-register/:jobRegisterId/active', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { jobRegisterId } = req.params;
    const jobRegisterField = await JobRegisterField.findActiveByJobRegisterId(jobRegisterId);
    
    if (!jobRegisterField) {
      return res.status(404).json({ error: 'Active job register field not found' });
    }
    
    res.json(jobRegisterField);
  } catch (error) {
    console.error('Error fetching active job register field:', error);
    res.status(500).json({ error: 'Failed to fetch active job register field' });
  }
});

// Create/Update job register fields - Only Super Admin and Admin can access
// This endpoint creates a new record and marks old ones as inactive
router.post('/job-register/:jobRegisterId/update', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { jobRegisterId } = req.params;
    const { form_fields_json } = req.body;
    
    // Validate that job register exists
    const jobRegister = await JobRegister.findById(jobRegisterId);
    if (!jobRegister) {
      return res.status(404).json({ error: 'Job register not found' });
    }

    // Validate form_fields_json
    if (!form_fields_json || !Array.isArray(form_fields_json)) {
      return res.status(400).json({ error: 'form_fields_json must be a valid array' });
    }

    // Create new active record and mark old ones as inactive
    const newJobRegisterField = await JobRegisterField.createAndDeactivateOld({
      job_register_id: jobRegisterId,
      form_fields_json: form_fields_json,
      added_by: req.user.id,
      updated_by: req.user.id,
    });
    
    res.status(201).json({ 
      ...newJobRegisterField,
      message: 'Job register fields updated successfully' 
    });
  } catch (error) {
    console.error('Error updating job register fields:', error);
    res.status(500).json({ error: 'Failed to update job register fields' });
  }
});

// Create new job register field - Only Super Admin and Admin can create
router.post('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const {
      job_register_id,
      form_fields_json,
      status,
    } = req.body;
    
    // Validate required fields
    if (!job_register_id) {
      return res.status(400).json({ error: 'Job register ID is required' });
    }

    // Validate that job register exists
    const jobRegister = await JobRegister.findById(job_register_id);
    if (!jobRegister) {
      return res.status(404).json({ error: 'Job register not found' });
    }

    // Validate form_fields_json if provided
    if (form_fields_json && !Array.isArray(form_fields_json)) {
      return res.status(400).json({ error: 'form_fields_json must be a valid array' });
    }

    const jobRegisterField = await JobRegisterField.create({
      job_register_id,
      form_fields_json: form_fields_json || null,
      status: status || 'Active',
      added_by: req.user.id,
    });
    
    res.status(201).json({ 
      ...jobRegisterField,
      message: 'Job register field created successfully' 
    });
  } catch (error) {
    console.error('Error creating job register field:', error);
    res.status(500).json({ error: 'Failed to create job register field' });
  }
});

// Update job register field - Only Super Admin and Admin can update
router.put('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      form_fields_json,
      status,
    } = req.body;
    
    // Check if job register field exists
    const existingJobRegisterField = await JobRegisterField.findById(id);
    if (!existingJobRegisterField) {
      return res.status(404).json({ error: 'Job register field not found' });
    }

    // Validate form_fields_json if provided
    if (form_fields_json !== undefined && !Array.isArray(form_fields_json)) {
      return res.status(400).json({ error: 'form_fields_json must be a valid array' });
    }
    
    const jobRegisterField = await JobRegisterField.update(id, {
      form_fields_json,
      status,
      updated_by: req.user.id,
    });
    
    res.json({ 
      ...jobRegisterField,
      message: 'Job register field updated successfully' 
    });
  } catch (error) {
    console.error('Error updating job register field:', error);
    res.status(500).json({ error: 'Failed to update job register field' });
  }
});

module.exports = router;

