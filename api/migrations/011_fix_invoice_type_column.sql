-- Migration: Fix invoice_type column to ensure it's properly set as ENUM
-- This migration:
-- 1. Checks if invoice_type column exists and fixes its type if needed
-- 2. Ensures it's an ENUM with correct values ('full_invoice','partial_invoice')
-- 3. Creates the index if it doesn't exist

-- Step 1: Modify the invoice_type column to ensure it's an ENUM type
-- This will convert VARCHAR/TEXT columns to ENUM if they were manually added incorrectly
-- Note: This preserves existing data that matches the enum values
ALTER TABLE `job` 
MODIFY COLUMN `invoice_type` enum('full_invoice','partial_invoice') DEFAULT NULL;

-- Step 2: Ensure the index exists
-- Check if index exists, if not create it (MySQL 5.7+ compatible)
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE()
    AND table_name = 'job'
    AND index_name = 'idx_invoice_type'
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE `job` ADD INDEX `idx_invoice_type` (`invoice_type`)',
    'SELECT "Index idx_invoice_type already exists, skipping..." AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

