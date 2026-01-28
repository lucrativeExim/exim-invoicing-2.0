const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const InvoiceService = require('../services/InvoiceService');
const { authenticate, requireRole } = require('../middleware/accessControl');
const { convertBigIntToString } = require('../lib/jsonUtils');

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
    
    // Convert BigInt values to strings before serialization
    const serializedInvoices = convertBigIntToString(invoices);
    res.json(serializedInvoices);
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

    // Convert BigInt values to strings before serialization
    const serializedBreakdown = convertBigIntToString(breakdown);
    res.json(serializedBreakdown);
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
    // console.log(invoice);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Convert BigInt values to strings before serialization
    const serializedInvoice = convertBigIntToString(invoice);
    res.json(serializedInvoice);
    // console.log(serializedInvoice);
    
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

    // Convert BigInt values to strings before serialization
    const serializedInvoice = convertBigIntToString(invoice);
    res.status(201).json({
      ...serializedInvoice,
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
    // If shifting to Proforma, recalculate invoice amounts based on selected jobs
    if (req.body.invoice_stage_status === 'Proforma') {
      // Fetch current invoice with selected jobs
      const currentInvoice = await Invoice.findById(req.params.id);
      
      if (!currentInvoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Get job IDs from invoiceSelectedJobs
      const jobIds = currentInvoice.invoiceSelectedJobs?.map(
        (invoiceJob) => {
          const jobId = invoiceJob.job?.id || invoiceJob.job_id;
          return jobId ? parseInt(jobId) : null;
        }
      ).filter(Boolean) || [];

      if (jobIds.length === 0) {
        return res.status(400).json({ error: 'No jobs found for this invoice' });
      }

      // Get billing_type from current invoice
      const billingType = currentInvoice.billing_type;
      if (!billingType) {
        return res.status(400).json({ error: 'Billing type is required' });
      }

      // Get reward_amount and discount_amount from current invoice or request body
      const rewardAmount = req.body.reward_amount !== undefined 
        ? req.body.reward_amount 
        : (currentInvoice.reward_amount || 0);
      const discountAmount = req.body.discount_amount !== undefined 
        ? req.body.discount_amount 
        : (currentInvoice.discount_amount || 0);

      // Recalculate invoice breakdown using InvoiceService
      const breakdown = await InvoiceService.calculateInvoiceBreakdown(
        jobIds,
        billingType,
        rewardAmount || 0,
        discountAmount || 0
      );

      // Prepare update data with recalculated amounts
      const updateData = {
        ...req.body,
        proforma_created_by: req.user.id,
        // Update all calculated amounts
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
        amount: breakdown.amount,
        pay_amount: breakdown.payAmount,
        reward_amount: breakdown.rewardAmount,
        discount_amount: breakdown.discountAmount,
      };

      const invoice = await Invoice.update(req.params.id, updateData);

      // Convert BigInt values to strings before serialization
      const serializedInvoice = convertBigIntToString(invoice);
      res.json({
        ...serializedInvoice,
        message: 'Invoice shifted to Proforma and amounts updated successfully',
      });
    } else {
      // For other updates, use the original logic
      const updateData = { ...req.body };
      const invoice = await Invoice.update(req.params.id, updateData);

      // Convert BigInt values to strings before serialization
      const serializedInvoice = convertBigIntToString(invoice);
      res.json({
        ...serializedInvoice,
        message: 'Invoice updated successfully',
      });
    }
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ 
      error: 'Failed to update invoice',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
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
