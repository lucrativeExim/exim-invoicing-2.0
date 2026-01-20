const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const JobServiceCharge = require('../models/JobServiceCharge');
const JobRegisterField = require('../models/JobRegisterField');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Get all jobs - Only Super Admin and Admin can access
router.get('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { jobRegisterId, status, invoiceType, invoiceReady, jobIdStatus } = req.query;
    // Support both invoiceType (new) and invoiceReady (legacy) for backward compatibility
    const invoiceTypeParam = invoiceType || (invoiceReady === 'true' ? 'full_invoice' : invoiceReady === 'false' ? null : undefined);
    const jobs = await Job.findAll({ jobRegisterId, status, invoiceType: invoiceTypeParam, jobIdStatus });
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get attachment fields for a job by job_id or job_no - MUST come before /:id route
router.get('/attachment-fields', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { job_id, job_no } = req.query;
    
    if (!job_id && !job_no) {
      return res.status(400).json({ error: 'job_id or job_no is required' });
    }

    // Find job by job_id (preferred) or job_no
    let job;
    try {
      if (job_id) {
        console.log(`[attachment-fields] Looking for job with job_id: ${job_id}`);
        job = await prisma.job.findFirst({
          where: {
            id: parseInt(job_id),
            job_id_status: { not: 'Delete' },
          },
          select: {
            id: true,
            job_no: true,
            job_register_field_id: true,
          },
        });
      } else if (job_no) {
        console.log(`[attachment-fields] Looking for job with job_no: ${job_no}`);
        job = await prisma.job.findFirst({
          where: {
            job_no: job_no,
            job_id_status: { not: 'Delete' },
          },
          select: {
            id: true,
            job_no: true,
            job_register_field_id: true,
          },
        });
      }
    } catch (jobError) {
      console.error('[attachment-fields] Error finding job:', jobError);
      return res.status(500).json({ error: 'Error finding job', details: jobError.message });
    }

    if (!job) {
      console.log(`[attachment-fields] Job not found for ${job_id ? 'job_id: ' + job_id : 'job_no: ' + job_no}`);
      return res.status(404).json({ error: 'Job not found' });
    }

    console.log(`[attachment-fields] Found job ID: ${job.id}, job_register_field_id: ${job.job_register_field_id}`);

    // If job doesn't have job_register_field_id, return empty array
    if (!job.job_register_field_id) {
      console.log(`[attachment-fields] Job ${job.id} has no job_register_field_id`);
      return res.json([]);
    }

    // Get job register field
    let jobRegisterField;
    try {
      jobRegisterField = await JobRegisterField.findById(job.job_register_field_id);
    } catch (jrfError) {
      console.error('[attachment-fields] Error finding JobRegisterField:', jrfError);
      return res.json([]);
    }
    
    if (!jobRegisterField) {
      console.log(`[attachment-fields] JobRegisterField not found for ID: ${job.job_register_field_id}`);
      return res.json([]);
    }

    if (!jobRegisterField.form_fields_json) {
      console.log(`[attachment-fields] JobRegisterField ${job.job_register_field_id} has no form_fields_json`);
      return res.json([]);
    }

    // Parse form_fields_json if it's a string
    let formFields = jobRegisterField.form_fields_json;
    if (typeof formFields === 'string') {
      try {
        formFields = JSON.parse(formFields);
      } catch (parseError) {
        console.error('[attachment-fields] Error parsing form_fields_json:', parseError);
        return res.json([]);
      }
    }

    // Handle case where formFields might be an object instead of array
    // Some databases might store it as an object with numeric keys
    if (formFields && typeof formFields === 'object' && !Array.isArray(formFields)) {
      // Convert object to array if needed
      formFields = Object.values(formFields);
    }

    // Filter fields where use_field is true and get their names
    let fieldNames = [];
    if (Array.isArray(formFields)) {
      fieldNames = formFields
        .filter(field => field && typeof field === 'object' && field.use_field === true && field.name)
        .map(field => field.name)
        .filter(name => name); // Remove any null/undefined names
    }

    console.log(`[attachment-fields] Found ${fieldNames.length} fields with use_field=true:`, fieldNames);

    // If no fields found, return empty array
    if (fieldNames.length === 0) {
      return res.json([]);
    }

    // Fetch fields_master records directly using Prisma with proper filters
    // Filter for Attachment type fields that are Active and match the field names
    let attachmentFields = [];
    try {
      // Simplified query without AND clause - Prisma handles multiple conditions automatically
      attachmentFields = await prisma.fieldsMaster.findMany({
        where: {
          field_name: {
            in: fieldNames,
          },
          field_type: 'Attachment',
          status: 'Active',
          deleted_at: null,
        },
        select: {
          field_name: true,
        },
      });
      console.log(`[attachment-fields] Found ${attachmentFields.length} attachment fields in fields_master`);
    } catch (dbError) {
      console.error('[attachment-fields] Database error fetching attachment fields:', dbError);
      console.error('[attachment-fields] Error details:', {
        message: dbError.message,
        code: dbError.code,
        meta: dbError.meta,
        stack: dbError.stack,
      });
      // Return empty array instead of throwing to prevent 500 error
      attachmentFields = [];
    }

    // Create response with field names (sorted alphabetically for consistency)
    const attachmentFieldNames = attachmentFields
      .map(field => field && field.field_name ? field.field_name : null)
      .filter(name => name !== null && name !== undefined) // Remove any null/undefined names
      .sort((a, b) => a.localeCompare(b));

    console.log(`[attachment-fields] Returning ${attachmentFieldNames.length} attachment field names`);
    res.json(attachmentFieldNames);
  } catch (error) {
    console.error('[attachment-fields] Unexpected error:', error);
    console.error('[attachment-fields] Error stack:', error.stack);
    console.error('[attachment-fields] Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    // Always return a valid response, even on error
    res.status(500).json({ 
      error: 'Failed to fetch attachment fields',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

// Helper function to parse date and return as Date object (with time component)
const parseDate = (dateValue) => {
  if (!dateValue) return null;
  let date;
  if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    date = new Date(dateValue);
  }
  if (isNaN(date.getTime())) return null;
  // Return Date object with time component (stored as DATETIME in database)
  return date;
};

// Create new job with service charges - Only Super Admin and Admin can create
router.post('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
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

    // Validate invoice_type enum value if provided
    if (jobData.invoice_type && !['full_invoice', 'partial_invoice'].includes(jobData.invoice_type)) {
      return res.status(400).json({ 
        error: `Invalid invoice_type value: ${jobData.invoice_type}. Must be 'full_invoice' or 'partial_invoice'` 
      });
    }
    
    // Validate billing_type enum value if provided
    if (jobData.billing_type && !['Reimbursement', 'Service_Reimbursement', 'Service', 'Service_Reimbursement_Split'].includes(jobData.billing_type)) {
      return res.status(400).json({ 
        error: `Invalid billing_type value: ${jobData.billing_type}. Must be one of: 'Reimbursement', 'Service_Reimbursement', 'Service', 'Service_Reimbursement_Split'` 
      });
    }

    // Prepare job data - only include valid Job columns
    const jobCreateData = {
      job_register_id: jobData.job_register_id ? parseInt(jobData.job_register_id) : null,
      job_no: jobData.job_no || null,
      job_register_field_id: jobData.job_register_field_id ? parseInt(jobData.job_register_field_id) : null,
      client_info_id: jobData.client_info_id ? parseInt(jobData.client_info_id) : null,
      client_bu_id: jobData.client_bu_id ? parseInt(jobData.client_bu_id) : null,
      job_owner_id: jobData.job_owner_id || null,
      processor_id: jobData.processor_id || null,
      job_date: parseDate(jobData.job_date),
      remark: jobData.remark || null,
      status: jobData.status || null,
      invoice_type: jobData.invoice_type || null,
      billing_type: jobData.billing_type || null,
      form_field_json_data: jobData.form_field_json_data ? (typeof jobData.form_field_json_data === 'string' ? jobData.form_field_json_data : JSON.stringify(jobData.form_field_json_data)) : null,
      job_id_status: jobData.job_id_status || 'Active',
      added_by: req.user.id ? parseInt(req.user.id) : null,
    };

    // Use transaction to ensure atomicity - create job and service charges together
    const result = await prisma.$transaction(async (tx) => {
      // Create job using Job model (which handles JobFieldValue creation internally)
      // Note: Job.create() uses its own transaction, so we need to use Prisma directly here
      // But we'll handle JobFieldValue creation manually in the transaction
      
      // First, fetch JobRegisterField if needed
      let jobRegisterField = null;
      if (jobCreateData.job_register_field_id) {
        jobRegisterField = await tx.jobRegisterField.findUnique({
          where: { id: jobCreateData.job_register_field_id },
        });
      }

      // Create the job
      const job = await tx.job.create({
        data: {
          job_register_id: jobCreateData.job_register_id,
          job_no: jobCreateData.job_no,
          job_register_field_id: jobCreateData.job_register_field_id,
          client_info_id: jobCreateData.client_info_id,
          client_bu_id: jobCreateData.client_bu_id,
          job_owner_id: jobCreateData.job_owner_id,
          processor_id: jobCreateData.processor_id,
          job_date: jobCreateData.job_date,
          remark: jobCreateData.remark,
          status: jobCreateData.status,
          invoice_type: jobCreateData.invoice_type,
          billing_type: jobCreateData.billing_type,
          form_field_json_data: jobCreateData.form_field_json_data,
          job_id_status: jobCreateData.job_id_status,
          added_by: jobCreateData.added_by,
        },
      });

      // Extract and store form field values in JobFieldValue table
      const JobFieldValue = require('../models/JobFieldValue');
      const JobModel = require('../models/Job');
      const fieldValues = {};

      // Helper function to convert field name to database column name (same as JobModel.getFieldKey)
      const getFieldKey = (fieldName) => {
        if (!fieldName || typeof fieldName !== 'string') return null;
        return fieldName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      };

      // Handle _dynamic fields from jobData
      const dynamicFields = {};
      Object.keys(jobData).forEach(key => {
        if (key.endsWith('_dynamic')) {
          // Remove _dynamic suffix and store the original field name
          const originalFieldName = key.slice(0, -8); // Remove '_dynamic' (8 characters)
          const value = jobData[key];
          // Only include non-empty values
          if (value !== '' && value !== null && value !== undefined) {
            dynamicFields[originalFieldName] = value;
          }
        }
      });

      console.log('Dynamic fields extracted in route:', dynamicFields);

      // Map dynamic fields to their original field names from form_fields_json
      if (Object.keys(dynamicFields).length > 0 && jobRegisterField) {
        // Parse form_fields_json to get field names
        let formFields = jobRegisterField.form_fields_json;
        if (typeof formFields === 'string') {
          try {
            formFields = JSON.parse(formFields);
          } catch (error) {
            console.error('Error parsing form_fields_json:', error);
            formFields = [];
          }
        }

        console.log('Form fields from jobRegisterField:', formFields);

        // Create a map of field keys to field names
        const fieldKeyToNameMap = {};
        if (Array.isArray(formFields)) {
          formFields.forEach((field) => {
            if (field.name) {
              const fieldKey = getFieldKey(field.name);
              if (fieldKey) {
                fieldKeyToNameMap[fieldKey] = field.name;
              }
            }
          });
        }

        console.log('Field key to name map:', fieldKeyToNameMap);

        // Map dynamic fields to their original field names
        Object.keys(dynamicFields).forEach(fieldKey => {
          const fieldName = fieldKeyToNameMap[fieldKey] || fieldKey;
          let value = dynamicFields[fieldKey];
          
          // Convert value to string for storage
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          } else {
            value = String(value);
          }
          
          fieldValues[fieldName] = value;
        });
      } else if (Object.keys(dynamicFields).length > 0) {
        // If jobRegisterField is not available, use field keys directly as field names
        console.log('JobRegisterField not available, using field keys directly');
        Object.keys(dynamicFields).forEach(fieldKey => {
          let value = dynamicFields[fieldKey];
          
          // Convert value to string for storage
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          } else {
            value = String(value);
          }
          
          fieldValues[fieldKey] = value;
        });
      }

      // Also handle form_field_json_data if provided (for backward compatibility)
      if (jobRegisterField && jobCreateData.form_field_json_data) {
        // Parse form_field_json_data if it's a string
        let formData = jobCreateData.form_field_json_data;
        if (typeof formData === 'string') {
          try {
            formData = JSON.parse(formData);
          } catch (error) {
            console.error('Error parsing form_field_json_data:', error);
            formData = {};
          }
        }

        // Extract field values using the helper method
        const formFieldValues = JobModel.extractFormFieldValues(formData, jobRegisterField);
        
        // Merge with dynamic field values (form_field_json_data takes precedence if duplicate)
        Object.assign(fieldValues, formFieldValues);
      }

      console.log('Final field values to save:', fieldValues);

      // Store field values in JobFieldValue table
      if (Object.keys(fieldValues).length > 0) {
        const fieldValueData = Object.keys(fieldValues).map((fieldName) => ({
          job_id: job.id,
          field_name: fieldName,
          field_value: fieldValues[fieldName] || null,
        }));

        await tx.jobFieldValue.createMany({
          data: fieldValueData,
          skipDuplicates: true,
        });
        console.log('JobFieldValue saved successfully for job:', job.id);
      } else {
        console.log('No field values to save');
      }

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

      // Fetch complete job with service charges and field values
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
          jobFieldValues: {
            orderBy: { field_name: 'asc' },
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
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: error.code,
      meta: error.meta
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

    // Parse job_date if provided
    if (jobData.job_date !== undefined) {
      jobData.job_date = parseDate(jobData.job_date);
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

router.get('/:id/get-attachment-types', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID parameter
    const jobId = parseInt(id);
    if (isNaN(jobId) || jobId <= 0) {
      return res.status(400).json({ error: 'Invalid job ID provided' });
    }
    
    // Fetch job with jobRegisterField including form_fields_json
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        jobRegisterField: {
          select: {
            id: true,
            form_fields_json: true,
          },
        },
      },
    });
    
    // Check if job exists
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Check if jobRegisterField exists
    if (!job.jobRegisterField) {
      return res.status(404).json({ error: 'Job Register Field not found for this job' });
    }
    
    // Validate form_fields_json exists and is an array
    if (!job.jobRegisterField.form_fields_json) {
      return res.status(404).json({ error: 'Form fields JSON not found for this job register field' });
    }
    
    if (!Array.isArray(job.jobRegisterField.form_fields_json)) {
      return res.status(400).json({ error: 'Form fields JSON is not a valid array' });
    }
    
    // Extract field names that have use_field === true
    let field_names = [];
    try {
      field_names = job.jobRegisterField.form_fields_json
        .filter(field => field && field.use_field === true && field.name)
        .map(field => field.name)
        .filter(name => name); // Remove any null/undefined names
    } catch (filterError) {
      console.error('Error filtering form fields:', filterError);
      return res.status(400).json({ error: 'Error processing form fields JSON structure' });
    }
    
    // Check if any field names were found
    if (!field_names || field_names.length === 0) {
      console.log("No attachment fields found with use_field === true");
      return res.json([]); // Return empty array instead of null
    }
    
    console.log("field_names:", field_names);
    
    // Fetch field master records
    let field_master = [];
    try {
      field_master = await prisma.fieldsMaster.findMany({
        where: {
          field_name: { in: field_names },
          field_type: "Attachment"
        },
        select: {
          id: true,
          field_name: true
        }
      });
    } catch (dbError) {
      console.error('Error fetching field master records:', dbError);
      return res.status(500).json({ error: 'Failed to fetch field master records from database' });
    }
    
    // Return the field master records
    res.json(field_master || []);
  } catch (error) {
    console.error('Error fetching Attachment Types:', error);
    
    // Handle Prisma-specific errors
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Database constraint violation' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // Generic error response
    res.status(500).json({ 
      error: 'Failed to fetch Attachment Types',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

