-- Migration: Add client_info_id and client_bu_id to job table
-- Changes:
-- 1. Add client_info_id column to job table
-- 2. Add client_bu_id column to job table
-- 3. Add foreign key constraints
-- 4. Add indexes for optimization

-- Step 1: Add client_info_id column
ALTER TABLE `job` 
ADD COLUMN `client_info_id` int(11) DEFAULT NULL AFTER `job_register_field_id`;

-- Step 2: Add client_bu_id column
ALTER TABLE `job` 
ADD COLUMN `client_bu_id` int(11) DEFAULT NULL AFTER `client_info_id`;

-- Step 3: Add foreign key constraints
ALTER TABLE `job`
ADD CONSTRAINT `fk_job_client_info_id` FOREIGN KEY (`client_info_id`) REFERENCES `client_info`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `job`
ADD CONSTRAINT `fk_job_client_bu_id` FOREIGN KEY (`client_bu_id`) REFERENCES `client_bu`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4: Add indexes for optimization
ALTER TABLE `job`
ADD INDEX `idx_client_info_id` (`client_info_id`);

ALTER TABLE `job`
ADD INDEX `idx_client_bu_id` (`client_bu_id`);

