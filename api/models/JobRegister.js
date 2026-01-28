const prisma = require('../lib/prisma');

class JobRegisterModel {
  /**
   * Get all job registers
   */
  async findAll(options = {}) {
    const {
      includeDeleted = false,
      activeOnly = false,
      select = {
        id: true,
        job_code: true,
        job_title: true,
        job_type: true,
        gst_rate_id: true,
        remi_one_desc: true,
        remi_two_desc: true,
        remi_three_desc: true,
        remi_four_desc: true,
        remi_five_desc: true,
        status: true,
        created_at: true,
        updated_at: true,
        gstRate: {
          select: {
            id: true,
            sac_no: true,
            sgst: true,
            cgst: true,
            igst: true,
          },
        },
      },
    } = options;

    const where = {};
    
    if (!includeDeleted) {
      where.deleted_at = null;
    }
    
    if (activeOnly) {
      where.status = 'Active';
    }

    return await prisma.jobRegister.findMany({
      where,
      select,
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get job register by ID
   */
  async findById(id) {
    return await prisma.jobRegister.findFirst({
      where: {
        id: parseInt(id),
        deleted_at: null,
      },
    });
  }

  /**
   * Get job register by job code
   */
  async findByJobCode(jobCode) {
    return await prisma.jobRegister.findFirst({
      where: {
        job_code: jobCode,
        deleted_at: null,
      },
    });
  }

  /**
   * Check if job code exists
   */
  async jobCodeExists(job_code, excludeId = null) {
    if (!job_code) return false;
    const where = { 
      job_code,
      deleted_at: null,
    };
    if (excludeId) {
      where.id = { not: parseInt(excludeId) };
    }
    const jobRegister = await prisma.jobRegister.findFirst({ where });
    return !!jobRegister;
  }

  /**
   * Check if job title exists
   */
  async jobTitleExists(job_title, excludeId = null) {
    if (!job_title) return false;
    const where = { 
      job_title,
      deleted_at: null,
    };
    if (excludeId) {
      where.id = { not: parseInt(excludeId) };
    }
    const jobRegister = await prisma.jobRegister.findFirst({ where });
    return !!jobRegister;
  }

  /**
   * Create a new job register
   */
  async create(data) {
    const {
      job_code,
      job_title,
      job_type,
      gst_rate_id,
      remi_one_desc,
      remi_two_desc,
      remi_three_desc,
      remi_four_desc,
      remi_five_desc,
      field_order,
      status,
      added_by,
    } = data;

    return await prisma.jobRegister.create({
      data: {
        job_code: job_code || null,
        job_title: job_title || null,
        job_type: job_type || null,
        gst_rate_id: gst_rate_id ? parseInt(gst_rate_id) : null,
        remi_one_desc: remi_one_desc || null,
        remi_two_desc: remi_two_desc || null,
        remi_three_desc: remi_three_desc || null,
        remi_four_desc: remi_four_desc || null,
        remi_five_desc: remi_five_desc || null,
        field_order: field_order || null,
        status: status || 'Active',
        added_by: added_by ? parseInt(added_by) : null,
      },
      select: {
        id: true,
        job_code: true,
        job_title: true,
        job_type: true,
        gst_rate_id: true,
        remi_one_desc: true,
        remi_two_desc: true,
        remi_three_desc: true,
        remi_four_desc: true,
        remi_five_desc: true,
        status: true,
        created_at: true,
      },
    });
  }

  /**
   * Update job register
   */
  async update(id, data) {
    const {
      job_code,
      job_title,
      job_type,
      gst_rate_id,
      remi_one_desc,
      remi_two_desc,
      remi_three_desc,
      remi_four_desc,
      remi_five_desc,
      field_order,
      status,
    } = data;

    const updateData = {};
    if (job_code !== undefined) updateData.job_code = job_code;
    if (job_title !== undefined) updateData.job_title = job_title;
    if (job_type !== undefined) updateData.job_type = job_type;
    if (gst_rate_id !== undefined) updateData.gst_rate_id = gst_rate_id ? parseInt(gst_rate_id) : null;
    if (remi_one_desc !== undefined) updateData.remi_one_desc = remi_one_desc;
    if (remi_two_desc !== undefined) updateData.remi_two_desc = remi_two_desc;
    if (remi_three_desc !== undefined) updateData.remi_three_desc = remi_three_desc;
    if (remi_four_desc !== undefined) updateData.remi_four_desc = remi_four_desc;
    if (remi_five_desc !== undefined) updateData.remi_five_desc = remi_five_desc;
    if (field_order !== undefined) updateData.field_order = field_order;
    if (status !== undefined) updateData.status = status;
    updateData.updated_at = new Date();

    return await prisma.jobRegister.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        job_code: true,
        job_title: true,
        job_type: true,
        gst_rate_id: true,
        remi_one_desc: true,
        remi_two_desc: true,
        remi_three_desc: true,
        remi_four_desc: true,
        remi_five_desc: true,
        status: true,
        updated_at: true,
      },
    });
  }

  /**
   * Soft delete job register
   */
  async softDelete(id, deletedBy = null) {
    return await prisma.jobRegister.update({
      where: { id: parseInt(id) },
      data: {
        status: 'Delete',
        deleted_at: new Date(),
        deleted_by: deletedBy ? parseInt(deletedBy) : null,
      },
    });
  }
}

module.exports = new JobRegisterModel();

