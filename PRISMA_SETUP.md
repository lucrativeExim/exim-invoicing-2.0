# Prisma ORM Setup Guide

This guide explains how to set up and use Prisma ORM for the EXIM Invoicing System backend.

## Overview

Prisma is now the primary ORM for database operations. The MySQL connection pool is kept only for migration scripts.

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

   This installs:
   - `@prisma/client` - Prisma Client for database queries
   - `prisma` - Prisma CLI (dev dependency)

## Configuration

1. **Set up environment variables:**

   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="mysql://exim_user:your_password@localhost:3306/exim_invoicing"
   DB_HOST=localhost
   DB_USER=exim_user
   DB_PASSWORD=your_password
   DB_NAME=exim_invoicing
   JWT_SECRET=your-secret-key-change-in-production
   PORT=3000
   ```

   The `DATABASE_URL` format is: `mysql://USER:PASSWORD@HOST:PORT/DATABASE`

2. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

   This reads the `prisma/schema.prisma` file and generates the Prisma Client.

## Prisma Schema

The schema file is located at `prisma/schema.prisma` and includes all database models:

- **User** - User accounts and authentication
- **State** - Indian states master data
- **GstRate** - GST rate configurations
- **Account** - Company/account information
- **ClientInfo** - Client information
- **ClientBu** - Client business units
- **JobRegister** - Job type registrations
- **JobRegisterField** - Dynamic form fields
- **Job** - Individual job records
- **JobAttachment** - Job file attachments
- **JobServiceCharge** - Service charges for jobs
- **ClientServiceCharge** - Service charges for clients
- **Invoice** - Invoice records
- **InvoiceSelectedJob** - Jobs linked to invoices
- **InvoiceAnnexure** - Invoice annexure details
- **FieldsMaster** - Master field definitions
- **JobReport** - Saved report configurations
- **UserSettings** - User preferences

## Usage

### Import Prisma Client

```javascript
const prisma = require('../config/database');
// or
const prisma = require('../lib/prisma');
```

### Example Queries

#### Find a user by email:
```javascript
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
});
```

#### Find users with conditions:
```javascript
const activeUsers = await prisma.user.findMany({
  where: {
    status: 'Active',
  },
  select: {
    id: true,
    first_name: true,
    last_name: true,
    email: true,
  },
});
```

#### Create a user:
```javascript
const user = await prisma.user.create({
  data: {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    password: hashedPassword,
    status: 'Active',
  },
});
```

#### Update a user:
```javascript
const user = await prisma.user.update({
  where: { id: 1 },
  data: {
    first_name: 'Jane',
    updated_at: new Date(),
  },
});
```

#### Delete (soft delete):
```javascript
const user = await prisma.user.update({
  where: { id: 1 },
  data: {
    status: 'Delete',
    deleted_at: new Date(),
  },
});
```

#### Include relations:
```javascript
const account = await prisma.account.findUnique({
  where: { id: 1 },
  include: {
    clientInfos: true,
    addedByUser: {
      select: {
        id: true,
        first_name: true,
        last_name: true,
      },
    },
  },
});
```

## Prisma Commands

### Generate Prisma Client
```bash
npm run prisma:generate
# or
npx prisma generate
```

### Create a migration
```bash
npm run prisma:migrate
# or
npx prisma migrate dev --name migration_name
```

### Open Prisma Studio (Database GUI)
```bash
npm run prisma:studio
# or
npx prisma studio
```

### Format schema file
```bash
npm run prisma:format
# or
npx prisma format
```

## Migration from Raw SQL

All routes have been updated to use Prisma:

- ✅ `routes/auth.js` - Authentication routes
- ✅ `routes/users.js` - User CRUD operations

### Benefits of Prisma

1. **Type Safety** - Auto-generated types based on schema
2. **Query Builder** - Intuitive query API
3. **Relations** - Easy handling of relationships
4. **Migrations** - Version-controlled database changes
5. **Prisma Studio** - Visual database browser
6. **Performance** - Optimized queries

## Notes

- The MySQL connection pool is still available at `db.pool` for migration scripts
- Prisma Client is exported from `config/database.js` as the default export
- All new code should use Prisma instead of raw SQL queries
- The schema matches your existing database structure exactly

## Troubleshooting

### Error: "Prisma Client has not been generated"
Run: `npm run prisma:generate`

### Error: "Can't reach database server"
- Check your `DATABASE_URL` in `.env`
- Ensure MySQL/MariaDB is running
- Verify database credentials

### Schema changes
After modifying `prisma/schema.prisma`:
1. Run `npm run prisma:generate` to regenerate the client
2. Run `npm run prisma:migrate` to create and apply migrations

## Next Steps

1. Update other routes to use Prisma
2. Create service layer files for complex business logic
3. Add Prisma middleware for logging/validation
4. Set up database seeding with Prisma



