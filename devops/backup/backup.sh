#!/bin/bash

# Database backup script for Security Incident Reporting System
# Usage: ./backup.sh [backup_name]

set -e

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-screenshot_db}
DB_USER=${DB_USER:-screenshot_user}
DB_PASSWORD=${DB_PASSWORD:-your_secure_password}
BACKUP_DIR=${BACKUP_DIR:-./backups}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
COMPRESS_BACKUPS=${COMPRESS_BACKUPS:-true}

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

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    log "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# Generate backup filename
BACKUP_NAME=${1:-"backup_$(date +%Y%m%d_%H%M%S)"}
BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}.sql"

# Set PGPASSWORD environment variable
export PGPASSWORD="$DB_PASSWORD"

# Test database connection
log "Testing database connection..."
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
    error "Cannot connect to database. Please check your configuration."
    exit 1
fi

# Create backup
log "Starting database backup..."
log "Database: $DB_NAME"
log "Backup file: $BACKUP_FILE"

# Perform the backup
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --no-password \
    --format=custom \
    --compress=9 \
    --file="$BACKUP_FILE"; then
    
    log "Backup completed successfully!"
    
    # Get backup file size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup size: $BACKUP_SIZE"
    
    # Verify backup integrity
    log "Verifying backup integrity..."
    if pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1; then
        log "Backup verification successful!"
    else
        error "Backup verification failed!"
        exit 1
    fi
    
else
    error "Backup failed!"
    exit 1
fi

# Clean up old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.sql" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# List current backups
log "Current backups:"
ls -lh "$BACKUP_DIR"/*.sql 2>/dev/null || warning "No backup files found"

# Create backup summary
BACKUP_SUMMARY="$BACKUP_DIR/backup_summary.txt"
{
    echo "Backup Summary - $(date)"
    echo "========================"
    echo "Database: $DB_NAME"
    echo "Backup file: $BACKUP_FILE"
    echo "Backup size: $BACKUP_SIZE"
    echo "Retention days: $RETENTION_DAYS"
    echo "Total backups: $(ls "$BACKUP_DIR"/*.sql 2>/dev/null | wc -l)"
    echo ""
    echo "Recent backups:"
    ls -lh "$BACKUP_DIR"/*.sql 2>/dev/null | tail -5 || echo "No backups found"
} > "$BACKUP_SUMMARY"

log "Backup summary saved to: $BACKUP_SUMMARY"
log "Backup process completed successfully!" 