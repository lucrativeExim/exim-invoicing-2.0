const prisma = require('../lib/prisma');

class ClientInfoModel {
  /**
   * Get all active client info records
   */
  async findAll(options = {}) {
    const {
      includeDeleted = false,
      accountId = null,
    } = options;

    const where = {};
    if (!includeDeleted) {
      where.status = { not: 'Delete' };
    }
    if (accountId) {
      where.account_id = parseInt(accountId);
    }

    return await prisma.clientInfo.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            account_name: true,
          },
        },
        addedByUser: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        deletedByUser: {
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
   * Get client info by ID
   */
  async findById(id, options = {}) {
    const { includeDeleted = false } = options;

    const where = { id: parseInt(id) };
    if (!includeDeleted) {
      where.status = { not: 'Delete' };
    }

    return await prisma.clientInfo.findUnique({
      where,
      include: {
        account: {
          select: {
            id: true,
            account_name: true,
          },
        },
        addedByUser: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        clientBus: {
          where: { status: { not: 'Delete' } },
          include: {
            state: true,
          },
        },
      },
    });
  }

  /**
   * Get client info by account ID
   */
  async findByAccountId(accountId, options = {}) {
    const { includeDeleted = false } = options;

    const where = { account_id: parseInt(accountId) };
    if (!includeDeleted) {
      where.status = { not: 'Delete' };
    }

    return await prisma.clientInfo.findMany({
      where,
      orderBy: { client_name: 'asc' },
    });
  }

  /**
   * Create a new client info
   */
  async create(data) {
    const {
      account_id,
      client_name,
      iec_no,
      alias,
      credit_terms,
      client_owner_ship,
      added_by,
    } = data;

    return await prisma.clientInfo.create({
      data: {
        account_id: account_id ? parseInt(account_id) : null,
        client_name: client_name || null,
        iec_no: iec_no || null,
        alias: alias || null,
        credit_terms: credit_terms || null,
        client_owner_ship: client_owner_ship || null,
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
      },
    });
  }

  /**
   * Update client info
   */
  async update(id, data) {
    const {
      account_id,
      client_name,
      iec_no,
      alias,
      credit_terms,
      client_owner_ship,
      status,
    } = data;

    const updateData = {};

    if (account_id !== undefined) updateData.account_id = account_id ? parseInt(account_id) : null;
    if (client_name !== undefined) updateData.client_name = client_name;
    if (iec_no !== undefined) updateData.iec_no = iec_no;
    if (alias !== undefined) updateData.alias = alias;
    if (credit_terms !== undefined) updateData.credit_terms = credit_terms;
    if (client_owner_ship !== undefined) updateData.client_owner_ship = client_owner_ship;
    if (status !== undefined) updateData.status = status;

    updateData.updated_at = new Date();

    return await prisma.clientInfo.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        account: {
          select: {
            id: true,
            account_name: true,
          },
        },
      },
    });
  }

  /**
   * Soft delete client info
   */
  async softDelete(id, deletedBy = null) {
    return await prisma.clientInfo.update({
      where: { id: parseInt(id) },
      data: {
        status: 'Delete',
        deleted_at: new Date(),
        deleted_by: deletedBy ? parseInt(deletedBy) : null,
      },
    });
  }

  /**
   * Check if IEC number exists
   */
  async iecNoExists(iec_no, excludeId = null) {
    if (!iec_no) return false;
    const where = { iec_no };
    if (excludeId) {
      where.id = { not: parseInt(excludeId) };
    }
    where.status = { not: 'Delete' };
    const client = await prisma.clientInfo.findFirst({ where });
    return !!client;
  }

  /**
   * Check if alias exists
   */
  async aliasExists(alias, excludeId = null) {
    if (!alias) return false;
    const where = { alias };
    if (excludeId) {
      where.id = { not: parseInt(excludeId) };
    }
    where.status = { not: 'Delete' };
    const client = await prisma.clientInfo.findFirst({ where });
    return !!client;
  }
}

module.exports = new ClientInfoModel();






















