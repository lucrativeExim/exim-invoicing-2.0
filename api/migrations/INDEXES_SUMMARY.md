# Database Indexes Summary

This document lists all indexes added to optimize database performance.

## Index Categories

### 1. Primary Key Indexes (Auto-created)
All tables have AUTO_INCREMENT primary keys which are automatically indexed:
- `accounts.id`
- `client_info.id`
- `client_bu.id`
- `client_service_charges.id`
- `fields_master.id`
- `gst_rates.id`
- `invoice_annexure.id`
- `invoice_selected_jobs.id`
- `invoices.id`
- `job.id`
- `job_attachment.id`
- `job_register.id`
- `job_register_fields.id`
- `job_reports.id`
- `job_service_charges.id`
- `state.id`
- `users.id`

### 2. Foreign Key Indexes
All foreign key columns are indexed for optimal join performance:

#### users table
- `idx_added_by` on `added_by`
- `idx_deleted_by` on `deleted_by`

#### accounts table
- `idx_added_by` on `added_by`
- `idx_deleted_by` on `deleted_by`

#### client_info table
- `idx_account_id` on `account_id`
- `idx_added_by` on `added_by`
- `idx_deleted_by` on `deleted_by`

#### client_bu table
- `idx_client_info_id` on `client_info_id`
- `idx_state_id` on `state_id`
- `idx_added_by` on `added_by`
- `idx_deleted_by` on `deleted_by`

#### gst_rates table
- `idx_added_by` on `added_by`

#### job_register table
- `idx_gst_rate_id` on `gst_rate_id`
- `idx_added_by` on `added_by`
- `idx_deleted_by` on `deleted_by`

#### job_register_fields table
- `idx_job_register_id` on `job_register_id`
- `idx_added_by` on `added_by`
- `idx_updated_by` on `updated_by`

#### job table
- `idx_job_register_id` on `job_register_id`
- `idx_job_register_field_id` on `job_register_field_id`
- `idx_added_by` on `added_by`
- `idx_deleted_by` on `deleted_by`

#### job_attachment table
- `idx_job_id` on `job_id`
- `idx_added_by` on `added_by`
- `idx_deleted_by` on `deleted_by`

#### job_service_charges table
- `idx_job_id` on `job_id`
- `idx_added_by` on `added_by`
- `idx_deleted_by` on `deleted_by`

#### client_service_charges table
- `idx_account_id` on `account_id`
- `idx_client_info_id` on `client_info_id`
- `idx_client_bu_id` on `client_bu_id`
- `idx_job_register_id` on `job_register_id`
- `idx_added_by` on `added_by`
- `idx_deleted_by` on `deleted_by`

#### invoices table
- `idx_job_register_id` on `job_register_id`
- `idx_added_by` on `added_by`
- `idx_canceled_by` on `canceled_by`
- `idx_performa_created_by` on `performa_created_by`
- `idx_performa_canceled_by` on `performa_canceled_by`

#### invoice_selected_jobs table
- `idx_invoice_id` on `invoice_id`
- `idx_created_by` on `created_by`

#### invoice_annexure table
- `idx_invoice_id` on `invoice_id`
- `idx_created_by` on `created_by`
- `idx_canceled_by` on `canceled_by`

#### fields_master table
- `idx_added_by` on `added_by`
- `idx_deleted_by` on `deleted_by`

#### job_reports table
- `idx_added_by` on `added_by`
- `idx_deleted_by` on `deleted_by`

### 3. Status Column Indexes
Indexed for filtering active/inactive/deleted records:
- `users.status`
- `accounts.status`
- `client_info.status`
- `client_bu.status`
- `job_register.status`
- `job.status`
- `job.job_id_status`
- `job_attachment.status`
- `job_service_charges.status`
- `client_service_charges.status`
- `invoices.status`
- `invoices.invoice_status`
- `invoices.invoice_stage_status`
- `fields_master.status`
- `job_reports.job_status`

### 4. Search/Lookup Indexes
Indexed for faster searches and lookups:

#### users table
- `idx_email` (UNIQUE) on `email` - For user authentication
- `idx_user_role` on `user_role` - For role-based queries
- `idx_mobile` on `mobile` - For mobile number lookups

#### accounts table
- `idx_account_name` on `account_name` - For account name searches
- `idx_gst_no` on `gst_no` - For GST number lookups
- `idx_pan_no` on `pan_no` - For PAN number lookups

#### client_info table
- `idx_client_name` on `client_name` - For client name searches
- `idx_iec_no` on `iec_no` - For IEC number lookups
- `idx_alias` on `alias` - For alias searches

#### client_bu table
- `idx_bu_name` on `bu_name` - For BU name searches
- `idx_client_type` on `client_type` - For filtering by client type
- `idx_gst_no` on `gst_no` - For GST number lookups

#### job_register table
- `idx_job_code` on `job_code` - For job code lookups
- `idx_job_title` on `job_title` - For job title searches
- `idx_job_type` on `job_type` - For filtering by job type

#### job table
- `idx_job_no` on `job_no` - For job number lookups
- `idx_po_no` on `po_no` - For PO number searches
- `idx_claim_no` on `claim_no` - For claim number lookups

#### invoices table
- `idx_draft_view_id` on `draft_view_id` - For draft invoice lookups
- `idx_performa_view_id` on `performa_view_id` - For performa invoice lookups
- `idx_po_no` on `po_no` - For PO number searches
- `idx_irn_no` on `irn_no` - For IRN number lookups

#### invoice_annexure table
- `idx_inv_ref_dbk_claim_no` on `inv_ref_dbk_claim_no` - For claim number lookups

#### fields_master table
- `idx_field_name` on `field_name` - For field name searches
- `idx_field_type` on `field_type` - For filtering by field type

#### job_reports table
- `idx_report_name` on `report_name` - For report name searches

#### state table
- `idx_state_name` on `state_name` - For state name searches

#### gst_rates table
- `idx_sac_no` on `sac_no` - For SAC number lookups

#### job_attachment table
- `idx_attachment_type` on `attachment_type` - For filtering by attachment type

#### job_service_charges table
- `idx_group_id` on `group_id` - For grouping charges
- `idx_gst_no` on `gst_no` - For GST number lookups
- `idx_gst_type` on `gst_type` - For filtering by GST type

#### client_service_charges table
- `idx_group_id` on `group_id` - For grouping charges

### 5. Date Column Indexes
Indexed for date range queries and sorting:

#### Common date indexes
- `idx_created_at` - On all tables with `created_at` column
- `idx_updated_at` - Where applicable

#### job table (specific date indexes)
- `idx_job_date` on `job_date`
- `idx_application_date` on `application_date`
- `idx_submission_date` on `submission_date`

### 6. Boolean/Enum Indexes
Indexed for filtering:

#### job table
- `idx_invoice_type` on `invoice_type` - For filtering jobs by invoice type

## Performance Benefits

These indexes provide:

1. **Faster Joins**: Foreign key indexes speed up JOIN operations
2. **Quick Filtering**: Status and enum indexes enable fast WHERE clause filtering
3. **Efficient Searches**: Search column indexes improve LIKE and exact match queries
4. **Date Range Queries**: Date indexes optimize BETWEEN and comparison queries
5. **Unique Constraints**: Email unique index prevents duplicates and speeds up lookups
6. **Sorting**: Indexes help ORDER BY operations perform better

## Index Maintenance

- Indexes are automatically maintained by MySQL/MariaDB
- Monitor index usage with `SHOW INDEX FROM table_name`
- Use `EXPLAIN` to verify index usage in queries
- Consider adding composite indexes for frequently combined WHERE clauses

## Notes

- All indexes use the default B-tree structure (InnoDB default)
- Index names follow the pattern `idx_column_name` for single columns
- Foreign key indexes are automatically created but explicitly named for clarity
- Unique indexes are used where data integrity requires uniqueness (e.g., email)

