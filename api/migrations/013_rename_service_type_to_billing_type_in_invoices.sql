-- Migration: Rename service_type column to billing_type in invoices table
-- This migration:
-- 1. Renames the service_type column to billing_type in the invoices table
-- 2. Maintains all existing data and constraints

-- Step 1: Check if service_type column exists, if yes rename it to billing_type
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE()
    AND table_name = 'invoices'
    AND column_name = 'service_type'
);

SET @billing_type_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE()
    AND table_name = 'invoices'
    AND column_name = 'billing_type'
);

-- Only rename if service_type exists and billing_type doesn't exist
SET @sql = IF(@column_exists > 0 AND @billing_type_exists = 0,
    'ALTER TABLE `invoices` CHANGE COLUMN `service_type` `billing_type` varchar(255) DEFAULT NULL',
    IF(@billing_type_exists > 0,
        'SELECT "Column billing_type already exists, skipping rename..." AS message',
        'SELECT "Column service_type does not exist, skipping rename..." AS message'
    )
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;



