const prisma = require('../lib/prisma');

class JobServiceChargeModel {
  /**
   * Get all job service charge records
   */
  async findAll(options = {}) {
    const {
      includeDeleted = false,
      jobId = null,
      groupId = null,
    } = options;

    const where = {};
    if (!includeDeleted) {
      where.status = { not: 'Delete' };
    }
    if (jobId) {
      where.job_id = parseInt(jobId);
    }
    if (groupId) {
      where.group_id = groupId;
    }

    return await prisma.jobServiceCharge.findMany({
      where,
      include: {
        job: {
          select: {
            id: true,
            job_no: true,
          },
        },
        addedByUser: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get job service charge by ID
   */
  async findById(id, options = {}) {
    const { includeDeleted = false } = options;
    
    const where = { id: parseInt(id) };
    if (!includeDeleted) {
      where.status = { not: 'Delete' };
    }

    return await prisma.jobServiceCharge.findUnique({
      where,
      include: {
        job: {
          select: {
            id: true,
            job_no: true,
          },
        },
      },
    });
  }

  /**
   * Get next group ID (JS-Id format: JS00001)
   */
  async getNextGroupId() {
    const lastRecord = await prisma.jobServiceCharge.findFirst({
      where: {
        group_id: {
          startsWith: 'JS',
        },
      },
      orderBy: { group_id: 'desc' },
      select: { group_id: true },
    });

    if (!lastRecord || !lastRecord.group_id) {
      return 'JS00001';
    }

    // Extract number from JS00001 format
    const numPart = lastRecord.group_id.replace('JS', '');
    const nextNum = parseInt(numPart) + 1;
    return `JS${String(nextNum).padStart(5, '0')}`;
  }

  /**
   * Create a new job service charge
   */
  async create(data) {
    const {
      group_id,
      job_id,
      client_name,
      client_address,
      concern_person,
      concern_email_id,
      concern_phone_no,
      gst_no,
      gst_type,
      min,
      max,
      in_percentage,
      fixed,
      per_shb,
      ca_charges,
      ce_charges,
      registration_other_charges,
      invoice_description,
      percentage_per_shb,
      fixed_percentage_per_shb,
      remi_one_desc,
      remi_one_charges,
      remi_two_desc,
      remi_two_charges,
      remi_three_desc,
      remi_three_charges,
      remi_four_desc,
      remi_four_charges,
      remi_five_desc,
      remi_five_charges,
      added_by,
    } = data;

    // Get next group ID if not provided
    const finalGroupId = group_id || await this.getNextGroupId();

    return await prisma.jobServiceCharge.create({
      data: {
        group_id: finalGroupId,
        job_id: job_id ? parseInt(job_id) : null,
        client_name: client_name || null,
        client_address: client_address || null,
        concern_person: concern_person || null,
        concern_email_id: concern_email_id || null,
        concern_phone_no: concern_phone_no || null,
        gst_no: gst_no || null,
        gst_type: gst_type || null,
        min: min ? parseFloat(min) : 0,
        max: max ? parseFloat(max) : 0,
        in_percentage: in_percentage ? parseFloat(in_percentage) : 0,
        fixed: fixed ? parseFloat(fixed) : 0,
        per_shb: per_shb ? parseFloat(per_shb) : 0,
        ca_charges: ca_charges ? parseFloat(ca_charges) : 0,
        ce_charges: ce_charges ? parseFloat(ce_charges) : 0,
        registration_other_charges: registration_other_charges ? parseFloat(registration_other_charges) : 0,
        invoice_description: invoice_description || null,
        percentage_per_shb: percentage_per_shb || 'No',
        fixed_percentage_per_shb: fixed_percentage_per_shb || 'No',
        remi_one_desc: remi_one_desc || null,
        remi_one_charges: remi_one_charges || null,
        remi_two_desc: remi_two_desc || null,
        remi_two_charges: remi_two_charges || null,
        remi_three_desc: remi_three_desc || null,
        remi_three_charges: remi_three_charges || null,
        remi_four_desc: remi_four_desc || null,
        remi_four_charges: remi_four_charges || null,
        remi_five_desc: remi_five_desc || null,
        remi_five_charges: remi_five_charges || null,
        status: 'Active',
        added_by: added_by ? parseInt(added_by) : null,
      },
      include: {
        job: {
          select: {
            id: true,
            job_no: true,
          },
        },
      },
    });
  }

  /**
   * Create multiple job service charges
   */
  async createMany(chargesData) {
    if (!Array.isArray(chargesData) || chargesData.length === 0) {
      return [];
    }

    // Get next group ID if not provided for the first charge
    // All charges in the same batch will share the same group_id if not individually specified
    let sharedGroupId = null;
    const firstCharge = chargesData[0];
    if (!firstCharge.group_id) {
      sharedGroupId = await this.getNextGroupId();
    }

    // Prepare data for bulk insert
    const dataToInsert = chargesData.map((charge) => {
      // Use individual group_id if provided, otherwise use shared group_id
      const groupId = charge.group_id || sharedGroupId;
      
      return {
        group_id: groupId,
        job_id: charge.job_id ? parseInt(charge.job_id) : null,
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
        added_by: charge.added_by ? parseInt(charge.added_by) : null,
      };
    });

    // Use transaction to insert all records
    return await prisma.$transaction(
      dataToInsert.map(data => prisma.jobServiceCharge.create({ data }))
    );
  }

  /**
   * Update job service charge
   */
  async update(id, data) {
    const updateData = {};

    if (data.job_id !== undefined) updateData.job_id = data.job_id ? parseInt(data.job_id) : null;
    if (data.client_name !== undefined) updateData.client_name = data.client_name;
    if (data.client_address !== undefined) updateData.client_address = data.client_address;
    if (data.concern_person !== undefined) updateData.concern_person = data.concern_person;
    if (data.concern_email_id !== undefined) updateData.concern_email_id = data.concern_email_id;
    if (data.concern_phone_no !== undefined) updateData.concern_phone_no = data.concern_phone_no;
    if (data.gst_no !== undefined) updateData.gst_no = data.gst_no;
    if (data.gst_type !== undefined) updateData.gst_type = data.gst_type;
    if (data.min !== undefined) updateData.min = parseFloat(data.min) || 0;
    if (data.max !== undefined) updateData.max = parseFloat(data.max) || 0;
    if (data.in_percentage !== undefined) updateData.in_percentage = parseFloat(data.in_percentage) || 0;
    if (data.fixed !== undefined) updateData.fixed = parseFloat(data.fixed) || 0;
    if (data.per_shb !== undefined) updateData.per_shb = parseFloat(data.per_shb) || 0;
    if (data.ca_charges !== undefined) updateData.ca_charges = parseFloat(data.ca_charges) || 0;
    if (data.ce_charges !== undefined) updateData.ce_charges = parseFloat(data.ce_charges) || 0;
    if (data.registration_other_charges !== undefined) updateData.registration_other_charges = parseFloat(data.registration_other_charges) || 0;
    if (data.invoice_description !== undefined) updateData.invoice_description = data.invoice_description;
    if (data.percentage_per_shb !== undefined) updateData.percentage_per_shb = data.percentage_per_shb;
    if (data.fixed_percentage_per_shb !== undefined) updateData.fixed_percentage_per_shb = data.fixed_percentage_per_shb;
    if (data.remi_one_desc !== undefined) updateData.remi_one_desc = data.remi_one_desc;
    if (data.remi_one_charges !== undefined) updateData.remi_one_charges = data.remi_one_charges;
    if (data.remi_two_desc !== undefined) updateData.remi_two_desc = data.remi_two_desc;
    if (data.remi_two_charges !== undefined) updateData.remi_two_charges = data.remi_two_charges;
    if (data.remi_three_desc !== undefined) updateData.remi_three_desc = data.remi_three_desc;
    if (data.remi_three_charges !== undefined) updateData.remi_three_charges = data.remi_three_charges;
    if (data.remi_four_desc !== undefined) updateData.remi_four_desc = data.remi_four_desc;
    if (data.remi_four_charges !== undefined) updateData.remi_four_charges = data.remi_four_charges;
    if (data.remi_five_desc !== undefined) updateData.remi_five_desc = data.remi_five_desc;
    if (data.remi_five_charges !== undefined) updateData.remi_five_charges = data.remi_five_charges;
    if (data.status !== undefined) updateData.status = data.status;

    updateData.updated_at = new Date();

    return await prisma.jobServiceCharge.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        job: {
          select: {
            id: true,
            job_no: true,
          },
        },
      },
    });
  }

  /**
   * Soft delete job service charge
   */
  async softDelete(id, deletedBy = null) {
    return await prisma.jobServiceCharge.update({
      where: { id: parseInt(id) },
      data: {
        status: 'Delete',
        deleted_at: new Date(),
        deleted_by: deletedBy ? parseInt(deletedBy) : null,
      },
    });
  }

  /**
   * Delete all job service charges for a job
   */
  async deleteByJobId(jobId, deletedBy = null) {
    return await prisma.jobServiceCharge.updateMany({
      where: {
        job_id: parseInt(jobId),
        status: { not: 'Delete' },
      },
      data: {
        status: 'Delete',
        deleted_at: new Date(),
        deleted_by: deletedBy ? parseInt(deletedBy) : null,
      },
    });
  }

  /**
   * Validate phone number (Indian format - 10 digits)
   */
  validatePhoneNo(phone_no) {
    if (!phone_no) return { valid: true, message: '' };
    
    const cleaned = String(phone_no).trim().replace(/[\s-]/g, '');
    
    if (cleaned.length !== 10) {
      return { valid: false, message: 'Phone number must be exactly 10 digits' };
    }
    
    if (!/^[6-9][0-9]{9}$/.test(cleaned)) {
      return { valid: false, message: 'Invalid Indian phone number.' };
    }
    
    return { valid: true, message: '' };
  }

  /**
   * Validate email format (supports multiple comma-separated emails, max 3)
   */
  validateEmails(emails) {
    if (!emails) return { valid: true, message: '' };
    
    const emailList = emails.split(',').map(e => e.trim()).filter(Boolean);
    
    if (emailList.length > 3) {
      return { valid: false, message: 'Maximum 3 email addresses allowed' };
    }
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of emailList) {
      if (!emailPattern.test(email)) {
        return { valid: false, message: `Invalid email format: ${email}` };
      }
    }
    
    return { valid: true, message: '' };
  }
}

module.exports = new JobServiceChargeModel();

