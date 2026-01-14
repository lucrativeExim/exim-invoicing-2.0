-- Migration: Cleanup invoice_ready column (if both columns exist)
-- This migration:
-- 1. Migrates any remaining data from invoice_ready to invoice_type (if needed)
-- 2. Drops the old invoice_ready column and index
-- 3. Ensures invoice_type index exists

-- Step 1: Migrate any remaining data from invoice_ready to invoice_type
-- Only update rows where invoice_type is NULL but invoice_ready has a value
UPDATE `job` 
SET `invoice_type` = CASE
    WHEN `invoice_ready` = 'true' AND `status` = 'Closed' THEN 'full_invoice'
    WHEN `invoice_ready` = 'true' AND (`status` = 'In-process' OR `status` = 'In_process') THEN 'partial_invoice'
    ELSE NULL
END
WHERE `invoice_type` IS NULL AND `invoice_ready` IS NOT NULL;

-- Step 2: Drop the old index (if it exists)
-- Use a stored procedure approach to handle "index doesn't exist" gracefully
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'job' 
    AND index_name = 'idx_invoice_ready'
);

SET @sql = IF(@index_exists > 0, 
    'ALTER TABLE `job` DROP INDEX `idx_invoice_ready`', 
    'SELECT "Index idx_invoice_ready does not exist, skipping..." AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Drop the old invoice_ready column (if it exists)
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'job' 
    AND column_name = 'invoice_ready'
);

SET @sql = IF(@column_exists > 0, 
    'ALTER TABLE `job` DROP COLUMN `invoice_ready`', 
    'SELECT "Column invoice_ready does not exist, skipping..." AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Ensure invoice_type index exists
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







