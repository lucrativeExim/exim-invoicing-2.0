const prisma = require('../lib/prisma');

class JobRegisterFieldModel {
  /**
   * Get all job register fields
   */
  async findAll(options = {}) {
    const {
      jobRegisterId = null,
      activeOnly = false,
      select = {
        id: true,
        job_register_id: true,
        form_fields_json: true,
        status: true,
        created_at: true,
        updated_at: true,
        added_by: true,
        updated_by: true,
      },
    } = options;

    const where = {};
    
    if (jobRegisterId) {
      where.job_register_id = parseInt(jobRegisterId);
    }
    
    if (activeOnly) {
      where.status = 'Active';
    }

    return await prisma.jobRegisterField.findMany({
      where,
      select,
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get job register field by ID
   */
  async findById(id) {
    return await prisma.jobRegisterField.findFirst({
      where: {
        id: parseInt(id),
      },
    });
  }

  /**
   * Get active job register field for a job register
   */
  async findActiveByJobRegisterId(jobRegisterId) {
    return await prisma.jobRegisterField.findFirst({
      where: {
        job_register_id: parseInt(jobRegisterId),
        status: 'Active',
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Create a new job register field
   */
  async create(data) {
    const {
      job_register_id,
      form_fields_json,
      status = 'Active',
      added_by,
    } = data;

    return await prisma.jobRegisterField.create({
      data: {
        job_register_id: job_register_id ? parseInt(job_register_id) : null,
        form_fields_json: form_fields_json || null,
        status: status || 'Active',
        added_by: added_by ? parseInt(added_by) : null,
      },
      select: {
        id: true,
        job_register_id: true,
        form_fields_json: true,
        status: true,
        created_at: true,
        added_by: true,
      },
    });
  }

  /**
   * Update job register field
   */
  async update(id, data) {
    const {
      form_fields_json,
      status,
      updated_by,
    } = data;

    const updateData = {};
    if (form_fields_json !== undefined) updateData.form_fields_json = form_fields_json;
    if (status !== undefined) updateData.status = status;
    if (updated_by !== undefined) updateData.updated_by = updated_by ? parseInt(updated_by) : null;
    updateData.updated_at = new Date();

    return await prisma.jobRegisterField.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        job_register_id: true,
        form_fields_json: true,
        status: true,
        updated_at: true,
        updated_by: true,
      },
    });
  }

  /**
   * Mark all job register fields as Inactive for a job register
   */
  async markAllInactiveByJobRegisterId(jobRegisterId, updatedBy = null) {
    return await prisma.jobRegisterField.updateMany({
      where: {
        job_register_id: parseInt(jobRegisterId),
        status: 'Active',
      },
      data: {
        status: 'Inactive',
        updated_at: new Date(),
        updated_by: updatedBy ? parseInt(updatedBy) : null,
      },
    });
  }

  /**
   * Create new active record and mark old ones as inactive
   */
  async createAndDeactivateOld(data) {
    const {
      job_register_id,
      form_fields_json,
      added_by,
      updated_by,
    } = data;

    // Use a transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      // Mark all existing active records as inactive
      await tx.jobRegisterField.updateMany({
        where: {
          job_register_id: parseInt(job_register_id),
          status: 'Active',
        },
        data: {
          status: 'Inactive',
          updated_at: new Date(),
          updated_by: updated_by ? parseInt(updated_by) : null,
        },
      });

      // Create new active record
      const newRecord = await tx.jobRegisterField.create({
        data: {
          job_register_id: parseInt(job_register_id),
          form_fields_json: form_fields_json || null,
          status: 'Active',
          added_by: added_by ? parseInt(added_by) : null,
        },
        select: {
          id: true,
          job_register_id: true,
          form_fields_json: true,
          status: true,
          created_at: true,
          added_by: true,
        },
      });

      return newRecord;
    });
  }
}

module.exports = new JobRegisterFieldModel();

