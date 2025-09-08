#!/usr/bin/env node

/**
 * MCP Stdio Bridge for Claude Desktop
 * Bridges stdio communication to HTTP MCP server
 */

const https = require('https');
const http = require('http');

class MCPStdioBridge {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.isHttps = serverUrl.startsWith('https:');
    
    // Handle stdin/stdout
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', this.handleStdinData.bind(this));
  }

  async handleStdinData(data) {
    try {
      // Parse JSON-RPC request
      const request = JSON.parse(data.trim());
      
      // Forward to HTTP server
      const response = await this.forwardToHttpServer(request);
      
      // Send response to stdout
      process.stdout.write(JSON.stringify(response) + '\n');
      
    } catch (error) {
      // Send error response
      const errorResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error: ' + error.message
        }
      };
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
  }

  async forwardToHttpServer(request) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.serverUrl);
      const requestLib = this.isHttps ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (this.isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // For HTTPS with self-signed certificates
        rejectUnauthorized: false
      };

      const req = requestLib.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error('Invalid JSON response from server'));
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify(request));
      req.end();
    });
  }
}

// Start the bridge
const serverUrl = process.env.MCP_SERVER_URL || 'https://localhost:3000/mcp';
new MCPStdioBridge(serverUrl);