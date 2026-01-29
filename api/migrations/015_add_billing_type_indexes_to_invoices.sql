-- Migration: Add billing_type indexes to invoices table
-- This migration:
-- 1. Adds index on billing_type column for faster filtering
-- 2. Adds composite index on (invoice_status, billing_type) for optimized exclusion queries
-- 
-- Purpose: Optimize job queries that exclude jobs with active invoices matching specific billing types
-- This improves performance when filtering jobs by billing_type and excluding already invoiced jobs

-- Step 1: Check if billing_type index exists, if not create it
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE()
    AND table_name = 'invoices'
    AND index_name = 'idx_billing_type'
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE `invoices` ADD INDEX `idx_billing_type` (`billing_type`)',
    'SELECT "Index idx_billing_type already exists, skipping..." AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Check if composite index exists, if not create it
SET @composite_index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE()
    AND table_name = 'invoices'
    AND index_name = 'idx_invoice_status_billing_type'
);

SET @sql = IF(@composite_index_exists = 0,
    'ALTER TABLE `invoices` ADD INDEX `idx_invoice_status_billing_type` (`invoice_status`, `billing_type`)',
    'SELECT "Index idx_invoice_status_billing_type already exists, skipping..." AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

