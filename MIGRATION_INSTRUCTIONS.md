# Migration Instructions: Invoice Ready to Invoice Type

## Issue
The database column `invoice_type` doesn't exist yet, causing Prisma errors when trying to create/update jobs.

## Solution: Run the Migration

### Step 1: Run the Migration Script

**Option A: Using MySQL Command Line (Recommended)**
```bash
# Navigate to the api directory
cd api

# Run the migration (replace with your database credentials)
mysql -u your_username -p your_database_name < migrations/009_migrate_invoice_ready_to_invoice_type.sql
```

**Option B: If you have an existing database with `invoice_ready` column:**
The migration script will:
1. Add the new `invoice_type` column
2. Migrate existing data from `invoice_ready` to `invoice_type`
3. Drop the old `invoice_ready` column and index
4. Create the new `invoice_type` index

**Option C: If you're creating a fresh database:**
The updated schema in `001_create_schema_with_indexes.sql` already includes `invoice_type`, so just run your normal migration.

### Step 2: Regenerate Prisma Client

After running the migration, regenerate the Prisma client:

```bash
cd api
npx prisma generate
```

### Step 3: Restart Your Server

Restart your Node.js server to pick up the new Prisma client.

## Verification

After running the migration, verify the column exists:

```sql
DESCRIBE job;
-- or
SHOW COLUMNS FROM job LIKE 'invoice_type';
```

You should see:
- Column: `invoice_type`
- Type: `enum('full_invoice','partial_invoice')`

## What the Migration Does

1. **Adds** `invoice_type` column with enum('full_invoice','partial_invoice')
2. **Migrates** existing data:
   - `invoice_ready='true'` + `status='Closed'` → `invoice_type='full_invoice'`
   - `invoice_ready='true'` + `status='In-process'` → `invoice_type='partial_invoice'`
   - `invoice_ready='false'` or NULL → `invoice_type=NULL`
3. **Drops** old `invoice_ready` column and `idx_invoice_ready` index
4. **Creates** new `idx_invoice_type` index

## Troubleshooting

If you get errors:
- Make sure you have the correct database credentials
- Ensure you have permission to ALTER the `job` table
- Check that the `job` table exists
- Verify the migration script path is correct







