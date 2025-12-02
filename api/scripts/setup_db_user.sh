#!/bin/bash

# Script to set up MySQL/MariaDB user for EXIM Invoicing System
# Usage: ./scripts/setup_db_user.sh

echo "🔧 Setting up MySQL/MariaDB user for EXIM Invoicing System"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Default values
DB_NAME="exim_invoicing"
DB_USER="exim_user"
DB_PASS=""

echo -e "${YELLOW}Step 1: Accessing MySQL/MariaDB${NC}"
echo ""
echo "On macOS with Homebrew MariaDB, you have a few options:"
echo ""
echo "Option A: Use sudo (requires your Mac password)"
echo "  sudo mysql -u root"
echo ""
echo "Option B: Use your system user (if MariaDB allows)"
echo "  mysql -u $(whoami)"
echo ""
echo "Option C: Access as root without password (if configured)"
echo "  mysql -u root"
echo ""

read -p "Which method would you like to try? (A/B/C): " method

case $method in
    A|a)
        echo ""
        echo -e "${YELLOW}Run these commands manually:${NC}"
        echo ""
        echo "sudo mysql -u root"
        echo ""
        echo "Then in MySQL, run:"
        echo ""
        cat << 'EOF'
-- Create database
CREATE DATABASE IF NOT EXISTS exim_invoicing CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- Create user (change password as needed)
CREATE USER IF NOT EXISTS 'exim_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON exim_invoicing.* TO 'exim_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
SELECT user, host FROM mysql.user WHERE user = 'exim_user';

-- Exit
EXIT;
EOF
        ;;
    B|b)
        SYSTEM_USER=$(whoami)
        echo ""
        echo -e "${YELLOW}Attempting to connect as: ${SYSTEM_USER}${NC}"
        echo ""
        read -p "Enter MySQL password (if any, or press Enter): " -s MYSQL_PASS
        echo ""
        
        if [ -z "$MYSQL_PASS" ]; then
            mysql -u "$SYSTEM_USER" << EOF
-- Create database
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- Create user
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY 'exim_password_123';

-- Grant privileges
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
SELECT user, host FROM mysql.user WHERE user = '$DB_USER';
EOF
        else
            mysql -u "$SYSTEM_USER" -p"$MYSQL_PASS" << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY 'exim_password_123';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SHOW DATABASES;
SELECT user, host FROM mysql.user WHERE user = '$DB_USER';
EOF
        fi
        ;;
    C|c)
        echo ""
        echo -e "${YELLOW}Attempting to connect as root without password${NC}"
        echo ""
        mysql -u root << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY 'exim_password_123';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SHOW DATABASES;
SELECT user, host FROM mysql.user WHERE user = '$DB_USER';
EOF
        ;;
esac

echo ""
echo -e "${GREEN}✅ User setup complete!${NC}"
echo ""
echo "Update your .env file with:"
echo "DB_USER=$DB_USER"
echo "DB_PASSWORD=exim_password_123"
echo "DB_NAME=$DB_NAME"

