-- Migration: Add billing_type column to job table
-- This migration:
-- 1. Adds the new billing_type column with enum('Reimbursement','Service_Reimbursement','Service','Service_Reimbursement_Split')
-- 2. Creates the index on billing_type

-- Step 1: Check if billing_type column exists, if not add it
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE()
    AND table_name = 'job'
    AND column_name = 'billing_type'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE `job` ADD COLUMN `billing_type` enum(''Reimbursement'',''Service_Reimbursement'',''Service'',''Service_Reimbursement_Split'') DEFAULT NULL AFTER `invoice_type`',
    'SELECT "Column billing_type already exists, skipping..." AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Check if index exists, if not create it
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE()
    AND table_name = 'job'
    AND index_name = 'idx_billing_type'
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE `job` ADD INDEX `idx_billing_type` (`billing_type`)',
    'SELECT "Index idx_billing_type already exists, skipping..." AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

