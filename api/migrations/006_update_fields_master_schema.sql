-- Migration: Update Fields Master schema
-- Date: 2024
-- Description: 
--   1. Add FieldType enum and update field_type column
--   2. Change default_value from VARCHAR to BOOLEAN
--   3. Change dropdown_options from VARCHAR to TEXT
--   4. Add UNIQUE constraint to field_name

-- Step 1: Create FieldType enum (MySQL doesn't support CREATE TYPE, so we'll use ALTER TABLE with ENUM)
-- First, let's check if we need to convert existing data
-- Convert any existing field_type values to match the enum values
UPDATE fields_master 
SET field_type = CASE 
  WHEN field_type IN ('Text', 'text', 'TEXT') THEN 'Text'
  WHEN field_type IN ('Date', 'date', 'DATE') THEN 'Date'
  WHEN field_type IN ('Dropdown', 'dropdown', 'DROPDOWN') THEN 'Dropdown'
  WHEN field_type IN ('Attachment', 'attachment', 'ATTACHMENT') THEN 'Attachment'
  WHEN field_type IN ('Number', 'number', 'NUMBER') THEN 'Number'
  ELSE NULL
END
WHERE field_type IS NOT NULL;

-- Step 2: Alter field_type to ENUM
ALTER TABLE fields_master 
  MODIFY COLUMN field_type ENUM('Text', 'Date', 'Dropdown', 'Attachment', 'Number') NULL;

-- Step 3: Convert default_value from VARCHAR to BOOLEAN (TINYINT(1))
-- First, convert existing string values to boolean
UPDATE fields_master 
SET default_value = CASE 
  WHEN default_value IN ('true', 'True', 'TRUE', '1', 'yes', 'Yes', 'YES') THEN '1'
  WHEN default_value IN ('false', 'False', 'FALSE', '0', 'no', 'No', 'NO') OR default_value IS NULL OR default_value = '' THEN '0'
  ELSE '0'
END;

-- Step 4: Alter default_value to BOOLEAN (TINYINT(1))
ALTER TABLE fields_master 
  MODIFY COLUMN default_value TINYINT(1) NULL DEFAULT 0;

-- Step 5: Change dropdown_options from VARCHAR(255) to TEXT
ALTER TABLE fields_master 
  MODIFY COLUMN dropdown_options TEXT NULL;

-- Step 6: Add UNIQUE constraint to field_name
-- First, remove any duplicate field_names (keep the one with the lowest id)
DELETE f1 FROM fields_master f1
INNER JOIN fields_master f2 
WHERE f1.id > f2.id AND f1.field_name = f2.field_name AND f1.field_name IS NOT NULL;

-- Now add the UNIQUE constraint
ALTER TABLE fields_master 
  ADD UNIQUE KEY `idx_field_name_unique` (`field_name`);

