const prisma = require('../lib/prisma');

class JobFieldValueModel {
  /**
   * Get all job field values for a job
   */
  async findByJobId(jobId, options = {}) {
    const { fieldName = null } = options;

    const where = {
      job_id: parseInt(jobId),
    };

    if (fieldName) {
      where.field_name = fieldName;
    }

    return await prisma.jobFieldValue.findMany({
      where,
      orderBy: { field_name: 'asc' },
    });
  }

  /**
   * Get job field value by ID
   */
  async findById(id) {
    return await prisma.jobFieldValue.findUnique({
      where: {
        id: parseInt(id),
      },
    });
  }

  /**
   * Get a specific field value for a job
   */
  async findByJobIdAndFieldName(jobId, fieldName) {
    return await prisma.jobFieldValue.findFirst({
      where: {
        job_id: parseInt(jobId),
        field_name: fieldName,
      },
    });
  }

  /**
   * Create a new job field value
   */
  async create(data) {
    const {
      job_id,
      field_name,
      field_value,
    } = data;

    return await prisma.jobFieldValue.create({
      data: {
        job_id: parseInt(job_id),
        field_name: field_name,
        field_value: field_value || null,
      },
    });
  }

  /**
   * Create multiple job field values
   */
  async createMany(dataArray) {
    if (!dataArray || dataArray.length === 0) {
      return [];
    }

    const formattedData = dataArray.map((item) => ({
      job_id: parseInt(item.job_id),
      field_name: item.field_name,
      field_value: item.field_value || null,
    }));

    return await prisma.jobFieldValue.createMany({
      data: formattedData,
      skipDuplicates: true,
    });
  }

  /**
   * Update job field value
   */
  async update(id, data) {
    const {
      field_value,
    } = data;

    const updateData = {
      updated_at: new Date(),
    };

    if (field_value !== undefined) {
      updateData.field_value = field_value || null;
    }

    return await prisma.jobFieldValue.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
  }

  /**
   * Update or create a field value for a job (upsert)
   */
  async upsert(jobId, fieldName, fieldValue) {
    return await prisma.jobFieldValue.upsert({
      where: {
        job_id_field_name: {
          job_id: parseInt(jobId),
          field_name: fieldName,
        },
      },
      update: {
        field_value: fieldValue || null,
        updated_at: new Date(),
      },
      create: {
        job_id: parseInt(jobId),
        field_name: fieldName,
        field_value: fieldValue || null,
      },
    });
  }

  /**
   * Upsert multiple field values for a job
   * Deletes existing values and creates new ones
   * @param {number} jobId - The job ID
   * @param {object} fieldValues - Object with field names as keys and values as values
   * @param {object} tx - Optional transaction client (if provided, uses existing transaction instead of creating new one)
   */
  async upsertMany(jobId, fieldValues, tx = null) {
    if (!fieldValues || typeof fieldValues !== 'object') {
      return;
    }

    const executeOperation = async (transactionClient) => {
      // Delete existing values for this job
      await transactionClient.jobFieldValue.deleteMany({
        where: {
          job_id: parseInt(jobId),
        },
      });

      // Create new values
      const dataArray = Object.keys(fieldValues).map((fieldName) => ({
        job_id: parseInt(jobId),
        field_name: fieldName,
        field_value: fieldValues[fieldName] || null,
      }));

      if (dataArray.length > 0) {
        await transactionClient.jobFieldValue.createMany({
          data: dataArray,
        });
      }
    };

    // If transaction client is provided, use it directly (for nested transactions)
    if (tx) {
      return await executeOperation(tx);
    }

    // Otherwise, create a new transaction
    return await prisma.$transaction(async (transactionClient) => {
      return await executeOperation(transactionClient);
    });
  }

  /**
   * Delete job field value by ID
   */
  async delete(id) {
    return await prisma.jobFieldValue.delete({
      where: { id: parseInt(id) },
    });
  }

  /**
   * Delete all field values for a job
   */
  async deleteByJobId(jobId) {
    return await prisma.jobFieldValue.deleteMany({
      where: {
        job_id: parseInt(jobId),
      },
    });
  }

  /**
   * Delete a specific field value for a job
   */
  async deleteByJobIdAndFieldName(jobId, fieldName) {
    return await prisma.jobFieldValue.deleteMany({
      where: {
        job_id: parseInt(jobId),
        field_name: fieldName,
      },
    });
  }

  /**
   * Get field values as an object (key-value pairs)
   */
  async getFieldValuesAsObject(jobId) {
    const fieldValues = await this.findByJobId(jobId);
    const result = {};
    
    fieldValues.forEach((fv) => {
      result[fv.field_name] = fv.field_value;
    });

    return result;
  }
}

module.exports = new JobFieldValueModel();

