#!/usr/bin/env node

/**
 * MCP HTTP Proxy
 * 
 * This script acts as a bridge between stdio-based MCP clients and HTTP-based MCP servers.
 * It reads MCP requests from stdin, forwards them to the HTTP server, and writes responses to stdout.
 */

const http = require('http');
const https = require('https');

class MCPHttpProxy {
  constructor(serverUrl = process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp') {
    this.serverUrl = serverUrl;
    this.requestId = 1;
    
    // Log startup with SSL configuration
    const isHttps = this.serverUrl.startsWith('https:');
    const tlsRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0';
    
    this.log('info', 'MCP HTTP Proxy starting', { 
      serverUrl: this.serverUrl,
      isHttps,
      tlsRejectUnauthorized,
      nodeEnv: process.env.NODE_ENV
    });
    
    this.setupStdioInterface();
  }

  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: 'mcp-http-proxy',
      message,
      ...data
    };
    console.error(JSON.stringify(logEntry));
  }

  setupStdioInterface() {
    let buffer = '';
    
    process.stdin.setEncoding('utf8');
    
    // Use readable event for proper stdin handling
    process.stdin.on('readable', () => {
      let chunk;
      while (null !== (chunk = process.stdin.read())) {
        buffer += chunk;
        
        // Process complete lines
        let lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            this.handleStdinLine(line.trim());
          }
        }
      }
    });

    process.stdin.on('end', () => {
      this.log('info', 'stdin closed, exiting');
      process.exit(0);
    });

    process.stdin.on('error', (error) => {
      this.log('error', 'stdin error', { error: error.message });
      process.exit(1);
    });

    // Handle process signals
    process.on('SIGTERM', () => {
      this.log('info', 'received SIGTERM, exiting');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      this.log('info', 'received SIGINT, exiting');
      process.exit(0);
    });

    // Log when proxy is ready
    this.log('info', 'MCP HTTP Proxy ready for requests');
  }

  async handleStdinLine(line) {
    try {
      const request = JSON.parse(line);
      
      this.log('debug', 'received MCP request', { 
        method: request.method, 
        id: request.id 
      });

      const response = await this.forwardRequest(request);
      
      this.log('debug', 'sending MCP response', { 
        id: response.id,
        hasError: !!response.error 
      });

      // Write response to stdout
      process.stdout.write(JSON.stringify(response) + '\n');
      
    } catch (error) {
      this.log('error', 'failed to process request', { 
        error: error.message,
        line: line.substring(0, 100) 
      });

      // Send error response
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
  }

  async forwardRequest(request) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(request);
      const url = new URL(this.serverUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'MCP-HTTP-Proxy/1.0'
        },
        timeout: 30000,
        // For development with self-signed certificates
        rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0'
      };

      const httpModule = url.protocol === 'https:' ? https : http;
      
      const req = httpModule.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            this.log('error', 'Failed to parse HTTP response', { 
              error: error.message,
              data: data.substring(0, 200),
              statusCode: res.statusCode
            });
            reject(new Error(`Failed to parse HTTP response: ${error.message}`));
          }
        });

        res.on('error', (error) => {
          this.log('error', 'HTTP response error', { 
            error: error.message,
            statusCode: res.statusCode
          });
          reject(new Error(`HTTP response error: ${error.message}`));
        });
      });

      req.on('error', (error) => {
        let errorMessage = `HTTP request failed: ${error.message}`;
        
        // Provide helpful SSL error messages
        if (error.code === 'CERT_HAS_EXPIRED') {
          errorMessage += ' (SSL certificate has expired)';
        } else if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
          errorMessage += ' (Self-signed certificate detected. Set NODE_TLS_REJECT_UNAUTHORIZED=0 for development)';
        } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          errorMessage += ' (Unable to verify SSL certificate)';
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage += ' (Connection refused. Is the server running?)';
        }
        
        this.log('error', 'HTTP request error', { 
          code: error.code,
          message: error.message,
          serverUrl: this.serverUrl
        });
        
        reject(new Error(errorMessage));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('HTTP request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }
}

// Start the proxy
new MCPHttpProxy();