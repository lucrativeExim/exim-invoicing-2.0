# Migration Quick Reference Card

## 🚀 Standard Workflow (Recommended)

### Adding/Modifying Columns or Tables

```powershell
# 1. Edit schema.prisma
# 2. Create and apply migration
cd api
npx prisma migrate dev --name descriptive_migration_name

# That's it! Prisma handles everything automatically
```

---

## 📋 Common Commands

| Task | Command |
|------|---------|
| **Create migration** | `npx prisma migrate dev --name <name>` |
| **Apply migrations (prod)** | `npx prisma migrate deploy` |
| **Regenerate client** | `npx prisma generate` |
| **View migration status** | `npx prisma migrate status` |
| **Pull DB to schema** | `npx prisma db pull` |
| **Format schema** | `npx prisma format` |

---

## ⚠️ Never Do This

❌ **Don't manually modify database** (MySQL CLI, phpMyAdmin)  
❌ **Don't skip schema.prisma** - Always edit it first  
❌ **Don't delete migration files** - They're version history  

---

## ✅ Always Do This

✅ **Edit schema.prisma first**  
✅ **Use descriptive migration names**  
✅ **Test in development first**  
✅ **Backup before production**  

---

## 🔧 Manual SQL Migration (When Needed)

```powershell
# 1. Create SQL file: api/migrations/XXX_description.sql
# 2. Run it:
cd api
node scripts/run_single_migration.js XXX_description.sql

# 3. Update schema.prisma to match
# 4. Regenerate client:
npx prisma generate
```

---

## 📝 Migration Examples

### Add Column
```prisma
model Job {
  new_field String? @db.VarChar(255)
}
```
→ `npx prisma migrate dev --name add_new_field_to_job`

### Modify Column
```prisma
model Job {
  quantity Int?  // Was: String?
}
```
→ `npx prisma migrate dev --name change_quantity_to_int`

### Add Table
```prisma
model NewTable {
  id Int @id @default(autoincrement())
  name String? @db.VarChar(255)
  @@map("new_table")
}
```
→ `npx prisma migrate dev --name create_new_table`

### Delete Column
Remove from schema.prisma → `npx prisma migrate dev --name remove_field`

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| File lock error | Close Node.js processes, try again |
| Column exists | Remove from DB or update schema to match |
| Type change fails | Use `--create-only`, edit SQL manually |
| Schema out of sync | Run `npx prisma db pull` |

---

**Full Guide:** See `DATABASE_MIGRATION_GUIDE.md` for detailed instructions.

