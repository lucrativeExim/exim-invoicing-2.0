# Invoice Service Billing Type Fix

## Problem Identified

When `billing_type = "Service"`, there was a mismatch between:
- **Invoice Display**: Shows only Service charges (Professional + Registration + CA + CE + Reward/Discount) + GST = ₹ 19,824.00
- **Database Storage**: Stored `pay_amount` including Application Fees (₹ 750) = ₹ 20,574.00

### Root Cause

1. **Display Logic** (Line 3780): Application Fees and Remi Charges are only displayed when `billingType !== "Service"` - meaning they're hidden for "Service" invoices.

2. **Display Total Calculation** (Line 3867-3879): For "Service" billing type, the displayed total is:
   ```
   serviceSubtotal + gstTotal = 16800 + 3024 = 19824
   ```

3. **Database Save Logic** (Line 1927-1939): Was using `calculations?.total || 0`, which includes `applicationFees + remiCharges` even for "Service" billing type.

## Solution

Updated `handleSaveInvoice()` function to calculate `pay_amount` based on billing type, matching the display logic:

### For "Service" Billing Type:
```javascript
// Calculate subtotal from Service charges only
const serviceSubtotal = (
  professionalCharges +
  registrationCharges +
  caCharges +
  ceCharges +
  rewardDiscountAmount
);

// Add GST amounts
const gstTotal = cgstAmount + sgstAmount + igstAmount;

// Final total = subtotal + GST (NO application fees or remi charges)
finalTotalAmount = serviceSubtotal + gstTotal;
```

### For "Reimbursement" Billing Type:
```javascript
// Application Fees + Remi Charges + (negative discount if any)
finalTotalAmount = (
  applicationFees +
  remi_one_charges +
  remi_two_charges +
  remi_three_charges +
  remi_four_charges +
  remi_five_charges +
  (negative discount if any)
);
```

### For "Service & Reimbursement" Billing Type:
```javascript
// Use calculations.total which includes everything
finalTotalAmount = calculations.total;
```

## What Gets Stored in Database

### For "Service" Billing Type:

| Field | Value | Displayed? |
|-------|-------|------------|
| `professional_charges` | 10000 | ✅ Yes |
| `registration_other_charges` | 800 | ✅ Yes |
| `ca_charges` | 1500 | ✅ Yes |
| `ce_charges` | 4500 | ✅ Yes |
| `ca_cert_count` | 6 | ✅ Yes |
| `ce_cert_count` | 3 | ✅ Yes |
| `reward_penalty_amount` | 0 | ✅ Yes (if applicable) |
| `application_fees` | 750 | ❌ **NO** (stored but not displayed) |
| `remi_one_charges` | 0 | ❌ **NO** (stored but not displayed) |
| `remi_two_charges` | 0 | ❌ **NO** (stored but not displayed) |
| `remi_three_charges` | 0 | ❌ **NO** (stored but not displayed) |
| `remi_four_charges` | 0 | ❌ **NO** (stored but not displayed) |
| `remi_five_charges` | NULL | ❌ **NO** (stored but not displayed) |
| `pay_amount` | **19824.00** | ✅ Yes (matches display) |

## Important Notes

1. **Application Fees and Remi Charges are still stored** in the database for "Service" invoices, but they are **NOT included in `pay_amount`** calculation.

2. **The display logic is correct** - Application Fees and Remi Charges should only be shown for "Reimbursement" or "Service & Reimbursement" billing types.

3. **The `pay_amount` field now matches the displayed total** for all billing types.

## Example Calculation

### Invoice Display (Service Billing Type):
```
Professional Charges:     ₹ 10,000.00
Registration Charges:    ₹    800.00
CA CERT (6 Nos):         ₹  1,500.00
CE CERT (3 Nos):         ₹  4,500.00
─────────────────────────────────────
Subtotal:                ₹ 16,800.00
I GST (18%):             ₹  3,024.00
─────────────────────────────────────
TOTAL:                   ₹ 19,824.00
```

### Database Storage:
```
pay_amount: "19824.00"  ✅ Matches display
application_fees: 750   ⚠️ Stored but not included in pay_amount
```

## Code Changes

**File**: `web/src/app/dashboard/invoice/invoice-creation/page.js`
**Function**: `handleSaveInvoice()` (Line ~1925-1939)
**Change**: Updated `finalTotalAmount` calculation to match display logic for "Service" billing type.









