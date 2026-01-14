# Fix for invoice_type Column Issue

## Problem
After manually adding the `invoice_type` column to the database, data insertion is failing. This is likely because:
1. The column was added as VARCHAR/TEXT instead of ENUM type
2. The Prisma client is out of sync with the database schema

## Solution

### Step 1: Run the Migration
Run the migration file to fix the column type:

**For PowerShell (Windows):**
```powershell
# Option 1: Using single migration script (Recommended - runs only this migration)
cd api
node scripts/run_single_migration.js 011_fix_invoice_type_column.sql

# Option 2: Using MySQL CLI with PowerShell
Get-Content api/migrations/011_fix_invoice_type_column.sql | mysql -u root -p

# Option 3: Direct MySQL command (if MySQL is in PATH)
mysql -u root -p -e "source api/migrations/011_fix_invoice_type_column.sql"
```

**For Bash/Linux/Mac:**
```bash
# Option 1: Using MySQL CLI
mysql -u root -p < api/migrations/011_fix_invoice_type_column.sql

# Option 2: Using the migration script
cd api
node scripts/run_migration.js
```

This migration will:
- Convert the `invoice_type` column to ENUM type with values: `'full_invoice'`, `'partial_invoice'`
- Ensure the index `idx_invoice_type` exists

### Step 2: Regenerate Prisma Client
After running the migration, regenerate the Prisma client:

**Important**: Close any running Node.js servers/processes first, then run:

```powershell
cd api
npx prisma generate
```

**If you get a file lock error (EPERM)**:
1. **Close all Node.js processes** (stop your API server, close any terminals running Node)
2. Wait a few seconds
3. Run `npx prisma generate` again
4. If it still fails, you may need to restart your computer or kill the process manually:
   ```powershell
   # Find Node processes
   Get-Process node
   
   # Kill all Node processes (use with caution)
   Stop-Process -Name node -Force
   ```

### Step 3: Verify the Fix
Check that the column is now an ENUM type:

```sql
SHOW COLUMNS FROM job WHERE Field = 'invoice_type';
```

You should see `Type: enum('full_invoice','partial_invoice')`

### Step 4: Test Data Insertion
Try inserting a job record with `invoice_type` set to either `'full_invoice'` or `'partial_invoice'` (or `null`).

## What the Migration Does

The migration file (`011_fix_invoice_type_column.sql`) will:
1. Modify the `invoice_type` column to be an ENUM type with the correct values
2. Create the index if it doesn't exist
3. Preserve any existing data that matches the enum values

## Important Notes

- **Valid enum values**: `'full_invoice'` or `'partial_invoice'` (or `null`)
- The column is nullable, so you can insert `null` if needed
- Make sure your application code uses these exact enum values when inserting data

## If Issues Persist

If data insertion still fails after running the migration:

1. **Check the error message**: Look at the exact error from Prisma/MySQL
2. **Verify enum values**: Ensure you're using `'full_invoice'` or `'partial_invoice'` (not `'Full_Invoice'` or other variations)
3. **Check Prisma client**: Make sure `npx prisma generate` completed successfully
4. **Restart your server**: After regenerating Prisma client, restart your Node.js server

## Example Usage

```javascript
// Correct usage
await prisma.job.create({
  data: {
    // ... other fields
    invoice_type: 'full_invoice',  // or 'partial_invoice' or null
  }
});
```

