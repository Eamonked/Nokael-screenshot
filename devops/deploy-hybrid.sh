#!/bin/bash

# Hybrid Deployment Script
# Usage: ./deploy-hybrid.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Configuration
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.hybrid.yml"
BACKEND_DIR="../backend"

log "Starting hybrid deployment for environment: $ENVIRONMENT"

# Check if we're in the right directory
if [ ! -f "$COMPOSE_FILE" ]; then
    error "Docker Compose file not found. Please run this script from the devops directory."
    exit 1
fi

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    error "Backend directory not found: $BACKEND_DIR"
    exit 1
fi

# Check if environment file exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    warning "Environment file not found. Creating from template..."
    if [ -f "$BACKEND_DIR/env.hybrid.example" ]; then
        cp "$BACKEND_DIR/env.hybrid.example" "$BACKEND_DIR/.env"
        warning "Please edit $BACKEND_DIR/.env with your configuration before continuing."
        exit 1
    else
        error "No environment template found. Please create $BACKEND_DIR/.env manually."
        exit 1
    fi
fi

# Validate environment configuration
log "Validating environment configuration..."
if ! grep -q "DEPLOYMENT_MODE=hybrid" "$BACKEND_DIR/.env"; then
    error "Environment file must have DEPLOYMENT_MODE=hybrid for hybrid deployment"
    exit 1
fi

# Check required environment variables for hybrid mode
required_vars=(
    "DB_HOST"
    "DB_PASSWORD"
    "JWT_SECRET"
    "LICENSE_SERVER_URL"
    "SYNC_ENABLED"
    "REMOTE_API_URL"
)

for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" "$BACKEND_DIR/.env"; then
        error "Required environment variable $var not found in .env file"
        exit 1
    fi
done

# Set deployment-specific environment variables
export DEPLOYMENT_MODE=hybrid
export TENANT_CONFIG=single
export LICENSE_MODE=remote
export SYNC_ENABLED=true
export OFFLINE_MODE=true

# Stop existing services
log "Stopping existing services..."
docker-compose -f "$COMPOSE_FILE" down --remove-orphans

# Build and start services
log "Building and starting services..."
docker-compose -f "$COMPOSE_FILE" up -d --build

# Wait for services to be ready
log "Waiting for services to be ready..."
sleep 10

# Check service health
log "Checking service health..."
if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    error "Services failed to start properly"
    docker-compose -f "$COMPOSE_FILE" logs
    exit 1
fi

# Run database migrations
log "Running database migrations..."
docker-compose -f "$COMPOSE_FILE" exec -T backend npm run migrate

# Run database seeds (if needed)
if [ "$ENVIRONMENT" = "development" ]; then
    log "Running database seeds..."
    docker-compose -f "$COMPOSE_FILE" exec -T backend npm run seed
fi

# Check API health
log "Checking API health..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
        log "API is healthy!"
        break
    fi
    
    attempt=$((attempt + 1))
    log "Waiting for API to be ready... (attempt $attempt/$max_attempts)"
    sleep 5
done

if [ $attempt -eq $max_attempts ]; then
    error "API failed to become healthy within expected time"
    docker-compose -f "$COMPOSE_FILE" logs backend
    exit 1
fi

# Test sync functionality
log "Testing sync functionality..."
sync_status=$(curl -s -X GET http://localhost:3000/api/sync/status 2>/dev/null || echo "sync_not_available")
if echo "$sync_status" | grep -q "enabled\|active"; then
    success "Sync functionality is active"
else
    warning "Sync functionality may not be fully configured"
fi

# Display deployment information
log "Hybrid deployment completed successfully!"
echo ""
echo "Deployment Information:"
echo "======================"
echo "Environment: $ENVIRONMENT"
echo "Deployment Mode: Hybrid (Single-tenant with sync)"
echo "API URL: http://localhost:3000"
echo "Health Check: http://localhost:3000/health"
echo "Nginx: http://localhost:80 (HTTP) / https://localhost:443 (HTTPS)"
echo ""
echo "Sync Configuration:"
echo "  Enabled: true"
echo "  Remote API: $(grep "^REMOTE_API_URL=" "$BACKEND_DIR/.env" | cut -d'=' -f2 || echo 'Not configured')"
echo "  License Mode: Remote with offline fallback"
echo ""
echo "Default Admin Credentials:"
echo "  Username: admin"
echo "  Password: Admin123!"
echo ""
echo "Services:"
docker-compose -f "$COMPOSE_FILE" ps
echo ""
echo "Logs:"
echo "  docker-compose -f $COMPOSE_FILE logs -f"
echo ""
echo "Stop services:"
echo "  docker-compose -f $COMPOSE_FILE down"
echo ""
echo "Backup database:"
echo "  ./backup/backup.sh"
echo ""
echo "Restore database:"
echo "  ./backup/restore.sh <backup_file>" 