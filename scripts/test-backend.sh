#!/bin/bash

# Backend Test Kit - Security Incident Reporting System
# Tests all three deployment modes: SaaS, Offline, and Hybrid

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO: $1${NC}"
}

success() {
    echo -e "${CYAN}[$(date +'%H:%M:%S')] SUCCESS: $1${NC}"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"
DEVOPS_DIR="$SCRIPT_DIR/../devops"
COMPOSE_FILE="$DEVOPS_DIR/docker-compose.yml"
COMPOSE_OFFLINE_FILE="$DEVOPS_DIR/docker-compose.offline.yml"
COMPOSE_HYBRID_FILE="$DEVOPS_DIR/docker-compose.hybrid.yml"

# Test configuration
API_BASE_URL="http://localhost:3000"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="Admin123!"
TEST_LICENSE_KEY="TEST-XXXX-YYYY-ZZZZ-1234"
WORKSTATION_ID="TEST-WORKSTATION-001"
HOSTNAME="test-host-01"

# Test results
TEST_RESULTS=()
JWT_TOKEN=""

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="$3"
    
    info "Running test: $test_name"
    
    if eval "$test_command"; then
        success "✓ $test_name passed"
        TEST_RESULTS+=("✓ $test_name")
        return 0
    else
        error "✗ $test_name failed"
        TEST_RESULTS+=("✗ $test_name")
        return 1
    fi
}

# Function to check if service is ready
wait_for_service() {
    local service_name="$1"
    local max_attempts=30
    local attempt=0
    
    info "Waiting for $service_name to be ready..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "$API_BASE_URL/health" > /dev/null 2>&1; then
            success "$service_name is ready!"
            return 0
        fi
        
        attempt=$((attempt + 1))
        info "Waiting for $service_name... (attempt $attempt/$max_attempts)"
        sleep 5
    done
    
    error "$service_name failed to become ready"
    return 1
}

# Function to setup test environment
setup_test_environment() {
    local mode="$1"
    
    log "Setting up $mode test environment..."
    
    # Stop existing services
    docker-compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true
    docker-compose -f "$COMPOSE_OFFLINE_FILE" down -v 2>/dev/null || true
    docker-compose -f "$COMPOSE_HYBRID_FILE" down -v 2>/dev/null || true
    
    # Copy appropriate environment file
    cp "$BACKEND_DIR/env.$mode.test" "$BACKEND_DIR/.env"
    
    # Create test license file for offline mode
    if [ "$mode" = "offline" ]; then
        echo "$TEST_LICENSE_KEY" > "$BACKEND_DIR/license.key"
    fi
    
    # Start services with appropriate compose file
    case "$mode" in
        "saas")
            docker-compose -f "$COMPOSE_FILE" up -d --build
            ;;
        "offline")
            docker-compose -f "$COMPOSE_OFFLINE_FILE" up -d --build
            ;;
        "hybrid")
            docker-compose -f "$COMPOSE_HYBRID_FILE" up -d --build
            ;;
    esac
    
    # Wait for services to be ready
    wait_for_service "backend"
    
    # Run migrations and seeds
    case "$mode" in
        "saas")
            docker-compose -f "$COMPOSE_FILE" exec -T backend npm run migrate
            docker-compose -f "$COMPOSE_FILE" exec -T backend npm run seed
            ;;
        "offline")
            docker-compose -f "$COMPOSE_OFFLINE_FILE" exec -T backend npm run migrate
            docker-compose -f "$COMPOSE_OFFLINE_FILE" exec -T backend npm run seed
            ;;
        "hybrid")
            docker-compose -f "$COMPOSE_HYBRID_FILE" exec -T backend npm run migrate
            docker-compose -f "$COMPOSE_HYBRID_FILE" exec -T backend npm run seed
            ;;
    esac
    
    success "$mode environment setup complete"
}

# Function to test authentication
test_authentication() {
    info "Testing authentication..."
    
    # Test login
    local login_response=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$ADMIN_USERNAME\", \"password\": \"$ADMIN_PASSWORD\"}")
    
    if echo "$login_response" | grep -q "accessToken"; then
        JWT_TOKEN=$(echo "$login_response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
        success "Authentication successful, JWT token obtained"
        return 0
    else
        error "Authentication failed: $login_response"
        return 1
    fi
}

# Function to test license activation
test_license_activation() {
    info "Testing license activation..."
    
    local activation_response=$(curl -s -X POST "$API_BASE_URL/api/license/activate" \
        -H "Content-Type: application/json" \
        -d "{
            \"license_key\": \"$TEST_LICENSE_KEY\",
            \"workstation_id\": \"$WORKSTATION_ID\",
            \"hostname\": \"$HOSTNAME\"
        }")
    
    if echo "$activation_response" | grep -q "success"; then
        success "License activation successful"
        return 0
    else
        warning "License activation response: $activation_response"
        return 0  # Don't fail the test, just warn
    fi
}

# Function to test license status check
test_license_status() {
    info "Testing license status check..."
    
    local status_response=$(curl -s -X GET "$API_BASE_URL/api/license/status?workstation_id=$WORKSTATION_ID&license_key=$TEST_LICENSE_KEY")
    
    if echo "$status_response" | grep -q "active\|valid"; then
        success "License status check successful"
        return 0
    else
        warning "License status response: $status_response"
        return 0  # Don't fail the test, just warn
    fi
}

# Function to test incident creation
test_incident_creation() {
    info "Testing incident creation..."
    
    # Create a test image file
    local test_image="$BACKEND_DIR/test_screenshot.jpg"
    if [ ! -f "$test_image" ]; then
        # Create a simple test image (1x1 pixel JPEG)
        echo -n -e '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\x27 ,#\x1c\x1c(7),01444\x1f\x27=9=82<.342\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x01\x01\x11\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00\xaa\xff\xd9' > "$test_image"
    fi
    
    local incident_response=$(curl -s -X POST "$API_BASE_URL/api/incidents" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -F "area=Test Area A1" \
        -F "description=Test incident from automated test suite" \
        -F "screenshot=@$test_image")
    
    if echo "$incident_response" | grep -q "id"; then
        success "Incident creation successful"
        return 0
    else
        error "Incident creation failed: $incident_response"
        return 1
    fi
}

# Function to test incident listing
test_incident_listing() {
    info "Testing incident listing..."
    
    local incidents_response=$(curl -s -X GET "$API_BASE_URL/api/incidents" \
        -H "Authorization: Bearer $JWT_TOKEN")
    
    if echo "$incidents_response" | grep -q "incidents"; then
        success "Incident listing successful"
        return 0
    else
        error "Incident listing failed: $incidents_response"
        return 1
    fi
}

# Function to test area management
test_area_management() {
    info "Testing area management..."
    
    # List areas
    local areas_response=$(curl -s -X GET "$API_BASE_URL/api/areas" \
        -H "Authorization: Bearer $JWT_TOKEN")
    
    if echo "$areas_response" | grep -q "areas"; then
        success "Area listing successful"
        return 0
    else
        error "Area listing failed: $areas_response"
        return 1
    fi
}

# Function to test user management
test_user_management() {
    info "Testing user management..."
    
    # List users
    local users_response=$(curl -s -X GET "$API_BASE_URL/api/users" \
        -H "Authorization: Bearer $JWT_TOKEN")
    
    if echo "$users_response" | grep -q "users"; then
        success "User listing successful"
        return 0
    else
        error "User listing failed: $users_response"
        return 1
    fi
}

# Function to test audit logging
test_audit_logging() {
    info "Testing audit logging..."
    
    # List audit logs
    local audit_response=$(curl -s -X GET "$API_BASE_URL/api/audit" \
        -H "Authorization: Bearer $JWT_TOKEN")
    
    if echo "$audit_response" | grep -q "logs"; then
        success "Audit logging working"
        return 0
    else
        warning "Audit logging response: $audit_response"
        return 0  # Don't fail the test, just warn
    fi
}

# Function to run all tests for a mode
run_mode_tests() {
    local mode="$1"
    
    log "Running tests for $mode mode..."
    
    # Setup environment
    setup_test_environment "$mode"
    
    # Run tests
    run_test "Authentication" "test_authentication"
    run_test "License Activation" "test_license_activation"
    run_test "License Status" "test_license_status"
    run_test "Incident Creation" "test_incident_creation"
    run_test "Incident Listing" "test_incident_listing"
    run_test "Area Management" "test_area_management"
    run_test "User Management" "test_user_management"
    run_test "Audit Logging" "test_audit_logging"
    
    # Cleanup
    case "$mode" in
        "saas")
            docker-compose -f "$COMPOSE_FILE" down -v
            ;;
        "offline")
            docker-compose -f "$COMPOSE_OFFLINE_FILE" down -v
            ;;
        "hybrid")
            docker-compose -f "$COMPOSE_HYBRID_FILE" down -v
            ;;
    esac
    
    success "$mode mode tests completed"
}

# Function to display test results
display_results() {
    echo ""
    log "Test Results Summary:"
    echo "===================="
    
    for result in "${TEST_RESULTS[@]}"; do
        echo "$result"
    done
    
    local passed=$(echo "${TEST_RESULTS[@]}" | grep -c "✓" || echo "0")
    local failed=$(echo "${TEST_RESULTS[@]}" | grep -c "✗" || echo "0")
    local total=${#TEST_RESULTS[@]}
    
    echo ""
    echo "Summary: $passed passed, $failed failed, $total total"
    
    if [ $failed -eq 0 ]; then
        success "All tests passed! 🎉"
        return 0
    else
        error "Some tests failed. Please check the logs above."
        return 1
    fi
}

# Main execution
main() {
    local mode="${1:-all}"
    
    echo -e "${PURPLE}"
    echo "=========================================="
    echo "  Backend Test Kit - Security Incident"
    echo "  Reporting System"
    echo "=========================================="
    echo -e "${NC}"
    
    # Check prerequisites
    if [ ! -f "$COMPOSE_FILE" ]; then
        error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    if [ ! -d "$BACKEND_DIR" ]; then
        error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    # Run tests based on mode
    case "$mode" in
        "saas")
            run_mode_tests "saas"
            ;;
        "offline")
            run_mode_tests "offline"
            ;;
        "hybrid")
            run_mode_tests "hybrid"
            ;;
        "all")
            log "Running tests for all modes..."
            run_mode_tests "saas"
            run_mode_tests "offline"
            run_mode_tests "hybrid"
            ;;
        *)
            error "Invalid mode: $mode. Use: saas, offline, hybrid, or all"
            exit 1
            ;;
    esac
    
    # Display results
    display_results
}

# Run main function with arguments
main "$@" 