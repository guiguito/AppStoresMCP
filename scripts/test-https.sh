#!/bin/bash

# Test HTTPS functionality of the MCP server
set -e

echo "🔐 Testing HTTPS MCP Server functionality..."

# Configuration
PORT=${PORT:-3000}
HOST=${HOST:-localhost}
HTTPS_URL="https://$HOST:$PORT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo "Testing $description..."
    
    # Use curl with self-signed certificate acceptance
    response=$(curl -s -w "%{http_code}" -k "$HTTPS_URL$endpoint" -o /tmp/response.json)
    status_code="${response: -3}"
    
    if [ "$status_code" -eq "$expected_status" ]; then
        print_status $GREEN "✅ $description: OK (HTTP $status_code)"
        return 0
    else
        print_status $RED "❌ $description: FAILED (HTTP $status_code, expected $expected_status)"
        if [ -f /tmp/response.json ]; then
            echo "Response body:"
            cat /tmp/response.json
            echo ""
        fi
        return 1
    fi
}

# Function to test MCP endpoint
test_mcp_endpoint() {
    local method=$1
    local params=$2
    local description=$3
    
    echo "Testing MCP $description..."
    
    # Create MCP request
    local request_data=$(cat << EOF
{
    "jsonrpc": "2.0",
    "id": "test-$(date +%s)",
    "method": "$method",
    "params": $params
}
EOF
)
    
    # Make request
    response=$(curl -s -w "%{http_code}" -k \
        -H "Content-Type: application/json" \
        -d "$request_data" \
        "$HTTPS_URL/mcp" \
        -o /tmp/mcp_response.json)
    
    status_code="${response: -3}"
    
    if [ "$status_code" -eq "200" ]; then
        # Check if response is valid JSON and has no error
        if jq -e '.error' /tmp/mcp_response.json > /dev/null 2>&1; then
            print_status $YELLOW "⚠️  MCP $description: Response contains error"
            jq '.error' /tmp/mcp_response.json
            return 1
        else
            print_status $GREEN "✅ MCP $description: OK"
            return 0
        fi
    else
        print_status $RED "❌ MCP $description: FAILED (HTTP $status_code)"
        if [ -f /tmp/mcp_response.json ]; then
            echo "Response body:"
            cat /tmp/mcp_response.json
            echo ""
        fi
        return 1
    fi
}

# Check if jq is available
if ! command -v jq &> /dev/null; then
    print_status $YELLOW "⚠️  jq not found. Installing jq for JSON parsing..."
    if command -v brew &> /dev/null; then
        brew install jq
    elif command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y jq
    else
        print_status $RED "❌ Please install jq manually to run MCP tests"
        exit 1
    fi
fi

# Check if server is running
echo "🔍 Checking if HTTPS server is running on $HTTPS_URL..."
if ! curl -s -k --connect-timeout 5 "$HTTPS_URL/health" > /dev/null; then
    print_status $RED "❌ Server is not responding on $HTTPS_URL"
    echo ""
    echo "To start the server with HTTPS:"
    echo "  1. Generate SSL certificates: npm run generate-ssl"
    echo "  2. Start server: HTTPS_ENABLED=true HTTPS_KEY_PATH=./ssl/server.key HTTPS_CERT_PATH=./ssl/server.crt npm start"
    exit 1
fi

print_status $GREEN "✅ Server is responding"
echo ""

# Test basic endpoints
print_status $YELLOW "🧪 Testing basic HTTPS endpoints..."
test_endpoint "/health" "Health check"
echo ""

# Test MCP endpoints
print_status $YELLOW "🧪 Testing MCP over HTTPS..."

# Test initialize
test_mcp_endpoint "initialize" '{
    "protocolVersion": "2025-03-26",
    "capabilities": {
        "roots": {"listChanged": false},
        "sampling": {}
    },
    "clientInfo": {
        "name": "https-test-client",
        "version": "1.0.0"
    }
}' "initialize"

# Test tools/list
test_mcp_endpoint "tools/list" '{}' "tools/list"

# Test a simple tool call
test_mcp_endpoint "tools/call" '{
    "name": "google-play-search",
    "arguments": {
        "query": "instagram",
        "num": 1,
        "lang": "en",
        "country": "us"
    }
}' "tools/call (google-play-search)"

echo ""
print_status $GREEN "🎉 HTTPS testing completed!"

# Test certificate information
echo ""
print_status $YELLOW "🔍 Certificate information:"
echo | openssl s_client -connect "$HOST:$PORT" -servername "$HOST" 2>/dev/null | openssl x509 -noout -subject -dates -issuer 2>/dev/null || print_status $YELLOW "⚠️  Could not retrieve certificate information"

echo ""
print_status $GREEN "✅ All HTTPS tests passed successfully!"