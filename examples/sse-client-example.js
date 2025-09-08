/**
 * SSE (Server-Sent Events) MCP Client Example
 * 
 * This example demonstrates how to use the SSE transport with automatic
 * MCP initialization to connect to the App Store MCP Server.
 * 
 * Features demonstrated:
 * - SSE connection establishment
 * - Automatic MCP initialization handling
 * - Request queuing during initialization
 * - Error handling and reconnection
 * - Tool discovery and usage
 * - Proper connection cleanup
 */

const EventSource = require('eventsource'); // npm install eventsource
const fetch = require('node-fetch'); // npm install node-fetch

class SSEMCPClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.connectionId = null;
    this.eventSource = null;
    this.isInitialized = false;
    this.responseHandlers = new Map();
    this.requestQueue = [];
    this.serverInfo = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
  }

  /**
   * Connect to the SSE endpoint and wait for initialization
   */
  async connect() {
    return new Promise((resolve, reject) => {
      console.log('🔌 Connecting to SSE endpoint...');
      
      this.eventSource = new EventSource(`${this.baseUrl}/sse`);
      
      // Handle connection establishment
      this.eventSource.addEventListener('connection', (event) => {
        const data = JSON.parse(event.data);
        this.connectionId = data.connectionId;
        console.log(`✅ SSE connected with ID: ${this.connectionId}`);
        console.log(`📊 Correlation ID: ${data.correlationId}`);
      });

      // Handle MCP responses (including automatic initialization)
      this.eventSource.addEventListener('mcp-response', (event) => {
        const response = JSON.parse(event.data);
        
        // Check if this is the automatic initialization response
        if (response.result && response.result.serverInfo && !this.isInitialized) {
          console.log('🚀 MCP initialization complete!');
          console.log(`📋 Server: ${response.result.serverInfo.name} v${response.result.serverInfo.version}`);
          console.log(`🔧 Protocol: ${response.result.protocolVersion}`);
          console.log('🛠️  Capabilities:', Object.keys(response.result.capabilities || {}));
          
          this.serverInfo = response.result.serverInfo;
          this.isInitialized = true;
          this.reconnectAttempts = 0; // Reset on successful connection
          
          // Process any queued requests
          this.processQueuedRequests();
          
          resolve(response.result);
          return;
        }
        
        // Handle regular MCP responses
        const handler = this.responseHandlers.get(response.id);
        if (handler) {
          if (response.error) {
            console.error(`❌ MCP Error for request ${response.id}:`, response.error);
            handler.reject(new Error(`${response.error.code}: ${response.error.message}`));
          } else {
            handler.resolve(response.result);
          }
          this.responseHandlers.delete(response.id);
        } else {
          console.log('📨 Unhandled MCP response:', response);
        }
      });

      // Handle heartbeats
      this.eventSource.addEventListener('heartbeat', (event) => {
        const data = JSON.parse(event.data);
        console.log(`💓 Heartbeat: ${data.timestamp}`);
      });

      // Handle connection errors
      this.eventSource.onerror = (error) => {
        console.error('🔥 SSE connection error:', error);
        
        if (!this.isInitialized) {
          reject(new Error('Failed to establish SSE connection'));
        } else {
          // Attempt reconnection for established connections
          this.handleReconnection();
        }
      };

      // Timeout if initialization doesn't complete within 10 seconds
      setTimeout(() => {
        if (!this.isInitialized) {
          this.eventSource.close();
          reject(new Error('Initialization timeout - server may not be responding'));
        }
      }, 10000);
    });
  }

  /**
   * Handle reconnection logic with exponential backoff
   */
  async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🚫 Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
    
    setTimeout(async () => {
      try {
        this.isInitialized = false;
        this.connectionId = null;
        await this.connect();
        console.log('✅ Reconnection successful');
      } catch (error) {
        console.error('❌ Reconnection failed:', error.message);
        this.handleReconnection();
      }
    }, delay);
  }

  /**
   * Send an MCP message
   */
  async sendMessage(message) {
    if (!this.connectionId) {
      throw new Error('Not connected. Call connect() first.');
    }

    // If not initialized, queue the request
    if (!this.isInitialized) {
      console.log(`⏳ Queuing request ${message.id} - waiting for initialization...`);
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ message, resolve, reject });
      });
    }

    return this.sendMessageNow(message);
  }

  /**
   * Send message immediately (after initialization)
   */
  async sendMessageNow(message) {
    const responsePromise = new Promise((resolve, reject) => {
      this.responseHandlers.set(message.id, { resolve, reject });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.responseHandlers.has(message.id)) {
          this.responseHandlers.delete(message.id);
          reject(new Error(`Request timeout for ${message.id}`));
        }
      }, 30000);
    });

    try {
      console.log(`📤 Sending MCP request: ${message.method} (${message.id})`);
      
      const response = await fetch(`${this.baseUrl}/sse/${this.connectionId}/message`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Correlation-ID': `client-${Date.now()}`
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return responsePromise;
    } catch (error) {
      this.responseHandlers.delete(message.id);
      throw error;
    }
  }

  /**
   * Process queued requests after initialization
   */
  async processQueuedRequests() {
    if (this.requestQueue.length === 0) {
      return;
    }

    console.log(`📋 Processing ${this.requestQueue.length} queued requests...`);
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    for (const { message, resolve, reject } of queue) {
      try {
        const result = await this.sendMessageNow(message);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    console.log('✅ All queued requests processed');
  }

  /**
   * Call a specific MCP tool
   */
  async callTool(toolName, arguments = {}) {
    const requestId = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return this.sendMessage({
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments
      }
    });
  }

  /**
   * List available tools
   */
  async listTools() {
    return this.sendMessage({
      jsonrpc: '2.0',
      id: `list-tools-${Date.now()}`,
      method: 'tools/list'
    });
  }

  /**
   * Disconnect from SSE
   */
  disconnect() {
    console.log('🔌 Disconnecting from SSE...');
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.connectionId = null;
    this.isInitialized = false;
    this.responseHandlers.clear();
    this.requestQueue = [];
    
    console.log('✅ Disconnected');
  }
}

/**
 * Example usage and demonstrations
 */
async function runExamples() {
  const client = new SSEMCPClient();
  
  try {
    // Connect and wait for initialization
    console.log('='.repeat(60));
    console.log('🚀 Starting SSE MCP Client Example');
    console.log('='.repeat(60));
    
    const serverInfo = await client.connect();
    console.log(`\n✅ Connected to ${serverInfo.name} v${serverInfo.version}`);
    
    // Example 1: List available tools
    console.log('\n📋 Example 1: Discovering available tools...');
    const toolsList = await client.listTools();
    console.log(`Found ${toolsList.tools.length} tools:`);
    toolsList.tools.slice(0, 5).forEach(tool => {
      console.log(`  • ${tool.name}: ${tool.description.substring(0, 60)}...`);
    });
    
    // Example 2: Get app details from Google Play
    console.log('\n📱 Example 2: Getting WhatsApp details from Google Play...');
    const whatsappDetails = await client.callTool('google-play-app-details', {
      appId: 'com.whatsapp'
    });
    console.log(`App: ${whatsappDetails.title}`);
    console.log(`Developer: ${whatsappDetails.developer}`);
    console.log(`Rating: ${whatsappDetails.score} ⭐ (${whatsappDetails.ratings?.toLocaleString()} ratings)`);
    console.log(`Installs: ${whatsappDetails.installs}`);
    
    // Example 3: Search for apps
    console.log('\n🔍 Example 3: Searching for messaging apps...');
    const searchResults = await client.callTool('google-play-search', {
      query: 'messaging',
      num: 3
    });
    console.log(`Found ${searchResults.length} messaging apps:`);
    searchResults.forEach((app, index) => {
      console.log(`  ${index + 1}. ${app.title} by ${app.developer} (${app.score}⭐)`);
    });
    
    // Example 4: Get app reviews
    console.log('\n💬 Example 4: Getting recent reviews for WhatsApp...');
    const reviews = await client.callTool('google-play-app-reviews', {
      appId: 'com.whatsapp',
      num: 3,
      sort: 'newest'
    });
    console.log(`Recent reviews (${reviews.data.length} shown):`);
    reviews.data.forEach((review, index) => {
      console.log(`  ${index + 1}. ${review.score}⭐ by ${review.userName}`);
      console.log(`     "${review.text.substring(0, 100)}..."`);
    });
    
    // Example 5: Compare app across stores
    console.log('\n🔄 Example 5: Comparing WhatsApp across both stores...');
    
    // Get from Apple App Store
    const appStoreDetails = await client.callTool('app-store-app-details', {
      appId: '310633997' // WhatsApp's App Store ID
    });
    
    console.log('Store Comparison:');
    console.log(`  Google Play: ${whatsappDetails.score}⭐ (${whatsappDetails.ratings?.toLocaleString()} ratings)`);
    console.log(`  Apple Store: ${appStoreDetails.score}⭐ (${appStoreDetails.reviews?.toLocaleString()} reviews)`);
    
    // Example 6: Test request queuing by sending multiple requests quickly
    console.log('\n⚡ Example 6: Testing concurrent requests...');
    const promises = [
      client.callTool('google-play-categories'),
      client.callTool('google-play-suggest', { term: 'photo' }),
      client.callTool('app-store-search', { query: 'photo editor', num: 2 })
    ];
    
    const results = await Promise.all(promises);
    console.log(`✅ Processed ${results.length} concurrent requests successfully`);
    console.log(`  • Categories: ${results[0].length} available`);
    console.log(`  • Suggestions: ${results[1].length} for "photo"`);
    console.log(`  • App Store search: ${results[2].length} photo editor apps`);
    
    console.log('\n🎉 All examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Example failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Always disconnect when done
    client.disconnect();
  }
}

/**
 * Error handling example
 */
async function errorHandlingExample() {
  const client = new SSEMCPClient();
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔥 Error Handling Examples');
    console.log('='.repeat(60));
    
    await client.connect();
    
    // Example 1: Invalid tool name
    console.log('\n❌ Example 1: Calling non-existent tool...');
    try {
      await client.callTool('non-existent-tool', {});
    } catch (error) {
      console.log(`Expected error: ${error.message}`);
    }
    
    // Example 2: Invalid parameters
    console.log('\n❌ Example 2: Invalid app ID format...');
    try {
      await client.callTool('google-play-app-details', {
        appId: 'invalid-app-id-format'
      });
    } catch (error) {
      console.log(`Expected error: ${error.message}`);
    }
    
    // Example 3: App not found
    console.log('\n❌ Example 3: App not found...');
    try {
      await client.callTool('google-play-app-details', {
        appId: 'com.nonexistent.app.that.does.not.exist'
      });
    } catch (error) {
      console.log(`Expected error: ${error.message}`);
    }
    
    console.log('\n✅ Error handling examples completed');
    
  } catch (error) {
    console.error('❌ Error handling example failed:', error.message);
  } finally {
    client.disconnect();
  }
}

/**
 * Performance testing example
 */
async function performanceExample() {
  const client = new SSEMCPClient();
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('⚡ Performance Testing Example');
    console.log('='.repeat(60));
    
    await client.connect();
    
    // Test rapid sequential requests
    console.log('\n🏃 Testing 10 sequential requests...');
    const startTime = Date.now();
    
    for (let i = 0; i < 10; i++) {
      await client.callTool('google-play-suggest', { 
        term: `test${i}` 
      });
      process.stdout.write('.');
    }
    
    const sequentialTime = Date.now() - startTime;
    console.log(`\n✅ Sequential requests completed in ${sequentialTime}ms`);
    
    // Test concurrent requests
    console.log('\n🚀 Testing 10 concurrent requests...');
    const concurrentStart = Date.now();
    
    const concurrentPromises = Array.from({ length: 10 }, (_, i) =>
      client.callTool('google-play-suggest', { term: `concurrent${i}` })
    );
    
    await Promise.all(concurrentPromises);
    const concurrentTime = Date.now() - concurrentStart;
    console.log(`✅ Concurrent requests completed in ${concurrentTime}ms`);
    
    console.log(`\n📊 Performance comparison:`);
    console.log(`  Sequential: ${sequentialTime}ms (${(sequentialTime/10).toFixed(1)}ms avg)`);
    console.log(`  Concurrent: ${concurrentTime}ms (${(concurrentTime/10).toFixed(1)}ms avg)`);
    console.log(`  Speedup: ${(sequentialTime/concurrentTime).toFixed(1)}x faster`);
    
  } catch (error) {
    console.error('❌ Performance example failed:', error.message);
  } finally {
    client.disconnect();
  }
}

// Main execution
async function main() {
  console.log('🌟 SSE MCP Client Examples');
  console.log('Make sure the MCP server is running on http://localhost:3000\n');
  
  // Run all examples
  await runExamples();
  await errorHandlingExample();
  await performanceExample();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 All examples completed!');
  console.log('='.repeat(60));
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { SSEMCPClient };