# Database Migrations

This directory contains SQL migration files for the EXIM Invoicing System 2.0 database schema.

## Migration Files

- `001_create_schema_with_indexes.sql` - Creates all database tables with optimized indexes
- `002_seed_data.sql` - Inserts initial seed data (states, etc.)

## Running Migrations

### Option 1: Using npm script (Recommended)

```bash
npm run migrate
```

This will use your `.env` file configuration to connect to the database.

### Option 2: Using Node.js script directly

```bash
node scripts/run_migration.js
```

### Option 3: Using MySQL command line

If you have direct MySQL/MariaDB access:

```bash
# With password
mysql -u root -p < migrations/001_create_schema_with_indexes.sql
mysql -u root -p < migrations/002_seed_data.sql

# Without password (if configured)
mysql -u root < migrations/001_create_schema_with_indexes.sql
mysql -u root < migrations/002_seed_data.sql
```

### Option 4: Using the shell script

```bash
./scripts/run_migration.sh [database_name] [username] [password]
```

Example:
```bash
./scripts/run_migration.sh exim_invoicing root your_password
```

## Environment Variables

Make sure your `.env` file has the following variables:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=exim_invoicing
```

## Indexes Added

The migration includes optimized indexes for:

- **Primary Keys**: All tables have AUTO_INCREMENT primary keys
- **Foreign Keys**: All foreign key columns are indexed for better join performance
- **Status Columns**: Indexed for filtering active/inactive records
- **Date Columns**: Created_at, updated_at columns indexed for date range queries
- **Search Columns**: Email, names, codes, numbers indexed for faster lookups
- **Unique Constraints**: Email in users table

## Tables Created

1. `state` - Indian states master data
2. `users` - User accounts and authentication
3. `gst_rates` - GST rate configurations
4. `accounts` - Company/account information
5. `client_info` - Client information
6. `client_bu` - Client business units
7. `job_register` - Job type registrations
8. `job_register_fields` - Dynamic form fields for jobs
9. `job` - Individual job records
10. `job_attachment` - Job file attachments
11. `job_service_charges` - Service charges for jobs
12. `client_service_charges` - Service charges for clients
13. `invoices` - Invoice records
14. `invoice_selected_jobs` - Jobs linked to invoices
15. `invoice_annexure` - Invoice annexure details
16. `fields_master` - Master field definitions
17. `job_reports` - Saved report configurations
18. `user_settings` - User preferences

## Notes

- All tables use `utf8mb4` character set for proper Unicode support
- Foreign keys use `ON DELETE SET NULL` and `ON UPDATE CASCADE` for referential integrity
- Soft delete pattern is implemented using `deleted_at` columns
- Audit trail columns (`added_by`, `deleted_by`, `created_at`, `updated_at`) are included in most tables

