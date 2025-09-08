#!/bin/bash
# Start server with HTTPS enabled
HTTPS_ENABLED=true \
HTTPS_KEY_PATH=./ssl/server.key \
HTTPS_CERT_PATH=./ssl/server.crt \
npm start

