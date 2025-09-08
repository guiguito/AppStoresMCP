#!/bin/bash

# Generate SSL certificates for HTTPS support
# This script creates self-signed certificates for development/testing purposes

set -e

CERT_DIR="./ssl"
DAYS=365
COUNTRY="US"
STATE="CA"
CITY="San Francisco"
ORG="MCP Server"
OU="Development"
CN="localhost"

echo "🔐 Generating SSL certificates for MCP Server..."

# Create ssl directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate private key
echo "📝 Generating private key..."
openssl genrsa -out "$CERT_DIR/server.key" 2048

# Generate certificate signing request
echo "📋 Generating certificate signing request..."
openssl req -new -key "$CERT_DIR/server.key" -out "$CERT_DIR/server.csr" -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$OU/CN=$CN"

# Generate self-signed certificate
echo "🏆 Generating self-signed certificate..."
openssl x509 -req -days $DAYS -in "$CERT_DIR/server.csr" -signkey "$CERT_DIR/server.key" -out "$CERT_DIR/server.crt"

# Set appropriate permissions
chmod 600 "$CERT_DIR/server.key"
chmod 644 "$CERT_DIR/server.crt"

echo "✅ SSL certificates generated successfully!"
echo ""
echo "📁 Certificate files:"
echo "   Private Key: $CERT_DIR/server.key"
echo "   Certificate: $CERT_DIR/server.crt"
echo ""
echo "🚀 To enable HTTPS, set these environment variables:"
echo "   export HTTPS_ENABLED=true"
echo "   export HTTPS_KEY_PATH=$PWD/$CERT_DIR/server.key"
echo "   export HTTPS_CERT_PATH=$PWD/$CERT_DIR/server.crt"
echo ""
echo "⚠️  Note: These are self-signed certificates for development only."
echo "   For production, use certificates from a trusted CA."