const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

class UserModel {
  /**
   * Get all active users
   */
  async findAll(options = {}) {
    const {
      includeDeleted = false,
      select = {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        mobile: true,
        user_role: true,
        authority: true,
        job_register_ids: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    } = options;

    const where = includeDeleted ? {} : { status: { not: 'Delete' } };

    return await prisma.user.findMany({
      where,
      select,
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get user by ID
   */
  async findById(id, options = {}) {
    const {
      includePassword = false,
      includeDeleted = false,
    } = options;

    const select = {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      mobile: true,
      user_role: true,
      authority: true,
      job_register_ids: true,
      status: true,
      created_at: true,
      updated_at: true,
    };

    if (includePassword) {
      select.password = true;
    }

    const where = { id: parseInt(id) };
    if (!includeDeleted) {
      where.status = { not: 'Delete' };
    }

    return await prisma.user.findUnique({
      where,
      select,
    });
  }

  /**
   * Get user by email
   */
  async findByEmail(email, options = {}) {
    const { includePassword = false, activeOnly = false } = options;

    const select = {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      mobile: true,
      user_role: true,
      authority: true,
      job_register_ids: true,
      status: true,
      created_at: true,
      updated_at: true,
    };

    if (includePassword) {
      select.password = true;
    }

    const where = { email };
    if (activeOnly) {
      where.status = 'Active';
    }

    return await prisma.user.findFirst({
      where,
      select,
    });
  }

  /**
   * Create a new user
   */
  async create(data) {
    const {
      first_name,
      last_name,
      email,
      password,
      mobile,
      user_role,
      authority,
      job_register_ids,
      added_by,
    } = data;

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Convert authority array to comma-separated string
    let authorityString = null;
    if (authority) {
      if (Array.isArray(authority)) {
        authorityString = authority.filter(a => a && a !== 'Full').join(',') || null;
      } else if (typeof authority === 'string') {
        // Remove 'Full' if present and split/join to normalize
        const authArray = authority.split(',').map(a => a.trim()).filter(a => a && a !== 'Full');
        authorityString = authArray.length > 0 ? authArray.join(',') : null;
      }
    }

    // Convert job_register_ids array to comma-separated string
    let jobRegisterIdsString = null;
    if (job_register_ids) {
      if (Array.isArray(job_register_ids)) {
        jobRegisterIdsString = job_register_ids.filter(id => id).join(',');
      } else if (typeof job_register_ids === 'string') {
        jobRegisterIdsString = job_register_ids;
      }
    }

    return await prisma.user.create({
      data: {
        first_name: first_name || null,
        last_name: last_name || null,
        email,
        password: hashedPassword,
        mobile: mobile || null,
        user_role: user_role || null,
        authority: authorityString,
        job_register_ids: jobRegisterIdsString || null,
        status: 'Active',
        added_by: added_by || null,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        mobile: true,
        user_role: true,
        authority: true,
        job_register_ids: true,
        status: true,
        created_at: true,
      },
    });
  }

  /**
   * Update user
   */
  async update(id, data) {
    const {
      first_name,
      last_name,
      email,
      password,
      mobile,
      user_role,
      authority,
      job_register_ids,
      status,
    } = data;

    const updateData = {};

    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (email !== undefined) updateData.email = email;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (user_role !== undefined) updateData.user_role = user_role;
    if (status !== undefined) updateData.status = status;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    // Convert authority array to comma-separated string
    if (authority !== undefined) {
      if (Array.isArray(authority)) {
        updateData.authority = authority.filter(a => a && a !== 'Full').join(',') || null;
      } else if (typeof authority === 'string') {
        // Remove 'Full' if present and split/join to normalize
        const authArray = authority.split(',').map(a => a.trim()).filter(a => a && a !== 'Full');
        updateData.authority = authArray.length > 0 ? authArray.join(',') : null;
      } else {
        updateData.authority = null;
      }
    }
    
    // Convert job_register_ids array to comma-separated string
    if (job_register_ids !== undefined) {
      if (Array.isArray(job_register_ids)) {
        updateData.job_register_ids = job_register_ids.filter(id => id).join(',') || null;
      } else if (typeof job_register_ids === 'string') {
        updateData.job_register_ids = job_register_ids || null;
      } else {
        updateData.job_register_ids = null;
      }
    }

    updateData.updated_at = new Date();

    return await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        mobile: true,
        user_role: true,
        authority: true,
        job_register_ids: true,
        status: true,
        updated_at: true,
      },
    });
  }

  /**
   * Soft delete user
   */
  async softDelete(id, deletedBy = null) {
    return await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        status: 'Delete',
        deleted_at: new Date(),
        deleted_by: deletedBy ? parseInt(deletedBy) : null,
      },
    });
  }

  /**
   * Verify password
   */
  async verifyPassword(user, password) {
    if (!user.password) {
      return false;
    }
    return await bcrypt.compare(password, user.password);
  }

  /**
   * Check if email exists
   */
  async emailExists(email, excludeId = null) {
    const where = { email };
    if (excludeId) {
      where.id = { not: parseInt(excludeId) };
    }
    const user = await prisma.user.findFirst({ where });
    return !!user;
  }
}

module.exports = new UserModel();

