import api from './api';

export const clientService = {
  /**
   * Get all clients
   * @param {number} accountId - Optional account ID to filter clients
   */
  async getClients(accountId = null) {
    try {
      const url = accountId 
        ? `/client-info/by-account/${accountId}`
        : '/client-info';
      const response = await api.get(url);
      return response.data.filter(client => client.status === 'Active');
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
  },

  /**
   * Get client by ID
   */
  async getClientById(id) {
    try {
      const response = await api.get(`/client-info/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching client:', error);
      throw error;
    }
  },
};

export default clientService;






