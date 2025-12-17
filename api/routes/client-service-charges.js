const express = require('express');
const router = express.Router();
const ClientServiceCharge = require('../models/ClientServiceCharge');
const { authenticate, requireRole } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Get all client service charge records - Only Super Admin and Admin can access
router.get('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { accountId, clientInfoId, clientBuId, jobRegisterId, groupId } = req.query;
    const charges = await ClientServiceCharge.findAll({ accountId, clientInfoId, clientBuId, jobRegisterId, groupId });
    res.json(charges);
  } catch (error) {
    console.error('Error fetching client service charges:', error);
    res.status(500).json({ error: 'Failed to fetch client service charges' });
  }
});

// Get next group ID (C-Id) - Only Super Admin and Admin can access
router.get('/next-group-id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const nextGroupId = await ClientServiceCharge.getNextGroupId();
    res.json({ group_id: nextGroupId });
  } catch (error) {
    console.error('Error getting next group ID:', error);
    res.status(500).json({ error: 'Failed to get next group ID' });
  }
});

// Get client service charge by ID - Only Super Admin and Admin can access
router.get('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const charge = await ClientServiceCharge.findById(id);
    
    if (!charge) {
      return res.status(404).json({ error: 'Client service charge not found' });
    }
    
    res.json(charge);
  } catch (error) {
    console.error('Error fetching client service charge:', error);
    res.status(500).json({ error: 'Failed to fetch client service charge' });
  }
});

// Create new client service charge - Only Super Admin and Admin can create
router.post('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const {
      group_id,
      account_id,
      client_info_id,
      client_bu_id,
      job_register_id,
      concern_person,
      concern_email_id,
      concern_phone_no,
      min,
      max,
      in_percentage,
      fixed,
      per_shb,
      ca_charges,
      ce_charges,
      registration_other_charges,
      invoice_description,
      percentage_per_shb,
      fixed_percentage_per_shb,
    } = req.body;

    // Validate phone number
    if (concern_phone_no) {
      const phoneValidation = ClientServiceCharge.validatePhoneNo(concern_phone_no);
      if (!phoneValidation.valid) {
        return res.status(400).json({ error: phoneValidation.message });
      }
    }

    // Validate emails (max 3, comma separated)
    if (concern_email_id) {
      const emailValidation = ClientServiceCharge.validateEmails(concern_email_id);
      if (!emailValidation.valid) {
        return res.status(400).json({ error: emailValidation.message });
      }
    }

    const charge = await ClientServiceCharge.create({
      group_id,
      account_id,
      client_info_id,
      client_bu_id,
      job_register_id,
      concern_person,
      concern_email_id,
      concern_phone_no,
      min,
      max,
      in_percentage,
      fixed,
      per_shb,
      ca_charges,
      ce_charges,
      registration_other_charges,
      invoice_description,
      percentage_per_shb,
      fixed_percentage_per_shb,
      added_by: req.user.id,
    });
    
    res.status(201).json({ 
      ...charge,
      message: 'Client service charge created successfully' 
    });
  } catch (error) {
    console.error('Error creating client service charge:', error);
    res.status(500).json({ error: 'Failed to create client service charge' });
  }
});

// Update client service charge - Only Super Admin and Admin can update
router.put('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      account_id,
      client_info_id,
      client_bu_id,
      job_register_id,
      concern_person,
      concern_email_id,
      concern_phone_no,
      min,
      max,
      in_percentage,
      fixed,
      per_shb,
      ca_charges,
      ce_charges,
      registration_other_charges,
      invoice_description,
      percentage_per_shb,
      fixed_percentage_per_shb,
      status,
    } = req.body;
    
    // Check if charge exists
    const existingCharge = await ClientServiceCharge.findById(id);
    if (!existingCharge) {
      return res.status(404).json({ error: 'Client service charge not found' });
    }

    // Validate phone number
    if (concern_phone_no) {
      const phoneValidation = ClientServiceCharge.validatePhoneNo(concern_phone_no);
      if (!phoneValidation.valid) {
        return res.status(400).json({ error: phoneValidation.message });
      }
    }

    // Validate emails
    if (concern_email_id) {
      const emailValidation = ClientServiceCharge.validateEmails(concern_email_id);
      if (!emailValidation.valid) {
        return res.status(400).json({ error: emailValidation.message });
      }
    }
    
    const charge = await ClientServiceCharge.update(id, {
      account_id,
      client_info_id,
      client_bu_id,
      job_register_id,
      concern_person,
      concern_email_id,
      concern_phone_no,
      min,
      max,
      in_percentage,
      fixed,
      per_shb,
      ca_charges,
      ce_charges,
      registration_other_charges,
      invoice_description,
      percentage_per_shb,
      fixed_percentage_per_shb,
      status,
    });
    
    res.json({ 
      ...charge,
      message: 'Client service charge updated successfully' 
    });
  } catch (error) {
    console.error('Error updating client service charge:', error);
    res.status(500).json({ error: 'Failed to update client service charge' });
  }
});

// Delete client service charge (soft delete) - Only Super Admin can delete
router.delete('/:id', requireRole(['Super_Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if charge exists
    const existingCharge = await ClientServiceCharge.findById(id, { includeDeleted: true });
    if (!existingCharge) {
      return res.status(404).json({ error: 'Client service charge not found' });
    }

    await ClientServiceCharge.softDelete(id, req.user.id);
    
    res.json({ message: 'Client service charge deleted successfully' });
  } catch (error) {
    console.error('Error deleting client service charge:', error);
    res.status(500).json({ error: 'Failed to delete client service charge' });
  }
});

module.exports = router;




