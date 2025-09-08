# MCP Client Setup Guide

This guide explains how to configure MCP clients like Cursor, Windsurf, and other MCP-compatible tools to connect to the App Store MCP Server over HTTP.

## Table of Contents

- [Overview](#overview)
- [Cursor IDE Setup](#cursor-ide-setup)
- [Windsurf IDE Setup](#windsurf-ide-setup)
- [Generic MCP Client Setup](#generic-mcp-client-setup)
- [Configuration Examples](#configuration-examples)
- [Testing the Connection](#testing-the-connection)
- [Troubleshooting](#troubleshooting)

## Overview

The App Store MCP Server implements the Model Context Protocol (MCP) over HTTP transport, making it compatible with various MCP clients. Unlike stdio-based MCP servers, this server runs as a standalone HTTP service that clients can connect to over the network.

### Key Information

- **Protocol**: MCP over HTTP (NOT WebSocket/Socket.IO)
- **Default URL**: `http://localhost:3000/mcp`
- **Transport**: HTTP POST requests with JSON-RPC 2.0
- **Authentication**: None required (configurable CORS)
- **Available Tools**: 6 app store scraping tools

### ⚠️ Important Transport Note

This server implements **MCP over HTTP**, not WebSocket or Socket.IO. If your MCP client is trying to connect via WebSocket (you'll see `/ws/socket.io/` in the logs), you need to use the HTTP proxy configuration below.

## Cursor IDE Setup

Cursor IDE supports MCP servers through configuration files. Here's how to set it up:

### 1. Create MCP Configuration

Create or edit your MCP configuration file:

**Location**: 
- macOS: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
- Windows: `%APPDATA%\Cursor\User\globalStorage\mcp.json`
- Linux: `~/.config/Cursor/User/globalStorage/mcp.json`

**Configuration**:
```json
{
  "mcpServers": {
    "app-store-mcp-server": {
      "command": "node",
      "args": ["-e", "require('http').createServer((req,res)=>{if(req.method==='POST'&&req.url==='/mcp'){let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{const request=JSON.parse(body);fetch('http://localhost:3000/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)}).then(r=>r.json()).then(data=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(data))}).catch(e=>{res.writeHead(500);res.end(JSON.stringify({error:e.message}))})});}else{res.writeHead(404);res.end();}}).listen(0,()=>console.log('MCP HTTP Proxy started'))"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3000"
      }
    }
  }
}
```

### 2. Alternative: Direct HTTP Configuration (if supported)

If Cursor supports direct HTTP MCP connections:

```json
{
  "mcpServers": {
    "app-store-mcp-server": {
      "transport": "http",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}
```

### 3. Start the MCP Server

Before using Cursor, ensure the App Store MCP Server is running:

```bash
# Start the server
npm start

# Verify it's running
curl http://localhost:3000/health
```

### 4. Restart Cursor

Restart Cursor IDE to load the new MCP configuration.

## Windsurf IDE Setup

Windsurf follows similar MCP configuration patterns:

### 1. Create MCP Configuration

**Location**: Check Windsurf documentation for the exact path, typically:
- macOS: `~/Library/Application Support/Windsurf/mcp.json`
- Windows: `%APPDATA%\Windsurf\mcp.json`
- Linux: `~/.config/Windsurf/mcp.json`

**Configuration**:
```json
{
  "servers": {
    "app-store-scraper": {
      "type": "http",
      "url": "http://localhost:3000/mcp",
      "name": "App Store MCP Server",
      "description": "Access to Google Play Store and Apple App Store data"
    }
  }
}
```

### 2. HTTP Proxy Configuration (if needed)

If Windsurf requires stdio transport, create a proxy script:

**Create `mcp-http-proxy.js`**:
```javascript
#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');

class MCPHttpProxy {
  constructor(serverUrl = 'http://localhost:3000/mcp') {
    this.serverUrl = serverUrl;
    this.setupStdioInterface();
  }

  setupStdioInterface() {
    process.stdin.on('data', async (data) => {
      try {
        const request = JSON.parse(data.toString().trim());
        const response = await this.forwardRequest(request);
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32603,
            message: 'Internal error',
            data: error.message
          }
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    });
  }

  async forwardRequest(request) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(request);
      const url = new URL(this.serverUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
}

new MCPHttpProxy(process.env.MCP_SERVER_URL);
```

**Make it executable**:
```bash
chmod +x mcp-http-proxy.js
```

**Windsurf Configuration**:
```json
{
  "servers": {
    "app-store-scraper": {
      "command": "node",
      "args": ["./mcp-http-proxy.js"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

## Generic MCP Client Setup

For other MCP clients, use these general patterns:

### HTTP-Native Clients

```json
{
  "server": {
    "name": "app-store-mcp-server",
    "transport": "http",
    "endpoint": "http://localhost:3000/mcp",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}
```

### Stdio-Based Clients (using proxy)

```json
{
  "server": {
    "name": "app-store-mcp-server",
    "command": "node",
    "args": ["path/to/mcp-http-proxy.js"],
    "env": {
      "MCP_SERVER_URL": "http://localhost:3000/mcp"
    }
  }
}
```

## Configuration Examples

### Development Configuration

```json
{
  "mcpServers": {
    "app-store-dev": {
      "transport": "http",
      "url": "http://localhost:3000/mcp",
      "timeout": 30000,
      "retries": 3
    }
  }
}
```

### Production Configuration

```json
{
  "mcpServers": {
    "app-store-prod": {
      "transport": "http",
      "url": "https://your-domain.com/mcp",
      "timeout": 60000,
      "retries": 5,
      "headers": {
        "Authorization": "Bearer your-token",
        "Content-Type": "application/json"
      }
    }
  }
}
```

### Docker-based Configuration

```json
{
  "mcpServers": {
    "app-store-docker": {
      "transport": "http",
      "url": "http://app-store-mcp-server:3000/mcp",
      "timeout": 45000
    }
  }
}
```

## Testing the Connection

### 1. Verify Server is Running

```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","uptime":123,"tools":6,"config":{...}}
```

### 2. Test MCP Endpoint

```bash
# List available tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test",
    "method": "tools/list"
  }'
```

### 3. Test Tool Execution

```bash
# Test a simple search
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test",
    "method": "tools/call",
    "params": {
      "name": "google-play-search",
      "arguments": {
        "query": "test",
        "num": 1
      }
    }
  }'
```

### 4. Verify in MCP Client

Once configured, you should see the following tools available in your MCP client:

- `google-play-app-details` - Get Google Play app information
- `google-play-app-reviews` - Get Google Play app reviews  
- `google-play-search` - Search Google Play Store
- `app-store-app-details` - Get Apple App Store app information
- `app-store-app-reviews` - Get Apple App Store app reviews
- `app-store-search` - Search Apple App Store

## Troubleshooting

### Common Issues

#### 1. Connection Refused

**Problem**: Client can't connect to the MCP server.

**Solutions**:
```bash
# Check if server is running
curl http://localhost:3000/health

# Check if port is correct
netstat -an | grep 3000

# Start the server if not running
npm start
```

#### 2. CORS Errors

**Problem**: Browser-based clients blocked by CORS policy.

**Solution**: Configure CORS origins:
```bash
# Allow specific origins
CORS_ORIGINS="http://localhost:3000,https://cursor.sh" npm start

# Allow all origins (development only)
CORS_ORIGINS="*" npm start
```

#### 3. Tools Not Appearing

**Problem**: MCP client doesn't show available tools.

**Solutions**:
1. Verify tools are registered:
   ```bash
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":"1","method":"tools/list"}'
   ```

2. Check client configuration syntax
3. Restart the MCP client
4. Check client logs for errors

#### 4. Timeout Errors

**Problem**: Requests timing out.

**Solutions**:
```bash
# Increase timeout in server config
SCRAPING_TIMEOUT=60000 npm start

# Increase client timeout in MCP config
{
  "timeout": 60000
}
```

#### 5. Rate Limiting

**Problem**: Too many requests error.

**Solutions**:
```bash
# Increase rate limits
RATE_LIMIT_MAX_REQUESTS=200 npm start
RATE_LIMIT_WINDOW_MS=900000 npm start

# Check current rate limit status
curl -I http://localhost:3000/health
```

### Debug Mode

Enable debug logging:

```bash
# Start server with debug logging
LOG_LEVEL=debug npm start

# Check server logs for MCP requests
tail -f server.log | grep mcp
```

### Network Issues

#### Firewall Configuration

```bash
# macOS - allow incoming connections
sudo pfctl -f /etc/pf.conf

# Linux - allow port 3000
sudo ufw allow 3000

# Windows - add firewall rule
netsh advfirewall firewall add rule name="MCP Server" dir=in action=allow protocol=TCP localport=3000
```

#### Docker Networking

If running in Docker:

```bash
# Ensure port is exposed
docker run -p 3000:3000 app-store-mcp-server

# Check container networking
docker inspect app-store-mcp-server | grep NetworkMode
```

## Advanced Configuration

### Load Balancing

For production deployments with multiple server instances:

```json
{
  "mcpServers": {
    "app-store-cluster": {
      "transport": "http",
      "urls": [
        "http://server1:3000/mcp",
        "http://server2:3000/mcp",
        "http://server3:3000/mcp"
      ],
      "loadBalancing": "round-robin"
    }
  }
}
```

### Authentication

If you add authentication to the server:

```json
{
  "mcpServers": {
    "app-store-secure": {
      "transport": "http",
      "url": "https://your-domain.com/mcp",
      "headers": {
        "Authorization": "Bearer your-jwt-token",
        "X-API-Key": "your-api-key"
      }
    }
  }
}
```

### Health Check Integration

Configure health checks in your MCP client:

```json
{
  "mcpServers": {
    "app-store-mcp-server": {
      "transport": "http",
      "url": "http://localhost:3000/mcp",
      "healthCheck": {
        "url": "http://localhost:3000/health",
        "interval": 30000,
        "timeout": 5000
      }
    }
  }
}
```

## Support

If you encounter issues:

1. **Check server logs**: `LOG_LEVEL=debug npm start`
2. **Verify connectivity**: `curl http://localhost:3000/health`
3. **Test MCP endpoint**: Use the curl examples above
4. **Check client documentation**: Refer to your MCP client's specific documentation
5. **Create an issue**: Include server logs, client configuration, and error messages

For client-specific setup questions, also refer to:
- [Cursor MCP Documentation](https://docs.cursor.sh/mcp)
- [Windsurf MCP Documentation](https://docs.windsurf.sh/mcp)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)