/**
 * Test the complete MCP handshake sequence that Trae should perform
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
  console.log('Note: fetch not available, will skip message sending tests');
}

class CompleteMCPHandshakeClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.connectionId = null;
    this.eventSource = null;
    this.isInitialized = false;
    this.handshakeComplete = false;
  }

  async performCompleteHandshake() {
    return new Promise((resolve, reject) => {
      console.log('🤝 Starting complete MCP handshake...');
      
      this.eventSource = new EventSource(`${this.baseUrl}/sse`, {
        headers: {
          'User-Agent': 'Trae/2.0.2',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      let initializeResponseReceived = false;
      let notificationSent = false;

      // Handle connection
      this.eventSource.addEventListener('connection', (event) => {
        console.log('✅ Step 1: Connection established');
        const data = JSON.parse(event.data);
        this.connectionId = data.connectionId;
        console.log(`  Connection ID: ${this.connectionId}`);
      });

      // Handle MCP responses
      this.eventSource.addEventListener('mcp-response', async (event) => {
        const response = JSON.parse(event.data);
        console.log(`📨 MCP Response received: ${response.id}`);
        
        // Step 2: Handle initialize response
        if (response.result && response.result.serverInfo && !initializeResponseReceived) {
          console.log('✅ Step 2: Initialize response received');
          console.log(`  Server: ${response.result.serverInfo.name}`);
          console.log(`  Protocol: ${response.result.protocolVersion}`);
          
          initializeResponseReceived = true;
          this.isInitialized = true;
          
          // Step 3: Send notifications/initialized (this is what Trae should do)
          console.log('📤 Step 3: Sending notifications/initialized...');
          try {
            await this.sendNotificationInitialized();
            notificationSent = true;
            console.log('✅ Step 3: notifications/initialized sent successfully');
            
            // Step 4: Test a regular tool call
            console.log('📤 Step 4: Testing tool call...');
            await this.testToolCall();
            
            this.handshakeComplete = true;
            console.log('🎉 Complete handshake successful!');
            resolve(true);
            
          } catch (error) {
            console.error('❌ Step 3 failed:', error.message);
            reject(error);
          }
        } else if (response.id && response.id.startsWith('notification-')) {
          // Handle response to notifications/initialized
          console.log('✅ Step 3 response: notifications/initialized acknowledged');
          if (response.error) {
            console.error('❌ Notification error:', response.error);
          }
        } else if (response.id && response.id.startsWith('tool-test-')) {
          // Handle tool call response
          console.log('✅ Step 4 response: Tool call successful');
          if (response.error) {
            console.error('❌ Tool call error:', response.error);
          } else {
            console.log(`  Found ${response.result.tools.length} tools`);
          }
        }
      });

      // Handle heartbeats
      this.eventSource.addEventListener('heartbeat', (event) => {
        console.log('💓 Heartbeat received');
      });

      // Handle errors
      this.eventSource.onerror = (error) => {
        console.error('🔥 SSE Error during handshake:');
        console.error('  Error:', error);
        console.error('  ReadyState:', this.eventSource.readyState);
        console.error('  Initialize received:', initializeResponseReceived);
        console.error('  Notification sent:', notificationSent);
        console.error('  Handshake complete:', this.handshakeComplete);
        
        if (!this.handshakeComplete) {
          reject(new Error('SSE error during handshake'));
        }
      };

      // Timeout
      setTimeout(() => {
        if (!this.handshakeComplete) {
          console.log('⏰ Handshake timeout');
          console.log('  Initialize received:', initializeResponseReceived);
          console.log('  Notification sent:', notificationSent);
          this.eventSource.close();
          reject(new Error('Handshake timeout'));
        }
      }, 15000);
    });
  }

  async sendNotificationInitialized() {
    if (!this.connectionId) {
      throw new Error('No connection ID');
    }

    const notificationMessage = {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {}
    };

    console.log('  Sending notification:', JSON.stringify(notificationMessage, null, 2));

    const response = await fetch(`${this.baseUrl}/sse/${this.connectionId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Trae/2.0.2'
      },
      body: JSON.stringify(notificationMessage)
    });

    console.log(`  HTTP Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  Error response: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log(`  HTTP Response: ${responseText}`);
  }

  async testToolCall() {
    if (!this.connectionId) {
      throw new Error('No connection ID');
    }

    const toolMessage = {
      jsonrpc: '2.0',
      id: 'tool-test-' + Date.now(),
      method: 'tools/list',
      params: {}
    };

    console.log('  Sending tool call:', JSON.stringify(toolMessage, null, 2));

    const response = await fetch(`${this.baseUrl}/sse/${this.connectionId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Trae/2.0.2'
      },
      body: JSON.stringify(toolMessage)
    });

    console.log(`  HTTP Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  Error response: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log(`  HTTP Response: ${responseText}`);
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    console.log('🔌 Disconnected');
  }
}

async function testCompleteHandshake() {
  const client = new CompleteMCPHandshakeClient();
  
  try {
    console.log('🧪 Testing Complete MCP Handshake (like Trae should do)');
    console.log('='.repeat(60));
    
    await client.performCompleteHandshake();
    console.log('✅ Complete handshake test passed!');
    
  } catch (error) {
    console.error('❌ Complete handshake test failed:', error.message);
    console.error('This might explain why Trae is having issues');
  } finally {
    client.disconnect();
  }
}

// Test different error scenarios that might affect Trae
async function testErrorScenarios() {
  console.log('\n🔥 Testing error scenarios that might affect Trae...');
  
  // Test 1: What happens if we send malformed JSON?
  console.log('\n1. Testing malformed JSON message:');
  try {
    const response = await fetch('http://localhost:3000/sse/fake-connection-id/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Trae/2.0.2'
      },
      body: '{"invalid": json}'
    });
    console.log(`  Status: ${response.status}`);
    const text = await response.text();
    console.log(`  Response: ${text}`);
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }

  // Test 2: What happens if we use wrong connection ID?
  console.log('\n2. Testing invalid connection ID:');
  try {
    const response = await fetch('http://localhost:3000/sse/invalid-connection-id/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Trae/2.0.2'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'test',
        method: 'tools/list'
      })
    });
    console.log(`  Status: ${response.status}`);
    const text = await response.text();
    console.log(`  Response: ${text}`);
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }

  // Test 3: What happens if we send message before connection is established?
  console.log('\n3. Testing message before connection:');
  try {
    const response = await fetch('http://localhost:3000/sse/not-yet-connected/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Trae/2.0.2'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      })
    });
    console.log(`  Status: ${response.status}`);
    const text = await response.text();
    console.log(`  Response: ${text}`);
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
}

async function main() {
  await testCompleteHandshake();
  await testErrorScenarios();
  
  console.log('\n🎯 All handshake tests completed');
  console.log('\nIf these tests pass but Trae still fails, the issue is likely:');
  console.log('1. Network/proxy configuration');
  console.log('2. Trae-specific SSE implementation differences');
  console.log('3. Timing issues in Trae\'s event handling');
  console.log('4. Different header expectations');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CompleteMCPHandshakeClient };