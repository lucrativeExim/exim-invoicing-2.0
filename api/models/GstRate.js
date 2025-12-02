const prisma = require('../lib/prisma');

class GstRateModel {
  /**
   * Get all GST rates
   */
  async findAll(options = {}) {
    const {
      includeDeleted = false,
      select = {
        id: true,
        sac_no: true,
        sgst: true,
        cgst: true,
        igst: true,
        created_at: true,
        updated_at: true,
      },
    } = options;

    return await prisma.gstRate.findMany({
      where: {},
      select,
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get GST rate by ID
   */
  async findById(id, options = {}) {
    const {
      includeDeleted = false,
    } = options;

    const select = {
      id: true,
      sac_no: true,
      sgst: true,
      cgst: true,
      igst: true,
      created_at: true,
      updated_at: true,
    };

    return await prisma.gstRate.findUnique({
      where: { id: parseInt(id) },
      select,
    });
  }

  /**
   * Get GST rate by SAC number
   */
  async findBySacNo(sacNo) {
    return await prisma.gstRate.findFirst({
      where: {
        sac_no: sacNo,
      },
    });
  }

  /**
   * Check if SAC number exists
   */
  async sacNoExists(sac_no, excludeId = null) {
    if (!sac_no) return false;
    const where = { sac_no };
    if (excludeId) {
      where.id = { not: parseInt(excludeId) };
    }
    const gstRate = await prisma.gstRate.findFirst({ where });
    return !!gstRate;
  }

  /**
   * Create a new GST rate
   */
  async create(data) {
    const {
      sac_no,
      sgst,
      cgst,
      igst,
      added_by,
    } = data;

    // Convert string values to float if provided
    const parseFloatValue = (value) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    };

    return await prisma.gstRate.create({
      data: {
        sac_no: sac_no || null,
        sgst: parseFloatValue(sgst),
        cgst: parseFloatValue(cgst),
        igst: parseFloatValue(igst),
        added_by: added_by ? parseInt(added_by) : null,
      },
      select: {
        id: true,
        sac_no: true,
        sgst: true,
        cgst: true,
        igst: true,
        created_at: true,
      },
    });
  }

  /**
   * Update GST rate
   */
  async update(id, data) {
    const {
      sac_no,
      sgst,
      cgst,
      igst,
    } = data;

    // Convert string values to float if provided
    const parseFloatValue = (value) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    };

    const updateData = {};
    if (sac_no !== undefined) updateData.sac_no = sac_no;
    if (sgst !== undefined) updateData.sgst = parseFloatValue(sgst);
    if (cgst !== undefined) updateData.cgst = parseFloatValue(cgst);
    if (igst !== undefined) updateData.igst = parseFloatValue(igst);
    updateData.updated_at = new Date();

    return await prisma.gstRate.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        sac_no: true,
        sgst: true,
        cgst: true,
        igst: true,
        updated_at: true,
      },
    });
  }

  /**
   * Delete GST rate (hard delete)
   */
  async delete(id) {
    return await prisma.gstRate.delete({
      where: { id: parseInt(id) },
    });
  }
}

module.exports = new GstRateModel();

