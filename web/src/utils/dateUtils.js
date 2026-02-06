/**
 * Date utility functions
 */

/**
 * Format date to dd-mm-yyyy format
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string in dd-mm-yyyy format or '-' if invalid
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
    const year = String(date.getFullYear()); // Get full 4-digit year
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

/**
 * Format date to dd-mm-yyyy format
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string in dd-mm-yyyy format or '-' if invalid
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
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

/**
 * Format field value - if it's a date in YYYY-MM-DD format, convert to dd-mm-yyyy
 * Otherwise return the value as-is
 * @param {string|number|any} value - Field value that might be a date
 * @returns {string|number|any} Formatted value if date, otherwise original value
 */
export const formatFieldValue = (value) => {
  if (!value || value === "NA" || value === null || value === undefined) {
    return value;
  }
  
  const strValue = String(value).trim();
  
  // Check if value matches YYYY-MM-DD format (e.g., 2026-01-31)
  const dateMatch = strValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return `${day}-${month}-${year}`;
  }
  
  // Try parsing as date to catch other date formats
  try {
    const date = new Date(strValue);
    if (!isNaN(date.getTime())) {
      // Check if the parsed date matches the input string (to avoid false positives)
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr === strValue || strValue.includes('-')) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }
    }
  } catch (e) {
    // Not a date, return as-is
  }
  
  return value;
};

