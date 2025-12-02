-- Migration: Add 'Full' to Authority enum
-- Date: 2024
-- Description: Adds 'Full' value to the Authority enum in the users table

-- Since the column is currently VARCHAR, we'll convert it to ENUM
-- First, ensure all existing values are valid single enum values
-- Note: Comma-separated values like "Job_Details,Invoicing" will need to be handled separately
-- For now, we'll convert the column to ENUM and handle comma-separated values by taking the first value

-- Step 1: Update any comma-separated values to use the first value (or Full if it contains multiple)
UPDATE users 
SET authority = CASE 
  WHEN authority = 'Full' THEN 'Full'
  WHEN authority LIKE '%,%' THEN SUBSTRING_INDEX(authority, ',', 1)
  WHEN authority IN ('Job_Details', 'Invoicing', 'Payment_Control') THEN authority
  ELSE NULL
END
WHERE authority IS NOT NULL;

-- Step 2: Convert VARCHAR to ENUM
ALTER TABLE users 
  MODIFY COLUMN authority ENUM('Job_Details', 'Invoicing', 'Payment_Control', 'Full') NULL;

