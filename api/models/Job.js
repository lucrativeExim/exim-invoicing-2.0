const prisma = require('../lib/prisma');
const JobRegisterField = require('./JobRegisterField');
const JobFieldValue = require('./JobFieldValue');

class JobModel {
  /**
   * Helper function to convert field name to database column name
   * Converts "Processor" to "processor", "Job Owner" to "job_owner", etc.
   */
  static getFieldKey(fieldName) {
    if (!fieldName || typeof fieldName !== 'string') return null;
    return fieldName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Get all valid Job model column names (excluding id, timestamps, and relations)
   * Note: Dynamic form fields are now stored in JobFieldValue table
   */
  static getValidJobColumns() {
    return [
      'job_register_id', 'job_no', 'job_register_field_id', 'client_info_id', 'client_bu_id', 
      'job_owner_id',
      'processor_id','job_date',
      'remark', 'status', 'invoice_type', 'billing_type',
      'job_id_status', 'added_by', 'deleted_by',
    ];
  }

  /**
   * Extract form field values from form data
   * Returns an object with field_name as key and field_value as value
   * @param {object} formData - Form data object
   * @param {object} jobRegisterField - JobRegisterField object with form_fields_json
   * @returns {object} - Object with field names and values
   */
  static extractFormFieldValues(formData, jobRegisterField) {
    const fieldValues = {};
    
    if (!formData || !jobRegisterField || !jobRegisterField.form_fields_json) {
      return fieldValues;
    }

    // Parse form_fields_json if it's a string
    let formFields = jobRegisterField.form_fields_json;
    if (typeof formFields === 'string') {
      try {
        formFields = JSON.parse(formFields);
      } catch (error) {
        console.error('Error parsing form_fields_json:', error);
        return fieldValues;
      }
    }

    // If formFields is an array, extract field names
    if (Array.isArray(formFields)) {
      formFields.forEach((field) => {
        if (field.name) {
          const fieldKey = JobModel.getFieldKey(field.name);
          if (fieldKey && formData[fieldKey] !== undefined && formData[fieldKey] !== null && formData[fieldKey] !== '') {
            // Convert value to string for storage
            let value = formData[fieldKey];
            if (value instanceof Date) {
              value = value.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            } else {
              value = String(value);
            }
            fieldValues[field.name] = value;
          }
        }
      });
    } else if (typeof formFields === 'object') {
      // If formFields is an object, use it directly
      Object.keys(formFields).forEach((fieldKey) => {
        const value = formFields[fieldKey];
        if (value !== undefined && value !== null && value !== '') {
          let stringValue = value;
          if (value instanceof Date) {
            stringValue = value.toISOString().split('T')[0];
          } else {
            stringValue = String(value);
          }
          fieldValues[fieldKey] = stringValue;
        }
      });
    }

    return fieldValues;
  }
  /**
   * Get all jobs
   */
  async findAll(options = {}) {
    const {
      includeDeleted = false,
      jobRegisterId = null,
      status = null,
      invoiceType = null,
      jobIdStatus = null,
    } = options;

    const where = {};
    
    if (jobIdStatus) {
      where.job_id_status = jobIdStatus;
    } else if (!includeDeleted) {
      where.job_id_status = { not: 'Delete' };
    }
    
    if (jobRegisterId) {
      where.job_register_id = parseInt(jobRegisterId);
    }
    
    if (status) {
      where.status = status;
    }
    
    if (invoiceType) {
      where.invoice_type = invoiceType;
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        jobRegister: {
          select: {
            id: true,
            job_title: true,
            job_code: true,
          },
        },
        jobRegisterField: {
          select: {
            id: true,
          },
        },
        clientInfo: {
          select: {
            id: true,
            client_name: true,
            account_id: true,
          },
        },
        clientBu: {
          select: {
            id: true,
            bu_name: true,
            client_info_id: true,
          },
        },
        addedByUser: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        jobServiceCharges: {
          where: {
            status: { not: 'Delete' },
          },
          select: {
            id: true,
            group_id: true,
            client_name: true,
          },
        },
        jobFieldValues: {
          orderBy: { field_name: 'asc' },
        },
        invoiceSelectedJobs: {
          include: {
            invoice: {
              select: {
                id: true,
                invoice_status: true,
                invoice_stage_status: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Add canDelete, canEdit, and canAddAttachment flags to each job
    // A job cannot be deleted if it exists in invoice_selected_jobs 
    // with an invoice that has invoice_status = 'Active' AND (invoice_stage_status = 'Draft' OR invoice_stage_status = 'Proforma')
    // A job cannot be edited or have attachments added if it exists in invoice_selected_jobs 
    // with an invoice that has invoice_status = 'Active' AND invoice_stage_status = 'Proforma'
    return jobs.map(job => {
      const hasActiveDraftInvoice = job.invoiceSelectedJobs.some(
        isj => isj.invoice && 
               isj.invoice.invoice_status === 'Active' && 
               isj.invoice.invoice_stage_status === 'Draft'
      );
      
      const hasActiveProformaInvoice = job.invoiceSelectedJobs.some(
        isj => isj.invoice && 
               isj.invoice.invoice_status === 'Active' && 
               isj.invoice.invoice_stage_status === 'Proforma'
      );
      
      const canDelete = !hasActiveDraftInvoice && !hasActiveProformaInvoice;
      const canEdit = !hasActiveProformaInvoice;
      const canAddAttachment = !hasActiveProformaInvoice;
      
      return {
        ...job,
        canDelete,
        canEdit,
        canAddAttachment,
      };
    });
  }

  /**
   * Get job by ID
   */
  async findById(id, options = {}) {
    const { includeDeleted = false } = options;
    
    const where = { id: parseInt(id) };
    if (!includeDeleted) {
      where.job_id_status = { not: 'Delete' };
    }

    return await prisma.job.findUnique({
      where,
      include: {
        jobRegister: {
          select: {
            id: true,
            job_title: true,
            job_code: true,
          },
        },
        jobRegisterField: {
          select: {
            id: true,
            form_fields_json: true,
            job_register_id: true,
            status: true,
          },
        },
        clientInfo: {
          select: {
            id: true,
            client_name: true,
            account_id: true,
          },
        },
        clientBu: {
          select: {
            id: true,
            bu_name: true,
            client_info_id: true,
          },
        },
        addedByUser: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        jobServiceCharges: {
          where: {
            status: { not: 'Delete' },
          },
        },
        jobFieldValues: {
          orderBy: { field_name: 'asc' },
        },
      },
    });
  }

  /**
   * Create a new job
   */
  async create(data) {
    const {
      job_register_id,
      job_no,
      job_register_field_id,
      client_info_id,
      client_bu_id,
      job_owner_id,
      processor_id,
      job_date,
      remark,
      status,
      invoice_type,
      form_field_json_data,
      job_id_status,
      added_by,
    } = data;

    // Use a transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      // Fetch JobRegisterField to get form_fields_json structure
      let jobRegisterField = null;
      if (job_register_field_id) {
        jobRegisterField = await tx.jobRegisterField.findUnique({
          where: { id: parseInt(job_register_field_id) },
        });
      }

      // Extract dynamic fields (ending with _dynamic) from data
      const dynamicFields = {};
      const baseDataFields = {};
      
      // List of known non-field properties to exclude
      const excludeKeys = ['job_service_charges'];
      
      // Separate dynamic fields from regular fields
      Object.keys(data).forEach(key => {
        // Skip excluded keys
        if (excludeKeys.includes(key)) {
          return;
        }
        
        if (key.endsWith('_dynamic')) {
          // Remove _dynamic suffix and store the original field name
          const originalFieldName = key.slice(0, -8); // Remove '_dynamic' (8 characters)
          const value = data[key];
          // Only include non-empty values
          if (value !== '' && value !== null && value !== undefined) {
            dynamicFields[originalFieldName] = value;
          }
        } else {
          // Regular field - include in baseDataFields if it's a valid Job column
          baseDataFields[key] = data[key];
        }
      });

      // Prepare base data with only valid Job columns (excluding dynamic fields)
      const baseData = {
        job_register_id: baseDataFields.job_register_id ? parseInt(baseDataFields.job_register_id) : null,
        job_no: baseDataFields.job_no || null,
        job_register_field_id: baseDataFields.job_register_field_id ? parseInt(baseDataFields.job_register_field_id) : null,
        client_info_id: baseDataFields.client_info_id ? parseInt(baseDataFields.client_info_id) : null,
        client_bu_id: baseDataFields.client_bu_id ? parseInt(baseDataFields.client_bu_id) : null,
        job_owner_id: baseDataFields.job_owner_id || null,
        processor_id: baseDataFields.processor_id || null,
        job_date: baseDataFields.job_date || null,
        remark: baseDataFields.remark || null,
        status: baseDataFields.status || null,
        invoice_type: baseDataFields.invoice_type || null,
        billing_type: baseDataFields.billing_type || null,
        form_field_json_data: form_field_json_data ? (typeof form_field_json_data === 'string' ? form_field_json_data : JSON.stringify(form_field_json_data)) : null,
        job_id_status: baseDataFields.job_id_status || job_id_status || 'Active',
        added_by: baseDataFields.added_by ? parseInt(baseDataFields.added_by) : (added_by ? parseInt(added_by) : null),
      };

      // Create the job
      const job = await tx.job.create({
        data: baseData,
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

      // Store dynamic fields in JobFieldValue table
      console.log('Dynamic fields extracted:', dynamicFields);
      console.log('JobRegisterField found:', jobRegisterField ? 'Yes' : 'No');
      
      if (Object.keys(dynamicFields).length > 0) {
        const fieldValues = {};
        
        if (jobRegisterField && jobRegisterField.form_fields_json) {
          // Map dynamic field keys to their original field names from form_fields_json
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
                const fieldKey = JobModel.getFieldKey(field.name);
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
        } else {
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

        console.log('Field values to save:', fieldValues);

        // Store field values in JobFieldValue table
        if (Object.keys(fieldValues).length > 0) {
          await JobFieldValue.upsertMany(job.id, fieldValues, tx);
          console.log('JobFieldValue saved successfully for job:', job.id);
        } else {
          console.log('No field values to save');
        }
      } else {
        console.log('No dynamic fields found');
      }

      // Also handle form_field_json_data if provided (for backward compatibility)
      if (jobRegisterField && form_field_json_data) {
        // Parse form_field_json_data if it's a string
        let formData = form_field_json_data;
        if (typeof formData === 'string') {
          try {
            formData = JSON.parse(formData);
          } catch (error) {
            console.error('Error parsing form_field_json_data:', error);
            formData = {};
          }
        }

        // Extract field values using the helper method
        const fieldValues = JobModel.extractFormFieldValues(formData, jobRegisterField);

        // Store field values in JobFieldValue table
        if (Object.keys(fieldValues).length > 0) {
          await JobFieldValue.upsertMany(job.id, fieldValues, tx);
        }
      }

      // Fetch job with field values
      const jobWithFields = await tx.job.findUnique({
        where: { id: job.id },
        include: {
          jobRegister: {
            select: {
              id: true,
              job_title: true,
              job_code: true,
            },
          },
          jobFieldValues: true,
        },
      });

      return jobWithFields;
    });
  }

  /**
   * Update job
   */
  async update(id, data) {
    // Use a transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      const updateData = {};

      // Extract dynamic fields (ending with _dynamic) from data
      const dynamicFields = {};
      const regularData = {};
      
      // Separate dynamic fields from regular fields
      Object.keys(data).forEach(key => {
        if (key.endsWith('_dynamic')) {
          // Remove _dynamic suffix and store the original field name
          const originalFieldName = key.slice(0, -8); // Remove '_dynamic' (8 characters)
          const value = data[key];
          // Only include non-empty values
          if (value !== '' && value !== null && value !== undefined) {
            dynamicFields[originalFieldName] = value;
          }
        } else {
          // Regular field
          regularData[key] = data[key];
        }
      });

      // Map only valid Job columns (excluding dynamic fields)
      const validFields = [
        'job_register_id', 'job_no', 'job_register_field_id', 'client_info_id', 'client_bu_id', 'type_of_unit',
        'job_owner', 'job_owner_email_id', 'job_owner_phone_no',
        'processor', 'processor_email_id', 'processor_phone_no',
        'job_date', 'remark', 'status', 'invoice_type', 'billing_type', 'form_field_json_data', 'job_id_status',
      ];

      const floatFields = ['job_owner_phone_no', 'processor_phone_no'];

      validFields.forEach(field => {
        if (regularData[field] !== undefined) {
          if (field === 'form_field_json_data' && regularData[field]) {
            updateData[field] = typeof regularData[field] === 'string' ? regularData[field] : JSON.stringify(regularData[field]);
          } else {
            updateData[field] = regularData[field] || null;
          }
        }
      });

      floatFields.forEach(field => {
        if (regularData[field] !== undefined) {
          updateData[field] = regularData[field] ? parseFloat(regularData[field]) : null;
        }
      });

      if (regularData.job_register_id !== undefined) {
        updateData.job_register_id = regularData.job_register_id ? parseInt(regularData.job_register_id) : null;
      }
      if (regularData.job_register_field_id !== undefined) {
        updateData.job_register_field_id = regularData.job_register_field_id ? parseInt(regularData.job_register_field_id) : null;
      }
      if (regularData.client_info_id !== undefined) {
        updateData.client_info_id = regularData.client_info_id ? parseInt(regularData.client_info_id) : null;
      }
      if (regularData.client_bu_id !== undefined) {
        updateData.client_bu_id = regularData.client_bu_id ? parseInt(regularData.client_bu_id) : null;
      }

      // Handle job_date - convert to Date object for Prisma (with time component)
      if (regularData.job_date !== undefined) {
        if (regularData.job_date === null || regularData.job_date === '') {
          updateData.job_date = null;
        } else {
          let date;
          if (regularData.job_date instanceof Date) {
            date = regularData.job_date;
          } else if (typeof regularData.job_date === 'string') {
            // Parse date string (handles both YYYY-MM-DD and ISO DateTime formats)
            date = new Date(regularData.job_date);
          } else {
            date = new Date(regularData.job_date);
          }
          if (date && !isNaN(date.getTime())) {
            // Store Date object with time component (stored as DATETIME in database)
            updateData.job_date = date;
          } else {
            updateData.job_date = null;
          }
        }
      }

      updateData.updated_at = new Date();

      // Update the job
      const job = await tx.job.update({
        where: { id: parseInt(id) },
        data: updateData,
      });

      // Update dynamic fields in JobFieldValue table
      if (Object.keys(dynamicFields).length > 0) {
        // Fetch JobRegisterField to get form_fields_json structure
        let jobRegisterField = null;
        if (job.job_register_field_id) {
          jobRegisterField = await tx.jobRegisterField.findUnique({
            where: { id: job.job_register_field_id },
          });
        }

        if (jobRegisterField) {
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

          // Create a map of field keys to field names
          const fieldKeyToNameMap = {};
          if (Array.isArray(formFields)) {
            formFields.forEach((field) => {
              if (field.name) {
                const fieldKey = JobModel.getFieldKey(field.name);
                if (fieldKey) {
                  fieldKeyToNameMap[fieldKey] = field.name;
                }
              }
            });
          }

          // Map dynamic fields to their original field names
          const fieldValues = {};
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

          // Update field values in JobFieldValue table
          if (Object.keys(fieldValues).length > 0) {
            await JobFieldValue.upsertMany(job.id, fieldValues, tx);
          }
        }
      }

      // Also handle form_field_json_data if provided (for backward compatibility)
      if (regularData.form_field_json_data !== undefined && regularData.form_field_json_data) {
        // Fetch JobRegisterField to get form_fields_json structure
        let jobRegisterField = null;
        if (job.job_register_field_id) {
          jobRegisterField = await tx.jobRegisterField.findUnique({
            where: { id: job.job_register_field_id },
          });
        }

        if (jobRegisterField) {
          // Parse form_field_json_data if it's a string
          let formData = regularData.form_field_json_data;
          if (typeof formData === 'string') {
            try {
              formData = JSON.parse(formData);
            } catch (error) {
              console.error('Error parsing form_field_json_data:', error);
              formData = {};
            }
          }

          // Extract field values using the helper method
          const fieldValues = JobModel.extractFormFieldValues(formData, jobRegisterField);

          // Update field values in JobFieldValue table
          if (Object.keys(fieldValues).length > 0) {
            await JobFieldValue.upsertMany(job.id, fieldValues, tx);
          }
        }
      }

      // Fetch updated job with field values
      return await tx.job.findUnique({
        where: { id: parseInt(id) },
        include: {
          jobRegister: {
            select: {
              id: true,
              job_title: true,
              job_code: true,
            },
          },
          jobFieldValues: true,
        },
      });
    });
  }

  /**
   * Soft delete job
   */
  async softDelete(id, deletedBy = null) {
    return await prisma.job.update({
      where: { id: parseInt(id) },
      data: {
        job_id_status: 'Delete',
        deleted_at: new Date(),
        deleted_by: deletedBy ? parseInt(deletedBy) : null,
      },
    });
  }
}

module.exports = new JobModel();

