const express = require('express');
const router = express.Router();
const ClientBu = require('../models/ClientBu');
const { authenticate, requireRole } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Get all client BU records - Only Super Admin and Admin can access
router.get('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { clientInfoId } = req.query;
    const clientBus = await ClientBu.findAll({ clientInfoId });
    res.json(clientBus);
  } catch (error) {
    console.error('Error fetching client BU:', error);
    res.status(500).json({ error: 'Failed to fetch client BU' });
  }
});

// Get client BU by ID - Only Super Admin and Admin can access
router.get('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const clientBu = await ClientBu.findById(id);
    
    if (!clientBu) {
      return res.status(404).json({ error: 'Client BU not found' });
    }
    
    res.json(clientBu);
  } catch (error) {
    console.error('Error fetching client BU:', error);
    res.status(500).json({ error: 'Failed to fetch client BU' });
  }
});

// Get client BU by client info ID - Only Super Admin and Admin can access
router.get('/by-client/:clientInfoId', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { clientInfoId } = req.params;
    const clientBus = await ClientBu.findByClientInfoId(clientInfoId);
    res.json(clientBus);
  } catch (error) {
    console.error('Error fetching client BU by client info:', error);
    res.status(500).json({ error: 'Failed to fetch client BU' });
  }
});

// Create new client BU - Only Super Admin and Admin can create
router.post('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const {
      client_info_id,
      bu_name,
      client_type,
      state_id,
      city,
      pincode,
      branch_code,
      address,
      gst_no,
      sc_i,
    } = req.body;
    
    if (!client_info_id) {
      return res.status(400).json({ error: 'Client is required' });
    }

    // Validate GST number format
    if (gst_no) {
      const gstValidation = ClientBu.validateGSTNo(gst_no);
      if (!gstValidation.valid) {
        return res.status(400).json({ error: gstValidation.message });
      }
      
      // Check if GST number already exists
      const gstExists = await ClientBu.gstNoExists(gst_no);
      if (gstExists) {
        return res.status(400).json({ error: 'BU with this GST number already exists' });
      }
    }

    // Validate pincode format
    if (pincode) {
      const pincodeValidation = ClientBu.validatePincode(pincode);
      if (!pincodeValidation.valid) {
        return res.status(400).json({ error: pincodeValidation.message });
      }
    }

    const clientBu = await ClientBu.create({
      client_info_id,
      bu_name,
      client_type,
      state_id,
      city,
      pincode,
      branch_code,
      address,
      gst_no: gst_no ? gst_no.trim().toUpperCase() : null,
      sc_i,
      added_by: req.user.id,
    });
    
    res.status(201).json({ 
      ...clientBu,
      message: 'Client BU created successfully' 
    });
  } catch (error) {
    console.error('Error creating client BU:', error);
    res.status(500).json({ error: 'Failed to create client BU' });
  }
});

// Update client BU - Only Super Admin and Admin can update
router.put('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      client_info_id,
      bu_name,
      client_type,
      state_id,
      city,
      pincode,
      branch_code,
      address,
      gst_no,
      sc_i,
      status,
    } = req.body;
    
    // Check if client BU exists
    const existingClientBu = await ClientBu.findById(id);
    if (!existingClientBu) {
      return res.status(404).json({ error: 'Client BU not found' });
    }

    // Validate and check GST number (if provided and changed)
    if (gst_no !== undefined && gst_no !== existingClientBu.gst_no) {
      if (gst_no) {
        const gstValidation = ClientBu.validateGSTNo(gst_no);
        if (!gstValidation.valid) {
          return res.status(400).json({ error: gstValidation.message });
        }
        
        const gstExists = await ClientBu.gstNoExists(gst_no, id);
        if (gstExists) {
          return res.status(400).json({ error: 'GST number already in use' });
        }
      }
    }

    // Validate pincode format
    if (pincode) {
      const pincodeValidation = ClientBu.validatePincode(pincode);
      if (!pincodeValidation.valid) {
        return res.status(400).json({ error: pincodeValidation.message });
      }
    }
    
    const clientBu = await ClientBu.update(id, {
      client_info_id,
      bu_name,
      client_type,
      state_id,
      city,
      pincode,
      branch_code,
      address,
      gst_no: gst_no ? gst_no.trim().toUpperCase() : gst_no,
      sc_i,
      status,
    });
    
    res.json({ 
      ...clientBu,
      message: 'Client BU updated successfully' 
    });
  } catch (error) {
    console.error('Error updating client BU:', error);
    res.status(500).json({ error: 'Failed to update client BU' });
  }
});

// Delete client BU (soft delete) - Only Super Admin can delete
router.delete('/:id', requireRole(['Super_Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if client BU exists
    const existingClientBu = await ClientBu.findById(id, { includeDeleted: true });
    if (!existingClientBu) {
      return res.status(404).json({ error: 'Client BU not found' });
    }

    await ClientBu.softDelete(id, req.user.id);
    
    res.json({ message: 'Client BU deleted successfully' });
  } catch (error) {
    console.error('Error deleting client BU:', error);
    res.status(500).json({ error: 'Failed to delete client BU' });
  }
});

module.exports = router;






















