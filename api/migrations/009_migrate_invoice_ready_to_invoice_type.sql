-- Migration: Change invoice_ready to invoice_type
-- This migration:
-- 1. Adds the new invoice_type column with enum('full_invoice','partial_invoice')
-- 2. Migrates data from invoice_ready to invoice_type based on status
-- 3. Drops the old invoice_ready column and index
-- 4. Creates the new invoice_type index

-- Step 1: Add the new invoice_type column
ALTER TABLE `job` 
ADD COLUMN `invoice_type` enum('full_invoice','partial_invoice') DEFAULT NULL AFTER `status`;

-- Step 2: Migrate data from invoice_ready to invoice_type
-- Mapping logic:
-- - invoice_ready='true' AND status='Closed' -> invoice_type='full_invoice'
-- - invoice_ready='true' AND status='In-process' -> invoice_type='partial_invoice'
-- - invoice_ready='false' or NULL -> invoice_type=NULL
UPDATE `job` 
SET `invoice_type` = CASE
    WHEN `invoice_ready` = 'true' AND `status` = 'Closed' THEN 'full_invoice'
    WHEN `invoice_ready` = 'true' AND (`status` = 'In-process' OR `status` = 'In_process') THEN 'partial_invoice'
    ELSE NULL
END;

-- Step 3: Drop the old index
ALTER TABLE `job` DROP INDEX `idx_invoice_ready`;

-- Step 4: Drop the old invoice_ready column
ALTER TABLE `job` DROP COLUMN `invoice_ready`;

-- Step 5: Create the new index on invoice_type
ALTER TABLE `job` ADD INDEX `idx_invoice_type` (`invoice_type`);







