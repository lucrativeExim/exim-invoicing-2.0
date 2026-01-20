# Invoice Field Storage Logic - Only Store Displayed Fields

## Overview
Updated the invoice save logic to ensure that **only fields displayed in the invoice UI are stored in the database**. Fields that are not displayed are set to `0` or `null` based on their data type.

## Display Logic by Billing Type

### 1. **Service** Billing Type
**Displayed Fields:**
- Professional Charges
- Registration/Other Charges
- CA CERT Charges (with count)
- CE CERT Charges (with count)
- Reward/Discount (if applicable)
- GST (CGST, SGST, IGST)

**NOT Displayed:**
- Application Fees
- Remi Charges (remi_one through remi_five)

**Database Storage:**
- `application_fees` → Set to `0`
- `remi_one_charges` through `remi_five_charges` → Set to `0` (or `null` for remi_five)

### 2. **Reimbursement** Billing Type
**Displayed Fields:**
- Application Fees
- Remi Charges (remi_one through remi_five, if they have descriptions and amounts > 0)

**NOT Displayed:**
- Professional Charges
- Registration/Other Charges
- CA CERT Charges
- CE CERT Charges
- CA/CE Cert Counts
- Reward/Discount
- GST

**Database Storage:**
- `professional_charges` → Set to `0`
- `registration_other_charges` → Set to `0`
- `ca_charges` → Set to `0`
- `ce_charges` → Set to `0`
- `ca_cert_count` → Set to `0`
- `ce_cert_count` → Set to `0`
- `amount` → Set to `null`
- `reward_penalty_input` → Set to `"0"`
- `reward_penalty_amount` → Set to `0`

### 3. **Service & Reimbursement** Billing Type
**Displayed Fields:**
- All Service charges (Professional, Registration, CA CERT, CE CERT, Reward/Discount, GST)
- All Reimbursement charges (Application Fees, Remi Charges)

**Database Storage:**
- All fields are stored with their actual values

## Code Implementation

### Updated Function: `handleSaveInvoice()`

**Location**: `web/src/app/dashboard/invoice/invoice-creation/page.js` (Line ~1961)

**Key Changes:**

```javascript
// Service charges - only store if displayed (Service or Service & Reimbursement)
professional_charges: billingType === "Reimbursement" ? 0 : professionalCharges,
registration_other_charges: billingType === "Reimbursement" ? 0 : registrationCharges,
ca_charges: billingType === "Reimbursement" ? 0 : caCharges,
ce_charges: billingType === "Reimbursement" ? 0 : ceCharges,
ca_cert_count: billingType === "Reimbursement" ? 0 : (combinedCaCertCount || 0),
ce_cert_count: billingType === "Reimbursement" ? 0 : (combinedCeCertCount || 0),

// Reimbursement charges - only store if displayed (Reimbursement or Service & Reimbursement)
application_fees: billingType === "Service" ? 0 : applicationFees,
remi_one_charges: billingType === "Service" ? 0 : (remiChargesMap["remi_one_charges"] ? parseFloat(remiChargesMap["remi_one_charges"]) : 0),
// ... same for remi_two through remi_five

// Reward/Discount - only store if displayed (Service or Service & Reimbursement)
reward_penalty_input: billingType === "Reimbursement" ? "0" : (invoiceCalculation.rewardDiscountPercent || "0"),
reward_penalty_amount: billingType === "Reimbursement" ? 0 : (parseFloat(invoiceCalculation.rewardDiscountAmount || 0) || 0),
```

## Example Scenarios

### Scenario 1: Service Invoice
**Invoice Display:**
```
Professional Charges: ₹ 10,000.00
Registration Charges: ₹ 800.00
CA CERT (6 Nos): ₹ 1,500.00
CE CERT (3 Nos): ₹ 4,500.00
Subtotal: ₹ 16,800.00
I GST (18%): ₹ 3,024.00
TOTAL: ₹ 19,824.00
```

**Database Storage:**
```sql
professional_charges: 10000
registration_other_charges: 800
ca_charges: 1500
ce_charges: 4500
ca_cert_count: 6
ce_cert_count: 3
application_fees: 0          -- NOT displayed, set to 0
remi_one_charges: 0          -- NOT displayed, set to 0
remi_two_charges: 0          -- NOT displayed, set to 0
remi_three_charges: 0         -- NOT displayed, set to 0
remi_four_charges: 0          -- NOT displayed, set to 0
remi_five_charges: NULL       -- NOT displayed, set to NULL
pay_amount: "19824.00"
```

### Scenario 2: Reimbursement Invoice
**Invoice Display:**
```
Application Fees: ₹ 750.00
Remi One Description: ₹ 500.00
TOTAL: ₹ 1,250.00
```

**Database Storage:**
```sql
professional_charges: 0          -- NOT displayed, set to 0
registration_other_charges: 0   -- NOT displayed, set to 0
ca_charges: 0                    -- NOT displayed, set to 0
ce_charges: 0                    -- NOT displayed, set to 0
ca_cert_count: 0                 -- NOT displayed, set to 0
ce_cert_count: 0                 -- NOT displayed, set to 0
amount: NULL                      -- NOT displayed, set to NULL
application_fees: 750            -- Displayed, store actual value
remi_one_charges: 500            -- Displayed, store actual value
remi_two_charges: 0              -- Not displayed (no description or amount = 0)
reward_penalty_input: "0"        -- NOT displayed, set to "0"
reward_penalty_amount: 0         -- NOT displayed, set to 0
pay_amount: "1250.00"
```

### Scenario 3: Service & Reimbursement Invoice
**Invoice Display:**
```
Professional Charges: ₹ 10,000.00
Registration Charges: ₹ 800.00
Subtotal: ₹ 10,800.00
GST: ₹ 1,944.00
─────────────────────────
Reimbursements:
Application Fees: ₹ 750.00
Remi One: ₹ 500.00
TOTAL: ₹ 13,994.00
```

**Database Storage:**
```sql
professional_charges: 10000      -- Displayed, store actual value
registration_other_charges: 800  -- Displayed, store actual value
application_fees: 750            -- Displayed, store actual value
remi_one_charges: 500            -- Displayed, store actual value
pay_amount: "13994.00"
```

## Benefits

1. **Data Consistency**: Database matches what's displayed in the invoice
2. **Clean Data**: No unnecessary data stored for fields that aren't relevant to the billing type
3. **Easier Reporting**: Can query database knowing that 0/null values mean the field wasn't applicable
4. **Accurate Totals**: `pay_amount` matches the displayed total exactly

## Important Notes

1. **Zero vs Null**: 
   - Numeric fields use `0` when not displayed
   - String fields (like `remi_five_charges`, `amount`) use `null` when not displayed
   - `reward_penalty_input` uses `"0"` string when not displayed

2. **Remi Fields**: Remi fields are only stored if they have a description AND amount > 0 in the UI. If not displayed, they're set to 0/null.

3. **Conditional Display**: Some fields are only displayed if their value > 0 (e.g., Registration Charges, CA CERT, CE CERT). These are still stored even if 0, but won't appear in the invoice display.

4. **Backward Compatibility**: Existing invoices in the database are not affected. This change only applies to new invoices being created.



