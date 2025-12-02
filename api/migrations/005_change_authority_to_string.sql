-- Migration: Change authority from ENUM to VARCHAR
-- Date: 2024
-- Description: Converts authority column from ENUM to VARCHAR to support comma-separated values

-- Step 1: Remove 'Full' values and convert to comma-separated string of all authorities
UPDATE users 
SET authority = CASE 
  WHEN authority = 'Full' THEN 'Job_Details,Invoicing,Payment_Control'
  WHEN authority IS NOT NULL THEN authority
  ELSE NULL
END
WHERE authority IS NOT NULL;

-- Step 2: Convert ENUM column back to VARCHAR
ALTER TABLE users 
  MODIFY COLUMN authority VARCHAR(255) NULL;

