-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 27, 2025 at 01:52 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `new_invoicing`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `id` int(11) NOT NULL,
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
  CONSTRAINT `fk_accounts_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_accounts_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`id`, `account_name`, `account_address`, `bank_name`, `bank_address`, `account_no`, `ifsc_no`, `gst_no`, `pan_no`, `msme_details`, `remark`, `invoice_serial_initial`, `invoice_serial_second_no`, `status`, `created_at`, `updated_at`, `deleted_at`, `added_by`, `deleted_by`) VALUES
(1, 'Lucrative Exim Outsourcing Pvt. Ltd. India.', 'KK Market, Balaji Nagar, Pune', 'ICICI Bank', 'Balaji Nagar, Pune 345678', 'Current A/C 3164529004', 'ICICI0282402', 'GST234455', 'AABCL4940J', 'MH26E0025297', '-', '1', '2526', 'Active', '2025-06-20 10:50:51', '2025-06-20 10:52:08', NULL, NULL, NULL),
(2, 'Lucrative Exim Consultants LLP', 'Unit No. 105, F - Wing , 4th Floor, KK Market, Bibwewadi, Pune - 411 037', 'Central Bank Of India', 'Jedhenagar, Chavan Bldg.oppo.Ramyanagari Bibvewadi,Pune- 411037', 'Current A/C 3251190810', 'CBIN0282402', '27AAEFL6669G1ZY', 'AAEFL6669G', 'MH26E0025297', '', '2', '2526', 'Active', '2025-06-20 12:08:05', NULL, NULL, NULL, NULL),
(3, 'Rahul and Associates', '	Unit No. 65(P), 66, 67, 68(P), Wing - A, 4th Floor, KK Market, Bibwewadi, Pune - 411 037', 'Central Bank Of India', 'Jedhenagar, Chavan Bldg.oppo.Ramyanagari Bibvewadi,Pune- 411037', 'Current A/C 3183495616', 'CBIN0282402', '27AKLPD0688C1ZA', 'AKLPD0688C', 'MH26D0135730', '', '4', '2526', 'Active', '2025-06-20 12:09:33', '2025-06-20 12:11:30', NULL, NULL, NULL),
(4, 'Agarwal & Associates', 'B-504, Relicon Garden Groove, Dattanager, Katraj, Pune-411046', 'Central Bank Of India', 'Jedhenagar, Chavan Bldg.oppo.Ramyanagari Bibvewadi,Pune- 411037', 'Current A/C 3196847291', 'CBIN0282402', '27AGYPA9485H1ZM', 'AGYPA9485H', 'MH26D0135344', '', '3', '2526', 'Active', '2025-06-20 12:10:51', '2025-06-20 12:13:18', NULL, NULL, NULL),
(5, 'Nirmal Associates', 'Plot No- 63, Sahakarvtund Society, Lane No-14, Paramhans Nagar, opp, vanaz company, Kothrud, Pune- 411038', 'Central Bank Of India', 'Jedhenagar, Chavan Bldg.oppo.Ramyanagari Bibvewadi,Pune- 411037', 'Current A/C 3189018636', 'CBIN0282402', '27APJPP0838H1ZO', 'APJPP0838H', 'MH26D0135710', '', '-', '2526', 'Active', '2025-06-20 12:13:01', NULL, NULL, NULL, NULL),
(6, 'Test Account Name', 'test Address', 'test Bank', 'test bank add', 'test account no', 'TEST123', '27AGPA9486H1ZM', 'AGYPA9486H', 'test msme', 'test remark', '15', '2526', 'Active', '2025-07-08 14:04:05', NULL, NULL, NULL, NULL),
(7, 'asdf', 'test Address', 'Bank Name', 'test bank add', '324', '23432432', '272727272727SFDSK', 'AGYPA9486H', 'test msme', 'remark', '5', '2526', 'Delete', '2025-07-09 10:26:46', NULL, '2025-07-09 10:28:45', NULL, NULL),
(8, 'asdfff', 'test Address', '123', '4', '444', '444', '272727272727SFDSK', 'AGYPA9486H', 'test msme', '12321', '6', '2526', 'Delete', '2025-07-09 10:28:00', NULL, '2025-07-09 10:36:30', NULL, 4),
(9, 'safa', 'test Address', 'Bank Name', 'test bank add', 'test 234657', 'TEST123', '272727272727SFDSK', 'AGYPA9486H', 'test msme', '12321', '23', '2526', 'Delete', '2025-07-09 10:37:08', NULL, '2025-07-09 10:37:44', 4, 4);

-- --------------------------------------------------------

--
-- Table structure for table `client_bu`
--

CREATE TABLE `client_bu` (
  `id` int(11) NOT NULL,
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
  CONSTRAINT `fk_client_bu_client_info_id` FOREIGN KEY (`client_info_id`) REFERENCES `client_info`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_bu_state_id` FOREIGN KEY (`state_id`) REFERENCES `state`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_bu_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_bu_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `client_bu`
--

INSERT INTO `client_bu` (`id`, `client_info_id`, `bu_name`, `client_type`, `state_id`, `city`, `pincode`, `branch_code`, `address`, `gst_no`, `sc_i`, `status`, `created_at`, `updated_at`, `deleted_at`, `added_by`, `deleted_by`) VALUES
(1, 1, 'Kothrud 1', 'SEZ', 11, 'Bengluru', 223554, 'BRANCH00202', 'Pune, Kothrud 987655', '272727272727SFDSK', 'SC', 'Active', '2025-07-14 11:08:47', '2025-11-27 13:14:13', NULL, 8, NULL),
(2, 3, 'Sarole-PSB', 'EOU', 14, 'Pune', 765434, NULL, 'Pune, sarole 4010', '273747XYZ', 'I', 'Active', '2025-07-14 11:10:04', '2025-08-08 20:36:33', NULL, 8, NULL),
(3, 2, 'BALEWADI', 'DTA', 14, 'Bengluru', 223554, 'BRANCH00202', 'PLOT No B-54, MIDC MURUD, PHASE II, VILLAGE - VASULI, TALUKA-KHED, ', '273747SDE', 'I', 'Active', '2025-07-14 11:10:56', '2025-09-25 11:35:11', NULL, 8, NULL),
(4, 2, 'PGBU', 'EOU', NULL, NULL, NULL, NULL, 'pune PGBU', '27374734sd', 'I', 'Active', '2025-07-14 11:12:06', NULL, NULL, 8, NULL),
(5, 4, 'CIL-PHP', 'EOU', 13, 'Bengluru', 223554, NULL, 'PHALTAN PUNE-4111', '273747SDE', 'I', 'Active', '2025-07-14 11:12:48', '2025-08-20 16:31:43', NULL, 8, NULL),
(6, 2, 'Sarole-PSB', 'SEZ', 11, 'Bengluru', 223554, NULL, 'Pune, sarole 4010', '272727272727SFDSK', 'I', 'Active', '2025-07-17 17:23:39', '2025-07-25 18:12:27', NULL, 8, NULL),
(7, 2, 'Kothrud', 'SEZ', 8, 'Bengluru', 223554, 'B87654', 'Pune, Kothrud 987655', '273747XYZ', 'I', 'Active', '2025-07-17 17:23:50', '2025-09-26 12:46:05', NULL, 8, NULL),
(8, 4, 'Sarole-PSB', 'SEZ', 2, 'Bengluru', 765434, NULL, 'Pune, sarole 4010', '273747XYZ', 'SC', 'Active', '2025-07-17 17:24:01', '2025-08-20 16:34:23', NULL, 8, NULL),
(9, 4, 'Sarole-PSB', 'MOOWR', NULL, NULL, NULL, NULL, 'Pune, sarole 4010', '273747SDE', 'Exempted', 'Active', '2025-07-17 17:24:26', NULL, NULL, 8, NULL),
(10, 1, 'PGBU', 'EOU', 1, 'Hydrabad', 678674, NULL, 'PHALTAN PUNE-4111', '272727272727SFDSK', 'Exempted', 'Active', '2025-07-17 17:24:49', '2025-07-19 18:43:59', NULL, 8, NULL),
(11, 2, 'Kothrud', 'DTA', 14, 'Pune', 411038, NULL, 'Pune, Kothrud 987655', '272727272727SFDSK', 'SC', 'Active', '2025-07-19 18:27:22', NULL, NULL, 8, NULL),
(12, 5, 'Sarole-PSB', 'DTA', 14, 'Pune', 456536, 'BRANCH00202', 'Pune, sarole 4010', '272727272727SFDSK', 'SC', 'Active', '2025-07-31 17:38:47', '2025-09-26 16:18:10', NULL, 8, NULL),
(13, 6, 'FIXED', 'DTA', 14, 'Pune', 987653, NULL, 'Pune, Kothrud 987655', '272727272727SFDSK', 'SC', 'Active', '2025-07-31 17:55:56', NULL, NULL, 8, NULL),
(14, 6, 'PERCENTAGE', 'DTA', 14, 'Pune', 456536, NULL, 'Pune, Kothrud 987655', '272727272727SFDSK', 'SC', 'Active', '2025-07-31 17:56:50', NULL, NULL, 8, NULL),
(15, 6, '% OR MIN WHICH HIGHHER', 'DTA', 14, 'Pune', 456536, NULL, 'Pune, Kothrud 987655', '272727272727SFDSK', 'SC', 'Active', '2025-07-31 17:58:25', NULL, NULL, 8, NULL),
(16, 7, 'BU1', 'DTA', 1, 'abcsdhalkjasdhf', 411166, NULL, '12321321', '321321', 'I', 'Active', '2025-08-11 12:42:27', NULL, NULL, 8, NULL),
(17, 7, 'Kothrud', 'DTA', 2, 'abcsdhalkjasdhf', 987653, NULL, 'Pune, sarole 4010', '273747XYZ', 'SC', 'Active', '2025-08-11 12:44:54', NULL, NULL, 8, NULL),
(18, 8, 'Kharadi', 'EOU', 4, 'Pune', 765434, 'BRANCH00202', 'Pune, kharadi, 765434', '273747XYZ44345', 'SC', 'Active', '2025-08-25 10:08:19', '2025-11-25 11:51:14', NULL, 8, NULL),
(19, 9, 'Branch 1', 'DTA', 1, 'abcsdhalkjasdhf', 456536, '008', 'pune kp', '273747XYZ', 'I', 'Active', '2025-09-01 13:57:14', '2025-09-24 12:38:35', NULL, 8, NULL),
(20, 10, 'Chakan Phase 2', 'DTA', 14, 'Pune', 410501, 'BRCODE000001', 'PLOT No B-54, MIDC MURUD, PHASE II, VILLAGE - VASULI, TALUKA-KHED.', '27567890JHj3443', 'SC', 'Active', '2025-09-24 12:01:00', '2025-11-11 17:59:46', NULL, 8, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `client_info`
--

CREATE TABLE `client_info` (
  `id` int(11) NOT NULL,
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
  CONSTRAINT `fk_client_info_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_info_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_info_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `client_info`
--

INSERT INTO `client_info` (`id`, `account_id`, `client_name`, `iec_no`, `alias`, `credit_terms`, `client_owner_ship`, `status`, `created_at`, `updated_at`, `deleted_at`, `added_by`, `deleted_by`) VALUES
(1, 2, 'Rahul Deva Collection 1', 'IEC90', 'RDC', '45', 'Ashok Sir', 'Active', '2025-07-14 11:08:37', '2025-11-27 13:14:13', NULL, 8, NULL),
(2, 1, 'Cummins India Ltd.', 'IC789000101', 'CIL', '80', 'Ashok Sir', 'Active', '2025-07-14 11:09:22', '2025-09-26 12:46:05', NULL, 8, NULL),
(3, 2, 'LEAR AUTO', NULL, 'LA', '80', 'Ashok Sir', 'Active', '2025-07-14 11:09:34', '2025-08-08 20:36:33', NULL, 8, NULL),
(4, 2, 'EMERSON', NULL, 'E', '45', 'Ashok Sir', 'Active', '2025-07-14 11:09:49', '2025-08-20 16:34:23', NULL, 8, NULL),
(5, 1, 'Fixed', 'IEC0006', 'F', '45', 'Ashok Sir', 'Active', '2025-07-31 17:38:13', '2025-09-26 16:18:10', NULL, 8, NULL),
(6, 1, 'Swastik PVT LTD', NULL, 'SPL', '45', 'Ashok Sir', 'Active', '2025-07-31 17:55:04', NULL, NULL, 8, NULL),
(7, 1, 'Abc Limited', NULL, 'ABCL', '60', 'ABCPL', 'Active', '2025-08-11 12:41:46', NULL, NULL, 8, NULL),
(8, 1, 'TCS', 'IC789000101', 'TCS', '80', 'Ashok Sir', 'Active', '2025-08-25 10:02:14', '2025-11-25 11:51:14', NULL, 8, NULL),
(9, 2, 'ABCD Limited', 'IEC No,.', 'AL', '45', 'ABCD', 'Active', '2025-09-01 13:56:28', '2025-09-24 12:38:35', NULL, 8, NULL),
(10, 2, 'Tetra-pak india pct ltd.', 'ICE0001', 'TPIPL', '45', 'Ashok Sir', 'Active', '2025-09-01 15:54:23', '2025-11-11 17:59:46', NULL, 8, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `client_service_charges`
--

CREATE TABLE `client_service_charges` (
  `id` int(11) NOT NULL,
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
  CONSTRAINT `fk_client_service_charges_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_service_charges_client_info_id` FOREIGN KEY (`client_info_id`) REFERENCES `client_info`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_service_charges_client_bu_id` FOREIGN KEY (`client_bu_id`) REFERENCES `client_bu`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_service_charges_job_register_id` FOREIGN KEY (`job_register_id`) REFERENCES `job_register`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_service_charges_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_client_service_charges_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `client_service_charges`
--


-- --------------------------------------------------------

--
-- Table structure for table `field_treatments`
--

CREATE TABLE `fields_master` (
  `id` int(11) NOT NULL,
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
  CONSTRAINT `fk_fields_master_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_fields_master_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `field_treatments`
--


--
-- Table structure for table `gst_rates`
--

CREATE TABLE `gst_rates` (
  `id` int(11) NOT NULL,
  `sac_no` varchar(255) DEFAULT NULL,
  `sgst` varchar(255) DEFAULT NULL,
  `cgst` varchar(255) DEFAULT NULL,
  `igst` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  CONSTRAINT `fk_gst_rates_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `gst_rates`
--

INSERT INTO `gst_rates` (`id`, `sac_no`, `sgst`, `cgst`, `igst`, `created_at`, `updated_at`, `added_by`) VALUES
(1, '998311', '9', '9', '18', '2025-06-20 10:56:00', '2025-09-03 14:22:14', 2),
(2, '999998313', '2.5', '2.5', '10', '2025-06-20 12:15:14', '2025-09-05 12:25:17', 2),
(3, '996521', '2', '2', '10', '2025-06-20 12:15:30', '2025-09-04 10:17:33', 2),
(4, '83099030', '9', '9', '18', '2025-06-20 12:15:41', '2025-11-10 12:26:39', 2),
(5, '840909', '9', '9', '18', '2025-07-08 14:04:55', '2025-11-10 12:36:31', 4),
(6, '840909', '2.5', '2.5', '5', '2025-07-08 17:55:30', '2025-11-10 12:36:48', 4);

-- --------------------------------------------------------

--
-- Table structure for table `initiators`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
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
  CONSTRAINT `fk_users_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_users_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `initiators`
--

INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `password`, `mobile`, `user_role`, `authority`, `job_register_ids`, `status`, `created_at`, `updated_at`, `deleted_at`, `added_by`, `deleted_by`) VALUES
(1, 'Mahesh', 'Shirde', 'mahesh@gmail.com', 'Mahesh@123', '9168240366', 'Admin', 'Billing', NULL, 'Delete', '2025-06-20 09:57:58', NULL, '2025-06-20 12:03:27', 1, NULL),
(2, 'Ashok', 'Agrawal', 'ashok.agarwal@lucrative.co.in', '$2y$10$bIpwmPp8N7ehdw8YDmbrNuVSozDBXHlOCMgaRwfOx0TiuxaN3oyq.', '9876345843', 'Super Admin', 'Job Details, Invoicing, Payment Control', '1,2', 'Active', '2025-06-20 10:46:28', '2025-11-05 10:59:24', NULL, NULL, NULL),
(3, 'Snehal', 'Pawar', 'snehal.sapkal@lucrative.co.in', '$2y$10$2NuPTitlaNjxXB.ob5xExe1oMhDYEzA7apdAaAsSFZl9WSv3tGVIe', '8733456784', 'Admin', 'Job Details, Invoicing', '2,5', 'Active', '2025-06-20 12:05:22', '2025-09-25 10:55:07', NULL, 2, NULL),
(4, 'Rajesh', 'More', 'rajesh.more@lucrative.co.in', '$2y$10$h2ARskVtMoffO/294oqg7O5lCbkczk2nZN21LcHm/fbwHFCq5NobS', '9834567898', 'Super Admin', 'Job Details, Invoicing, Payment Control', NULL, 'Active', '2025-06-20 12:05:49', NULL, NULL, 2, NULL),
(5, 'Aniket', 'Khopade', 'iec@lucrative.co.in', '$2y$10$ZzvcqUZ.zwDE/zb7h3tsBOsO4Kwh4p.YbnZcpSed5Q978QIpIhWDS', '8762345672', 'Initiator', 'Job Details', '7,8', 'Active', '2025-06-20 12:06:23', '2025-09-25 10:54:48', NULL, 2, NULL),
(6, 'ab', 'ab', 'ab@lucrative.co.in', '$2y$10$MXaG/yMpKRjbG3EtPbkmSuaMpSSAYVhexNODShxMwZmytcds7XZxC', '1234563245', 'Super Admin', 'Job Details', NULL, 'Delete', '2025-07-08 14:44:33', NULL, '2025-07-09 17:52:32', 4, NULL),
(7, 'Yogesh', 'Deshmukh', 'yogesh.deshmukh@lucrative.co.in', '$2y$10$Cg4EPHjc2ioZK9iJVsbn3.oWnil/3kxmX4nPGMyQTr1EGGPfZmN7e', '9561001050', 'Super Admin', 'Job Details, Invoicing', '1,5', 'Active', '2025-07-09 09:57:06', '2025-09-25 10:54:57', NULL, 4, NULL),
(8, 'Haresh', 'Tathare', 'haresh.tathare@lucrative.co.in', '$2y$10$514JZdWQ1nZ/N1hJppniCOozYpCnNx/2kFoGIpDkFk/otJMolv.b2', '9890752116', 'Super Admin', 'Job Details, Invoicing, Payment Control', '2,3,5,6,8', 'Active', '2025-07-09 09:59:48', '2025-09-25 10:54:37', NULL, 4, NULL),
(9, 'Mahesh', 'Shirde', 'mahesh@gmail.com', '$2y$10$ZjYAMuVWHiOop5Pxj3TjOunpR.wdy0T.4LtNSQkH0xpNY2PWalk6e', '9876543456', 'Initiator', 'Job Details, Invoicing', '1,2,3', 'Active', '2025-09-24 16:46:13', '2025-09-25 10:54:32', NULL, 8, NULL),
(10, 'Girish', 'Chonde', 'girish@gmail.com', '$2y$10$lGuISc4co83PkckN6hyJFuTtR7IPGybTeRZjzCVDtN/M/NMTy5pay', '9876543870', 'Admin', 'Job Details, Invoicing, Payment Control', '1,2,5,8', 'Active', '2025-09-25 10:09:39', '2025-09-25 10:54:25', NULL, 8, NULL),
(11, 'User FName', 'LName', 'user@lucrative.co.in', '$2y$10$pyPUP5OfOI2jUnyVHme.KO191F91LxZS/wknS3bNfbABLQ96gTOW.', '9876543234', 'Admin', 'Job Details, Invoicing, Payment Control', '2,5,8', 'Active', '2025-09-25 10:14:54', '2025-09-25 10:54:16', NULL, 8, NULL),
(12, 'Fname', 'Lname', 'fname@gmail.com', '$2y$10$OfvJw3/s0/o8MDyxh0dMaegnr8ZzPSfQn4R1qcuuRRFWSe3hzF3De', '9876543456', 'Admin', 'Job Details, Invoicing, Payment Control', '2,5,7', 'Active', '2025-09-25 10:56:02', NULL, NULL, 8, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--
CREATE TABLE `job_service_charges` (
  `id` int(11) NOT NULL,
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
  CONSTRAINT `fk_job_service_charges_job_id` FOREIGN KEY (`job_id`) REFERENCES `job`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_service_charges_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_service_charges_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL,
  `draft_view_id` varchar(255) DEFAULT NULL,
  `performa_view_id` varchar(255) DEFAULT NULL,
  `job_register_id` int(11) DEFAULT NULL,
  `billing_type` varchar(255) DEFAULT NULL,
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
  CONSTRAINT `fk_invoices_job_register_id` FOREIGN KEY (`job_register_id`) REFERENCES `job_register`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_canceled_by` FOREIGN KEY (`canceled_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_performa_created_by` FOREIGN KEY (`performa_created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_invoices_performa_canceled_by` FOREIGN KEY (`performa_canceled_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `invoice_selected_jobs` (
  `id` int(11) NOT NULL,
  `invoice_id` int(11) DEFAULT NULL,
  CONSTRAINT `fk_invoice_selected_jobs_invoice_id` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  CONSTRAINT `fk_invoice_selected_jobs_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `invoices`
--

-- --------------------------------------------------------

--
-- Table structure for table `invoices_annexure`
--

CREATE TABLE `invoice_annexure` (
  `id` int(11) NOT NULL,
  `invoice_id` int(11) DEFAULT NULL,
  CONSTRAINT `fk_invoice_annexure_invoice_id` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
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
  CONSTRAINT `fk_invoice_annexure_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_invoice_annexure_canceled_by` FOREIGN KEY (`canceled_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job`
--

CREATE TABLE `job` (
  `id` int(11) NOT NULL,
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
  `invoice_type` enum('full_invoice','partial_invoice') DEFAULT NULL,
  `form_field_json_data` text DEFAULT NULL,
  `job_id_status` enum('Active','InActive','Delete') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  CONSTRAINT `fk_job_job_register_id` FOREIGN KEY (`job_register_id`) REFERENCES `job_register`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_job_register_field_id` FOREIGN KEY (`job_register_field_id`) REFERENCES `job_register_fields`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `job`
--


-- --------------------------------------------------------

--
-- Table structure for table `job_attachment`
--

CREATE TABLE `job_attachment` (
  `id` int(11) NOT NULL,
  `job_id` int(11) NOT NULL,
  `attachment_type` varchar(255) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `status` enum('Active','InActive','Delete') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  CONSTRAINT `fk_job_attachment_job_id` FOREIGN KEY (`job_id`) REFERENCES `job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_job_attachment_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_attachment_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_register`
--

CREATE TABLE `job_register` (
  `id` int(11) NOT NULL,
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
  CONSTRAINT `fk_job_register_gst_rate_id` FOREIGN KEY (`gst_rate_id`) REFERENCES `gst_rates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_register_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_register_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `job_register`
--

---------------------------------------------------

--
-- Table structure for table `job_register_fields`
--

CREATE TABLE `job_register_fields` (
  `id` int(11) NOT NULL,
  `job_register_id` int(11) DEFAULT NULL,
  `form_fields_json` text DEFAULT NULL,
  `status` enum('In-process','Closed') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  CONSTRAINT `fk_job_register_fields_job_register_id` FOREIGN KEY (`job_register_id`) REFERENCES `job_register`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_register_fields_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_register_fields_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `job_register_fields`
--


-- --------------------------------------------------------

--
-- Table structure for table `job_reports`
--

CREATE TABLE `job_reports` (
  `id` int(11) NOT NULL,
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
  CONSTRAINT `fk_job_reports_added_by` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_reports_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `job_reports`
--

-- --------------------------------------------------------

--
-- Table structure for table `state`
--

CREATE TABLE `state` (
  `id` int(11) NOT NULL,
  `state_name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `state`
--

INSERT INTO `state` (`id`, `state_name`) VALUES
(1, 'Andhra Pradesh'),
(2, 'Arunachal Pradesh'),
(3, 'Assam'),
(4, 'Bihar'),
(5, 'Chhattisgarh'),
(6, 'Goa'),
(7, 'Gujarat'),
(8, 'Haryana'),
(9, 'Himachal Pradesh'),
(10, 'Jharkhand'),
(11, 'Karnataka'),
(12, 'Kerala'),
(13, 'Madhya Pradesh'),
(14, 'Maharashtra'),
(15, 'Manipur'),
(16, 'Meghalaya'),
(17, 'Mizoram'),
(18, 'Nagaland'),
(19, 'Odisha'),
(20, 'Punjab'),
(21, 'Rajasthan'),
(22, 'Sikkim'),
(23, 'Tamil Nadu'),
(24, 'Telangana'),
(25, 'Tripura'),
(26, 'Uttar Pradesh'),
(27, 'Uttarakhand'),
(28, 'West Bengal');

-- --------------------------------------------------------

--
-- Table structure for table `user_settings`
--

CREATE TABLE `user_settings` (
  `user_id` int(11) NOT NULL,
  `font` varchar(100) DEFAULT NULL,
  `theme` varchar(100) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  CONSTRAINT `fk_user_settings_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

