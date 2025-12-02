import api from './api';

export const authService = {
  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} Login response with user and token
   */
  async login(email, password) {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });
      
      // Store token and user in localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Login failed' };
    }
  },

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise} Registration response
   */
  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      
      // Store token and user in localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Registration failed' };
    }
  },

  /**
   * Verify token and get current user
   * @returns {Promise} User data
   */
  async verifyToken() {
    try {
      const response = await api.get('/auth/verify');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Token verification failed' };
    }
  },

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Get current user from localStorage
   * @returns {Object|null} User object or null
   */
  getCurrentUser() {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Get token from localStorage
   * @returns {string|null} Token or null
   */
  getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    return !!this.getToken();
  },
};



