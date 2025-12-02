-- Migration: Change GST Rates columns from VARCHAR to FLOAT
-- Date: 2024
-- Description: Converts sgst, cgst, and igst columns from VARCHAR(255) to FLOAT

-- Step 1: Convert existing string values to float (if any exist)
-- This handles cases where values might be stored as strings like "5.5" or "10"
UPDATE gst_rates 
SET 
  sgst = CASE 
    WHEN sgst IS NULL OR sgst = '' THEN NULL
    ELSE CAST(sgst AS DECIMAL(10,2))
  END,
  cgst = CASE 
    WHEN cgst IS NULL OR cgst = '' THEN NULL
    ELSE CAST(cgst AS DECIMAL(10,2))
  END,
  igst = CASE 
    WHEN igst IS NULL OR igst = '' THEN NULL
    ELSE CAST(igst AS DECIMAL(10,2))
  END;

-- Step 2: Alter the column types from VARCHAR to FLOAT
ALTER TABLE gst_rates 
  MODIFY COLUMN sgst FLOAT NULL,
  MODIFY COLUMN cgst FLOAT NULL,
  MODIFY COLUMN igst FLOAT NULL;

