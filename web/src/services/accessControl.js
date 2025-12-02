import { authService } from './authService';

/**
 * Access Control Service for frontend
 * Provides utilities to check user permissions based on role and authority
 */

export const accessControl = {
  /**
   * Get current user
   */
  getCurrentUser() {
    return authService.getCurrentUser();
  },

  /**
   * Check if user has one of the required roles
   * @param {Array} requiredRoles - Array of allowed roles (e.g., ['Super_Admin', 'Admin'])
   * @returns {boolean}
   */
  hasRole(requiredRoles) {
    const user = this.getCurrentUser();
    if (!user || !user.user_role) return false;
    return requiredRoles.includes(user.user_role);
  },

  /**
   * Check if user has one of the required authorities
   * @param {Array} requiredAuthorities - Array of allowed authorities (e.g., ['Job_Details', 'Invoicing'])
   * @returns {boolean}
   */
  hasAuthority(requiredAuthorities) {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    // Super Admin has access to everything
    if (user.user_role === 'Super_Admin') {
      return true;
    }
    
    if (!user.authority) return false;
    
    // Parse comma-separated authority string into array
    const userAuthorities = typeof user.authority === 'string'
      ? user.authority.split(',').map(a => a.trim()).filter(Boolean)
      : Array.isArray(user.authority)
        ? user.authority
        : [];
    
    // Check if user has any of the required authorities
    return requiredAuthorities.some(auth => userAuthorities.includes(auth));
  },

  /**
   * Check if user has required role OR authority
   * @param {Object} options - { roles: [], authorities: [] }
   * @returns {boolean}
   */
  hasAccess(options = {}) {
    const user = this.getCurrentUser();
    if (!user) return false;

    const { roles = [], authorities = [] } = options;

    // Super Admin has access to everything
    if (user.user_role === 'Super_Admin') {
      return true;
    }

    // Check role
    if (roles.length > 0 && roles.includes(user.user_role)) {
      return true;
    }

    // Check authority (handle comma-separated string or array)
    if (authorities.length > 0) {
      const userAuthorities = typeof user.authority === 'string'
        ? user.authority.split(',').map(a => a.trim()).filter(Boolean)
        : Array.isArray(user.authority)
          ? user.authority
          : [];
      const hasAuthority = authorities.some(auth => userAuthorities.includes(auth));
      if (hasAuthority) {
        return true;
      }
    }

    return false;
  },

  /**
   * Check if user is Super Admin
   * @returns {boolean}
   */
  isSuperAdmin() {
    const user = this.getCurrentUser();
    return user?.user_role === 'Super_Admin';
  },

  /**
   * Check if user is Admin or Super Admin
   * @returns {boolean}
   */
  isAdmin() {
    const user = this.getCurrentUser();
    return user?.user_role === 'Super_Admin' || user?.user_role === 'Admin';
  },

  /**
   * Check if user can manage users (Super Admin or Admin)
   * @returns {boolean}
   */
  canManageUsers() {
    return this.hasRole(['Super_Admin', 'Admin']);
  },

  /**
   * Check if user can manage accounts (Super Admin or Admin)
   * @returns {boolean}
   */
  canManageAccounts() {
    return this.hasRole(['Super_Admin', 'Admin']);
  },
};

export default accessControl;

