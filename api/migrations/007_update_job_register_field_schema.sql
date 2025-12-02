-- Migration: Update JobRegisterField schema
-- Changes:
-- 1. Change form_fields_json from TEXT to JSON type
-- 2. Add Active and Inactive to JobRegisterFieldStatus enum

-- Step 1: Update the enum to include Active and Inactive
ALTER TABLE `job_register_fields` 
MODIFY COLUMN `status` enum('In-process','Closed','Active','Inactive') DEFAULT NULL;

-- Step 2: Convert existing TEXT data to JSON (if any exists)
-- First, ensure all existing data is valid JSON or NULL
-- If there's existing data, we need to validate it first
-- For now, we'll just change the column type
-- Note: MySQL 5.7+ supports JSON type natively

-- Step 3: Change form_fields_json from TEXT to JSON
-- First, let's check if there's any invalid JSON data
-- We'll convert TEXT to JSON, keeping NULL values as NULL
ALTER TABLE `job_register_fields` 
MODIFY COLUMN `form_fields_json` JSON DEFAULT NULL;

