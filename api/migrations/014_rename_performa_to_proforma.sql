-- Migration: Rename 'performa' to 'proforma' in database
-- This migration updates:
-- 1. Enum value 'Performa' to 'Proforma' in invoice_stage_status
-- 2. Column names from performa_* to proforma_*
-- 3. Index names
-- 4. Foreign key constraint names

-- Step 1: Update enum value in invoice_stage_status column (if 'Performa' exists)
UPDATE invoices SET invoice_stage_status = 'Proforma' WHERE invoice_stage_status = 'Performa';

-- Step 2: Modify the enum definition to replace 'Performa' with 'Proforma'
-- Check if enum contains 'Performa' before modifying
SET @enum_has_performa = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND COLUMN_NAME = 'invoice_stage_status'
  AND COLUMN_TYPE LIKE '%Performa%'
);
SET @sql = IF(@enum_has_performa > 0, 
  "ALTER TABLE invoices MODIFY COLUMN invoice_stage_status ENUM('Draft','Proforma','Canceled') DEFAULT NULL", 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Drop old foreign key constraints first (must be done before dropping indexes)
-- Check and drop any foreign key related to performa_created_by
SET @fk_name = NULL;
SELECT CONSTRAINT_NAME INTO @fk_name FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND CONSTRAINT_NAME LIKE '%performa_created_by%'
  LIMIT 1;
SET @sql = IF(@fk_name IS NOT NULL, CONCAT('ALTER TABLE invoices DROP FOREIGN KEY ', @fk_name), 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and drop any foreign key related to performa_canceled_by
SET @fk_name = NULL;
SELECT CONSTRAINT_NAME INTO @fk_name FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND CONSTRAINT_NAME LIKE '%performa_canceled_by%'
  LIMIT 1;
SET @sql = IF(@fk_name IS NOT NULL, CONCAT('ALTER TABLE invoices DROP FOREIGN KEY ', @fk_name), 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Drop old indexes (if they exist)
SET @index_name = NULL;
SELECT INDEX_NAME INTO @index_name FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND INDEX_NAME = 'idx_performa_view_id'
  LIMIT 1;
SET @sql = IF(@index_name IS NOT NULL, 'ALTER TABLE invoices DROP INDEX idx_performa_view_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_name = NULL;
SELECT INDEX_NAME INTO @index_name FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND INDEX_NAME = 'idx_performa_created_by'
  LIMIT 1;
SET @sql = IF(@index_name IS NOT NULL, 'ALTER TABLE invoices DROP INDEX idx_performa_created_by', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_name = NULL;
SELECT INDEX_NAME INTO @index_name FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND INDEX_NAME = 'idx_performa_canceled_by'
  LIMIT 1;
SET @sql = IF(@index_name IS NOT NULL, 'ALTER TABLE invoices DROP INDEX idx_performa_canceled_by', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Rename columns from performa_* to proforma_* (only if performa columns exist)
-- Check if performa_view_id exists before renaming
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND COLUMN_NAME = 'performa_view_id'
);
SET @sql = IF(@col_exists > 0, 
  'ALTER TABLE invoices CHANGE COLUMN performa_view_id proforma_view_id VARCHAR(255) DEFAULT NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND COLUMN_NAME = 'performa_created_at'
);
SET @sql = IF(@col_exists > 0, 
  'ALTER TABLE invoices CHANGE COLUMN performa_created_at proforma_created_at DATETIME DEFAULT NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND COLUMN_NAME = 'performa_created_by'
);
SET @sql = IF(@col_exists > 0, 
  'ALTER TABLE invoices CHANGE COLUMN performa_created_by proforma_created_by INT(11) DEFAULT NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND COLUMN_NAME = 'performa_canceled_at'
);
SET @sql = IF(@col_exists > 0, 
  'ALTER TABLE invoices CHANGE COLUMN performa_canceled_at proforma_canceled_at DATETIME DEFAULT NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND COLUMN_NAME = 'performa_canceled_by'
);
SET @sql = IF(@col_exists > 0, 
  'ALTER TABLE invoices CHANGE COLUMN performa_canceled_by proforma_canceled_by INT(11) DEFAULT NULL', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 6: Create new indexes with proforma names (only if they don't exist)
SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND INDEX_NAME = 'idx_proforma_view_id'
);
SET @sql = IF(@index_exists = 0, 
  'ALTER TABLE invoices ADD INDEX idx_proforma_view_id (proforma_view_id)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND INDEX_NAME = 'idx_proforma_created_by'
);
SET @sql = IF(@index_exists = 0, 
  'ALTER TABLE invoices ADD INDEX idx_proforma_created_by (proforma_created_by)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND INDEX_NAME = 'idx_proforma_canceled_by'
);
SET @sql = IF(@index_exists = 0, 
  'ALTER TABLE invoices ADD INDEX idx_proforma_canceled_by (proforma_canceled_by)', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 7: Add new foreign key constraints with proforma names (only if they don't exist)
SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND CONSTRAINT_NAME = 'fk_invoices_proforma_created_by'
);
SET @sql = IF(@fk_exists = 0, 
  "ALTER TABLE invoices ADD CONSTRAINT fk_invoices_proforma_created_by FOREIGN KEY (proforma_created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE", 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'invoices' 
  AND CONSTRAINT_NAME = 'fk_invoices_proforma_canceled_by'
);
SET @sql = IF(@fk_exists = 0, 
  "ALTER TABLE invoices ADD CONSTRAINT fk_invoices_proforma_canceled_by FOREIGN KEY (proforma_canceled_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE", 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
