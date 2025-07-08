#!/bin/bash

# Database restore script for Security Incident Reporting System
# Usage: ./restore.sh <backup_file>

set -e

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-screenshot_db}
DB_USER=${DB_USER:-screenshot_user}
DB_PASSWORD=${DB_PASSWORD:-your_secure_password}
BACKUP_DIR=${BACKUP_DIR:-./backups}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Check if backup file is provided
if [ $# -eq 0 ]; then
    error "Usage: $0 <backup_file>"
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/*.sql 2>/dev/null || echo "No backup files found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    # Try to find the file in backup directory
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    else
        error "Backup file not found: $BACKUP_FILE"
        echo "Available backups:"
        ls -lh "$BACKUP_DIR"/*.sql 2>/dev/null || echo "No backup files found"
        exit 1
    fi
fi

# Set PGPASSWORD environment variable
export PGPASSWORD="$DB_PASSWORD"

# Test database connection
log "Testing database connection..."
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
    error "Cannot connect to database. Please check your configuration."
    exit 1
fi

# Verify backup file integrity
log "Verifying backup file integrity..."
if ! pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1; then
    error "Backup file is corrupted or invalid: $BACKUP_FILE"
    exit 1
fi

# Show backup contents
log "Backup file contents:"
pg_restore --list "$BACKUP_FILE" | head -20

# Confirm restore operation
echo ""
warning "WARNING: This will completely replace the current database!"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""
read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log "Restore operation cancelled."
    exit 0
fi

# Create backup of current database before restore
log "Creating backup of current database before restore..."
CURRENT_BACKUP="$BACKUP_DIR/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --no-password \
    --format=custom \
    --compress=9 \
    --file="$CURRENT_BACKUP"

log "Pre-restore backup created: $CURRENT_BACKUP"

# Drop and recreate database
log "Dropping and recreating database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres << EOF
DROP DATABASE IF EXISTS "$DB_NAME";
CREATE DATABASE "$DB_NAME" OWNER "$DB_USER";
EOF

# Restore database
log "Restoring database from backup..."
if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --no-password \
    --clean \
    --if-exists \
    "$BACKUP_FILE"; then
    
    log "Database restore completed successfully!"
    
    # Verify restore
    log "Verifying restore..."
    TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    log "Restored tables: $TABLE_COUNT"
    
    # Show some basic statistics
    log "Database statistics:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
\echo 'Users:'
SELECT COUNT(*) as user_count FROM users;
\echo 'Areas:'
SELECT COUNT(*) as area_count FROM areas;
\echo 'Incidents:'
SELECT COUNT(*) as incident_count FROM incidents;
\echo 'Audit logs:'
SELECT COUNT(*) as audit_count FROM audit_logs;
EOF
    
else
    error "Database restore failed!"
    log "Attempting to restore from pre-restore backup..."
    
    # Try to restore from pre-restore backup
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres << EOF
DROP DATABASE IF EXISTS "$DB_NAME";
CREATE DATABASE "$DB_NAME" OWNER "$DB_USER";
EOF
    
    if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose \
        --no-password \
        --clean \
        --if-exists \
        "$CURRENT_BACKUP"; then
        
        log "Successfully restored from pre-restore backup!"
    else
        error "Failed to restore from pre-restore backup!"
        error "Database may be in an inconsistent state!"
        exit 1
    fi
fi

log "Restore process completed!" 