# Setting Up MySQL/MariaDB Users on macOS

## Quick Guide

On macOS with Homebrew-installed MariaDB, the root user may require special access. Here are several ways to set up a database user for your application.

## Method 1: Using sudo (Most Common)

If you have admin access, use sudo:

```bash
sudo mysql -u root
```

Once connected, run these SQL commands:

```sql
-- Create the database
CREATE DATABASE IF NOT EXISTS exim_invoicing 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_general_ci;

-- Create a dedicated user for your application
CREATE USER IF NOT EXISTS 'exim_user'@'localhost' 
  IDENTIFIED BY 'your_secure_password_here';

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON exim_invoicing.* 
  TO 'exim_user'@'localhost';

-- Apply the changes
FLUSH PRIVILEGES;

-- Verify the user was created
SELECT user, host FROM mysql.user WHERE user = 'exim_user';

-- Exit MySQL
EXIT;
```

## Method 2: Using Your System User

Sometimes MariaDB allows your macOS user to connect:

```bash
mysql -u $(whoami)
```

Or with your username directly:

```bash
mysql -u rimamalvankar
```

If this works, you can create the user and database using the same SQL commands from Method 1.

## Method 3: Reset Root Password (If Needed)

If you've forgotten the root password or need to reset it:

```bash
# Stop MariaDB
brew services stop mariadb

# Start MariaDB in safe mode (skip grant tables)
mysqld_safe --skip-grant-tables &

# Connect without password
mysql -u root

# Reset root password
USE mysql;
UPDATE user SET password=PASSWORD('new_password') WHERE User='root';
FLUSH PRIVILEGES;
EXIT;

# Stop safe mode and restart normally
brew services restart mariadb
```

## Method 4: Create User via Command Line (One-liner)

If you can access MySQL, you can create everything in one command:

```bash
mysql -u root -e "
CREATE DATABASE IF NOT EXISTS exim_invoicing CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER IF NOT EXISTS 'exim_user'@'localhost' IDENTIFIED BY 'exim_password_123';
GRANT ALL PRIVILEGES ON exim_invoicing.* TO 'exim_user'@'localhost';
FLUSH PRIVILEGES;
"
```

Or with sudo:

```bash
sudo mysql -u root -e "
CREATE DATABASE IF NOT EXISTS exim_invoicing CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER IF NOT EXISTS 'exim_user'@'localhost' IDENTIFIED BY 'exim_password_123';
GRANT ALL PRIVILEGES ON exim_invoicing.* TO 'exim_user'@'localhost';
FLUSH PRIVILEGES;
"
```

## Update Your .env File

After creating the user, update your `.env` file:

```env
DB_HOST=localhost
DB_USER=exim_user
DB_PASSWORD=your_secure_password_here
DB_NAME=exim_invoicing
PORT=3000
```

## Test the Connection

Test if the new user works:

```bash
mysql -u exim_user -p exim_invoicing
```

Enter your password when prompted. If successful, you're connected!

## Verify User Permissions

Check what permissions your user has:

```sql
SHOW GRANTS FOR 'exim_user'@'localhost';
```

## Common Issues

### Issue: "Access denied for user 'root'@'localhost'"

**Solution**: Use `sudo mysql -u root` instead of `mysql -u root`

### Issue: "Can't connect to local MySQL server"

**Solution**: Make sure MariaDB is running:
```bash
brew services list | grep mariadb
brew services start mariadb
```

### Issue: "Unknown database 'exim_invoicing'"

**Solution**: The database doesn't exist yet. Run the migration:
```bash
npm run migrate
```

## Recommended Setup

For development, I recommend:

1. **Create a dedicated application user** (not root)
   - Username: `exim_user` or `exim_dev`
   - Password: Something secure but easy to remember for dev

2. **Grant only necessary privileges**:
   ```sql
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER 
   ON exim_invoicing.* 
   TO 'exim_user'@'localhost';
   ```

3. **Use environment variables** in `.env` (never commit passwords!)

4. **Test the connection** before running migrations

## Security Best Practices

- ✅ Use a dedicated user for your application (not root)
- ✅ Use strong passwords in production
- ✅ Grant only necessary privileges
- ✅ Never commit `.env` files to git
- ✅ Use different users for development and production
- ✅ Regularly rotate passwords

## Quick Reference Commands

```bash
# Check if MariaDB is running
brew services list | grep mariadb

# Start MariaDB
brew services start mariadb

# Stop MariaDB
brew services stop mariadb

# Connect as root (with sudo)
sudo mysql -u root

# Connect as application user
mysql -u exim_user -p exim_invoicing

# List all databases
mysql -u root -e "SHOW DATABASES;"

# List all users
mysql -u root -e "SELECT user, host FROM mysql.user;"

# Show user privileges
mysql -u root -e "SHOW GRANTS FOR 'exim_user'@'localhost';"
```



