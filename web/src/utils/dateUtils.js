/**
 * Date utility functions
 */

/**
 * Format date to dd/mm/yy format
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string in dd/mm/yy format or '-' if invalid
 */
export const formatDateDDMMYY = (dateString) => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '-';
    }
    
    // Get day, month, and year
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2); // Get last 2 digits of year
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

/**
 * Format date to dd/mm/yyyy format
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string in dd/mm/yyyy format or '-' if invalid
 */
export const formatDateDDMMYYYY = (dateString) => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '-';
    }
    
    // Get day, month, and year
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()); // Get full 4-digit year
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

