# Database Migration Guide

This guide explains the proper process for making database schema changes (adding/modifying columns, adding/deleting tables) in this project.

## Overview

This project uses **Prisma ORM** for database management. There are two approaches:

1. **Prisma Migrations** (Recommended) - Automatic, type-safe migrations
2. **Manual SQL Migrations** - For complex migrations or when Prisma can't handle it

## ⚠️ Important: Never Manually Modify the Database

**DO NOT:**
- ❌ Manually add columns via MySQL CLI or phpMyAdmin
- ❌ Manually modify column types directly in the database
- ❌ Manually create/drop tables without migrations

**DO:**
- ✅ Always modify `schema.prisma` first
- ✅ Use Prisma migrations to apply changes
- ✅ Use manual SQL migrations only for complex cases

---

## 🎯 Recommended Process: Prisma Migrations

### Step 1: Modify the Schema

Edit `api/prisma/schema.prisma` to reflect your desired changes:

```prisma
// Example: Adding a new column
model Job {
  id              Int       @id @default(autoincrement())
  // ... existing fields
  new_field       String?   @db.VarChar(255)  // NEW FIELD
  invoice_type    InvoiceType?  // Existing field
}

// Example: Modifying a column
model Job {
  // Change from String? to required String
  job_no          String    @db.VarChar(255)  // Removed ? to make required
}

// Example: Adding a new table
model NewTable {
  id              Int       @id @default(autoincrement())
  name            String?   @db.VarChar(255)
  created_at      DateTime? @default(now()) @db.DateTime(0)
  
  @@map("new_table")
}

// Example: Adding a new enum
enum NewStatus {
  Active
  InActive
  Pending
}
```

### Step 2: Create and Apply Migration

**PowerShell (Windows):**
```powershell
cd api
npx prisma migrate dev --name add_new_field_to_job
```

**Bash/Linux/Mac:**
```bash
cd api
npx prisma migrate dev --name add_new_field_to_job
```

This command will:
1. ✅ Create a migration file in `api/prisma/migrations/`
2. ✅ Apply the migration to your database
3. ✅ Regenerate Prisma Client automatically

### Step 3: Verify the Migration

Check that the migration was created:
```powershell
# View migration files
ls api/prisma/migrations/
```

The migration file will be in: `api/prisma/migrations/YYYYMMDDHHMMSS_add_new_field_to_job/migration.sql`

### Step 4: Update Your Code

After migration, update your models/routes to use the new field:

```javascript
// In your model file (e.g., api/models/Job.js)
async create(data) {
  const { new_field, ...otherFields } = data;
  
  return await prisma.job.create({
    data: {
      ...otherFields,
      new_field: new_field || null,
    },
  });
}
```

---

## 📋 Common Migration Scenarios

### Scenario 1: Adding a New Column

**1. Edit `schema.prisma`:**
```prisma
model Job {
  id              Int       @id @default(autoincrement())
  // ... existing fields
  new_column      String?   @db.VarChar(255)  // Add this
}
```

**2. Create migration:**
```powershell
cd api
npx prisma migrate dev --name add_new_column_to_job
```

**3. Done!** Prisma handles everything automatically.

---

### Scenario 2: Modifying a Column Type

**1. Edit `schema.prisma`:**
```prisma
model Job {
  // Change from String? to Int?
  quantity        Int?      // Was: String? @db.VarChar(255)
}
```

**2. Create migration:**
```powershell
cd api
npx prisma migrate dev --name change_quantity_to_int
```

**⚠️ Warning:** If you have existing data, Prisma may warn you. You may need to:
- Create a manual SQL migration for data transformation
- Or use `prisma migrate dev --create-only` to create migration without applying, then edit it

---

### Scenario 3: Adding a New Table

**1. Edit `schema.prisma`:**
```prisma
model NewTable {
  id              Int       @id @default(autoincrement())
  name            String?   @db.VarChar(255)
  status          NewStatus?
  created_at      DateTime? @default(now()) @db.DateTime(0)
  
  @@index([status], name: "idx_status")
  @@map("new_table")
}

enum NewStatus {
  Active
  InActive
}
```

**2. Create migration:**
```powershell
cd api
npx prisma migrate dev --name create_new_table
```

---

### Scenario 4: Deleting a Column

**1. Edit `schema.prisma`:**
```prisma
model Job {
  id              Int       @id @default(autoincrement())
  // Remove the field you want to delete
  // old_field      String?   @db.VarChar(255)  // DELETE THIS LINE
}
```

**2. Create migration:**
```powershell
cd api
npx prisma migrate dev --name remove_old_field_from_job
```

**⚠️ Warning:** This will permanently delete the column and all its data. Make sure you have backups!

---

### Scenario 5: Deleting a Table

**1. Edit `schema.prisma`:**
```prisma
// Remove the entire model block
// model OldTable {
//   ...
// }
```

**2. Create migration:**
```powershell
cd api
npx prisma migrate dev --name drop_old_table
```

**⚠️ Warning:** This will permanently delete the table and all its data!

---

### Scenario 6: Adding/Modifying Indexes

**1. Edit `schema.prisma`:**
```prisma
model Job {
  id              Int       @id @default(autoincrement())
  job_no          String?   @db.VarChar(255)
  // ... other fields
  
  @@index([job_no], name: "idx_job_no")  // Add or modify index
  @@index([status, invoice_type], name: "idx_status_invoice_type")  // Composite index
}
```

**2. Create migration:**
```powershell
cd api
npx prisma migrate dev --name add_indexes_to_job
```

---

## 🔧 Alternative: Manual SQL Migrations

Use manual SQL migrations **only** when:
- Prisma can't handle the migration automatically
- You need complex data transformations
- You need to migrate data between columns
- You need custom SQL that Prisma doesn't support

### Process for Manual SQL Migrations

**1. Create SQL file:**
```powershell
# Create file: api/migrations/012_your_migration_name.sql
```

**2. Write your SQL:**
```sql
-- Migration: Description of what this does
-- This migration:
-- 1. Does this
-- 2. Does that

ALTER TABLE `job` 
ADD COLUMN `new_field` varchar(255) DEFAULT NULL AFTER `existing_field`;

-- Add index
ALTER TABLE `job` ADD INDEX `idx_new_field` (`new_field`);
```

**3. Run the migration:**
```powershell
cd api
node scripts/run_single_migration.js 012_your_migration_name.sql
```

**4. Update `schema.prisma` to match:**
```prisma
model Job {
  // ... existing fields
  new_field       String?   @db.VarChar(255)  // Add to match database
}
```

**5. Regenerate Prisma Client:**
```powershell
cd api
npx prisma generate
```

---

## 📝 Migration Naming Convention

Use descriptive names that explain what the migration does:

**Good names:**
- `add_invoice_type_to_job`
- `change_quantity_to_int`
- `create_user_preferences_table`
- `add_index_on_job_no`

**Bad names:**
- `migration1`
- `update`
- `fix`
- `changes`

---

## 🚀 Complete Workflow Example

Let's say you want to add a `priority` field to the `Job` table:

### Step 1: Edit Schema
```prisma
// api/prisma/schema.prisma
model Job {
  id              Int       @id @default(autoincrement())
  // ... existing fields
  priority        JobPriority?  // NEW FIELD
  // ... rest of fields
}

enum JobPriority {
  Low
  Medium
  High
  Urgent
}
```

### Step 2: Create Migration
```powershell
cd api
npx prisma migrate dev --name add_priority_to_job
```

Output:
```
✔ Created migration: 20250102120000_add_priority_to_job
✔ Applied migration: 20250102120000_add_priority_to_job
✔ Generated Prisma Client
```

### Step 3: Update Model Code
```javascript
// api/models/Job.js
async create(data) {
  const { priority, ...otherFields } = data;
  
  return await prisma.job.create({
    data: {
      ...otherFields,
      priority: priority || null,
    },
  });
}
```

### Step 4: Test
```javascript
// Test creating a job with priority
const job = await Job.create({
  // ... other fields
  priority: 'High',
});
```

---

## ⚠️ Important Notes

### Before Making Changes

1. **Backup your database** (especially in production)
2. **Test in development first**
3. **Review the generated migration SQL** before applying

### After Making Changes

1. **Regenerate Prisma Client** if you used manual SQL:
   ```powershell
   npx prisma generate
   ```

2. **Update your code** to use the new fields

3. **Test thoroughly** before deploying to production

### Production Deployments

For production, use:
```powershell
npx prisma migrate deploy
```

This applies pending migrations without prompting for a migration name.

---

## 🔍 Troubleshooting

### Error: "Migration failed"

1. Check the error message
2. Review the generated migration SQL
3. Fix the schema and try again
4. If needed, manually fix the database and update schema

### Error: "Column already exists"

You may have manually added the column. Options:
1. Remove it from the database and use Prisma migration
2. Or update `schema.prisma` to match existing database, then use `prisma db pull` to sync

### Error: "Can't modify column type"

For complex type changes:
1. Use `prisma migrate dev --create-only` to create migration without applying
2. Edit the migration SQL file manually
3. Apply with `prisma migrate deploy`

### Schema Out of Sync

If your database and schema don't match:
```powershell
# Pull current database structure into schema
npx prisma db pull

# Review changes, then generate client
npx prisma generate
```

---

## 📚 Additional Resources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- Project-specific: `api/migrations/README.md`

---

## ✅ Checklist for Every Migration

- [ ] Modified `api/prisma/schema.prisma`
- [ ] Created migration with `npx prisma migrate dev --name <descriptive_name>`
- [ ] Migration applied successfully
- [ ] Prisma Client regenerated
- [ ] Updated model files to use new fields
- [ ] Updated route handlers if needed
- [ ] Tested the changes
- [ ] Committed migration files to version control

---

## 🎓 Best Practices

1. **Always modify schema.prisma first** - Never modify the database directly
2. **Use descriptive migration names** - Future you will thank you
3. **Test migrations in development** - Before applying to production
4. **Review generated SQL** - Especially for complex changes
5. **Keep migrations small** - One logical change per migration
6. **Never delete migration files** - They're part of your version history
7. **Document complex migrations** - Add comments in SQL files
8. **Backup before production migrations** - Always!

---

## Quick Reference Commands

```powershell
# Create and apply migration
npx prisma migrate dev --name <migration_name>

# Create migration without applying (edit first)
npx prisma migrate dev --create-only --name <migration_name>

# Apply pending migrations (production)
npx prisma migrate deploy

# Regenerate Prisma Client
npx prisma generate

# Pull database structure into schema
npx prisma db pull

# View migration status
npx prisma migrate status

# Reset database (development only - deletes all data!)
npx prisma migrate reset
```

---

**Remember:** The schema file (`schema.prisma`) is the source of truth. Always modify it first, then let Prisma handle the database changes!

