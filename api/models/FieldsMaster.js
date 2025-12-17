const prisma = require('../lib/prisma');

class FieldsMasterModel {
  /**
   * Get all Fields Master records
   */
  async findAll(options = {}) {
    const {
      includeDeleted = false,
      select = {
        id: true,
        field_name: true,
        field_type: true,
        default_value: true,
        treatment: true,
        dropdown_options: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    } = options;

    const where = {};
    if (!includeDeleted) {
      where.deleted_at = null;
    }

    return await prisma.fieldsMaster.findMany({
      where,
      select,
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get Fields Master by ID
   */
  async findById(id, options = {}) {
    const {
      includeDeleted = false,
    } = options;

    const select = {
      id: true,
      field_name: true,
      field_type: true,
      default_value: true,
      treatment: true,
      dropdown_options: true,
      status: true,
      created_at: true,
      updated_at: true,
    };

    const where = { id: parseInt(id) };
    if (!includeDeleted) {
      where.deleted_at = null;
    }

    return await prisma.fieldsMaster.findUnique({
      where,
      select,
    });
  }

  /**
   * Get Fields Master by field name
   */
  async findByFieldName(fieldName) {
    return await prisma.fieldsMaster.findFirst({
      where: {
        field_name: fieldName,
        deleted_at: null,
      },
    });
  }

  /**
   * Get Fields Master by multiple field names (bulk fetch)
   */
  async findByFieldNames(fieldNames) {
    if (!Array.isArray(fieldNames) || fieldNames.length === 0) {
      return [];
    }
    return await prisma.fieldsMaster.findMany({
      where: {
        field_name: {
          in: fieldNames,
        },
        deleted_at: null,
      },
      select: {
        id: true,
        field_name: true,
        field_type: true,
        default_value: true,
        treatment: true,
        dropdown_options: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  /**
   * Check if field name exists
   */
  async fieldNameExists(field_name, excludeId = null) {
    if (!field_name) return false;
    const where = { 
      field_name,
      deleted_at: null,
    };
    if (excludeId) {
      where.id = { not: parseInt(excludeId) };
    }
    const field = await prisma.fieldsMaster.findFirst({ where });
    return !!field;
  }

  /**
   * Create a new Fields Master record
   */
  async create(data) {
    const {
      field_name,
      field_type,
      default_value,
      treatment,
      dropdown_options,
      added_by,
    } = data;

    // Parse treatment if it's an array
    let treatmentValue = null;
    if (treatment) {
      if (Array.isArray(treatment)) {
        treatmentValue = JSON.stringify(treatment);
      } else if (typeof treatment === 'string') {
        treatmentValue = treatment;
      }
    }

    // Parse dropdown_options if it's an array
    let dropdownOptionsValue = null;
    if (dropdown_options) {
      if (Array.isArray(dropdown_options)) {
        dropdownOptionsValue = JSON.stringify(dropdown_options);
      } else if (typeof dropdown_options === 'string') {
        dropdownOptionsValue = dropdown_options;
      }
    }

    // Convert default_value to boolean
    const defaultValue = default_value === true || default_value === 'true' || default_value === 'True';

    return await prisma.fieldsMaster.create({
      data: {
        field_name: field_name || null,
        field_type: field_type || null,
        default_value: defaultValue,
        treatment: treatmentValue,
        dropdown_options: dropdownOptionsValue,
        added_by: added_by ? parseInt(added_by) : null,
      },
      select: {
        id: true,
        field_name: true,
        field_type: true,
        default_value: true,
        treatment: true,
        dropdown_options: true,
        status: true,
        created_at: true,
      },
    });
  }

  /**
   * Update Fields Master record
   */
  async update(id, data) {
    const {
      field_name,
      field_type,
      default_value,
      treatment,
      dropdown_options,
    } = data;

    const updateData = {};
    
    if (field_name !== undefined) updateData.field_name = field_name;
    if (field_type !== undefined) updateData.field_type = field_type;
    
    if (default_value !== undefined) {
      updateData.default_value = default_value === true || default_value === 'true' || default_value === 'True';
    }
    
    if (treatment !== undefined) {
      if (Array.isArray(treatment)) {
        updateData.treatment = JSON.stringify(treatment);
      } else if (typeof treatment === 'string') {
        updateData.treatment = treatment;
      }
    }
    
    if (dropdown_options !== undefined) {
      if (dropdown_options === null) {
        // Explicitly set to null to clear the field
        updateData.dropdown_options = null;
      } else if (Array.isArray(dropdown_options)) {
        updateData.dropdown_options = JSON.stringify(dropdown_options);
      } else if (typeof dropdown_options === 'string') {
        updateData.dropdown_options = dropdown_options;
      }
    }
    
    updateData.updated_at = new Date();

    return await prisma.fieldsMaster.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        field_name: true,
        field_type: true,
        default_value: true,
        treatment: true,
        dropdown_options: true,
        status: true,
        updated_at: true,
      },
    });
  }

  /**
   * Soft delete Fields Master record
   */
  async softDelete(id, deleted_by) {
    return await prisma.fieldsMaster.update({
      where: { id: parseInt(id) },
      data: {
        deleted_at: new Date(),
        deleted_by: deleted_by ? parseInt(deleted_by) : null,
        status: 'Delete',
      },
    });
  }

  /**
   * Delete Fields Master record (hard delete)
   */
  async delete(id) {
    return await prisma.fieldsMaster.delete({
      where: { id: parseInt(id) },
    });
  }
}

module.exports = new FieldsMasterModel();

