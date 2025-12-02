const express = require('express');
const router = express.Router();
const { Account } = require('../models');
const { authenticate, requireRole } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Get all accounts - Only Super Admin and Admin can access
router.get('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const accounts = await Account.findAll();
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Get account by ID - Only Super Admin and Admin can access
router.get('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Account.findById(id);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json(account);
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// Create new account - Only Super Admin and Admin can create accounts
router.post('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const {
      account_name,
      account_address,
      bank_name,
      bank_address,
      account_no,
      ifsc_no,
      gst_no,
      pan_no,
      msme_details,
      remark,
      invoice_serial_initial,
      invoice_serial_second_no,
    } = req.body;
    
    if (!account_name) {
      return res.status(400).json({ error: 'Account name is required' });
    }

    // Validate GST number format (if provided)
    if (gst_no) {
      const gstValidation = Account.validateGSTNo(gst_no);
      if (!gstValidation.valid) {
        return res.status(400).json({ error: gstValidation.message });
      }
      
      // Normalize GST number (uppercase, no spaces)
      const normalizedGST = gst_no.trim().toUpperCase();
      
      // Check if GST number already exists
      const gstExists = await Account.gstNoExists(normalizedGST);
      if (gstExists) {
        return res.status(400).json({ error: 'Account with this GST number already exists' });
      }
    }

    // Validate PAN number format (if provided)
    if (pan_no) {
      const panValidation = Account.validatePANNo(pan_no);
      if (!panValidation.valid) {
        return res.status(400).json({ error: panValidation.message });
      }
      
      // Normalize PAN number (uppercase, no spaces)
      const normalizedPAN = pan_no.trim().toUpperCase();
      
      // Check if PAN number already exists
      const panExists = await Account.panNoExists(normalizedPAN);
      if (panExists) {
        return res.status(400).json({ error: 'Account with this PAN number already exists' });
      }
    }

    // Validate invoice serial initial uniqueness (if provided)
    if (invoice_serial_initial) {
      const serialExists = await Account.invoiceSerialInitialExists(invoice_serial_initial);
      if (serialExists) {
        return res.status(400).json({ error: 'Invoice serial initial already exists' });
      }
    }

    // Normalize GST and PAN before saving
    const normalizedGST = gst_no ? gst_no.trim().toUpperCase() : null;
    const normalizedPAN = pan_no ? pan_no.trim().toUpperCase() : null;

    const account = await Account.create({
      account_name,
      account_address,
      bank_name,
      bank_address,
      account_no,
      ifsc_no,
      gst_no: normalizedGST,
      pan_no: normalizedPAN,
      msme_details,
      remark,
      invoice_serial_initial,
      invoice_serial_second_no,
      added_by: req.user.id, // Track who created this account
    });
    
    res.status(201).json({ 
      ...account,
      message: 'Account created successfully' 
    });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Update account - Only Super Admin and Admin can update accounts
router.put('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      account_name,
      account_address,
      bank_name,
      bank_address,
      account_no,
      ifsc_no,
      gst_no,
      pan_no,
      msme_details,
      remark,
      invoice_serial_initial,
      invoice_serial_second_no,
      status,
    } = req.body;
    
    // Check if account exists
    const existingAccount = await Account.findById(id);
    if (!existingAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Validate and check GST number (if provided and changed)
    if (gst_no !== undefined && gst_no !== existingAccount.gst_no) {
      const gstValidation = Account.validateGSTNo(gst_no);
      if (!gstValidation.valid) {
        return res.status(400).json({ error: gstValidation.message });
      }
      
      const normalizedGST = gst_no.trim().toUpperCase();
      const gstExists = await Account.gstNoExists(normalizedGST, id);
      if (gstExists) {
        return res.status(400).json({ error: 'GST number already in use' });
      }
    }

    // Validate and check PAN number (if provided and changed)
    if (pan_no !== undefined && pan_no !== existingAccount.pan_no) {
      const panValidation = Account.validatePANNo(pan_no);
      if (!panValidation.valid) {
        return res.status(400).json({ error: panValidation.message });
      }
      
      const normalizedPAN = pan_no.trim().toUpperCase();
      const panExists = await Account.panNoExists(normalizedPAN, id);
      if (panExists) {
        return res.status(400).json({ error: 'PAN number already in use' });
      }
    }

    // Validate invoice serial initial uniqueness (if provided and changed)
    if (invoice_serial_initial !== undefined && invoice_serial_initial !== existingAccount.invoice_serial_initial) {
      if (invoice_serial_initial) {
        const serialExists = await Account.invoiceSerialInitialExists(invoice_serial_initial, id);
        if (serialExists) {
          return res.status(400).json({ error: 'Invoice serial initial already exists' });
        }
      }
    }
    
    // Normalize GST and PAN before saving (if they are being updated)
    const updateData = {
      account_name,
      account_address,
      bank_name,
      bank_address,
      account_no,
      ifsc_no,
      msme_details,
      remark,
      invoice_serial_initial,
      invoice_serial_second_no,
      status,
    };

    // Only update GST/PAN if they are provided
    if (gst_no !== undefined) {
      updateData.gst_no = gst_no ? gst_no.trim().toUpperCase() : null;
    }
    if (pan_no !== undefined) {
      updateData.pan_no = pan_no ? pan_no.trim().toUpperCase() : null;
    }

    const account = await Account.update(id, updateData);
    
    res.json({ 
      ...account,
      message: 'Account updated successfully' 
    });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Delete account (soft delete) - Only Super Admin can delete accounts
router.delete('/:id', requireRole(['Super_Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if account exists
    const existingAccount = await Account.findById(id, { includeDeleted: true });
    if (!existingAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await Account.softDelete(id, req.user.id);
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;

