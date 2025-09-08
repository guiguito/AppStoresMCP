#!/bin/bash

# Integration test runner script
# Handles Docker-based integration testing with proper cleanup

set -e

# Configuration
DOCKER_COMPOSE_FILE="docker/docker-compose.integration.yml"
TEST_TIMEOUT=600 # 10 minutes for comprehensive tests
CLEANUP_ON_EXIT=true
COMPREHENSIVE_MODE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Cleanup function
cleanup() {
    if [ "$CLEANUP_ON_EXIT" = true ]; then
        log_info "Cleaning up Docker containers..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down --volumes --remove-orphans 2>/dev/null || true
        docker system prune -f --volumes 2>/dev/null || true
    fi
}

# Set up trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    log_info "Starting integration test environment..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if docker-compose file exists
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log_error "Docker compose file not found: $DOCKER_COMPOSE_FILE"
        exit 1
    fi
    
    # Clean up any existing containers
    log_info "Cleaning up existing containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --volumes --remove-orphans 2>/dev/null || true
    
    # Build and start services
    log_info "Building and starting integration test environment..."
    if ! docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache; then
        log_error "Failed to build Docker images"
        exit 1
    fi
    
    # Start the MCP server
    log_info "Starting MCP server..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d mcp-server-test
    
    # Wait for server to be healthy
    log_info "Waiting for MCP server to be ready..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T mcp-server-test curl -f http://localhost:3000/health >/dev/null 2>&1; then
            log_info "MCP server is ready!"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        log_error "MCP server failed to start within timeout"
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs mcp-server-test
        exit 1
    fi
    
    # Run integration tests
    if [ "$COMPREHENSIVE_MODE" = true ]; then
        log_info "Running comprehensive integration tests for all 19 tools..."
        # Set environment variable for comprehensive testing
        export COMPREHENSIVE_TEST_MODE=true
    else
        log_info "Running standard integration tests..."
    fi
    
    if docker-compose -f "$DOCKER_COMPOSE_FILE" --profile test up --abort-on-container-exit integration-test-runner; then
        log_info "Integration tests completed successfully!"
        exit_code=0
    else
        log_error "Integration tests failed!"
        exit_code=1
    fi
    
    # Show logs if tests failed
    if [ $exit_code -ne 0 ]; then
        log_info "Showing container logs for debugging..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs
    fi
    
    exit $exit_code
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-cleanup)
            CLEANUP_ON_EXIT=false
            shift
            ;;
        --comprehensive)
            COMPREHENSIVE_MODE=true
            shift
            ;;
        --timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --no-cleanup      Don't clean up Docker containers after tests"
            echo "  --comprehensive   Run comprehensive tests for all 19 tools"
            echo "  --timeout SEC     Set test timeout in seconds (default: 600)"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main