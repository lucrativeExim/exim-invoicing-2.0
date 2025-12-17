import api from './api';

export const userService = {
  /**
   * Get current user's profile using auth verify endpoint
   * @returns {Promise} User profile data
   */
  async getProfile() {
    try {
      // Use auth/verify which already exists and returns full user data
      const response = await api.get('/auth/verify');
      const user = response.data.user;
      
      // Update localStorage with fresh data
      if (user && typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      return user;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch profile' };
    }
  },

  /**
   * Update current user's profile
   * @param {Object} profileData - Profile data to update (first_name, last_name, mobile)
   * @returns {Promise} Updated profile data
   */
  async updateProfile(profileData) {
    try {
      // Get current user ID from localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (!currentUser.id) {
        throw { error: 'User not logged in' };
      }
      
      // Use the profile update endpoint
      const response = await api.put('/users/profile', profileData);
      
      // Update user in localStorage
      if (response.data && typeof window !== 'undefined') {
        const updatedUser = {
          ...currentUser,
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          mobile: response.data.mobile,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update profile' };
    }
  },

  /**
   * Update current user's password
   * @param {Object} passwordData - Password data (old_password, new_password)
   * @returns {Promise} Success message
   */
  async updatePassword(passwordData) {
    try {
      const response = await api.put('/users/profile/password', passwordData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update password' };
    }
  },
};

