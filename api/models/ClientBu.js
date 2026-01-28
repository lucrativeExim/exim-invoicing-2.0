const prisma = require('../lib/prisma');

class ClientBuModel {
  /**
   * Get all active client BU records
   */
  async findAll(options = {}) {
    const {
      includeDeleted = false,
      clientInfoId = null,
    } = options;

    const where = {};
    if (!includeDeleted) {
      where.status = { not: 'Delete' };
    }
    if (clientInfoId) {
      where.client_info_id = parseInt(clientInfoId);
    }

    return await prisma.clientBu.findMany({
      where,
      include: {
        clientInfo: {
          select: {
            id: true,
            client_name: true,
            account_id: true,
          },
        },
        state: {
          select: {
            id: true,
            state_name: true,
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
   * Get client BU by ID
   */
  async findById(id, options = {}) {
    const { includeDeleted = false } = options;

    const where = { id: parseInt(id) };
    if (!includeDeleted) {
      where.status = { not: 'Delete' };
    }

    return await prisma.clientBu.findUnique({
      where,
      include: {
        clientInfo: {
          select: {
            id: true,
            client_name: true,
            account_id: true,
          },
        },
        state: {
          select: {
            id: true,
            state_name: true,
          },
        },
      },
    });
  }

  /**
   * Get client BU by client info ID
   */
  async findByClientInfoId(clientInfoId, options = {}) {
    const { includeDeleted = false } = options;

    const where = { client_info_id: parseInt(clientInfoId) };
    if (!includeDeleted) {
      where.status = { not: 'Delete' };
    }

    return await prisma.clientBu.findMany({
      where,
      include: {
        state: {
          select: {
            id: true,
            state_name: true,
          },
        },
      },
      orderBy: { bu_name: 'asc' },
    });
  }

  /**
   * Create a new client BU
   */
  async create(data) {
    const {
      client_info_id,
      bu_name,
      client_type,
      state_id,
      city,
      pincode,
      branch_code,
      address,
      gst_no,
      sc_i,
      added_by,
    } = data;

    return await prisma.clientBu.create({
      data: {
        client_info_id: client_info_id ? parseInt(client_info_id) : null,
        bu_name: bu_name || null,
        client_type: client_type || null,
        state_id: state_id ? parseInt(state_id) : null,
        city: city || null,
        pincode: pincode ? parseInt(pincode) : null,
        branch_code: branch_code || null,
        address: address || null,
        gst_no: gst_no || null,
        sc_i: sc_i || null,
        status: 'Active',
        added_by: added_by ? parseInt(added_by) : null,
      },
      include: {
        clientInfo: {
          select: {
            id: true,
            client_name: true,
          },
        },
        state: {
          select: {
            id: true,
            state_name: true,
          },
        },
      },
    });
  }

  /**
   * Update client BU
   */
  async update(id, data) {
    const {
      client_info_id,
      bu_name,
      client_type,
      state_id,
      city,
      pincode,
      branch_code,
      address,
      gst_no,
      sc_i,
      status,
    } = data;

    const updateData = {};

    if (client_info_id !== undefined) updateData.client_info_id = client_info_id ? parseInt(client_info_id) : null;
    if (bu_name !== undefined) updateData.bu_name = bu_name;
    if (client_type !== undefined) updateData.client_type = client_type;
    if (state_id !== undefined) updateData.state_id = state_id ? parseInt(state_id) : null;
    if (city !== undefined) updateData.city = city;
    if (pincode !== undefined) updateData.pincode = pincode ? parseInt(pincode) : null;
    if (branch_code !== undefined) updateData.branch_code = branch_code;
    if (address !== undefined) updateData.address = address;
    if (gst_no !== undefined) updateData.gst_no = gst_no;
    if (sc_i !== undefined) updateData.sc_i = sc_i;
    if (status !== undefined) updateData.status = status;

    updateData.updated_at = new Date();

    return await prisma.clientBu.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        clientInfo: {
          select: {
            id: true,
            client_name: true,
          },
        },
        state: {
          select: {
            id: true,
            state_name: true,
          },
        },
      },
    });
  }

  /**
   * Soft delete client BU
   */
  async softDelete(id, deletedBy = null) {
    return await prisma.clientBu.update({
      where: { id: parseInt(id) },
      data: {
        status: 'Delete',
        deleted_at: new Date(),
        deleted_by: deletedBy ? parseInt(deletedBy) : null,
      },
    });
  }

  /**
   * Validate GST number format
   */
  validateGSTNo(gst_no) {
    if (!gst_no) return { valid: true, message: '' };
    
    const cleaned = gst_no.trim().toUpperCase();
    
    if (cleaned.length !== 15) {
      return { valid: false, message: 'GST number must be exactly 15 characters' };
    }
    
    const gstPattern = /^[0-9]{2}[A-Z0-9]{10}[A-Z0-9]{1}Z[0-9]{1}$/;
    if (!gstPattern.test(cleaned)) {
      return { valid: false, message: 'Invalid GST number format. Format: 27ABCDE1234F1Z5' };
    }
    
    return { valid: true, message: '' };
  }

  /**
   * Validate pincode format (6 digits for India)
   */
  validatePincode(pincode) {
    if (!pincode) return { valid: true, message: '' };
    
    const cleaned = String(pincode).trim();
    
    if (cleaned.length !== 6) {
      return { valid: false, message: 'Pincode must be exactly 6 digits' };
    }
    
    if (!/^[0-9]{6}$/.test(cleaned)) {
      return { valid: false, message: 'Pincode must contain only digits' };
    }
    
    return { valid: true, message: '' };
  }

  /**
   * Check if GST number exists
   */
  async gstNoExists(gst_no, excludeId = null) {
    if (!gst_no) return false;
    const where = { gst_no: gst_no.trim().toUpperCase() };
    if (excludeId) {
      where.id = { not: parseInt(excludeId) };
    }
    where.status = { not: 'Delete' };
    const bu = await prisma.clientBu.findFirst({ where });
    return !!bu;
  }
}

module.exports = new ClientBuModel();






















