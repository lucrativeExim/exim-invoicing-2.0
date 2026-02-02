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

/**
 * Calculate service subtotal from invoice data
 * This matches the calculation logic used in both invoice creation and view pages
 * Formula: baseAmount + registrationCharges + caCharges + ceCharges + rewardAmount - discountAmount
 * 
 * @param {Object} options - Calculation options
 * @param {Object} options.invoiceBreakdown - API response from /invoices/sample (preferred)
 * @param {Object} options.invoiceData - Invoice data from /invoices/{id} (fallback)
 * @param {number} options.baseAmount - Base/professional charges amount (fallback)
 * @param {number} options.registrationCharges - Registration charges (fallback)
 * @param {number} options.caCharges - CA charges (fallback)
 * @param {number} options.ceCharges - CE charges (fallback)
 * @param {number} options.rewardAmount - Reward amount (fallback)
 * @param {number} options.discountAmount - Discount amount (fallback)
 * @returns {number} Calculated service subtotal
 */
export const calculateServiceSubtotal = ({
  invoiceBreakdown,
  invoiceData,
  baseAmount,
  registrationCharges,
  caCharges,
  ceCharges,
  rewardAmount,
  discountAmount,
}) => {
  // Priority 1: Use serviceSubtotal from API response if available
  if (invoiceBreakdown?.serviceSubtotal !== undefined) {
    return parseFloat(invoiceBreakdown.serviceSubtotal) || 0;
  }

  // Priority 2: Calculate from invoiceBreakdown fields if available
  if (invoiceBreakdown) {
    const base = parseFloat(invoiceBreakdown.professionalCharges || 0);
    const reg = parseFloat(invoiceBreakdown.registrationCharges || 0);
    const ca = parseFloat(invoiceBreakdown.caCharges || 0);
    const ce = parseFloat(invoiceBreakdown.ceCharges || 0);
    const reward = parseFloat(invoiceBreakdown.rewardAmount || 0);
    const discount = parseFloat(invoiceBreakdown.discountAmount || 0);
    
    return base + reg + ca + ce + reward - discount;
  }

  // Priority 3: Calculate from invoiceData (from /invoices/{id} API)
  if (invoiceData) {
    const base = parseFloat(invoiceData.professional_charges || invoiceData.amount || 0);
    const reg = parseFloat(invoiceData.registration_other_charges || 0);
    const ca = parseFloat(invoiceData.ca_charges || 0);
    const ce = parseFloat(invoiceData.ce_charges || 0);
    const reward = parseFloat(invoiceData.reward_amount || 0);
    const discount = parseFloat(invoiceData.discount_amount || 0);
    
    return base + reg + ca + ce + reward - discount;
  }

  // Priority 4: Calculate from individual parameters
  const base = parseFloat(baseAmount || 0);
  const reg = parseFloat(registrationCharges || 0);
  const ca = parseFloat(caCharges || 0);
  const ce = parseFloat(ceCharges || 0);
  const reward = parseFloat(rewardAmount || 0);
  const discount = parseFloat(discountAmount || 0);

  return base + reg + ca + ce + reward - discount;
};

