/**
 * Invoice utility functions
 */

/**
 * Format invoice_type value to readable display name
 * @param {string} invoiceType - The invoice type value from database (e.g., 'full_invoice', 'partial_invoice')
 * @returns {string} Formatted display name (e.g., 'Full Invoice', 'Partial Invoice')
 */
export const formatInvoiceType = (invoiceType) => {
  if (!invoiceType) return null;

  const typeMap = {
    'full_invoice': 'Full Invoice',
    'partial_invoice': 'Partial Invoice',
    'Full Invoice': 'Full Invoice', // Handle if already formatted
    'Partial Invoice': 'Partial Invoice', // Handle if already formatted
  };

  return typeMap[invoiceType] || invoiceType;
};

/**
 * Get badge variant for invoice type
 * @param {string} invoiceType - The invoice type value
 * @returns {string} Badge variant name
 */
export const getInvoiceTypeBadgeVariant = (invoiceType) => {
  if (!invoiceType) return 'default';

  const normalizedType = invoiceType.toLowerCase().replace(/\s+/g, '_');
  
  const variantMap = {
    'full_invoice': 'primary',
    'partial_invoice': 'info',
  };

  return variantMap[normalizedType] || 'default';
};

