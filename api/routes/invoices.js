const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const InvoiceService = require('../services/InvoiceService');
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

// Get sample invoice calculation - Only Super Admin and Admin can access
router.get('/sample', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { job_ids, billing_type, reward_amount, discount_amount } = req.query;

    // Validate required fields
    if (!job_ids) {
      return res.status(400).json({ error: 'job_ids is required' });
    }

    if (!billing_type) {
      return res.status(400).json({ error: 'billing_type is required' });
    }

    // Parse job_ids (can be comma-separated string or array)
    const jobIdsArray = Array.isArray(job_ids)
      ? job_ids
      : typeof job_ids === 'string'
      ? job_ids.split(',').map((id) => id.trim())
      : [job_ids];

    if (jobIdsArray.length === 0) {
      return res.status(400).json({ error: 'At least one job ID is required' });
    }

    // Calculate invoice breakdown
    const breakdown = await InvoiceService.calculateInvoiceBreakdown(
      jobIdsArray,
      billing_type,
      reward_amount || 0,
      discount_amount || 0
    );

    res.json(breakdown);
  } catch (error) {
    console.error('Error calculating sample invoice:', error);
    res.status(500).json({
      error: error.message || 'Failed to calculate sample invoice',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
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
      job_ids, // Array of job IDs for InvoiceSelectedJob table
      billing_type,
      reward_amount,
      discount_amount,
      note,
      po_no,
      irn_no,
      // Optional: account_id (if not provided, will be fetched from job)
      account_id,
    } = req.body;

    // Validate required fields
    if (!job_ids || !Array.isArray(job_ids) || job_ids.length === 0) {
      return res.status(400).json({ error: 'At least one job ID is required' });
    }

    if (!billing_type) {
      return res.status(400).json({ error: 'Billing type is required' });
    }

    // Calculate invoice breakdown using InvoiceService
    const breakdown = await InvoiceService.calculateInvoiceBreakdown(
      job_ids,
      billing_type,
      reward_amount || 0,
      discount_amount || 0
    );

    // Use calculated values and job-derived values
    const invoice = await Invoice.create({
      account_id: account_id || breakdown.accountId,
      job_register_id: breakdown.jobRegisterId,
      billing_type: breakdown.billingType,
      invoice_type: breakdown.invoiceType, // From job
      pay_amount: breakdown.payAmount,
      amount: breakdown.amount,
      professional_charges: breakdown.professionalCharges,
      registration_other_charges: breakdown.registrationCharges,
      ca_charges: breakdown.caCharges,
      ce_charges: breakdown.ceCharges,
      ca_cert_count: breakdown.caCertCount,
      ce_cert_count: breakdown.ceCertCount,
      application_fees: breakdown.applicationFees,
      remi_one_charges: breakdown.remiOneCharges,
      remi_two_charges: breakdown.remiTwoCharges,
      remi_three_charges: breakdown.remiThreeCharges,
      remi_four_charges: breakdown.remiFourCharges,
      remi_five_charges: breakdown.remiFiveCharges,
      reward_amount: breakdown.rewardAmount,
      discount_amount: breakdown.discountAmount,
      note: note || null,
      po_no: po_no || null,
      irn_no: irn_no || null,
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
