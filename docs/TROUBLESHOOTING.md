# Troubleshooting Guide

## Table of Contents

- [SSE Connection Issues](#sse-connection-issues)
- [HTTPS Troubleshooting](#https-troubleshooting)
  - [Quick Verification Steps](#quick-https-verification-steps)
  - [Common HTTPS Issues](#common-https-issues-and-solutions)
  - [HTTPS Configuration](#https-configuration)
  - [HTTPS Testing](#https-testing-commands)

---

## SSE Connection Issues

The `/sse` endpoint implements the standard MCP HTTP+SSE transport (protocol 2024-11-05):

1. `GET /sse` → the first event is `event: endpoint` with `data: /sse/<connectionId>/message`
2. The client POSTs JSON-RPC messages to that URL → `202 Accepted`
3. Responses arrive on the stream as `event: message`; notifications get no response
4. A `: heartbeat` comment line is sent every `SSE_HEARTBEAT_INTERVAL` ms

The server does **not** initialize on the client's behalf: the client must send `initialize`
and then `notifications/initialized`, as with any MCP server.

### Quick check

```bash
# Should print "event: endpoint" immediately
curl -N http://localhost:3000/sse
```

### Common issues

| Symptom | Cause / fix |
|---------|-------------|
| `POST /sse/<id>/message` returns 404 | The stream for that connection id is closed (client disconnected or server restarted). Reconnect to `/sse` and use the new endpoint. |
| `GET /sse` returns 503 | `SSE_MAX_CONNECTIONS` reached. |
| Request returns 403 `Origin not allowed` | The request carries a browser `Origin` header that is not in `CORS_ORIGINS`. |
| Responses never arrive behind a proxy | Disable proxy buffering for `/sse` (see below). |
| Client expects `connection` / `mcp-response` events | Those custom events were removed; use the standard `endpoint` / `message` events (see `examples/sse-client-example.js`). |

### Proxy configuration

```nginx
location /sse {
  proxy_pass http://backend;
  proxy_set_header Connection '';
  proxy_http_version 1.1;
  proxy_buffering off;
  proxy_cache off;
}
```

### Environment variables

```bash
ENABLE_SSE_TRANSPORT=true
SSE_HEARTBEAT_INTERVAL=30000
SSE_MAX_CONNECTIONS=100
```

## HTTPS Troubleshooting

### Quick HTTPS Verification Steps

#### 1. Check if HTTPS Server is Running
```bash
curl -k https://localhost:3000/health
```
Expected: `{"status":"healthy","timestamp":"...","version":"1.0.0"}`

#### 2. Test MCP Proxy with HTTPS
```bash
echo '{"jsonrpc":"2.0","id":"test","method":"tools/list","params":{}}' | \
  MCP_SERVER_URL="https://localhost:3000/mcp" \
  NODE_TLS_REJECT_UNAUTHORIZED=0 \
  node tools/mcp-http-proxy.js
```
Expected: JSON response with tools list

#### 3. Verify SSL Certificates
```bash
ls -la ssl/
```
Expected: `server.key` and `server.crt` files

### Common HTTPS Issues and Solutions

#### Issue: "certificate signed by unknown authority"
**Solution**: Set `NODE_TLS_REJECT_UNAUTHORIZED=0` in MCP configuration

#### Issue: "server gave HTTP response to HTTPS client"
**Solutions**:
1. Make sure server is started with HTTPS enabled:
   ```bash
   HTTPS_ENABLED=true HTTPS_KEY_PATH=./ssl/server.key HTTPS_CERT_PATH=./ssl/server.crt npm start
   ```
2. Or change client URL to use `http://` instead of `https://`

#### Issue: "ECONNREFUSED" with HTTPS
**Solution**: Make sure the MCP server is running on the correct port with HTTPS enabled

### HTTPS Configuration

#### MCP Client Configuration for HTTPS
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

#### Required HTTPS Environment Variables
```bash
# Required for HTTPS
HTTPS_ENABLED=true
HTTPS_KEY_PATH=./ssl/server.key
HTTPS_CERT_PATH=./ssl/server.crt

# Optional
PORT=3000
NODE_ENV=development
```

### HTTPS Testing Commands

#### Generate SSL Certificates
```bash
npm run generate-ssl
```

#### Start HTTPS Server
```bash
HTTPS_ENABLED=true HTTPS_KEY_PATH=./ssl/server.key HTTPS_CERT_PATH=./ssl/server.crt npm start
```

#### Test HTTPS Functionality
```bash
./scripts/test-https.sh
```

### HTTPS Security Notes

- `NODE_TLS_REJECT_UNAUTHORIZED=0` disables certificate validation (development only)
- Only use self-signed certificates for development
- For production, use certificates from a trusted Certificate Authority
- The warning about TLS connections being insecure is expected in development

### HTTPS Logs and Debugging

#### Check Server Logs for HTTPS
On startup the server logs:
```json
{"timestamp":"...","level":"info","type":"server_start","message":"MCP HTTPS transport listening on port 3000","port":3000,"httpsEnabled":true}
```
Certificate read errors (wrong path, bad passphrase) abort startup with an `application_start_error` log.
