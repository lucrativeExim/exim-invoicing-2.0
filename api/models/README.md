# Models Directory

This directory contains separate model files for each database table. Each model wraps Prisma operations and provides a clean, reusable interface for database operations.

## Structure

```
api/models/
├── index.js          # Exports all models
├── User.js           # User model
├── State.js          # State model
├── GstRate.js        # GST Rate model
└── README.md         # This file
```

## Benefits

1. **Separation of Concerns**: Database logic is separated from route handlers
2. **Reusability**: Model methods can be used across multiple routes
3. **Maintainability**: Changes to database operations are centralized
4. **Testability**: Models can be easily unit tested
5. **Consistency**: Standardized methods across all models

## Usage

### Importing Models

```javascript
// Import a specific model
const { User } = require('../models');

// Or import multiple models
const { User, State, GstRate } = require('../models');
```

### Example: Using User Model

```javascript
const { User } = require('../models');

// Get all active users
const users = await User.findAll();

// Get user by ID
const user = await User.findById(1);

// Get user by email
const user = await User.findByEmail('user@example.com');

// Create a new user
const newUser = await User.create({
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  password: 'password123',
  user_role: 'Admin'
});

// Update user
const updatedUser = await User.update(1, {
  first_name: 'Jane',
  status: 'Active'
});

// Soft delete user
await User.softDelete(1);

// Check if email exists
const exists = await User.emailExists('user@example.com');
```

## Creating New Models

To create a new model file, follow this pattern:

```javascript
const prisma = require('../lib/prisma');

class YourModel {
  /**
   * Get all records
   */
  async findAll(options = {}) {
    const { includeDeleted = false } = options;
    const where = includeDeleted ? {} : { deleted_at: null };
    
    return await prisma.yourModel.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get record by ID
   */
  async findById(id) {
    return await prisma.yourModel.findUnique({
      where: { id: parseInt(id) },
    });
  }

  /**
   * Create a new record
   */
  async create(data) {
    return await prisma.yourModel.create({
      data,
    });
  }

  /**
   * Update record
   */
  async update(id, data) {
    return await prisma.yourModel.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Delete record (soft delete if applicable)
   */
  async delete(id) {
    return await prisma.yourModel.delete({
      where: { id: parseInt(id) },
    });
  }
}

module.exports = new YourModel();
```

Then add it to `models/index.js`:

```javascript
const YourModel = require('./YourModel');

module.exports = {
  // ... other models
  YourModel,
};
```

## Model Methods Convention

Each model should implement these standard methods:

- `findAll(options)` - Get all records
- `findById(id, options)` - Get record by ID
- `create(data)` - Create new record
- `update(id, data)` - Update record
- `delete(id)` or `softDelete(id)` - Delete record

Additional methods can be added as needed:
- `findByField(field)` - Find by specific field
- `exists(id)` - Check if record exists
- Custom business logic methods

## Migration from Direct Prisma Usage

### Before (Direct Prisma):
```javascript
const prisma = require('../config/database');

const users = await prisma.user.findMany({
  where: { status: { not: 'Delete' } },
  select: { id: true, email: true }
});
```

### After (Using Models):
```javascript
const { User } = require('../models');

const users = await User.findAll();
```

## Notes

- Models use Prisma under the hood, so all Prisma features are still available
- Models handle common operations like password hashing, soft deletes, etc.
- Models can include validation, transformations, and business logic
- The Prisma schema file (`prisma/schema.prisma`) remains the single source of truth for database structure

