/**
 * Debug client that mimics Trae/2.0.2 behavior
 * This will help us understand what Trae expects vs what we're sending
 */

const EventSource = require('eventsource');
// Use built-in fetch in newer Node.js versions, fallback to node-fetch
let fetch;
try {
  fetch = globalThis.fetch;
  if (!fetch) {
    fetch = require('node-fetch');
  }
} catch (error) {
  // If node-fetch is not available, we'll handle it in the sendMessage method
  console.log('Note: fetch not available, will skip message sending tests');
}

class TraeLikeSSEClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.connectionId = null;
    this.eventSource = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  async connect() {
    console.log('🔌 Connecting like Trae/2.0.2...');
    
    // Create the initialization promise first
    this.initializationPromise = new Promise((resolve, reject) => {
      // Set up SSE connection with Trae-like headers
      this.eventSource = new EventSource(`${this.baseUrl}/sse`, {
        headers: {
          'User-Agent': 'Trae/2.0.2',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      let initializationReceived = false;
      let connectionEstablished = false;

      // Handle connection events
      this.eventSource.addEventListener('connection', (event) => {
        console.log('✅ Connection event received');
        try {
          const data = JSON.parse(event.data);
          this.connectionId = data.connectionId;
          connectionEstablished = true;
          console.log(`  Connection ID: ${this.connectionId}`);
        } catch (error) {
          console.error('❌ Failed to parse connection data:', error.message);
        }
      });

      // Handle MCP responses - this is where Trae might be having issues
      this.eventSource.addEventListener('mcp-response', (event) => {
        console.log('🚀 MCP Response received');
        try {
          const response = JSON.parse(event.data);
          console.log('  Response ID:', response.id);
          console.log('  Has result:', !!response.result);
          console.log('  Has error:', !!response.error);
          
          // Check if this looks like an initialization response
          if (response.result && response.result.serverInfo) {
            console.log('✅ This appears to be initialization response');
            console.log('  Server:', response.result.serverInfo.name);
            console.log('  Protocol:', response.result.protocolVersion);
            console.log('  Capabilities:', Object.keys(response.result.capabilities || {}));
            
            initializationReceived = true;
            this.isInitialized = true;
            resolve(response.result);
          } else {
            console.log('❓ This doesn\'t look like initialization response');
            console.log('  Full response:', JSON.stringify(response, null, 2));
          }
        } catch (error) {
          console.error('❌ Failed to parse MCP response:', error.message);
          console.error('  Raw data:', event.data);
        }
      });

      // Handle heartbeats
      this.eventSource.addEventListener('heartbeat', (event) => {
        console.log('💓 Heartbeat received');
      });

      // Handle errors - this is likely where Trae is failing
      this.eventSource.onerror = (error) => {
        console.error('🔥 SSE Error occurred:');
        console.error('  Error:', error);
        console.error('  ReadyState:', this.eventSource.readyState);
        console.error('  Connection established:', connectionEstablished);
        console.error('  Initialization received:', initializationReceived);
        
        // If we haven't received initialization yet, this is the problem
        if (!initializationReceived) {
          reject(new Error('SSE error before initialization completed'));
        }
      };

      // Handle open
      this.eventSource.onopen = (event) => {
        console.log('🔓 SSE Connection opened');
        console.log('  ReadyState:', this.eventSource.readyState);
      };

      // Timeout similar to what Trae might use
      setTimeout(() => {
        if (!initializationReceived) {
          console.log('⏰ Initialization timeout (like Trae might experience)');
          console.log('  Connection established:', connectionEstablished);
          console.log('  ReadyState:', this.eventSource.readyState);
          this.eventSource.close();
          reject(new Error('Initialization timeout - client gave up waiting'));
        }
      }, 10000); // 10 second timeout like many MCP clients use
    });

    return this.initializationPromise;
  }

  // Test sending a message like Trae would
  async sendMessage(message) {
    if (!this.connectionId) {
      throw new Error('Not connected');
    }

    console.log(`📤 Sending message like Trae would: ${message.method}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/sse/${this.connectionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Trae/2.0.2',
          'Accept': 'application/json'
        },
        body: JSON.stringify(message)
      });

      console.log(`  HTTP Status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`  Error response: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log(`  HTTP Response: ${responseText}`);
      
      return responseText;
    } catch (error) {
      console.error(`❌ Failed to send message: ${error.message}`);
      throw error;
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    console.log('🔌 Disconnected');
  }
}

async function testTraeLikeConnection() {
  const client = new TraeLikeSSEClient();
  
  try {
    console.log('🧪 Testing Trae-like SSE Connection');
    console.log('='.repeat(50));
    
    // Test connection and initialization
    const result = await client.connect();
    console.log('✅ Initialization successful!');
    console.log('Server Info:', result);
    
    // Test sending a message (like tools/list)
    console.log('\n📋 Testing message sending...');
    await client.sendMessage({
      jsonrpc: '2.0',
      id: 'test-1',
      method: 'tools/list'
    });
    
    // Wait a bit for the response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Message sending test completed');
    
  } catch (error) {
    console.error('❌ Trae-like connection failed:', error.message);
    console.error('This might explain why Trae is timing out');
  } finally {
    client.disconnect();
  }
}

// Also test with different timing scenarios
async function testTimingScenarios() {
  console.log('\n🕐 Testing different timing scenarios...');
  
  // Scenario 1: Very quick connection and immediate message
  console.log('\n1. Quick connection + immediate message:');
  const quickClient = new TraeLikeSSEClient();
  try {
    await quickClient.connect();
    // Send message immediately after connection
    await quickClient.sendMessage({
      jsonrpc: '2.0',
      id: 'quick-test',
      method: 'tools/list'
    });
    console.log('✅ Quick scenario worked');
  } catch (error) {
    console.error('❌ Quick scenario failed:', error.message);
  } finally {
    quickClient.disconnect();
  }

  // Scenario 2: Connection with delay before message
  console.log('\n2. Connection + delayed message:');
  const delayedClient = new TraeLikeSSEClient();
  try {
    await delayedClient.connect();
    // Wait 1 second before sending message
    await new Promise(resolve => setTimeout(resolve, 1000));
    await delayedClient.sendMessage({
      jsonrpc: '2.0',
      id: 'delayed-test',
      method: 'tools/list'
    });
    console.log('✅ Delayed scenario worked');
  } catch (error) {
    console.error('❌ Delayed scenario failed:', error.message);
  } finally {
    delayedClient.disconnect();
  }
}

async function main() {
  await testTraeLikeConnection();
  await testTimingScenarios();
  
  console.log('\n🎯 Trae-like testing completed');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TraeLikeSSEClient };