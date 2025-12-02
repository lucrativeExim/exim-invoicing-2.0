const prisma = require('../lib/prisma');

class AccountModel {
  /**
   * Get all active accounts
   */
  async findAll(options = {}) {
    const {
      includeDeleted = false,
      select = {
        id: true,
        account_name: true,
        account_address: true,
        bank_name: true,
        bank_address: true,
        account_no: true,
        ifsc_no: true,
        gst_no: true,
        pan_no: true,
        msme_details: true,
        remark: true,
        invoice_serial_initial: true,
        invoice_serial_second_no: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    } = options;

    const where = includeDeleted ? {} : { status: { not: 'Delete' } };

    return await prisma.account.findMany({
      where,
      select,
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get account by ID
   */
  async findById(id, options = {}) {
    const {
      includeDeleted = false,
    } = options;

    const select = {
      id: true,
      account_name: true,
      account_address: true,
      bank_name: true,
      bank_address: true,
      account_no: true,
      ifsc_no: true,
      gst_no: true,
      pan_no: true,
      msme_details: true,
      remark: true,
      invoice_serial_initial: true,
      invoice_serial_second_no: true,
      status: true,
      created_at: true,
      updated_at: true,
    };

    const where = { id: parseInt(id) };
    if (!includeDeleted) {
      where.status = { not: 'Delete' };
    }

    return await prisma.account.findUnique({
      where,
      select,
    });
  }

  /**
   * Create a new account
   */
  async create(data) {
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
      added_by,
    } = data;

    return await prisma.account.create({
      data: {
        account_name: account_name || null,
        account_address: account_address || null,
        bank_name: bank_name || null,
        bank_address: bank_address || null,
        account_no: account_no || null,
        ifsc_no: ifsc_no || null,
        gst_no: gst_no || null,
        pan_no: pan_no || null,
        msme_details: msme_details || null,
        remark: remark || null,
        invoice_serial_initial: invoice_serial_initial || null,
        invoice_serial_second_no: invoice_serial_second_no || null,
        status: 'Active',
        added_by: added_by || null,
      },
      select: {
        id: true,
        account_name: true,
        account_address: true,
        bank_name: true,
        bank_address: true,
        account_no: true,
        ifsc_no: true,
        gst_no: true,
        pan_no: true,
        msme_details: true,
        remark: true,
        invoice_serial_initial: true,
        invoice_serial_second_no: true,
        status: true,
        created_at: true,
      },
    });
  }

  /**
   * Update account
   */
  async update(id, data) {
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
    } = data;

    const updateData = {};

    if (account_name !== undefined) updateData.account_name = account_name;
    if (account_address !== undefined) updateData.account_address = account_address;
    if (bank_name !== undefined) updateData.bank_name = bank_name;
    if (bank_address !== undefined) updateData.bank_address = bank_address;
    if (account_no !== undefined) updateData.account_no = account_no;
    if (ifsc_no !== undefined) updateData.ifsc_no = ifsc_no;
    if (gst_no !== undefined) updateData.gst_no = gst_no;
    if (pan_no !== undefined) updateData.pan_no = pan_no;
    if (msme_details !== undefined) updateData.msme_details = msme_details;
    if (remark !== undefined) updateData.remark = remark;
    if (invoice_serial_initial !== undefined) updateData.invoice_serial_initial = invoice_serial_initial;
    if (invoice_serial_second_no !== undefined) updateData.invoice_serial_second_no = invoice_serial_second_no;
    if (status !== undefined) updateData.status = status;

    updateData.updated_at = new Date();

    return await prisma.account.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        account_name: true,
        account_address: true,
        bank_name: true,
        bank_address: true,
        account_no: true,
        ifsc_no: true,
        gst_no: true,
        pan_no: true,
        msme_details: true,
        remark: true,
        invoice_serial_initial: true,
        invoice_serial_second_no: true,
        status: true,
        updated_at: true,
      },
    });
  }

  /**
   * Soft delete account
   */
  async softDelete(id, deletedBy = null) {
    return await prisma.account.update({
      where: { id: parseInt(id) },
      data: {
        status: 'Delete',
        deleted_at: new Date(),
        deleted_by: deletedBy ? parseInt(deletedBy) : null,
      },
    });
  }

  /**
   * Check if GST number exists
   */
  async gstNoExists(gst_no, excludeId = null) {
    if (!gst_no) return false;
    const where = { gst_no };
    if (excludeId) {
      where.id = { not: parseInt(excludeId) };
    }
    const account = await prisma.account.findFirst({ where });
    return !!account;
  }

  /**
   * Check if PAN number exists
   */
  async panNoExists(pan_no, excludeId = null) {
    if (!pan_no) return false;
    const where = { pan_no };
    if (excludeId) {
      where.id = { not: parseInt(excludeId) };
    }
    const account = await prisma.account.findFirst({ where });
    return !!account;
  }

  /**
   * Check if invoice serial initial exists
   */
  async invoiceSerialInitialExists(invoice_serial_initial, excludeId = null) {
    if (!invoice_serial_initial) return false;
    const where = { invoice_serial_initial };
    if (excludeId) {
      where.id = { not: parseInt(excludeId) };
    }
    const account = await prisma.account.findFirst({ where });
    return !!account;
  }

  /**
   * Validate GST number format
   * Format: 15 characters - 2 digits (state code) + 10 characters (PAN) + 1 character (entity number) + Z + 1 digit (check digit)
   * Example: 27ABCDE1234F1Z5
   */
  validateGSTNo(gst_no) {
    if (!gst_no) return { valid: true, message: '' };
    
    // Remove spaces and convert to uppercase
    const cleaned = gst_no.trim().toUpperCase();
    
    // Check length
    if (cleaned.length !== 15) {
      return { valid: false, message: 'GST number must be exactly 15 characters' };
    }
    
    // Check format: 2 digits + 10 alphanumeric + 1 alphanumeric + Z + 1 digit
    const gstPattern = /^[0-9]{2}[A-Z0-9]{10}[A-Z0-9]{1}Z[0-9]{1}$/;
    if (!gstPattern.test(cleaned)) {
      return { valid: false, message: 'Invalid GST number format. Format: 27ABCDE1234F1Z5' };
    }
    
    return { valid: true, message: '' };
  }

  /**
   * Validate PAN number format
   * Format: 10 characters - 5 letters + 4 digits + 1 letter
   * Example: ABCDE1234F
   */
  validatePANNo(pan_no) {
    if (!pan_no) return { valid: true, message: '' };
    
    // Remove spaces and convert to uppercase
    const cleaned = pan_no.trim().toUpperCase();
    
    // Check length
    if (cleaned.length !== 10) {
      return { valid: false, message: 'PAN number must be exactly 10 characters' };
    }
    
    // Check format: 5 letters + 4 digits + 1 letter
    const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panPattern.test(cleaned)) {
      return { valid: false, message: 'Invalid PAN number format. Format: ABCDE1234F' };
    }
    
    return { valid: true, message: '' };
  }
}

module.exports = new AccountModel();

