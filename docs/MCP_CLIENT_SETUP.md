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

The App Store MCP Server is a **remote HTTP-based MCP server** that provides app store scraping functionality. It supports two transport protocols:

1. **HTTP Transport** (Primary) - Direct MCP over HTTP
2. **SSE Transport** (Enhanced compatibility) - Server-Sent Events for legacy clients

### Key Information

- **Server Type**: Remote HTTP server (not stdio-based)
- **Primary Protocol**: MCP over HTTP with JSON-RPC 2.0
- **Default URL**: `http://localhost:3000/mcp`
- **SSE Endpoint**: `http://localhost:3000/sse` (for compatible clients)
- **Authentication**: None required (configurable CORS)
- **Available Tools**: 19 comprehensive app store scraping tools

### Transport Support

- ✅ **HTTP Transport**: Native MCP over HTTP (recommended)
- ✅ **SSE Transport**: Server-Sent Events with automatic initialization
- ⚠️ **Stdio Support**: Available via external bridge utilities in `tools/` directory

### ⚠️ Important Notes

- This is a **remote server**, not a stdio-based MCP server
- For stdio-only clients, use the bridge utilities in the `tools/` directory
- The server must be running before connecting MCP clients

## Cursor IDE Setup

Cursor IDE supports MCP servers through configuration files. Since this is a remote HTTP server, you have two options:

### Option 1: Direct HTTP Configuration (Recommended)

If Cursor supports direct HTTP MCP connections:

**Location**: 
- macOS: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
- Windows: `%APPDATA%\Cursor\User\globalStorage\mcp.json`
- Linux: `~/.config/Cursor/User/globalStorage/mcp.json`

**Configuration**:
```json
{
  "mcpServers": {
    "app-store-mcp-server": {
      "transport": "http",
      "url": "http://localhost:3000/mcp",
      "timeout": 30000
    }
  }
}
```

### Option 2: Using Stdio Bridge (if HTTP not supported)

If Cursor only supports stdio-based MCP servers, use the provided bridge utility:

```json
{
  "mcpServers": {
    "app-store-mcp-server": {
      "command": "node",
      "args": ["tools/mcp-http-proxy.js"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

### Setup Steps

1. **Start the MCP Server**:
   ```bash
   npm start
   # Verify: curl http://localhost:3000/health
   ```

2. **Create the configuration file** with one of the options above

3. **Restart Cursor IDE** to load the new MCP configuration

## Windsurf IDE Setup

Windsurf follows similar MCP configuration patterns:

### Option 1: Direct HTTP Configuration (Recommended)

**Location**: Check Windsurf documentation for the exact path, typically:
- macOS: `~/Library/Application Support/Windsurf/mcp.json`
- Windows: `%APPDATA%\Windsurf\mcp.json`
- Linux: `~/.config/Windsurf/mcp.json`

**Configuration**:
```json
{
  "mcpServers": {
    "app-store-mcp-server": {
      "transport": "http",
      "url": "http://localhost:3000/mcp",
      "name": "App Store MCP Server",
      "description": "Access to Google Play Store and Apple App Store data",
      "timeout": 30000
    }
  }
}
```

### Option 2: Using Stdio Bridge (if HTTP not supported)

If Windsurf only supports stdio-based MCP servers:

```json
{
  "mcpServers": {
    "app-store-mcp-server": {
      "command": "node",
      "args": ["tools/mcp-http-proxy.js"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

**Note**: The `tools/mcp-http-proxy.js` bridge utility is provided with the server for stdio compatibility.

## Generic MCP Client Setup

For other MCP clients, use these general patterns based on their transport support:

### HTTP-Native Clients (Recommended)

For clients that support direct HTTP MCP connections:

```json
{
  "mcpServers": {
    "app-store-mcp-server": {
      "transport": "http",
      "url": "http://localhost:3000/mcp",
      "timeout": 30000,
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}
```

### SSE-Compatible Clients

For clients that support Server-Sent Events:

```json
{
  "mcpServers": {
    "app-store-mcp-server": {
      "transport": "sse",
      "url": "http://localhost:3000/sse",
      "timeout": 60000
    }
  }
}
```

### Stdio-Only Clients

For clients that only support stdio-based MCP servers, use the provided bridge:

```json
{
  "mcpServers": {
    "app-store-mcp-server": {
      "command": "node",
      "args": ["tools/mcp-http-proxy.js"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

**Bridge Utilities Available**:
- `tools/mcp-http-proxy.js` - HTTP to stdio bridge
- `tools/mcp-stdio-bridge.js` - Alternative stdio bridge for Claude Desktop

## Configuration Examples

### Development Configuration

```json
{
  "mcpServers": {
    "app-store-dev": {
      "transport": "http",
      "url": "http://localhost:3000/mcp",
      "timeout": 30000
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

### HTTPS Configuration

```json
{
  "mcpServers": {
    "app-store-secure": {
      "transport": "http",
      "url": "https://localhost:3000/mcp",
      "timeout": 30000,
      "allowSelfSignedCerts": true
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
# {"status":"healthy","uptime":123,"tools":19,"config":{...}}
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

Once configured, you should see 19 comprehensive tools available in your MCP client:

**Google Play Store Tools (10 tools):**
- `google-play-app-details` - Get detailed app information
- `google-play-app-reviews` - Get app reviews with token-based pagination
- `google-play-search` - Search for apps (up to 100 results, no pagination)
- `google-play-list` - Get app lists from collections and categories (up to 100 results, no pagination)
- `google-play-developer` - Get all apps by a specific developer with token-based pagination
- `google-play-suggest` - Get search suggestions
- `google-play-similar` - Find similar apps
- `google-play-permissions` - Get app permissions information
- `google-play-datasafety` - Get app data safety information
- `google-play-categories` - Get list of available categories

**Apple App Store Tools (9 tools):**
- `app-store-app-details` - Get detailed app information
- `app-store-app-reviews` - Get app reviews with page-based pagination
- `app-store-search` - Search for apps (up to 100 results, no pagination)
- `app-store-list` - Get app lists from collections and categories (up to 100 results, no pagination)
- `app-store-developer` - Get all apps by a specific developer
- `app-store-privacy` - Get app privacy information
- `app-store-suggest` - Get search suggestions
- `app-store-similar` - Find similar apps
- `app-store-ratings` - Get detailed ratings breakdown

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

For production deployments with multiple server instances (client-dependent feature):

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

Configure health checks in your MCP client (if supported):

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

**Note**: Advanced features like load balancing and health checks depend on your MCP client's capabilities.

## Bridge Utilities for Stdio Clients

If your MCP client only supports stdio-based servers, the project provides bridge utilities in the `tools/` directory:

### Available Bridges

1. **`tools/mcp-http-proxy.js`** - General-purpose HTTP to stdio bridge
2. **`tools/mcp-stdio-bridge.js`** - Specialized bridge for Claude Desktop

### How Bridges Work

```
MCP Client (stdio) → Bridge Utility → HTTP Server (this project)
```

The bridge utilities:
- Accept stdio input from MCP clients
- Convert requests to HTTP and forward to the server
- Return HTTP responses via stdout to the client

### Using Bridges

Simply reference the bridge in your MCP client configuration:

```json
{
  "mcpServers": {
    "app-store-mcp-server": {
      "command": "node",
      "args": ["tools/mcp-http-proxy.js"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3000/mcp"
      }
    }
  }
}
```

**Important**: The main server must be running for bridges to work.

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