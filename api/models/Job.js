const prisma = require('../lib/prisma');

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
   */
  static getValidJobColumns() {
    return [
      'job_register_id', 'job_no', 'job_register_field_id', 'client_info_id', 'client_bu_id', 'type_of_unit',
      'job_owner', 'job_owner_email_id', 'job_owner_phone_no',
      'processor', 'processor_email_id', 'processor_phone_no',
      'port', 'claim_no', 'po_no', 'quantity', 'description_of_quantity',
      'job_date', 'application_target_date', 'application_date',
      'application', 'claim_amount_after_finalization',
      'appl_fee_duty_paid', 'appl_fees_reference_no', 'app_fees_payt_date',
      'eft_attachment', 'bank_name', 'application_ref_no', 'application_ref_date',
      'cac', 'cac_attachment', 'cec', 'cec_attachment', 'no_of_cac', 'no_of_cec',
      'submission_target_date', 'submission_date',
      'acknowlegment', 'submitted_to', 'file_no', 'file_date',
      'job_verification_target_date', 'job_verification_date',
      'sanction_approval_target_date', 'sanction___approval_date',
      'authorisation_no', 'duty_credit_scrip_no', 'license_no',
      'certificate_no', 'refund_sanction_order_no', 'brand_rate_letter_no',
      'lic_scrip_order_cert_amendment_no', 'date',
      'refund_order_license_approval_brl_certificate_attachment',
      'duty_credit_refund_sanctioned_exempted_amount',
      'license_registration_target_date', 'license_registration_date',
      'import_date', 'actual_duty_credit_refund_sanctioned_amount',
      'normal_retro', 'cus_clearance', 'type_of_ims', 'bis', 'ims', 'scomet',
      'inv_no', 'inv_date', 'dbk_claim_no', 'dbk_claim_date',
      'ref__no', 'ref__date', 'remark', 'status', 'invoice_type',
      'job_id_status', 'added_by', 'deleted_by',
    ];
  }

  /**
   * Map form_field_json_data to Job model columns
   * Extracts fields from form_field_json_data JSON string and maps them to valid Job columns
   * @param {string|object} formFieldJsonData - JSON string or parsed object from form_field_json_data
   * @returns {object} - Mapped data with only valid Job columns
   */
  static mapFormFieldsToJobColumns(formFieldJsonData) {
    const mappedData = {};
    
    if (!formFieldJsonData) {
      return mappedData;
    }

    // Parse JSON string if needed
    let formFields = {};
    try {
      if (typeof formFieldJsonData === 'string') {
        formFields = JSON.parse(formFieldJsonData);
      } else if (typeof formFieldJsonData === 'object') {
        formFields = formFieldJsonData;
      } else {
        return mappedData;
      }
    } catch (error) {
      console.error('Error parsing form_field_json_data:', error);
      return mappedData;
    }

    // Get valid Job columns
    const validColumns = this.getValidJobColumns();
    
    // List of date fields
    const dateFields = [
      'job_date', 'application_target_date', 'application_date',
      'app_fees_payt_date', 'application_ref_date', 'cac', 'cec',
      'submission_target_date', 'submission_date', 'file_date',
      'job_verification_target_date', 'job_verification_date',
      'sanction_approval_target_date', 'sanction___approval_date',
      'license_registration_target_date', 'license_registration_date',
      'import_date', 'inv_date', 'dbk_claim_date', 'ref__date',
    ];

    // List of phone number fields (stored as Float)
    const phoneFields = ['job_owner_phone_no', 'processor_phone_no'];

    // Helper function to parse date strings
    const parseDate = (dateValue) => {
      if (!dateValue) return null;
      if (dateValue instanceof Date) return dateValue;
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    // Iterate through form fields and map to Job columns
    Object.keys(formFields).forEach((fieldKey) => {
      const value = formFields[fieldKey];
      
      // Skip empty values
      if (value === '' || value === null || value === undefined) {
        return;
      }

      // Check if the field key matches a valid Job column
      if (validColumns.includes(fieldKey)) {
        // Handle date fields
        if (dateFields.includes(fieldKey)) {
          const dateValue = parseDate(value);
          if (dateValue) {
            mappedData[fieldKey] = dateValue;
          }
        }
        // Handle phone number fields
        else if (phoneFields.includes(fieldKey)) {
          const phoneValue = parseFloat(value);
          if (!isNaN(phoneValue)) {
            mappedData[fieldKey] = phoneValue;
          }
        }
        // Handle regular fields
        else {
          mappedData[fieldKey] = value;
        }
      }
      // If field key doesn't match, try to convert field name to column name
      // This handles cases where form might send field names like "Processor" instead of "processor"
      else {
        const normalizedKey = this.getFieldKey(fieldKey);
        if (normalizedKey && validColumns.includes(normalizedKey)) {
          // Handle date fields
          if (dateFields.includes(normalizedKey)) {
            const dateValue = parseDate(value);
            if (dateValue) {
              mappedData[normalizedKey] = dateValue;
            }
          }
          // Handle phone number fields
          else if (phoneFields.includes(normalizedKey)) {
            const phoneValue = parseFloat(value);
            if (!isNaN(phoneValue)) {
              mappedData[normalizedKey] = phoneValue;
            }
          }
          // Handle regular fields
          else {
            mappedData[normalizedKey] = value;
          }
        }
        // If field doesn't match any valid column, ignore it (as per requirement)
      }
    });

    return mappedData;
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

    return await prisma.job.findMany({
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
      },
      orderBy: { created_at: 'desc' },
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
      type_of_unit,
      job_owner,
      job_owner_email_id,
      job_owner_phone_no,
      processor,
      processor_email_id,
      processor_phone_no,
      port,
      claim_no,
      po_no,
      quantity,
      description_of_quantity,
      job_date,
      application_target_date,
      application_date,
      application,
      claim_amount_after_finalization,
      appl_fee_duty_paid,
      appl_fees_reference_no,
      app_fees_payt_date,
      eft_attachment,
      bank_name,
      application_ref_no,
      application_ref_date,
      cac,
      cac_attachment,
      cec,
      cec_attachment,
      no_of_cac,
      no_of_cec,
      submission_target_date,
      submission_date,
      acknowlegment,
      submitted_to,
      file_no,
      file_date,
      job_verification_target_date,
      job_verification_date,
      sanction_approval_target_date,
      sanction___approval_date,
      authorisation_no,
      duty_credit_scrip_no,
      license_no,
      certificate_no,
      refund_sanction_order_no,
      brand_rate_letter_no,
      lic_scrip_order_cert_amendment_no,
      date,
      refund_order_license_approval_brl_certificate_attachment,
      duty_credit_refund_sanctioned_exempted_amount,
      license_registration_target_date,
      license_registration_date,
      import_date,
      actual_duty_credit_refund_sanctioned_amount,
      normal_retro,
      cus_clearance,
      type_of_ims,
      bis,
      ims,
      scomet,
      inv_no,
      inv_date,
      dbk_claim_no,
      dbk_claim_date,
      ref__no,
      ref__date,
      remark,
      status,
      invoice_type,
      form_field_json_data,
      job_id_status,
      added_by,
    } = data;

    // Helper function to parse date strings
    const parseDate = (dateValue) => {
      if (!dateValue) return null;
      if (dateValue instanceof Date) return dateValue;
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    // Map form_field_json_data to Job columns
    const mappedFormFields = JobModel.mapFormFieldsToJobColumns(form_field_json_data);

    // Prepare base data with explicit fields (these take precedence over mapped fields)
    const baseData = {
      job_register_id: job_register_id ? parseInt(job_register_id) : null,
      job_no: job_no || null,
      job_register_field_id: job_register_field_id ? parseInt(job_register_field_id) : null,
      client_info_id: client_info_id ? parseInt(client_info_id) : null,
      client_bu_id: client_bu_id ? parseInt(client_bu_id) : null,
      type_of_unit: type_of_unit || null,
      job_owner: job_owner || null,
      job_owner_email_id: job_owner_email_id || null,
      job_owner_phone_no: job_owner_phone_no ? parseFloat(job_owner_phone_no) : null,
      processor: processor || null,
      processor_email_id: processor_email_id || null,
      processor_phone_no: processor_phone_no ? parseFloat(processor_phone_no) : null,
      port: port || null,
      claim_no: claim_no || null,
      po_no: po_no || null,
      quantity: quantity || null,
      description_of_quantity: description_of_quantity || null,
      job_date: parseDate(job_date),
      application_target_date: parseDate(application_target_date),
      application_date: parseDate(application_date),
      application: application || null,
      claim_amount_after_finalization: claim_amount_after_finalization || null,
      appl_fee_duty_paid: appl_fee_duty_paid || null,
      appl_fees_reference_no: appl_fees_reference_no || null,
      app_fees_payt_date: parseDate(app_fees_payt_date),
      eft_attachment: eft_attachment || null,
      bank_name: bank_name || null,
      application_ref_no: application_ref_no || null,
      application_ref_date: parseDate(application_ref_date),
      cac: parseDate(cac),
      cac_attachment: cac_attachment || null,
      cec: parseDate(cec),
      cec_attachment: cec_attachment || null,
      no_of_cac: no_of_cac || null,
      no_of_cec: no_of_cec || null,
      submission_target_date: parseDate(submission_target_date),
      submission_date: parseDate(submission_date),
      acknowlegment: acknowlegment || null,
      submitted_to: submitted_to || null,
      file_no: file_no || null,
      file_date: parseDate(file_date),
      job_verification_target_date: parseDate(job_verification_target_date),
      job_verification_date: parseDate(job_verification_date),
      sanction_approval_target_date: parseDate(sanction_approval_target_date),
      sanction___approval_date: parseDate(sanction___approval_date),
      authorisation_no: authorisation_no || null,
      duty_credit_scrip_no: duty_credit_scrip_no || null,
      license_no: license_no || null,
      certificate_no: certificate_no || null,
      refund_sanction_order_no: refund_sanction_order_no || null,
      brand_rate_letter_no: brand_rate_letter_no || null,
      lic_scrip_order_cert_amendment_no: lic_scrip_order_cert_amendment_no || null,
      date: date || null,
      refund_order_license_approval_brl_certificate_attachment: refund_order_license_approval_brl_certificate_attachment || null,
      duty_credit_refund_sanctioned_exempted_amount: duty_credit_refund_sanctioned_exempted_amount || null,
      license_registration_target_date: parseDate(license_registration_target_date),
      license_registration_date: parseDate(license_registration_date),
      import_date: parseDate(import_date),
      actual_duty_credit_refund_sanctioned_amount: actual_duty_credit_refund_sanctioned_amount || null,
      normal_retro: normal_retro || null,
      cus_clearance: cus_clearance || null,
      type_of_ims: type_of_ims || null,
      bis: bis || null,
      ims: ims || null,
      scomet: scomet || null,
      inv_no: inv_no || null,
      inv_date: parseDate(inv_date),
      dbk_claim_no: dbk_claim_no || null,
      dbk_claim_date: parseDate(dbk_claim_date),
      ref__no: ref__no || null,
      ref__date: parseDate(ref__date),
      remark: remark || null,
      status: status || null,
      invoice_type: invoice_type || null,
      job_id_status: job_id_status || 'Active',
      added_by: added_by ? parseInt(added_by) : null,
    };

    // Merge mapped form fields with base data
    // Explicit fields in baseData take precedence, mapped fields fill in missing values
    const finalData = { ...mappedFormFields, ...baseData };
    
    // Keep form_field_json_data in final data for reference (optional - remove if not needed)
    finalData.form_field_json_data = form_field_json_data ? (typeof form_field_json_data === 'string' ? form_field_json_data : JSON.stringify(form_field_json_data)) : null;

    return await prisma.job.create({
      data: finalData,
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
  }

  /**
   * Update job
   */
  async update(id, data) {
    const updateData = {};

    // Helper function to parse date strings
    const parseDate = (dateValue) => {
      if (!dateValue) return null;
      if (dateValue instanceof Date) return dateValue;
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    // Map form_field_json_data to Job columns if provided
    let mappedFormFields = {};
    if (data.form_field_json_data !== undefined) {
      mappedFormFields = JobModel.mapFormFieldsToJobColumns(data.form_field_json_data);
    }

    // Map all possible fields
    const fields = [
      'job_register_id', 'job_no', 'job_register_field_id', 'client_info_id', 'client_bu_id', 'type_of_unit',
      'job_owner', 'job_owner_email_id', 'job_owner_phone_no',
      'processor', 'processor_email_id', 'processor_phone_no',
      'port', 'claim_no', 'po_no', 'quantity', 'description_of_quantity',
      'application', 'claim_amount_after_finalization',
      'appl_fee_duty_paid', 'appl_fees_reference_no',
      'eft_attachment', 'bank_name', 'application_ref_no',
      'cac_attachment', 'cec_attachment', 'no_of_cac', 'no_of_cec',
      'acknowlegment', 'submitted_to', 'file_no',
      'authorisation_no', 'duty_credit_scrip_no', 'license_no',
      'certificate_no', 'refund_sanction_order_no', 'brand_rate_letter_no',
      'lic_scrip_order_cert_amendment_no', 'date',
      'refund_order_license_approval_brl_certificate_attachment',
      'duty_credit_refund_sanctioned_exempted_amount',
      'actual_duty_credit_refund_sanctioned_amount',
      'normal_retro', 'cus_clearance', 'type_of_ims', 'bis', 'ims', 'scomet',
      'inv_no', 'dbk_claim_no', 'ref__no', 'remark', 'status', 'invoice_type',
      'form_field_json_data', 'job_id_status',
    ];

    const dateFields = [
      'job_date', 'application_target_date', 'application_date',
      'app_fees_payt_date', 'application_ref_date', 'cac', 'cec',
      'submission_target_date', 'submission_date', 'file_date',
      'job_verification_target_date', 'job_verification_date',
      'sanction_approval_target_date', 'sanction___approval_date',
      'license_registration_target_date', 'license_registration_date',
      'import_date', 'inv_date', 'dbk_claim_date', 'ref__date',
    ];

    const floatFields = ['job_owner_phone_no', 'processor_phone_no'];

    fields.forEach(field => {
      if (data[field] !== undefined) {
        if (field === 'form_field_json_data' && data[field]) {
          updateData[field] = typeof data[field] === 'string' ? data[field] : JSON.stringify(data[field]);
        } else {
          updateData[field] = data[field] || null;
        }
      }
    });

    dateFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = parseDate(data[field]);
      }
    });

    floatFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field] ? parseFloat(data[field]) : null;
      }
    });

    if (data.job_register_id !== undefined) {
      updateData.job_register_id = data.job_register_id ? parseInt(data.job_register_id) : null;
    }
    if (data.job_register_field_id !== undefined) {
      updateData.job_register_field_id = data.job_register_field_id ? parseInt(data.job_register_field_id) : null;
    }
    if (data.client_info_id !== undefined) {
      updateData.client_info_id = data.client_info_id ? parseInt(data.client_info_id) : null;
    }
    if (data.client_bu_id !== undefined) {
      updateData.client_bu_id = data.client_bu_id ? parseInt(data.client_bu_id) : null;
    }

    // Merge mapped form fields with update data
    // Explicit fields in updateData take precedence, mapped fields fill in missing values
    const finalUpdateData = { ...mappedFormFields, ...updateData };
    finalUpdateData.updated_at = new Date();

    return await prisma.job.update({
      where: { id: parseInt(id) },
      data: finalUpdateData,
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

