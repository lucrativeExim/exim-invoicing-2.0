# Data Copy Script - Copy Data from exim_invoicing to leo_munimji

This script copies data from the `exim_invoicing` database to the `leo_munimji` database for the following tables:

- `state`
- `gst_rates`
- `accounts`
- `client_info`
- `client_bu`
- `client_service_charges`
- `fields_master`

## Features

- ✅ Copies data in the correct order (respecting foreign key dependencies)
- ✅ Handles duplicate records (uses INSERT IGNORE)
- ✅ Validates and cleans foreign key references
- ✅ Sets foreign keys to null if referenced records don't exist
- ✅ Provides detailed progress reporting
- ✅ Error handling and recovery

## Prerequisites

1. Both databases (`exim_invoicing` and `leo_munimji`) must exist
2. The target database (`leo_munimji`) must have all tables created (run migrations first)
3. Database credentials must be configured in `.env` file

## Usage

### Option 1: Using npm script (Recommended)

```bash
cd api
npm run copy:data
```

### Option 2: Direct execution

```bash
cd api
node scripts/copy_data_from_exim.js
```

## How It Works

1. **Connects to both databases** using credentials from `.env`
2. **Copies tables in order**:
   - `state` (no dependencies)
   - `gst_rates` (depends on users)
   - `accounts` (depends on users)
   - `client_info` (depends on accounts and users)
   - `client_bu` (depends on client_info, state, and users)
   - `client_service_charges` (depends on account, client_info, client_bu, job_register, and users)
   - `fields_master` (depends on users)

3. **For each table**:
   - Checks if table exists in source
   - Reads all rows from source
   - Validates foreign key references
   - Cleans foreign keys (sets to null if referenced record doesn't exist)
   - Inserts data using `INSERT IGNORE` to avoid duplicates
   - Reports progress and statistics

## Foreign Key Handling

The script automatically handles foreign key references:

- **User references** (`added_by`, `deleted_by`): If the user doesn't exist in target, the FK is set to `null`
- **Account references**: If the account doesn't exist in target, the FK is set to `null`
- **Client Info references**: If the client_info doesn't exist in target, the FK is set to `null`
- **State references**: If the state doesn't exist in target, the FK is set to `null`
- **Job Register references**: If the job_register doesn't exist in target, the FK is set to `null`

This ensures data integrity while allowing partial data migration.

## Output Example

```
🚀 Starting data copy from exim_invoicing to leo_munimji...

📊 Database Configuration:
   Host: localhost
   User: root
   Source DB: exim_invoicing
   Target DB: leo_munimji

🔗 Connecting to source database 'exim_invoicing'...
✅ Connected to source database

🔗 Connecting to target database 'leo_munimji'...
✅ Connected to target database

📋 Copying table: state
   📥 Found 36 rows in source table
   ⏳ Progress: 36/36 rows processed...
   ✅ Completed:
      - 36 rows inserted
      - 0 rows skipped (duplicates or errors)

📋 Copying table: gst_rates
   📥 Found 15 rows in source table
   🔍 Validating foreign key references...
   ⏳ Progress: 15/15 rows processed...
   ✅ Completed:
      - 15 rows inserted
      - 0 rows skipped (duplicates or errors)
      - 2 rows had foreign keys set to null (referenced records don't exist)

...

✅ Data copy completed successfully!

📊 Summary:
   Tables copied: 7
   Tables: state, gst_rates, accounts, client_info, client_bu, client_service_charges, fields_master
```

## Troubleshooting

### Error: Table doesn't exist

**Solution**: Make sure you've run migrations on the target database first:
```bash
npm run setup:db
```

### Error: Foreign key constraint failed

The script automatically handles this by setting foreign keys to null. If you see many warnings about foreign keys, it means:
- Referenced records (like users) don't exist in the target database
- This is expected if you're only copying specific tables

### Error: Connection refused

**Solution**: Check your `.env` file and ensure:
- MySQL server is running
- Database credentials are correct
- Both databases exist

### Duplicate entry errors

The script uses `INSERT IGNORE` to handle duplicates. If you see "skipped" rows, they are likely duplicates that already exist in the target database.

## Notes

- The script uses `INSERT IGNORE` to avoid duplicate key errors
- Foreign keys are automatically cleaned (set to null) if referenced records don't exist
- The script processes data in batches of 100 rows for better performance
- Progress is shown in real-time for each table

## Safety

- The script only **reads** from the source database (no data is modified)
- The script uses `INSERT IGNORE` so existing data in target won't be overwritten
- You can run the script multiple times safely (it will skip duplicates)

