import api from './api';

export const accountService = {
  /**
   * Get all accounts
   */
  async getAccounts() {
    try {
      const response = await api.get('/accounts');
      return response.data;
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  },

  /**
   * Get account by ID
   */
  async getAccountById(id) {
    try {
      const response = await api.get(`/accounts/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching account:', error);
      throw error;
    }
  },
};

export default accountService;





