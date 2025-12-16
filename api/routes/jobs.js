const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const JobServiceCharge = require('../models/JobServiceCharge');
const { authenticate, requireRole } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Get all jobs - Only Super Admin and Admin can access
router.get('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { jobRegisterId, status, invoiceReady, jobIdStatus } = req.query;
    const jobs = await Job.findAll({ jobRegisterId, status, invoiceReady, jobIdStatus });
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get job by ID - Only Super Admin and Admin can access
router.get('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Helper function to parse date
const parseDate = (dateValue) => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// Create new job with service charges - Only Super Admin and Admin can create
router.post('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  const prisma = require('../lib/prisma');
  
  try {
    const { job_service_charges, ...jobData } = req.body;

    // Validate service charges first before creating job
    if (job_service_charges && Array.isArray(job_service_charges) && job_service_charges.length > 0) {
      for (const charge of job_service_charges) {
        // Validate phone number
        if (charge.concern_phone_no) {
          const phoneValidation = JobServiceCharge.validatePhoneNo(charge.concern_phone_no);
          if (!phoneValidation.valid) {
            return res.status(400).json({ error: phoneValidation.message });
          }
        }

        // Validate emails
        if (charge.concern_email_id) {
          const emailValidation = JobServiceCharge.validateEmails(charge.concern_email_id);
          if (!emailValidation.valid) {
            return res.status(400).json({ error: emailValidation.message });
          }
        }
      }
    }

    // Use transaction to ensure atomicity - all operations use transaction client
    const result = await prisma.$transaction(async (tx) => {
      // Prepare job data with proper parsing
      const jobCreateData = {
        job_register_id: jobData.job_register_id ? parseInt(jobData.job_register_id) : null,
        job_no: jobData.job_no || null,
        job_register_field_id: jobData.job_register_field_id ? parseInt(jobData.job_register_field_id) : null,
        client_info_id: jobData.client_info_id ? parseInt(jobData.client_info_id) : null,
        client_bu_id: jobData.client_bu_id ? parseInt(jobData.client_bu_id) : null,
        type_of_unit: jobData.type_of_unit || null,
        job_owner: jobData.job_owner || null,
        job_owner_email_id: jobData.job_owner_email_id || null,
        job_owner_phone_no: jobData.job_owner_phone_no ? parseFloat(jobData.job_owner_phone_no) : null,
        processor: jobData.processor || null,
        processor_email_id: jobData.processor_email_id || null,
        processor_phone_no: jobData.processor_phone_no ? parseFloat(jobData.processor_phone_no) : null,
        port: jobData.port || null,
        claim_no: jobData.claim_no || null,
        po_no: jobData.po_no || null,
        quantity: jobData.quantity || null,
        description_of_quantity: jobData.description_of_quantity || null,
        job_date: parseDate(jobData.job_date),
        application_target_date: parseDate(jobData.application_target_date),
        application_date: parseDate(jobData.application_date),
        application: jobData.application || null,
        claim_amount_after_finalization: jobData.claim_amount_after_finalization || null,
        appl_fee_duty_paid: jobData.appl_fee_duty_paid || null,
        appl_fees_reference_no: jobData.appl_fees_reference_no || null,
        app_fees_payt_date: parseDate(jobData.app_fees_payt_date),
        eft_attachment: jobData.eft_attachment || null,
        bank_name: jobData.bank_name || null,
        application_ref_no: jobData.application_ref_no || null,
        application_ref_date: parseDate(jobData.application_ref_date),
        cac: parseDate(jobData.cac),
        cac_attachment: jobData.cac_attachment || null,
        cec: parseDate(jobData.cec),
        cec_attachment: jobData.cec_attachment || null,
        no_of_cac: jobData.no_of_cac || null,
        no_of_cec: jobData.no_of_cec || null,
        submission_target_date: parseDate(jobData.submission_target_date),
        submission_date: parseDate(jobData.submission_date),
        acknowlegment: jobData.acknowlegment || null,
        submitted_to: jobData.submitted_to || null,
        file_no: jobData.file_no || null,
        file_date: parseDate(jobData.file_date),
        job_verification_target_date: parseDate(jobData.job_verification_target_date),
        job_verification_date: parseDate(jobData.job_verification_date),
        sanction_approval_target_date: parseDate(jobData.sanction_approval_target_date),
        sanction___approval_date: parseDate(jobData.sanction___approval_date),
        authorisation_no: jobData.authorisation_no || null,
        duty_credit_scrip_no: jobData.duty_credit_scrip_no || null,
        license_no: jobData.license_no || null,
        certificate_no: jobData.certificate_no || null,
        refund_sanction_order_no: jobData.refund_sanction_order_no || null,
        brand_rate_letter_no: jobData.brand_rate_letter_no || null,
        lic_scrip_order_cert_amendment_no: jobData.lic_scrip_order_cert_amendment_no || null,
        date: jobData.date || null,
        refund_order_license_approval_brl_certificate_attachment: jobData.refund_order_license_approval_brl_certificate_attachment || null,
        duty_credit_refund_sanctioned_exempted_amount: jobData.duty_credit_refund_sanctioned_exempted_amount || null,
        license_registration_target_date: parseDate(jobData.license_registration_target_date),
        license_registration_date: parseDate(jobData.license_registration_date),
        import_date: parseDate(jobData.import_date),
        actual_duty_credit_refund_sanctioned_amount: jobData.actual_duty_credit_refund_sanctioned_amount || null,
        normal_retro: jobData.normal_retro || null,
        cus_clearance: jobData.cus_clearance || null,
        type_of_ims: jobData.type_of_ims || null,
        bis: jobData.bis || null,
        ims: jobData.ims || null,
        scomet: jobData.scomet || null,
        inv_no: jobData.inv_no || null,
        inv_date: parseDate(jobData.inv_date),
        dbk_claim_no: jobData.dbk_claim_no || null,
        dbk_claim_date: parseDate(jobData.dbk_claim_date),
        ref__no: jobData.ref__no || null,
        ref__date: parseDate(jobData.ref__date),
        remark: jobData.remark || null,
        status: jobData.status || null,
        invoice_ready: jobData.invoice_ready || null,
        form_field_json_data: jobData.form_field_json_data ? (typeof jobData.form_field_json_data === 'string' ? jobData.form_field_json_data : JSON.stringify(jobData.form_field_json_data)) : null,
        job_id_status: jobData.job_id_status || 'Active',
        added_by: req.user.id ? parseInt(req.user.id) : null,
      };

      // Create job using transaction client
      const job = await tx.job.create({
        data: jobCreateData,
        include: {
          jobRegister: {
            select: {
              id: true,
              job_title: true,
              job_code: true,
            },
          },
        },
      });

      // Create job service charges if provided
      if (job_service_charges && Array.isArray(job_service_charges) && job_service_charges.length > 0) {
        // Get next group ID if not provided
        const firstGroupId = job_service_charges[0]?.group_id;
        let sharedGroupId = firstGroupId;
        
        if (!sharedGroupId) {
          const lastRecord = await tx.jobServiceCharge.findFirst({
            where: { group_id: { startsWith: 'JS' } },
            orderBy: { group_id: 'desc' },
            select: { group_id: true },
          });
          const numPart = lastRecord?.group_id ? lastRecord.group_id.replace('JS', '') : '0';
          const nextNum = parseInt(numPart) + 1;
          sharedGroupId = `JS${String(nextNum).padStart(5, '0')}`;
        }

        // Prepare and create service charges
        const chargesData = job_service_charges.map((charge) => ({
          group_id: charge.group_id || sharedGroupId,
          job_id: job.id,
          client_name: charge.client_name || null,
          client_address: charge.client_address || null,
          concern_person: charge.concern_person || null,
          concern_email_id: charge.concern_email_id || null,
          concern_phone_no: charge.concern_phone_no || null,
          gst_no: charge.gst_no || null,
          gst_type: charge.gst_type || null,
          min: charge.min ? parseFloat(charge.min) : 0,
          max: charge.max ? parseFloat(charge.max) : 0,
          in_percentage: charge.in_percentage ? parseFloat(charge.in_percentage) : 0,
          fixed: charge.fixed ? parseFloat(charge.fixed) : 0,
          per_shb: charge.per_shb ? parseFloat(charge.per_shb) : 0,
          ca_charges: charge.ca_charges ? parseFloat(charge.ca_charges) : 0,
          ce_charges: charge.ce_charges ? parseFloat(charge.ce_charges) : 0,
          registration_other_charges: charge.registration_other_charges ? parseFloat(charge.registration_other_charges) : 0,
          invoice_description: charge.invoice_description || null,
          percentage_per_shb: charge.percentage_per_shb || 'No',
          fixed_percentage_per_shb: charge.fixed_percentage_per_shb || 'No',
          remi_one_desc: charge.remi_one_desc || null,
          remi_one_charges: charge.remi_one_charges || null,
          remi_two_desc: charge.remi_two_desc || null,
          remi_two_charges: charge.remi_two_charges || null,
          remi_three_desc: charge.remi_three_desc || null,
          remi_three_charges: charge.remi_three_charges || null,
          remi_four_desc: charge.remi_four_desc || null,
          remi_four_charges: charge.remi_four_charges || null,
          remi_five_desc: charge.remi_five_desc || null,
          remi_five_charges: charge.remi_five_charges || null,
          status: 'Active',
          added_by: req.user.id ? parseInt(req.user.id) : null,
        }));

        // Create all service charges using transaction client
        for (const chargeData of chargesData) {
          await tx.jobServiceCharge.create({ data: chargeData });
        }
      }

      // Fetch complete job with service charges using transaction client
      const completeJob = await tx.job.findUnique({
        where: { id: job.id },
        include: {
          jobRegister: {
            select: {
              id: true,
              job_title: true,
              job_code: true,
            },
          },
          jobServiceCharges: {
            where: { status: { not: 'Delete' } },
          },
        },
      });

      return completeJob;
    });

    res.status(201).json({
      ...result,
      message: 'Job created successfully with service charges',
    });
  } catch (error) {
    console.error('Error creating job:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    
    // Return more specific error messages
    let errorMessage = 'Failed to create job';
    if (error.code === 'P2002') {
      errorMessage = 'A record with this value already exists';
    } else if (error.code === 'P2003') {
      errorMessage = 'Invalid reference: related record does not exist';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update job - Only Super Admin and Admin can update
router.put('/:id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { job_service_charges, ...jobData } = req.body;
    
    // Check if job exists
    const existingJob = await Job.findById(id);
    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Update job data
    const updatedJob = await Job.update(id, jobData);

    // Update service charges if provided
    if (job_service_charges !== undefined) {
      if (Array.isArray(job_service_charges)) {
        // Validate each service charge
        for (const charge of job_service_charges) {
          if (charge.concern_phone_no) {
            const phoneValidation = JobServiceCharge.validatePhoneNo(charge.concern_phone_no);
            if (!phoneValidation.valid) {
              return res.status(400).json({ error: phoneValidation.message });
            }
          }

          if (charge.concern_email_id) {
            const emailValidation = JobServiceCharge.validateEmails(charge.concern_email_id);
            if (!emailValidation.valid) {
              return res.status(400).json({ error: emailValidation.message });
            }
          }
        }

        // Delete existing service charges (soft delete)
        await JobServiceCharge.deleteByJobId(id, req.user.id);

        // Create new service charges if array is not empty
        if (job_service_charges.length > 0) {
          const chargesData = job_service_charges.map(charge => ({
            ...charge,
            job_id: parseInt(id),
            added_by: req.user.id,
          }));
          await JobServiceCharge.createMany(chargesData);
        }
      }
    }

    // Fetch updated job with service charges
    const completeJob = await Job.findById(id);
    
    res.json({
      ...completeJob,
      message: 'Job updated successfully',
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job (soft delete) - Only Super Admin can delete
router.delete('/:id', requireRole(['Super_Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if job exists
    const existingJob = await Job.findById(id, { includeDeleted: true });
    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Soft delete job
    await Job.softDelete(id, req.user.id);

    // Soft delete all associated service charges
    await JobServiceCharge.deleteByJobId(id, req.user.id);
    
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Get job service charges by job ID
router.get('/:id/service-charges', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const charges = await JobServiceCharge.findAll({ jobId: id });
    res.json(charges);
  } catch (error) {
    console.error('Error fetching job service charges:', error);
    res.status(500).json({ error: 'Failed to fetch job service charges' });
  }
});

// Get next group ID for job service charges
router.get('/service-charges/next-group-id', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const nextGroupId = await JobServiceCharge.getNextGroupId();
    res.json({ group_id: nextGroupId });
  } catch (error) {
    console.error('Error getting next group ID:', error);
    res.status(500).json({ error: 'Failed to get next group ID' });
  }
});

module.exports = router;

