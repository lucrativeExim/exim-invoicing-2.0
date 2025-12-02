-- EXIM Invoicing System 2.0 - Database Schema with Indexes
-- Created: 2025-11-27
-- Database: exim_invoicing

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS `exim_invoicing` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `exim_invoicing`;

-- --------------------------------------------------------
-- Table: state (must be created first as it's referenced by other tables)
-- --------------------------------------------------------

CREATE TABLE `state` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `state_name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_state_name` (`state_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: users (must be created early as it's referenced by many tables)
-- --------------------------------------------------------

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `email` varchar(50) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `mobile` varchar(10) DEFAULT NULL,
  `user_role` varchar(255) DEFAULT NULL,
  `authority` varchar(255) DEFAULT NULL,
  `job_register_ids` text DEFAULT NULL,
  `status` enum('Active','InActive','Delete') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_email` (`email`),
  KEY `idx_status` (`status`),
  KEY `idx_user_role` (`user_role`),
  KEY `idx_mobile` (`mobile`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_added_by` (`added_by`),
  KEY `idx_deleted_by` (`deleted_by`),
  CONSTRAINT `fk_users_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_users_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: gst_rates
-- --------------------------------------------------------

CREATE TABLE `gst_rates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sac_no` varchar(255) DEFAULT NULL,
  `sgst` varchar(255) DEFAULT NULL,
  `cgst` varchar(255) DEFAULT NULL,
  `igst` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sac_no` (`sac_no`),
  KEY `idx_added_by` (`added_by`),
  CONSTRAINT `fk_gst_rates_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: accounts
-- --------------------------------------------------------

CREATE TABLE `accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_name` varchar(255) DEFAULT NULL,
  `account_address` text DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `bank_address` text DEFAULT NULL,
  `account_no` varchar(50) DEFAULT NULL,
  `ifsc_no` varchar(255) DEFAULT NULL,
  `gst_no` varchar(255) DEFAULT NULL,
  `pan_no` varchar(255) DEFAULT NULL,
  `msme_details` varchar(255) DEFAULT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `invoice_serial_initial` varchar(255) DEFAULT NULL,
  `invoice_serial_second_no` varchar(255) DEFAULT NULL,
  `status` enum('Active','InActive','Delete') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_gst_no` (`gst_no`),
  KEY `idx_pan_no` (`pan_no`),
  KEY `idx_account_name` (`account_name`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_added_by` (`added_by`),
  KEY `idx_deleted_by` (`deleted_by`),
  CONSTRAINT `fk_accounts_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_accounts_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: client_info
-- --------------------------------------------------------

CREATE TABLE `client_info` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_id` int(11) DEFAULT NULL,
  `client_name` varchar(255) DEFAULT NULL,
  `iec_no` varchar(255) DEFAULT NULL,
  `alias` varchar(255) DEFAULT NULL,
  `credit_terms` varchar(255) DEFAULT NULL,
  `client_owner_ship` varchar(255) DEFAULT NULL,
  `status` enum('Active','InActive','Delete') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_account_id` (`account_id`),
  KEY `idx_client_name` (`client_name`),
  KEY `idx_iec_no` (`iec_no`),
  KEY `idx_alias` (`alias`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_added_by` (`added_by`),
  KEY `idx_deleted_by` (`deleted_by`),
  CONSTRAINT `fk_client_info_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_info_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_info_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: client_bu
-- --------------------------------------------------------

CREATE TABLE `client_bu` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `client_info_id` int(11) DEFAULT NULL,
  `bu_name` varchar(255) DEFAULT NULL,
  `client_type` varchar(255) DEFAULT NULL,
  `state_id` int(11) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `pincode` int(11) DEFAULT NULL,
  `branch_code` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `gst_no` varchar(255) DEFAULT NULL,
  `sc_i` varchar(255) DEFAULT NULL,
  `status` enum('Active','InActive','Delete') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_client_info_id` (`client_info_id`),
  KEY `idx_state_id` (`state_id`),
  KEY `idx_bu_name` (`bu_name`),
  KEY `idx_client_type` (`client_type`),
  KEY `idx_gst_no` (`gst_no`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_added_by` (`added_by`),
  KEY `idx_deleted_by` (`deleted_by`),
  CONSTRAINT `fk_client_bu_client_info_id` FOREIGN KEY (`client_info_id`) REFERENCES `client_info`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_bu_state_id` FOREIGN KEY (`state_id`) REFERENCES `state`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_bu_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_bu_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: job_register
-- --------------------------------------------------------

CREATE TABLE `job_register` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_code` varchar(255) DEFAULT NULL,
  `job_title` varchar(255) DEFAULT NULL,
  `job_type` varchar(255) DEFAULT NULL,
  `gst_rate_id` int(11) DEFAULT NULL,
  `remi_one_desc` varchar(255) DEFAULT NULL,
  `remi_two_desc` varchar(255) DEFAULT NULL,
  `remi_three_desc` varchar(255) DEFAULT NULL,
  `remi_four_desc` varchar(255) DEFAULT NULL,
  `remi_five_desc` varchar(255) DEFAULT NULL,
  `field_order` text DEFAULT NULL,
  `status` enum('Active','Inactive','Delete') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_job_code` (`job_code`),
  KEY `idx_job_title` (`job_title`),
  KEY `idx_job_type` (`job_type`),
  KEY `idx_gst_rate_id` (`gst_rate_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_added_by` (`added_by`),
  KEY `idx_deleted_by` (`deleted_by`),
  CONSTRAINT `fk_job_register_gst_rate_id` FOREIGN KEY (`gst_rate_id`) REFERENCES `gst_rates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_register_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_register_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: job_register_fields
-- --------------------------------------------------------

CREATE TABLE `job_register_fields` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_register_id` int(11) DEFAULT NULL,
  `form_fields_json` text DEFAULT NULL,
  `status` enum('In-process','Closed') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_job_register_id` (`job_register_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_added_by` (`added_by`),
  KEY `idx_updated_by` (`updated_by`),
  CONSTRAINT `fk_job_register_fields_job_register_id` FOREIGN KEY (`job_register_id`) REFERENCES `job_register`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_register_fields_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_register_fields_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: job
-- --------------------------------------------------------

CREATE TABLE `job` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_register_id` int(11) DEFAULT NULL,
  `job_no` varchar(255) DEFAULT NULL,
  `job_register_field_id` int(11) DEFAULT NULL,
  `type_of_unit` varchar(255) DEFAULT NULL,
  `job_owner` varchar(255) DEFAULT NULL,
  `job_owner_email_id` varchar(255) DEFAULT NULL,
  `job_owner_phone_no` float DEFAULT NULL,
  `processor` varchar(255) DEFAULT NULL,
  `processor_email_id` varchar(255) DEFAULT NULL,
  `processor_phone_no` float DEFAULT NULL,
  `port` varchar(255) DEFAULT NULL,
  `claim_no` varchar(255) DEFAULT NULL,
  `po_no` varchar(255) DEFAULT NULL,
  `quantity` varchar(255) DEFAULT NULL,
  `description_of_quantity` varchar(255) DEFAULT NULL,
  `job_date` date DEFAULT NULL,
  `application_target_date` date DEFAULT NULL,
  `application_date` date DEFAULT NULL,
  `application` varchar(255) DEFAULT NULL,
  `claim_amount_after_finalization` varchar(255) DEFAULT NULL,
  `appl_fee_duty_paid` varchar(255) DEFAULT NULL,
  `appl_fees_reference_no` varchar(255) DEFAULT NULL,
  `app_fees_payt_date` date DEFAULT NULL,
  `eft_attachment` varchar(255) DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `application_ref_no` varchar(255) DEFAULT NULL,
  `application_ref_date` date DEFAULT NULL,
  `cac` date DEFAULT NULL,
  `cac_attachment` varchar(255) DEFAULT NULL,
  `cec` date DEFAULT NULL,
  `cec_attachment` varchar(255) DEFAULT NULL,
  `no_of_cac` varchar(255) DEFAULT NULL,
  `no_of_cec` varchar(255) DEFAULT NULL,
  `submission_target_date` date DEFAULT NULL,
  `submission_date` date DEFAULT NULL,
  `acknowlegment` varchar(255) DEFAULT NULL,
  `submitted_to` varchar(255) DEFAULT NULL,
  `file_no` varchar(255) DEFAULT NULL,
  `file_date` date DEFAULT NULL,
  `job_verification_target_date` date DEFAULT NULL,
  `job_verification_date` date DEFAULT NULL,
  `sanction_approval_target_date` date DEFAULT NULL,
  `sanction___approval_date` date DEFAULT NULL,
  `authorisation_no` varchar(255) DEFAULT NULL,
  `duty_credit_scrip_no` varchar(255) DEFAULT NULL,
  `license_no` varchar(255) DEFAULT NULL,
  `certificate_no` varchar(255) DEFAULT NULL,
  `refund_sanction_order_no` varchar(255) DEFAULT NULL,
  `brand_rate_letter_no` varchar(255) DEFAULT NULL,
  `lic_scrip_order_cert_amendment_no` varchar(255) DEFAULT NULL,
  `date` varchar(255) DEFAULT NULL,
  `refund_order_license_approval_brl_certificate_attachment` varchar(255) DEFAULT NULL,
  `duty_credit_refund_sanctioned_exempted_amount` varchar(255) DEFAULT NULL,
  `license_registration_target_date` date DEFAULT NULL,
  `license_registration_date` date DEFAULT NULL,
  `import_date` date DEFAULT NULL,
  `actual_duty_credit_refund_sanctioned_amount` varchar(255) DEFAULT NULL,
  `normal_retro` varchar(255) DEFAULT NULL,
  `cus_clearance` varchar(255) DEFAULT NULL,
  `type_of_ims` varchar(255) DEFAULT NULL,
  `bis` varchar(255) DEFAULT NULL,
  `ims` varchar(255) DEFAULT NULL,
  `scomet` varchar(255) DEFAULT NULL,
  `inv_no` varchar(255) DEFAULT NULL,
  `inv_date` date DEFAULT NULL,
  `dbk_claim_no` varchar(255) DEFAULT NULL,
  `dbk_claim_date` date DEFAULT NULL,
  `ref__no` varchar(255) DEFAULT NULL,
  `ref__date` date DEFAULT NULL,
  `remark` text DEFAULT NULL,
  `status` enum('In-process','Closed') DEFAULT NULL,
  `invoice_ready` enum('true','false') DEFAULT NULL,
  `form_field_json_data` text DEFAULT NULL,
  `job_id_status` enum('Active','InActive','Delete') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_job_register_id` (`job_register_id`),
  KEY `idx_job_register_field_id` (`job_register_field_id`),
  KEY `idx_job_no` (`job_no`),
  KEY `idx_po_no` (`po_no`),
  KEY `idx_claim_no` (`claim_no`),
  KEY `idx_job_date` (`job_date`),
  KEY `idx_status` (`status`),
  KEY `idx_invoice_ready` (`invoice_ready`),
  KEY `idx_job_id_status` (`job_id_status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_added_by` (`added_by`),
  KEY `idx_deleted_by` (`deleted_by`),
  KEY `idx_application_date` (`application_date`),
  KEY `idx_submission_date` (`submission_date`),
  CONSTRAINT `fk_job_job_register_id` FOREIGN KEY (`job_register_id`) REFERENCES `job_register`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_job_register_field_id` FOREIGN KEY (`job_register_field_id`) REFERENCES `job_register_fields`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: job_attachment
-- --------------------------------------------------------

CREATE TABLE `job_attachment` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) NOT NULL,
  `attachment_type` varchar(255) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `status` enum('Active','InActive','Delete') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_job_id` (`job_id`),
  KEY `idx_attachment_type` (`attachment_type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_added_by` (`added_by`),
  KEY `idx_deleted_by` (`deleted_by`),
  CONSTRAINT `fk_job_attachment_job_id` FOREIGN KEY (`job_id`) REFERENCES `job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_job_attachment_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_attachment_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: job_service_charges
-- --------------------------------------------------------

CREATE TABLE `job_service_charges` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` varchar(255) DEFAULT NULL,
  `job_id` int(11) DEFAULT NULL,
  `client_name` varchar(255) DEFAULT NULL,
  `client_address` text DEFAULT NULL,
  `concern_person` varchar(255) DEFAULT NULL,
  `concern_email_id` varchar(255) DEFAULT NULL,
  `concern_phone_no` varchar(10) DEFAULT NULL,
  `gst_no` varchar(255) DEFAULT NULL,
  `gst_type` enum('SC','I','EXEMPTED') DEFAULT NULL,
  `min` float NOT NULL DEFAULT 0,
  `max` float NOT NULL DEFAULT 0,
  `in_percentage` float NOT NULL DEFAULT 0,
  `fixed` float NOT NULL DEFAULT 0,
  `per_shb` float NOT NULL DEFAULT 0,
  `ca_charges` float NOT NULL DEFAULT 0,
  `ce_charges` float NOT NULL DEFAULT 0,
  `registration_other_charges` float NOT NULL DEFAULT 0,
  `invoice_description` text DEFAULT NULL,
  `percentage_per_shb` enum('No','Yes') NOT NULL DEFAULT 'No',
  `fixed_percentage_per_shb` enum('No','Yes') NOT NULL DEFAULT 'No',
  `remi_one_desc` varchar(255) DEFAULT NULL,
  `remi_one_charges` varchar(255) DEFAULT NULL,
  `remi_two_desc` varchar(255) DEFAULT NULL,
  `remi_two_charges` varchar(255) DEFAULT NULL,
  `remi_three_desc` varchar(255) DEFAULT NULL,
  `remi_three_charges` varchar(255) DEFAULT NULL,
  `remi_four_desc` varchar(255) DEFAULT NULL,
  `remi_four_charges` varchar(255) DEFAULT NULL,
  `remi_five_desc` varchar(255) DEFAULT NULL,
  `remi_five_charges` varchar(255) DEFAULT NULL,
  `status` enum('Active','InActive','Delete') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_job_id` (`job_id`),
  KEY `idx_gst_no` (`gst_no`),
  KEY `idx_gst_type` (`gst_type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_added_by` (`added_by`),
  KEY `idx_deleted_by` (`deleted_by`),
  CONSTRAINT `fk_job_service_charges_job_id` FOREIGN KEY (`job_id`) REFERENCES `job`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_service_charges_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_service_charges_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: client_service_charges
-- --------------------------------------------------------

CREATE TABLE `client_service_charges` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` varchar(255) DEFAULT NULL,
  `account_id` int(11) DEFAULT NULL,
  `client_info_id` int(11) DEFAULT NULL,
  `client_bu_id` int(11) DEFAULT NULL,
  `job_register_id` int(11) DEFAULT NULL,
  `concern_person` varchar(255) DEFAULT NULL,
  `concern_email_id` varchar(255) DEFAULT NULL,
  `concern_phone_no` varchar(10) DEFAULT NULL,
  `min` float NOT NULL DEFAULT 0,
  `max` float NOT NULL DEFAULT 0,
  `in_percentage` float NOT NULL DEFAULT 0,
  `fixed` float NOT NULL DEFAULT 0,
  `per_shb` float NOT NULL DEFAULT 0,
  `ca_charges` float NOT NULL DEFAULT 0,
  `ce_charges` float NOT NULL DEFAULT 0,
  `other_charges` float NOT NULL DEFAULT 0,
  `registration_other_charges` float NOT NULL DEFAULT 0,
  `reimbursement` varchar(255) DEFAULT NULL,
  `reimbursement_charges` float NOT NULL DEFAULT 0,
  `remi_one_description` varchar(255) DEFAULT NULL,
  `remi_one_charges` varchar(255) DEFAULT NULL,
  `remi_two_description` varchar(255) DEFAULT NULL,
  `remi_two_charges` varchar(255) DEFAULT NULL,
  `remi_three_description` varchar(255) DEFAULT NULL,
  `remi_three_charges` varchar(255) DEFAULT NULL,
  `remi_four_description` varchar(255) DEFAULT NULL,
  `remi_four_charges` varchar(255) DEFAULT NULL,
  `invoice_description` text DEFAULT NULL,
  `percentage_per_shb` enum('No','Yes') NOT NULL DEFAULT 'No',
  `fixed_percentage_per_shb` enum('No','Yes') NOT NULL DEFAULT 'No',
  `status` enum('Active','InActive','Delete') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_account_id` (`account_id`),
  KEY `idx_client_info_id` (`client_info_id`),
  KEY `idx_client_bu_id` (`client_bu_id`),
  KEY `idx_job_register_id` (`job_register_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_added_by` (`added_by`),
  KEY `idx_deleted_by` (`deleted_by`),
  CONSTRAINT `fk_client_service_charges_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_service_charges_client_info_id` FOREIGN KEY (`client_info_id`) REFERENCES `client_info`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_service_charges_client_bu_id` FOREIGN KEY (`client_bu_id`) REFERENCES `client_bu`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_service_charges_job_register_id` FOREIGN KEY (`job_register_id`) REFERENCES `job_register`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_service_charges_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_service_charges_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: invoices
-- --------------------------------------------------------

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `draft_view_id` varchar(255) DEFAULT NULL,
  `performa_view_id` varchar(255) DEFAULT NULL,
  `job_register_id` int(11) DEFAULT NULL,
  `service_type` varchar(255) DEFAULT NULL,
  `invoice_type` varchar(255) DEFAULT NULL,
  `pay_amount` varchar(255) DEFAULT NULL,
  `amount` varchar(255) DEFAULT NULL,
  `professional_charges` decimal(10,0) DEFAULT 0,
  `registration_other_charges` decimal(10,0) DEFAULT 0,
  `ca_charges` decimal(10,0) DEFAULT 0,
  `ce_charges` decimal(10,0) DEFAULT 0,
  `ca_cert_count` int(11) DEFAULT NULL,
  `ce_cert_count` int(11) DEFAULT NULL,
  `application_fees` decimal(10,0) DEFAULT 0,
  `remi_one_charges` decimal(10,0) DEFAULT 0,
  `remi_two_charges` decimal(10,0) DEFAULT 0,
  `remi_three_charges` decimal(10,0) DEFAULT 0,
  `remi_four_charges` decimal(10,0) DEFAULT 0,
  `remi_five_charges` varchar(255) DEFAULT NULL,
  `reward_penalty_input` varchar(255) DEFAULT '0',
  `reward_penalty_amount` decimal(10,0) DEFAULT 0,
  `note` text DEFAULT NULL,
  `po_no` varchar(255) DEFAULT NULL,
  `irn_no` varchar(255) DEFAULT NULL,
  `status` enum('Open','Closed') DEFAULT NULL,
  `invoice_status` enum('Active','InActive','Delete') DEFAULT NULL,
  `invoice_stage_status` enum('Draft','Performa','Canceled') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `canceled_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `canceled_by` int(11) DEFAULT NULL,
  `performa_created_at` datetime DEFAULT NULL,
  `performa_created_by` int(11) DEFAULT NULL,
  `performa_canceled_at` datetime DEFAULT NULL,
  `performa_canceled_by` int(11) DEFAULT NULL,
  `credit_debit_note_number` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_draft_view_id` (`draft_view_id`),
  KEY `idx_performa_view_id` (`performa_view_id`),
  KEY `idx_job_register_id` (`job_register_id`),
  KEY `idx_po_no` (`po_no`),
  KEY `idx_irn_no` (`irn_no`),
  KEY `idx_status` (`status`),
  KEY `idx_invoice_status` (`invoice_status`),
  KEY `idx_invoice_stage_status` (`invoice_stage_status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_added_by` (`added_by`),
  KEY `idx_canceled_by` (`canceled_by`),
  KEY `idx_performa_created_by` (`performa_created_by`),
  KEY `idx_performa_canceled_by` (`performa_canceled_by`),
  CONSTRAINT `fk_invoices_job_register_id` FOREIGN KEY (`job_register_id`) REFERENCES `job_register`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_canceled_by` FOREIGN KEY (`canceled_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_performa_created_by` FOREIGN KEY (`performa_created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_performa_canceled_by` FOREIGN KEY (`performa_canceled_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: invoice_selected_jobs
-- --------------------------------------------------------

CREATE TABLE `invoice_selected_jobs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_invoice_id` (`invoice_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `fk_invoice_selected_jobs_invoice_id` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_invoice_selected_jobs_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: invoice_annexure
-- --------------------------------------------------------

CREATE TABLE `invoice_annexure` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_id` int(11) DEFAULT NULL,
  `inv_ref_dbk_claim_no` varchar(255) DEFAULT NULL,
  `inv_ref_dbk_claim_date` date DEFAULT NULL,
  `lic_script_order_autho_certi_no` varchar(255) DEFAULT NULL,
  `lic_script_order_autho_certi_date` date DEFAULT NULL,
  `duty_saved_duty_credit_amount` varchar(255) DEFAULT NULL,
  `qty_uom` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `canceled_at` datetime DEFAULT NULL,
  `canceled_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_invoice_id` (`invoice_id`),
  KEY `idx_inv_ref_dbk_claim_no` (`inv_ref_dbk_claim_no`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_canceled_by` (`canceled_by`),
  CONSTRAINT `fk_invoice_annexure_invoice_id` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_invoice_annexure_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_invoice_annexure_canceled_by` FOREIGN KEY (`canceled_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: fields_master
-- --------------------------------------------------------

CREATE TABLE `fields_master` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `field_name` varchar(255) DEFAULT NULL,
  `field_type` varchar(255) DEFAULT NULL,
  `default_value` varchar(255) DEFAULT NULL,
  `treatment` text DEFAULT NULL,
  `dropdown_options` varchar(255) DEFAULT NULL,
  `status` enum('Active','InActive','Delete') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_field_name` (`field_name`),
  KEY `idx_field_type` (`field_type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_added_by` (`added_by`),
  KEY `idx_deleted_by` (`deleted_by`),
  CONSTRAINT `fk_fields_master_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_fields_master_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: job_reports
-- --------------------------------------------------------

CREATE TABLE `job_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `report_name` varchar(255) DEFAULT NULL,
  `status` text DEFAULT NULL,
  `job_status` enum('Active','Delete') DEFAULT NULL,
  `account_ids` text DEFAULT NULL,
  `job_ids` text DEFAULT NULL,
  `client_ids` text DEFAULT NULL,
  `job_fields` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_report_name` (`report_name`),
  KEY `idx_job_status` (`job_status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_added_by` (`added_by`),
  KEY `idx_deleted_by` (`deleted_by`),
  CONSTRAINT `fk_job_reports_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_reports_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table: user_settings
-- --------------------------------------------------------

CREATE TABLE `user_settings` (
  `user_id` int(11) NOT NULL,
  `font` varchar(100) DEFAULT NULL,
  `theme` varchar(100) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_settings_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

