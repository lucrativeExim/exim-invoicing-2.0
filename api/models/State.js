const prisma = require('../lib/prisma');

class StateModel {
  /**
   * Get all states
   */
  async findAll() {
    return await prisma.state.findMany({
      orderBy: { state_name: 'asc' },
    });
  }

  /**
   * Get state by ID
   */
  async findById(id) {
    return await prisma.state.findUnique({
      where: { id: parseInt(id) },
    });
  }

  /**
   * Get state by name
   */
  async findByName(stateName) {
    return await prisma.state.findFirst({
      where: { state_name: stateName },
    });
  }

  /**
   * Create a new state
   */
  async create(data) {
    const { state_name } = data;
    return await prisma.state.create({
      data: { state_name },
    });
  }

  /**
   * Update state
   */
  async update(id, data) {
    const { state_name } = data;
    return await prisma.state.update({
      where: { id: parseInt(id) },
      data: { state_name },
    });
  }

  /**
   * Delete state
   */
  async delete(id) {
    return await prisma.state.delete({
      where: { id: parseInt(id) },
    });
  }
}

module.exports = new StateModel();

