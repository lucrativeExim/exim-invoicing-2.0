const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const { authenticate, requireRole } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Get all invoices - Only Super Admin and Admin can access
router.get('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { invoice_status, invoice_stage_status } = req.query;
    
    let invoices;
    
    // If both invoice_status and invoice_stage_status are provided (and invoice_stage_status is not empty), use findByStatusAndStage
    if (invoice_status && invoice_stage_status && invoice_stage_status.trim() !== '') {
      invoices = await Invoice.findByStatusAndStage(invoice_status, invoice_stage_status);
    } else {
      // Otherwise, get all invoices (with optional filtering)
      invoices = await Invoice.findAll();
      
      // Apply client-side filtering if needed
      if (invoice_status) {
        invoices = invoices.filter(inv => inv.invoice_status === invoice_status);
      }
      if (invoice_stage_status && invoice_stage_status.trim() !== '') {
        invoices = invoices.filter(inv => inv.invoice_stage_status === invoice_stage_status);
      }
    }
    
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get invoice by ID - Only Super Admin and Admin can access
router.get('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create new invoice - Only Super Admin and Admin can create
router.post('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const {
      account_id,
      job_register_id,
      billing_type,
      invoice_type,
      pay_amount,
      amount,
      professional_charges,
      registration_other_charges,
      ca_charges,
      ce_charges,
      ca_cert_count,
      ce_cert_count,
      application_fees,
      remi_one_charges,
      remi_two_charges,
      remi_three_charges,
      remi_four_charges,
      remi_five_charges,
      reward_penalty_input,
      reward_penalty_amount,
      note,
      po_no,
      irn_no,
      job_ids, // Array of job IDs for InvoiceSelectedJob table
    } = req.body;

    // Validate required fields
    if (!job_register_id) {
      return res.status(400).json({ error: 'Job register ID is required' });
    }

    if (!billing_type) {
      return res.status(400).json({ error: 'Billing type is required' });
    }

    if (!invoice_type) {
      return res.status(400).json({ error: 'Invoice type is required' });
    }

    if (!job_ids || !Array.isArray(job_ids) || job_ids.length === 0) {
      return res.status(400).json({ error: 'At least one job ID is required' });
    }

    // Create invoice with selected jobs
    const invoice = await Invoice.create({
      account_id,
      job_register_id,
      billing_type,
      invoice_type,
      pay_amount,
      amount,
      professional_charges,
      registration_other_charges,
      ca_charges,
      ce_charges,
      ca_cert_count,
      ce_cert_count,
      application_fees,
      remi_one_charges,
      remi_two_charges,
      remi_three_charges,
      remi_four_charges,
      remi_five_charges,
      reward_penalty_input,
      reward_penalty_amount,
      note,
      po_no,
      irn_no,
      job_ids,
      added_by: req.user.id, // Track who created this invoice
    });

    res.status(201).json({
      ...invoice,
      message: 'Invoice created successfully',
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });

    // Return more specific error messages
    let errorMessage = 'Failed to create invoice';
    if (error.code === 'P2002') {
      errorMessage = 'A record with this value already exists';
    } else if (error.code === 'P2003') {
      errorMessage = 'Invalid reference: related record does not exist';
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: error.code,
      meta: error.meta,
    });
  }
});

// Update invoice - Only Super Admin and Admin can update
router.put('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    // If shifting to Proforma, add proforma_created_by from req.user
    const updateData = { ...req.body };
    if (req.body.invoice_stage_status === 'Proforma') {
      updateData.proforma_created_by = req.user.id;
    }

    const invoice = await Invoice.update(req.params.id, updateData);

    res.json({
      ...invoice,
      message: 'Invoice updated successfully',
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Delete invoice (soft delete) - Only Super Admin and Admin can delete
router.delete('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    await Invoice.delete(req.params.id, req.user.id);

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

module.exports = router;
