# Sample Invoice Fields and Database Storage Mapping

## Overview
This document explains which fields are displayed in the Sample Invoice (lines 3306-4066) and how the amounts are calculated and stored in the database.

## Sample Invoice Display Fields

### 1. Header Section (Lines 3380-3494)

#### Company Information (Left Side)
- **Company Logo**: From `sessionAccount` (Account context)
- **Account Name**: `sessionAccount.account_name` → Stored in `accounts` table
- **Billed To**: `jobServiceChargesMap[selectedJobIds[0]].client_name` → From `job_service_charges` table
- **Client Address**: `jobServiceChargesMap[selectedJobIds[0]].client_address` → From `job_service_charges` table
- **GSTN No**: `jobServiceChargesMap[selectedJobIds[0]].gst_no` → From `job_service_charges` table
- **Kind Attn**: `jobServiceChargesMap[selectedJobIds[0]].concern_person` → From `job_service_charges` table
- **Emails**: `jobServiceChargesMap[selectedJobIds[0]].concern_email_id` → From `job_service_charges` table

#### Invoice Details (Right Side)
- **Invoice Type**: `billingType` (e.g., "GST Invoice" or "Reimbursement/Debit Note")
- **Invoice No**: `sampleInvoiceData.invoiceNo` (initially "NA", generated on save)
- **Date**: `sampleInvoiceData.date` (current date)
- **Job No**: `sampleInvoiceData.jobNo` (or "As Per Annexure" for multiple jobs)
- **Customer ID**: `sampleInvoiceData.customerId` (group_id from client service charge)
- **PO No**: `sampleInvoiceData.poNo` → Stored in `invoices.po_no`
- **IRN No**: `sampleInvoiceData.irnNo` → Stored in `invoices.irn_no`

### 2. Professional Service Charges Section (Lines 3496-3597)

#### Details Section
- **Service Details**: `sampleInvoiceData.serviceDetails` (job code name from `job_register.job_code`)
- **Billing Field Values**: Dynamic fields from `billingFieldNames` array, values from `JobFieldValue` table

#### Amount Display
- **Amount**: Calculated based on billing type:
  - **Reimbursement**: `applicationFees + remiCharges + (negative discount if any)`
  - **Service/Service & Reimbursement**: `finalAmount` (from invoice calculation)

### 3. Charges Breakdown Section (Lines 3654-3917)

#### Service Charges (Only shown if `billingType !== "Reimbursement"`)

1. **Reward** (if `rewardDiscountAmount > 0`)
   - Display: `sampleInvoiceData.rewardDiscountAmount`
   - Database: `invoices.reward_penalty_amount` (Decimal)

2. **Discount** (if `rewardDiscountAmount < 0` and no remi fields)
   - Display: `sampleInvoiceData.rewardDiscountAmount` (negative value)
   - Database: `invoices.reward_penalty_amount` (Decimal, negative)

3. **Registration/Other Charges** (if `registrationCharges > 0`)
   - Display: `sampleInvoiceData.registrationCharges`
   - Database: `invoices.registration_other_charges` (Decimal)
   - **Calculation**: Sum of `job_service_charges.registration_other_charges` from all selected jobs

4. **CA CERT Charges** (if `caCharges > 0`)
   - Display: `sampleInvoiceData.caCharges` with count `combinedCaCertCount`
   - Database: `invoices.ca_charges` (Decimal)
   - Database: `invoices.ca_cert_count` (Int)
   - **Calculation**: For each job: `(no_of_cac from JobFieldValue) * (job_service_charges.ca_charges)`, then sum all

5. **CE CERT Charges** (if `ceCharges > 0`)
   - Display: `sampleInvoiceData.ceCharges` with count `combinedCeCertCount`
   - Database: `invoices.ce_charges` (Decimal)
   - Database: `invoices.ce_cert_count` (Int)
   - **Calculation**: For each job: `(no_of_cec from JobFieldValue) * (job_service_charges.ce_charges)`, then sum all

6. **Subtotal**
   - Display: `finalAmount + registrationCharges + caCharges + ceCharges + rewardDiscountAmount`
   - **Not stored directly** - calculated from other fields

7. **GST Charges** (CGST, SGST, IGST)
   - Display: Calculated from `calculations` object
   - **Not stored directly** - calculated from subtotal and GST rates
   - **GST Rates**: From `gst_rates` table via `job_register.gst_rate_id`
   - **GST Type**: From `job_service_charges.gst_type` (SC/I/EXEMPTED)

#### Reimbursement Charges (Only shown if `billingType !== "Service"`)

1. **Application Fees** (if `applicationFees > 0`)
   - Display: `calculations.applicationFees`
   - Database: `invoices.application_fees` (Decimal)
   - **Calculation**: Sum of `appl_fee_duty_paid` from `JobFieldValue` table for all selected jobs

2. **Remi Fields** (Dynamic, up to 5 fields)
   - Display: Description from `job_service_charges.remi_X_desc` and amount
   - Database: `invoices.remi_one_charges` through `invoices.remi_five_charges` (Decimal)
   - **Calculation**: 
     - **Full Invoice**: From `job_service_charges.remi_X_charges`
     - **Partial Invoice**: From `partialInvoiceBreakdown.remiX.payAmt` (Pay Amt value)
   - **Field Mapping**:
     - `remi_one_charges` → `invoices.remi_one_charges`
     - `remi_two_charges` → `invoices.remi_two_charges`
     - `remi_three_charges` → `invoices.remi_three_charges`
     - `remi_four_charges` → `invoices.remi_four_charges`
     - `remi_five_charges` → `invoices.remi_five_charges` (String/VarChar)

### 4. Total Amount (Lines 3849-3913)

- **Display**: Calculated based on billing type:
  - **Reimbursement**: `applicationFees + remiCharges + (negative discount if any)`
  - **Service**: `subtotal + GST amounts`
  - **Service & Reimbursement**: `subtotal + GST + applicationFees + remiCharges`
- **Database**: `invoices.pay_amount` (VarChar) - Final total amount

### 5. Total Amount in Words (Lines 3920-3984)

- **Display**: Converted using `numberToWords()` function
- **Not stored in database** - calculated on-the-fly

### 6. Footer Section (Lines 3986-4009)

- **Thank You Message**: Static text
- **Account Name**: `sessionAccount.account_name`
- **Address & Contact**: Static text (hardcoded)

## Database Storage Mapping

### Invoice Table (`invoices`)

When `handleSaveInvoice()` is called (line 1859), the following data is saved:

```javascript
{
  // Basic Information
  account_id: effectiveAccountId,                    // For draft_view_id generation
  job_register_id: selectedJobCode,                  // invoices.job_register_id
  billing_type: billingType,                        // invoices.billing_type
  invoice_type: invoiceType,                        // invoices.invoice_type
  
  // Amount Fields
  pay_amount: finalTotalAmount.toFixed(2),          // invoices.pay_amount (VarChar)
  amount: invoiceCalculation.amount || professionalCharges.toFixed(2), // invoices.amount (VarChar)
  
  // Service Charges
  professional_charges: professionalCharges,        // invoices.professional_charges (Decimal)
  registration_other_charges: registrationCharges,  // invoices.registration_other_charges (Decimal)
  ca_charges: caCharges,                            // invoices.ca_charges (Decimal)
  ce_charges: ceCharges,                            // invoices.ce_charges (Decimal)
  ca_cert_count: combinedCaCertCount,               // invoices.ca_cert_count (Int)
  ce_cert_count: combinedCeCertCount,              // invoices.ce_cert_count (Int)
  
  // Reimbursement Charges
  application_fees: applicationFees,                // invoices.application_fees (Decimal)
  remi_one_charges: remiChargesMap["remi_one_charges"],     // invoices.remi_one_charges (Decimal)
  remi_two_charges: remiChargesMap["remi_two_charges"],     // invoices.remi_two_charges (Decimal)
  remi_three_charges: remiChargesMap["remi_three_charges"], // invoices.remi_three_charges (Decimal)
  remi_four_charges: remiChargesMap["remi_four_charges"],   // invoices.remi_four_charges (Decimal)
  remi_five_charges: String(remiChargesMap["remi_five_charges"]), // invoices.remi_five_charges (VarChar)
  
  // Reward/Discount
  reward_penalty_input: invoiceCalculation.rewardDiscountPercent || "0", // invoices.reward_penalty_input (VarChar)
  reward_penalty_amount: parseFloat(invoiceCalculation.rewardDiscountAmount || 0), // invoices.reward_penalty_amount (Decimal)
  
  // Additional Fields
  note: sampleInvoiceData.note || null,            // invoices.note (Text)
  po_no: sampleInvoiceData.poNo || null,           // invoices.po_no (VarChar)
  irn_no: sampleInvoiceData.irnNo || null,         // invoices.irn_no (VarChar)
  
  // Job Associations
  job_ids: selectedJobIds,                         // Creates entries in InvoiceSelectedJob table
}
```

### Amount Calculation Logic

#### Full Invoice (when `hasPayAmtValues === false`)

1. **Professional Charges**: `finalAmount` (from invoice calculation modal)
2. **Registration Charges**: Sum of `job_service_charges.registration_other_charges` from all selected jobs
3. **CA Charges**: Sum of `(no_of_cac * ca_charges)` for each selected job
4. **CE Charges**: Sum of `(no_of_cec * ce_charges)` for each selected job
5. **Application Fees**: Sum of `appl_fee_duty_paid` from `JobFieldValue` table for all selected jobs
6. **Remi Charges**: From `job_service_charges.remi_X_charges` (first selected job)

#### Partial Invoice (when `hasPayAmtValues === true`)

All amounts use **Pay Amt** values from `partialInvoiceBreakdown`:
- `partialInvoiceBreakdown.professionalCharges.payAmt`
- `partialInvoiceBreakdown.registrationCharges.payAmt`
- `partialInvoiceBreakdown.caCert.payAmt`
- `partialInvoiceBreakdown.ceCert.payAmt`
- `partialInvoiceBreakdown.applicationFees.payAmt`
- `partialInvoiceBreakdown.remiOne.payAmt` through `remiFive.payAmt`

### GST Calculation

GST is calculated but **NOT stored** in the database. It's calculated on-the-fly:

1. **Subtotal** = `professionalCharges + registrationCharges + caCharges + ceCharges + rewardDiscountAmount`
2. **GST Rates** from `gst_rates` table (via `job_register.gst_rate_id`)
3. **GST Type** from `job_service_charges.gst_type`:
   - **SC**: Apply CGST and SGST, IGST = 0
   - **I**: Apply only IGST, CGST = 0, SGST = 0
   - **EXEMPTED**: No GST (all = 0)
4. **GST Amounts**:
   - `cgstAmount = (subtotal * cgstRate) / 100`
   - `sgstAmount = (subtotal * sgstRate) / 100`
   - `igstAmount = (subtotal * igstRate) / 100`

### Total Amount Calculation

The `pay_amount` field stores the final total:

- **Reimbursement**: `applicationFees + remiCharges + (negative discount if any)`
- **Service**: `subtotal + cgstAmount + sgstAmount + igstAmount`
- **Service & Reimbursement**: `subtotal + cgstAmount + sgstAmount + igstAmount + applicationFees + remiCharges`

## Key Points

1. **Partial Invoice Support**: When Pay Amt values are set, the system uses those instead of full amounts
2. **Remi Fields**: Up to 5 remi fields can be displayed, mapped by array index to database columns
3. **GST Not Stored**: GST amounts are calculated but not stored - they're recalculated when displaying
4. **Multiple Jobs**: When multiple jobs are selected, some fields show "As Per Annexure"
5. **Job Associations**: Selected jobs are stored in `InvoiceSelectedJob` table via `job_ids` array

## Related Database Tables

- `invoices` - Main invoice data
- `invoice_selected_jobs` - Links invoices to jobs
- `job_service_charges` - Source of remi charges, client info, GST type
- `job_field_values` - Source of billing field values, CA/CE counts, application fees
- `job_register` - Source of job code, GST rate relationship
- `gst_rates` - Source of GST rates (CGST, SGST, IGST)
- `accounts` - Source of account/company information









