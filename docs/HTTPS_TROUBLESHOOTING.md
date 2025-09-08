# HTTPS MCP Server Troubleshooting Guide

## Quick Verification Steps

### 1. Check if HTTPS Server is Running
```bash
curl -k https://localhost:3000/health
```
Expected: `{"status":"healthy","timestamp":"...","version":"1.0.0"}`

### 2. Test MCP Proxy Directly
```bash
echo '{"jsonrpc":"2.0","id":"test","method":"tools/list","params":{}}' | \
  MCP_SERVER_URL="https://localhost:3000/mcp" \
  NODE_TLS_REJECT_UNAUTHORIZED=0 \
  node tools/mcp-http-proxy.js
```
Expected: JSON response with tools list

### 3. Verify SSL Certificates
```bash
ls -la ssl/
```
Expected: `server.key` and `server.crt` files

## Common Issues and Solutions

### Issue: "certificate signed by unknown authority"
**Solution**: Set `NODE_TLS_REJECT_UNAUTHORIZED=0` in MCP configuration

### Issue: "server gave HTTP response to HTTPS client"
**Solutions**:
1. Make sure server is started with HTTPS enabled:
   ```bash
   HTTPS_ENABLED=true HTTPS_KEY_PATH=./ssl/server.key HTTPS_CERT_PATH=./ssl/server.crt npm start
   ```
2. Or change client URL to use `http://` instead of `https://`

### Issue: "ECONNREFUSED"
**Solution**: Make sure the MCP server is running on the correct port

### Issue: Changes not taking effect in Kiro
**Solutions**:
1. Restart Kiro IDE
2. Reload MCP server from MCP Server view
3. Check MCP Logs in Kiro for detailed error messages

## Configuration Files

### MCP Client Configuration (`.kiro/settings/mcp.json`)

**Note**: The `.kiro` directory is gitignored. Create this file locally for your MCP client configuration.
```json
{
  "mcpServers": {
    "app-store-mcp-server": {
      "command": "node",
      "args": ["tools/mcp-http-proxy.js"],
      "env": {
        "MCP_SERVER_URL": "https://localhost:3000/mcp",
        "NODE_ENV": "development",
        "NODE_TLS_REJECT_UNAUTHORIZED": "0"
      },
      "disabled": false
    }
  }
}
```

### Server Environment Variables
```bash
# Required for HTTPS
HTTPS_ENABLED=true
HTTPS_KEY_PATH=./ssl/server.key
HTTPS_CERT_PATH=./ssl/server.crt

# Optional
PORT=3000
NODE_ENV=development
```

## Testing Commands

### Generate SSL Certificates
```bash
npm run generate-ssl
```

### Start HTTPS Server
```bash
HTTPS_ENABLED=true HTTPS_KEY_PATH=./ssl/server.key HTTPS_CERT_PATH=./ssl/server.crt npm start
```

### Test HTTPS Functionality
```bash
./scripts/test-https.sh
```

### Run HTTPS Client Example
```bash
node examples/https-client-example.js
```

## Security Notes

- `NODE_TLS_REJECT_UNAUTHORIZED=0` disables certificate validation
- Only use self-signed certificates for development
- For production, use certificates from a trusted Certificate Authority
- The warning about TLS connections being insecure is expected in development

## Logs and Debugging

### Check MCP Proxy Logs
The proxy logs to stderr with structured JSON:
```json
{"timestamp":"...","level":"info","component":"mcp-http-proxy","message":"..."}
```

### Check Server Logs
The server logs include HTTPS-specific information:
```json
{"timestamp":"...","level":"info","type":"https_config_loaded","message":"HTTPS configuration loaded successfully"}
```

### Enable Debug Logging
Set `LOG_LEVEL=debug` for more detailed logs.