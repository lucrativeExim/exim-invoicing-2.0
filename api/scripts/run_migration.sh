#!/bin/bash

# Script to run database migrations for EXIM Invoicing System 2.0
# Usage: ./scripts/run_migration.sh [database_name] [username] [password]

DB_NAME="${1:-exim_invoicing}"
DB_USER="${2:-root}"
DB_PASS="${3:-}"
MIGRATIONS_DIR="migrations"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running database migrations...${NC}"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Check if MySQL/MariaDB is accessible
if [ -z "$DB_PASS" ]; then
    mysql -u "$DB_USER" -e "SELECT 1" > /dev/null 2>&1
else
    mysql -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1" > /dev/null 2>&1
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Cannot connect to MySQL/MariaDB. Please check your credentials.${NC}"
    exit 1
fi

# Run schema migration
echo -e "${YELLOW}Creating database schema...${NC}"
if [ -z "$DB_PASS" ]; then
    mysql -u "$DB_USER" < "$MIGRATIONS_DIR/001_create_schema_with_indexes.sql"
else
    mysql -u "$DB_USER" -p"$DB_PASS" < "$MIGRATIONS_DIR/001_create_schema_with_indexes.sql"
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Schema created successfully${NC}"
else
    echo -e "${RED}✗ Error creating schema${NC}"
    exit 1
fi

# Run seed data
echo -e "${YELLOW}Inserting seed data...${NC}"
if [ -z "$DB_PASS" ]; then
    mysql -u "$DB_USER" < "$MIGRATIONS_DIR/002_seed_data.sql"
else
    mysql -u "$DB_USER" -p"$DB_PASS" < "$MIGRATIONS_DIR/002_seed_data.sql"
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Seed data inserted successfully${NC}"
else
    echo -e "${RED}✗ Error inserting seed data${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Migration completed successfully!${NC}"

