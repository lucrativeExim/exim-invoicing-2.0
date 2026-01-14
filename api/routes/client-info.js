const express = require('express');
const router = express.Router();
const ClientInfo = require('../models/ClientInfo');
const { authenticate, requireRole } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Get all client info records - Only Super Admin and Admin can access
router.get('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { accountId } = req.query;
    const clientInfos = await ClientInfo.findAll({ accountId });
    res.json(clientInfos);
  } catch (error) {
    console.error('Error fetching client info:', error);
    res.status(500).json({ error: 'Failed to fetch client info' });
  }
});

// Get client info by ID - Only Super Admin and Admin can access
router.get('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const clientInfo = await ClientInfo.findById(id);
    
    if (!clientInfo) {
      return res.status(404).json({ error: 'Client info not found' });
    }
    
    res.json(clientInfo);
  } catch (error) {
    console.error('Error fetching client info:', error);
    res.status(500).json({ error: 'Failed to fetch client info' });
  }
});

// Get client info by account ID - Only Super Admin and Admin can access
router.get('/by-account/:accountId', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { accountId } = req.params;
    const clientInfos = await ClientInfo.findByAccountId(accountId);
    res.json(clientInfos);
  } catch (error) {
    console.error('Error fetching client info by account:', error);
    res.status(500).json({ error: 'Failed to fetch client info' });
  }
});

// Create new client info - Only Super Admin and Admin can create
router.post('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const {
      account_id,
      client_name,
      iec_no,
      alias,
      credit_terms,
      client_owner_ship,
    } = req.body;
    
    if (!client_name) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    // Check if IEC number already exists
    if (iec_no) {
      const iecExists = await ClientInfo.iecNoExists(iec_no);
      if (iecExists) {
        return res.status(400).json({ error: 'Client with this IEC number already exists' });
      }
    }

    // Check if alias already exists
    if (alias) {
      const aliasExists = await ClientInfo.aliasExists(alias);
      if (aliasExists) {
        return res.status(400).json({ error: 'Client with this alias already exists' });
      }
    }

    const clientInfo = await ClientInfo.create({
      account_id,
      client_name,
      iec_no,
      alias,
      credit_terms,
      client_owner_ship,
      added_by: req.user.id,
    });
    
    res.status(201).json({ 
      ...clientInfo,
      message: 'Client info created successfully' 
    });
  } catch (error) {
    console.error('Error creating client info:', error);
    res.status(500).json({ error: 'Failed to create client info' });
  }
});

// Update client info - Only Super Admin and Admin can update
router.put('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      account_id,
      client_name,
      iec_no,
      alias,
      credit_terms,
      client_owner_ship,
      status,
    } = req.body;
    
    // Check if client info exists
    const existingClientInfo = await ClientInfo.findById(id);
    if (!existingClientInfo) {
      return res.status(404).json({ error: 'Client info not found' });
    }

    // Check if IEC number already exists (if changed)
    if (iec_no && iec_no !== existingClientInfo.iec_no) {
      const iecExists = await ClientInfo.iecNoExists(iec_no, id);
      if (iecExists) {
        return res.status(400).json({ error: 'Client with this IEC number already exists' });
      }
    }

    // Check if alias already exists (if changed)
    if (alias && alias !== existingClientInfo.alias) {
      const aliasExists = await ClientInfo.aliasExists(alias, id);
      if (aliasExists) {
        return res.status(400).json({ error: 'Client with this alias already exists' });
      }
    }
    
    const clientInfo = await ClientInfo.update(id, {
      account_id,
      client_name,
      iec_no,
      alias,
      credit_terms,
      client_owner_ship,
      status,
    });
    
    res.json({ 
      ...clientInfo,
      message: 'Client info updated successfully' 
    });
  } catch (error) {
    console.error('Error updating client info:', error);
    res.status(500).json({ error: 'Failed to update client info' });
  }
});

// Delete client info (soft delete) - Only Super Admin can delete
router.delete('/:id', requireRole(['Super_Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if client info exists
    const existingClientInfo = await ClientInfo.findById(id, { includeDeleted: true });
    if (!existingClientInfo) {
      return res.status(404).json({ error: 'Client info not found' });
    }

    await ClientInfo.softDelete(id, req.user.id);
    
    res.json({ message: 'Client info deleted successfully' });
  } catch (error) {
    console.error('Error deleting client info:', error);
    res.status(500).json({ error: 'Failed to delete client info' });
  }
});

module.exports = router;






















