#!/bin/bash

# Add self-signed certificate to macOS keychain for development
set -e

CERT_PATH="./ssl/server.crt"

echo "🔐 Adding SSL certificate to macOS keychain..."

if [ ! -f "$CERT_PATH" ]; then
    echo "❌ Certificate not found at $CERT_PATH"
    echo "Run 'npm run generate-ssl' first to generate certificates"
    exit 1
fi

# Add certificate to keychain
echo "📋 Adding certificate to System keychain..."
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CERT_PATH"

echo "✅ Certificate added to macOS keychain successfully!"
echo ""
echo "🔍 Certificate details:"
openssl x509 -in "$CERT_PATH" -text -noout | grep -A 2 "Subject:"
echo ""
echo "🚀 You can now use HTTPS without certificate warnings"
echo "   The certificate is trusted for: localhost"
echo ""
echo "⚠️  Note: This is for development only. Remove the certificate when done:"
echo "   sudo security delete-certificate -c 'localhost' /Library/Keychains/System.keychain"