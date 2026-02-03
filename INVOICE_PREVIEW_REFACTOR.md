# Invoice Preview Refactoring Summary

## Overview
Separated invoice creation and preview functionality into two distinct pages to improve code organization and ensure consistent use of API responses.

## Changes Made

### 1. Created New Preview Page
**File:** `web/src/app/dashboard/invoice/preview/page.js`

- **Purpose:** Dedicated page for displaying invoice preview
- **Query Parameters:**
  - `job_ids` (comma-separated): List of job IDs to include in invoice
  - `billing_type`: Service, Reimbursement, or Service_Reimbursement
  - `invoice_type`: Full Invoice or Partial Invoice
  - `reward_amount`: Optional reward amount
  - `discount_amount`: Optional discount amount

- **Key Features:**
  - Fetches invoice breakdown from `/invoices/sample` API
  - Uses API response consistently (no client-side calculation fallbacks)
  - Displays invoice using data from `invoiceBreakdown` state
  - Supports save and print functionality
  - Shows annexure table for multiple jobs

### 2. Updated Invoice Creation Page
**File:** `web/src/app/dashboard/invoice/invoice-creation/page.js`

- **Changes:**
  - `handleShowSampleInvoice()` now redirects to preview page instead of showing modal
  - Removed dependency on `fetchInvoiceBreakdown()` for preview (still used for partial invoice breakdown)
  - Preview logic moved to separate page

## How It Works

### Invoice Creation Flow:
1. User selects jobs, billing type, and invoice type
2. For **Full Invoice** with **Service** or **Service_Reimbursement**: Shows calculation modal for reward/discount
3. For **Partial Invoice**: Shows partial invoice breakdown modal
4. When "Show Sample Invoice" is clicked, redirects to `/dashboard/invoice/preview` with query params

### Preview Page Flow:
1. Reads query parameters from URL
2. Fetches invoice breakdown from `/invoices/sample` API with:
   - `job_ids`: Selected job IDs
   - `billing_type`: Selected billing type
   - `reward_amount`: From calculation modal
   - `discount_amount`: From calculation modal
3. Fetches job data (service charges, field values) for display
4. Displays invoice using API response data
5. User can save invoice or print

## Key Improvements

### 1. Consistent API Usage
- **Before:** Mixed client-side calculations (`invoiceCalculation.amount`) and API responses (`invoiceBreakdown`)
- **After:** Preview page uses API response exclusively

### 2. Code Separation
- **Before:** ~4100 lines in single file mixing creation and preview logic
- **After:** Creation page focuses on job selection and calculation, preview page handles display

### 3. Better Data Flow
- **Before:** `invoiceCalculation.amount` computed client-side, sometimes overridden by API
- **After:** Preview page always uses API response, ensuring consistency

## API Response Structure

The `/invoices/sample` API returns:
```javascript
{
  professionalCharges: number,
  registrationCharges: number,
  caCharges: number,
  ceCharges: number,
  applicationFees: number,
  remiFields: Array<{description: string, charges: number, fieldName: string}>,
  remiCharges: {remi_one_charges: number, ...},
  rewardAmount: number,
  discountAmount: number,
  gst: {
    cgstRate: number,
    sgstRate: number,
    igstRate: number,
    cgstAmount: number,
    sgstAmount: number,
    igstAmount: number
  },
  serviceSubtotal: number,
  finalAmount: number,
  payAmount: number,
  caCertCount: number,
  ceCertCount: number,
  jobRegisterId: number,
  accountId: number,
  invoiceType: string,
  billingType: string
}
```

## Display Logic

### Professional Charges Amount (Line 3646-3662 in old code)
**Before:**
```javascript
// Used client-side calculation
invoiceCalculation.amount || sampleInvoiceData.finalAmount
```

**After (Preview Page):**
```javascript
// Uses API response directly
billingType === "Reimbursement" 
  ? (calculations.applicationFees + calculations.remiCharges).toFixed(2)
  : invoiceBreakdown.professionalCharges.toFixed(2)
```

## Remaining Work

### Unused Code to Remove (Optional):
1. `showSampleInvoice` state variable (line 93)
2. Sample invoice modal JSX (lines 3420-4100)
3. `invoiceBreakdown` state if not used elsewhere
4. `sampleInvoiceData` useMemo if not needed
5. Client-side calculation functions that duplicate API logic

### Partial Invoice Support:
- Partial invoice breakdown modal still exists in creation page
- Consider moving to preview page with query params for opening amounts

## Testing Checklist

- [ ] Full Invoice with Service billing type
- [ ] Full Invoice with Service_Reimbursement billing type
- [ ] Full Invoice with Reimbursement billing type
- [ ] Partial Invoice flow
- [ ] Multiple jobs (annexure table)
- [ ] Reward amount application
- [ ] Discount amount application
- [ ] Save invoice functionality
- [ ] Print functionality
- [ ] Back navigation

## Migration Notes

- Old URLs with inline preview will no longer work
- All previews now go through `/dashboard/invoice/preview` route
- Query parameters must be provided for preview to work
