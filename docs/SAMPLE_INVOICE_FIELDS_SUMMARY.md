# Sample Invoice Fields Summary - Quick Reference

## Field Display → Database Mapping Table

| Display Field | Source/Calculation | Database Column | Data Type | Notes |
|--------------|-------------------|-----------------|-----------|-------|
| **HEADER SECTION** |
| Account Name | `sessionAccount.account_name` | `accounts.account_name` | VarChar | From Account context |
| Billed To | `jobServiceCharges.client_name` | `job_service_charges.client_name` | VarChar | From first selected job |
| Client Address | `jobServiceCharges.client_address` | `job_service_charges.client_address` | Text | From first selected job |
| GSTN No | `jobServiceCharges.gst_no` | `job_service_charges.gst_no` | VarChar | From first selected job |
| Kind Attn | `jobServiceCharges.concern_person` | `job_service_charges.concern_person` | VarChar | From first selected job |
| Emails | `jobServiceCharges.concern_email_id` | `job_service_charges.concern_email_id` | VarChar | From first selected job |
| Invoice No | Generated on save | `invoices.draft_view_id` | VarChar | Auto-generated format: D{account_id}{year_pair}{sequence} |
| Date | Current date | N/A | - | Calculated on display |
| Job No | `job.job_no` | N/A | - | From selected jobs |
| Customer ID | `client_service_charges.group_id` | N/A | - | From client service charge |
| PO No | `sampleInvoiceData.poNo` | `invoices.po_no` | VarChar | User input |
| IRN No | `sampleInvoiceData.irnNo` | `invoices.irn_no` | VarChar | User input |
| **SERVICE CHARGES** |
| Professional Charges | `finalAmount` or `partialInvoiceBreakdown.professionalCharges.payAmt` | `invoices.professional_charges` | Decimal(10,0) | From invoice calculation modal |
| Registration Charges | Sum of `job_service_charges.registration_other_charges` | `invoices.registration_other_charges` | Decimal(10,0) | Sum across all selected jobs |
| CA CERT Charges | `(no_of_cac * ca_charges)` per job, then sum | `invoices.ca_charges` | Decimal(10,0) | Calculated from JobFieldValue |
| CA CERT Count | Sum of `no_of_cac` from JobFieldValue | `invoices.ca_cert_count` | Int | Sum across all selected jobs |
| CE CERT Charges | `(no_of_cec * ce_charges)` per job, then sum | `invoices.ce_charges` | Decimal(10,0) | Calculated from JobFieldValue |
| CE CERT Count | Sum of `no_of_cec` from JobFieldValue | `invoices.ce_cert_count` | Int | Sum across all selected jobs |
| Reward/Discount | `invoiceCalculation.rewardDiscountAmount` | `invoices.reward_penalty_amount` | Decimal(10,0) | Positive = reward, Negative = discount |
| Reward % Input | `invoiceCalculation.rewardDiscountPercent` | `invoices.reward_penalty_input` | VarChar | Percentage value as string |
| **REIMBURSEMENT CHARGES** |
| Application Fees | Sum of `appl_fee_duty_paid` from JobFieldValue | `invoices.application_fees` | Decimal(10,0) | Sum across all selected jobs |
| Remi One | `job_service_charges.remi_one_charges` or Pay Amt | `invoices.remi_one_charges` | Decimal(10,0) | From first selected job or partial breakdown |
| Remi Two | `job_service_charges.remi_two_charges` or Pay Amt | `invoices.remi_two_charges` | Decimal(10,0) | From first selected job or partial breakdown |
| Remi Three | `job_service_charges.remi_three_charges` or Pay Amt | `invoices.remi_three_charges` | Decimal(10,0) | From first selected job or partial breakdown |
| Remi Four | `job_service_charges.remi_four_charges` or Pay Amt | `invoices.remi_four_charges` | Decimal(10,0) | From first selected job or partial breakdown |
| Remi Five | `job_service_charges.remi_five_charges` or Pay Amt | `invoices.remi_five_charges` | VarChar(255) | From first selected job or partial breakdown |
| **GST CHARGES** |
| CGST Rate | `gst_rates.cgst` via `job_register.gst_rate_id` | N/A | - | Not stored, calculated on display |
| CGST Amount | `(subtotal * cgstRate) / 100` | N/A | - | Not stored, calculated on display |
| SGST Rate | `gst_rates.sgst` via `job_register.gst_rate_id` | N/A | - | Not stored, calculated on display |
| SGST Amount | `(subtotal * sgstRate) / 100` | N/A | - | Not stored, calculated on display |
| IGST Rate | `gst_rates.igst` via `job_register.gst_rate_id` | N/A | - | Not stored, calculated on display |
| IGST Amount | `(subtotal * igstRate) / 100` | N/A | - | Not stored, calculated on display |
| **TOTALS** |
| Subtotal | `professionalCharges + registrationCharges + caCharges + ceCharges + rewardDiscountAmount` | N/A | - | Calculated, not stored |
| Total Amount | Based on billing type (see calculation below) | `invoices.pay_amount` | VarChar(255) | Final total stored as string |
| Total in Words | `numberToWords(totalAmount)` | N/A | - | Calculated on display |
| **OTHER FIELDS** |
| Note | `sampleInvoiceData.note` | `invoices.note` | Text | User input |
| Billing Type | `billingType` state | `invoices.billing_type` | VarChar(255) | Service/Reimbursement/Service & Reimbursement |
| Invoice Type | `invoiceType` state | `invoices.invoice_type` | VarChar(255) | Full Invoice/Partial Invoice |
| Job Register ID | `selectedJobCode` | `invoices.job_register_id` | Int | Links to job_register table |
| Selected Jobs | `selectedJobIds` array | `invoice_selected_jobs` table | - | Creates multiple records |

## Total Amount Calculation by Billing Type

### Reimbursement
```
pay_amount = applicationFees + remi_one_charges + remi_two_charges + remi_three_charges + remi_four_charges + remi_five_charges + (negative discount if any)
```

### Service
```
pay_amount = subtotal + cgstAmount + sgstAmount + igstAmount
where subtotal = professionalCharges + registrationCharges + caCharges + ceCharges + rewardDiscountAmount
```

### Service & Reimbursement
```
pay_amount = subtotal + cgstAmount + sgstAmount + igstAmount + applicationFees + remiCharges
where subtotal = professionalCharges + registrationCharges + caCharges + ceCharges + rewardDiscountAmount
and remiCharges = sum of all remi_X_charges
```

## GST Calculation Logic

| GST Type | CGST | SGST | IGST | Applied Based On |
|----------|------|------|------|------------------|
| SC (State/Central) | Yes | Yes | No | `job_service_charges.gst_type = 'SC'` |
| I (Interstate) | No | No | Yes | `job_service_charges.gst_type = 'I'` |
| EXEMPTED | No | No | No | `job_service_charges.gst_type = 'EXEMPTED'` |
| Default | Yes* | Yes* | Yes* | If gst_type is null/undefined |

*Default applies CGST/SGST if available, otherwise IGST

## Partial Invoice Pay Amt Mapping

When `hasPayAmtValues === true`, amounts come from `partialInvoiceBreakdown`:

| Field | Pay Amt Source |
|-------|----------------|
| Professional Charges | `partialInvoiceBreakdown.professionalCharges.payAmt` |
| Registration Charges | `partialInvoiceBreakdown.registrationCharges.payAmt` |
| CA CERT | `partialInvoiceBreakdown.caCert.payAmt` |
| CE CERT | `partialInvoiceBreakdown.ceCert.payAmt` |
| Application Fees | `partialInvoiceBreakdown.applicationFees.payAmt` |
| Remi One | `partialInvoiceBreakdown.remiOne.payAmt` |
| Remi Two | `partialInvoiceBreakdown.remiTwo.payAmt` |
| Remi Three | `partialInvoiceBreakdown.remiThree.payAmt` |
| Remi Four | `partialInvoiceBreakdown.remiFour.payAmt` |
| Remi Five | `partialInvoiceBreakdown.remiFive.payAmt` |

## Data Flow Summary

```
User Input/Selection
    ↓
State Variables (React)
    ↓
Calculations (useMemo hooks)
    ↓
Sample Invoice Display (Lines 3306-4066)
    ↓
handleSaveInvoice() (Line 1859)
    ↓
API POST /invoices
    ↓
InvoiceModel.create() (api/models/Invoice.js)
    ↓
Database: invoices table + invoice_selected_jobs table
```

## Important Notes

1. **GST amounts are NOT stored** - They are recalculated every time the invoice is displayed
2. **Remi fields are mapped by array index** - The first remi field in the array maps to `remi_one_charges`, second to `remi_two_charges`, etc.
3. **Multiple jobs** - When multiple jobs are selected, some fields show "As Per Annexure"
4. **Partial invoices** - Use Pay Amt values from `partialInvoiceBreakdown` instead of full amounts
5. **Amount field** - The `amount` field stores the base professional charges, while `pay_amount` stores the final total including all charges and GST









