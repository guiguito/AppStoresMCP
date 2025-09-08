/**
 * HTTPS MCP Client Example
 * Demonstrates connecting to an MCP server over HTTPS
 */

const https = require('https');
const fs = require('fs');

class HTTPSMCPClient {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 30000;
    this.rejectUnauthorized = config.rejectUnauthorized !== false; // Default to true for security
    this.ca = config.caPath ? fs.readFileSync(config.caPath) : undefined;
    this.requestId = 1;
  }

  /**
   * Make an HTTPS request to the MCP server
   */
  async makeRequest(method, params = {}) {
    const requestData = JSON.stringify({
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    });

    return new Promise((resolve, reject) => {
      const url = new URL(this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestData),
          'User-Agent': 'HTTPS-MCP-Client/1.0.0'
        },
        timeout: this.timeout,
        rejectUnauthorized: this.rejectUnauthorized
      };

      // Add custom CA if provided
      if (this.ca) {
        options.ca = this.ca;
      }

      console.log(`🔐 Making HTTPS request to ${this.baseUrl}`);
      console.log(`📝 Method: ${method}`);
      console.log(`🔒 Certificate validation: ${this.rejectUnauthorized ? 'enabled' : 'disabled'}`);

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log(`✅ HTTPS response received (${res.statusCode})`);
            
            if (response.error) {
              console.error('❌ MCP Error:', response.error);
              reject(new Error(`MCP Error: ${response.error.message}`));
            } else {
              resolve(response);
            }
          } catch (error) {
            console.error('❌ Failed to parse response:', error.message);
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ HTTPS request failed:', error.message);
        
        if (error.code === 'CERT_HAS_EXPIRED') {
          console.error('🚨 SSL certificate has expired');
        } else if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
          console.error('🚨 Self-signed certificate detected. Use rejectUnauthorized: false for testing');
        } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          console.error('🚨 Unable to verify certificate. Check your CA configuration');
        }
        
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      });

      req.write(requestData);
      req.end();
    });
  }

  /**
   * Initialize MCP connection
   */
  async initialize() {
    console.log('🚀 Initializing HTTPS MCP connection...');
    
    const response = await this.makeRequest('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {
        roots: { listChanged: false },
        sampling: {}
      },
      clientInfo: {
        name: 'https-mcp-client',
        version: '1.0.0'
      }
    });

    if (response.result) {
      console.log('✅ MCP initialization successful');
      console.log(`📋 Server: ${response.result.serverInfo.name} v${response.result.serverInfo.version}`);
      console.log(`🔧 Protocol: ${response.result.protocolVersion}`);
      console.log('🛠️  Capabilities:', Object.keys(response.result.capabilities || {}));
      return response.result;
    }

    throw new Error('Initialization failed');
  }

  /**
   * List available tools
   */
  async listTools() {
    console.log('🔍 Listing available tools...');
    
    const response = await this.makeRequest('tools/list');
    
    if (response.result && response.result.tools) {
      console.log(`📦 Found ${response.result.tools.length} tools:`);
      response.result.tools.forEach(tool => {
        console.log(`  • ${tool.name}: ${tool.description}`);
      });
      return response.result.tools;
    }

    return [];
  }

  /**
   * Search Google Play Store
   */
  async searchGooglePlay(query, options = {}) {
    console.log(`🔍 Searching Google Play for: "${query}"`);
    
    const response = await this.makeRequest('tools/call', {
      name: 'google-play-search',
      arguments: { query, ...options }
    });

    if (response.result && response.result.content) {
      const results = response.result.content[0];
      console.log(`📱 Found ${results.apps?.length || 0} apps`);
      
      if (results.apps && results.apps.length > 0) {
        console.log('Top results:');
        results.apps.slice(0, 3).forEach((app, index) => {
          console.log(`  ${index + 1}. ${app.title} (${app.appId})`);
          console.log(`     Rating: ${app.score} | Price: ${app.priceText || 'Free'}`);
        });
      }
      
      return results;
    }

    return null;
  }
}

// Example usage
async function main() {
  // Configuration for HTTPS connection
  const config = {
    baseUrl: 'https://localhost:3000/mcp',
    timeout: 30000,
    // For self-signed certificates in development
    rejectUnauthorized: false,
    // For production with custom CA
    // caPath: './ssl/ca.crt'
  };

  const client = new HTTPSMCPClient(config);

  try {
    // Initialize connection
    await client.initialize();

    // List available tools
    await client.listTools();

    // Search for apps
    await client.searchGooglePlay('instagram', { 
      lang: 'en',
      country: 'us',
      num: 5
    });

    console.log('🎉 HTTPS MCP client demo completed successfully!');

  } catch (error) {
    console.error('💥 Demo failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🚨 Connection refused. Make sure the HTTPS MCP server is running on the configured port.');
      console.error('   Start server with: HTTPS_ENABLED=true npm start');
    }
    
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { HTTPSMCPClient };