/**
 * Example MCP Client for App Store MCP Server
 * 
 * This example demonstrates how to interact with the App Store MCP Server
 * using HTTP requests to call various tools.
 */

const http = require('http');

class MCPClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.requestId = 1;
  }

  /**
   * Make an MCP request to the server
   */
  async makeRequest(method, params = {}) {
    const requestData = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(requestData);
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(new Error(`MCP Error: ${response.error.message}`));
            } else {
              resolve(response.result);
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * List all available tools
   */
  async listTools() {
    return this.makeRequest('tools/list');
  }

  /**
   * Call a specific tool
   */
  async callTool(toolName, arguments) {
    return this.makeRequest('tools/call', {
      name: toolName,
      arguments
    });
  }

  // Convenience methods for each tool

  /**
   * Get Google Play app details
   */
  async getGooglePlayAppDetails(appId, options = {}) {
    return this.callTool('google-play-app-details', {
      appId,
      ...options
    });
  }

  /**
   * Get Google Play app reviews
   */
  async getGooglePlayAppReviews(appId, options = {}) {
    return this.callTool('google-play-app-reviews', {
      appId,
      sort: 'newest',
      num: 10,
      ...options
    });
  }

  /**
   * Search Google Play Store
   */
  async searchGooglePlay(query, options = {}) {
    return this.callTool('google-play-search', {
      query,
      num: 10,
      ...options
    });
  }

  /**
   * Get Apple App Store app details
   */
  async getAppStoreAppDetails(appId, options = {}) {
    return this.callTool('app-store-app-details', {
      appId,
      ...options
    });
  }

  /**
   * Get Apple App Store app reviews
   */
  async getAppStoreAppReviews(appId, options = {}) {
    return this.callTool('app-store-app-reviews', {
      appId,
      sort: 'mostRecent',
      num: 10,
      ...options
    });
  }

  /**
   * Search Apple App Store
   */
  async searchAppStore(query, options = {}) {
    return this.callTool('app-store-search', {
      query,
      num: 10,
      ...options
    });
  }
}

// Example usage
async function demonstrateUsage() {
  const client = new MCPClient();

  try {
    console.log('=== MCP Client Demo ===\n');

    // 1. List available tools
    console.log('1. Listing available tools...');
    const tools = await client.listTools();
    console.log(`Found ${tools.tools.length} tools:`);
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log();

    // 2. Search Google Play Store
    console.log('2. Searching Google Play Store for "messaging" apps...');
    const googlePlayResults = await client.searchGooglePlay('messaging', { num: 3 });
    if (googlePlayResults.success) {
      console.log(`Found ${googlePlayResults.data.count} results:`);
      googlePlayResults.data.results.forEach(app => {
        console.log(`  - ${app.title} by ${app.developer} (${app.rating}★)`);
      });
    }
    console.log();

    // 3. Get app details from Google Play
    console.log('3. Getting WhatsApp details from Google Play...');
    const whatsappDetails = await client.getGooglePlayAppDetails('com.whatsapp');
    if (whatsappDetails.success) {
      const app = whatsappDetails.data;
      console.log(`App: ${app.title}`);
      console.log(`Developer: ${app.developer}`);
      console.log(`Rating: ${app.rating} (${app.ratingCount.toLocaleString()} reviews)`);
      console.log(`Category: ${app.category}`);
      console.log(`Version: ${app.version}`);
    }
    console.log();

    // 4. Get app reviews
    console.log('4. Getting recent WhatsApp reviews from Google Play...');
    const reviews = await client.getGooglePlayAppReviews('com.whatsapp', { num: 3 });
    if (reviews.success) {
      console.log(`Recent reviews (${reviews.data.count} shown):`);
      reviews.data.reviews.forEach(review => {
        console.log(`  - ${review.rating}★ by ${review.userName}: "${review.text.substring(0, 100)}..."`);
      });
    }
    console.log();

    // 5. Search Apple App Store
    console.log('5. Searching Apple App Store for "photo" apps...');
    const appStoreResults = await client.searchAppStore('photo', { num: 3 });
    if (appStoreResults.success) {
      console.log(`Found ${appStoreResults.data.count} results:`);
      appStoreResults.data.results.forEach(app => {
        console.log(`  - ${app.title} by ${app.developer} (${app.rating}★)`);
      });
    }
    console.log();

    // 6. Get Apple App Store app details
    console.log('6. Getting Instagram details from Apple App Store...');
    const instagramDetails = await client.getAppStoreAppDetails('389801252');
    if (instagramDetails.success) {
      const app = instagramDetails.data;
      console.log(`App: ${app.title}`);
      console.log(`Developer: ${app.developer}`);
      console.log(`Rating: ${app.rating} (${app.ratingCount.toLocaleString()} reviews)`);
      console.log(`Category: ${app.category}`);
      console.log(`Size: ${app.size}`);
    }

  } catch (error) {
    console.error('Demo failed:', error.message);
  }
}

// Error handling example
async function demonstrateErrorHandling() {
  const client = new MCPClient();

  console.log('\n=== Error Handling Demo ===\n');

  try {
    // Try to get details for a non-existent app
    console.log('1. Trying to get details for non-existent app...');
    const result = await client.getGooglePlayAppDetails('com.nonexistent.app');
    console.log('Result:', result);
  } catch (error) {
    console.log('Caught error:', error.message);
  }

  try {
    // Try invalid parameters
    console.log('2. Trying search with invalid parameters...');
    const result = await client.searchGooglePlay('', { num: 200 }); // Empty query, too many results
    console.log('Result:', result);
  } catch (error) {
    console.log('Caught error:', error.message);
  }
}

// Rate limiting example
async function demonstrateRateLimiting() {
  const client = new MCPClient();

  console.log('\n=== Rate Limiting Demo ===\n');

  // Make multiple rapid requests to trigger rate limiting
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      client.searchGooglePlay(`test query ${i}`, { num: 1 })
        .then(result => ({ success: true, index: i, result }))
        .catch(error => ({ success: false, index: i, error: error.message }))
    );
  }

  const results = await Promise.all(promises);
  results.forEach(result => {
    if (result.success) {
      console.log(`Request ${result.index}: Success`);
    } else {
      console.log(`Request ${result.index}: Failed - ${result.error}`);
    }
  });
}

// Run the demo if this file is executed directly
if (require.main === module) {
  (async () => {
    await demonstrateUsage();
    await demonstrateErrorHandling();
    await demonstrateRateLimiting();
  })();
}

module.exports = { MCPClient };