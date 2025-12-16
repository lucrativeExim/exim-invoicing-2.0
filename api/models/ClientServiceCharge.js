const prisma = require('../lib/prisma');

class ClientServiceChargeModel {
  /**
   * Get all active client service charge records
   */
  async findAll(options = {}) {
    const {
      includeDeleted = false,
      accountId = null,
      clientInfoId = null,
      clientBuId = null,
      jobRegisterId = null,
      groupId = null,
    } = options;

    const where = {};
    if (!includeDeleted) {
      where.status = { not: 'Delete' };
    }
    if (accountId) {
      where.account_id = parseInt(accountId);
    }
    if (clientInfoId) {
      where.client_info_id = parseInt(clientInfoId);
    }
    if (clientBuId) {
      where.client_bu_id = parseInt(clientBuId);
    }
    if (jobRegisterId) {
      where.job_register_id = parseInt(jobRegisterId);
    }
    if (groupId) {
      where.group_id = groupId;
    }

    return await prisma.clientServiceCharge.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            account_name: true,
          },
        },
        clientInfo: {
          select: {
            id: true,
            client_name: true,
          },
        },
        clientBu: {
          select: {
            id: true,
            bu_name: true,
          },
        },
        jobRegister: {
          select: {
            id: true,
            job_title: true,
            job_code: true,
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
   * Get client service charge by ID
   */
  async findById(id, options = {}) {
    const { includeDeleted = false } = options;

    const where = { id: parseInt(id) };
    if (!includeDeleted) {
      where.status = { not: 'Delete' };
    }

    return await prisma.clientServiceCharge.findUnique({
      where,
      include: {
        account: {
          select: {
            id: true,
            account_name: true,
          },
        },
        clientInfo: {
          select: {
            id: true,
            client_name: true,
          },
        },
        clientBu: {
          select: {
            id: true,
            bu_name: true,
          },
        },
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
   * Get next group ID (C-Id format: LE00001)
   */
  async getNextGroupId() {
    const lastRecord = await prisma.clientServiceCharge.findFirst({
      where: {
        group_id: {
          startsWith: 'LE',
        },
      },
      orderBy: { group_id: 'desc' },
      select: { group_id: true },
    });

    if (!lastRecord || !lastRecord.group_id) {
      return 'LE00001';
    }

    // Extract number from LE00001 format
    const numPart = lastRecord.group_id.replace('LE', '');
    const nextNum = parseInt(numPart) + 1;
    return `LE${String(nextNum).padStart(5, '0')}`;
  }

  /**
   * Create a new client service charge
   */
  async create(data) {
    const {
      group_id,
      account_id,
      client_info_id,
      client_bu_id,
      job_register_id,
      concern_person,
      concern_email_id,
      concern_phone_no,
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
      added_by,
    } = data;

    // Get next group ID if not provided
    const finalGroupId = group_id || await this.getNextGroupId();

    return await prisma.clientServiceCharge.create({
      data: {
        group_id: finalGroupId,
        account_id: account_id ? parseInt(account_id) : null,
        client_info_id: client_info_id ? parseInt(client_info_id) : null,
        client_bu_id: client_bu_id ? parseInt(client_bu_id) : null,
        job_register_id: job_register_id ? parseInt(job_register_id) : null,
        concern_person: concern_person || null,
        concern_email_id: concern_email_id || null,
        concern_phone_no: concern_phone_no || null,
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
        status: 'Active',
        added_by: added_by ? parseInt(added_by) : null,
      },
      include: {
        account: {
          select: {
            id: true,
            account_name: true,
          },
        },
        clientInfo: {
          select: {
            id: true,
            client_name: true,
          },
        },
        clientBu: {
          select: {
            id: true,
            bu_name: true,
          },
        },
        jobRegister: {
          select: {
            id: true,
            job_title: true,
          },
        },
      },
    });
  }

  /**
   * Update client service charge
   */
  async update(id, data) {
    const {
      account_id,
      client_info_id,
      client_bu_id,
      job_register_id,
      concern_person,
      concern_email_id,
      concern_phone_no,
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
      status,
    } = data;

    const updateData = {};

    if (account_id !== undefined) updateData.account_id = account_id ? parseInt(account_id) : null;
    if (client_info_id !== undefined) updateData.client_info_id = client_info_id ? parseInt(client_info_id) : null;
    if (client_bu_id !== undefined) updateData.client_bu_id = client_bu_id ? parseInt(client_bu_id) : null;
    if (job_register_id !== undefined) updateData.job_register_id = job_register_id ? parseInt(job_register_id) : null;
    if (concern_person !== undefined) updateData.concern_person = concern_person;
    if (concern_email_id !== undefined) updateData.concern_email_id = concern_email_id;
    if (concern_phone_no !== undefined) updateData.concern_phone_no = concern_phone_no;
    if (min !== undefined) updateData.min = parseFloat(min) || 0;
    if (max !== undefined) updateData.max = parseFloat(max) || 0;
    if (in_percentage !== undefined) updateData.in_percentage = parseFloat(in_percentage) || 0;
    if (fixed !== undefined) updateData.fixed = parseFloat(fixed) || 0;
    if (per_shb !== undefined) updateData.per_shb = parseFloat(per_shb) || 0;
    if (ca_charges !== undefined) updateData.ca_charges = parseFloat(ca_charges) || 0;
    if (ce_charges !== undefined) updateData.ce_charges = parseFloat(ce_charges) || 0;
    if (registration_other_charges !== undefined) updateData.registration_other_charges = parseFloat(registration_other_charges) || 0;
    if (invoice_description !== undefined) updateData.invoice_description = invoice_description;
    if (percentage_per_shb !== undefined) updateData.percentage_per_shb = percentage_per_shb;
    if (fixed_percentage_per_shb !== undefined) updateData.fixed_percentage_per_shb = fixed_percentage_per_shb;
    if (status !== undefined) updateData.status = status;

    updateData.updated_at = new Date();

    return await prisma.clientServiceCharge.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        account: {
          select: {
            id: true,
            account_name: true,
          },
        },
        clientInfo: {
          select: {
            id: true,
            client_name: true,
          },
        },
        clientBu: {
          select: {
            id: true,
            bu_name: true,
          },
        },
        jobRegister: {
          select: {
            id: true,
            job_title: true,
          },
        },
      },
    });
  }

  /**
   * Soft delete client service charge
   */
  async softDelete(id, deletedBy = null) {
    return await prisma.clientServiceCharge.update({
      where: { id: parseInt(id) },
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

module.exports = new ClientServiceChargeModel();

