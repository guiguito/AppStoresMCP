/**
 * Debug SSE Client to identify the timeout issue
 * This will help us understand what the client is receiving vs what it expects
 */

const EventSource = require('eventsource');

class DebugSSEClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.connectionId = null;
    this.eventSource = null;
    this.isInitialized = false;
    this.receivedEvents = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log('🔌 Connecting to SSE endpoint...');
      console.log(`URL: ${this.baseUrl}/sse`);
      
      this.eventSource = new EventSource(`${this.baseUrl}/sse`);
      
      // Log all events received
      this.eventSource.onmessage = (event) => {
        console.log('📨 Raw SSE message received:');
        console.log('  Type:', event.type);
        console.log('  Data:', event.data);
        console.log('  LastEventId:', event.lastEventId);
        console.log('  Origin:', event.origin);
        this.receivedEvents.push({
          type: event.type,
          data: event.data,
          timestamp: new Date().toISOString()
        });
      };

      // Handle connection establishment
      this.eventSource.addEventListener('connection', (event) => {
        console.log('✅ Connection event received:');
        console.log('  Data:', event.data);
        try {
          const data = JSON.parse(event.data);
          this.connectionId = data.connectionId;
          console.log(`  Connection ID: ${this.connectionId}`);
          console.log(`  Correlation ID: ${data.correlationId}`);
        } catch (error) {
          console.error('❌ Failed to parse connection data:', error.message);
        }
      });

      // Handle MCP responses
      this.eventSource.addEventListener('mcp-response', (event) => {
        console.log('🚀 MCP Response event received:');
        console.log('  Data:', event.data);
        try {
          const response = JSON.parse(event.data);
          console.log('  Parsed response:', JSON.stringify(response, null, 2));
          
          // Check if this is initialization response
          if (response.result && response.result.serverInfo && !this.isInitialized) {
            console.log('✅ Initialization response detected!');
            console.log(`  Server: ${response.result.serverInfo.name}`);
            console.log(`  Version: ${response.result.serverInfo.version}`);
            console.log(`  Protocol: ${response.result.protocolVersion}`);
            this.isInitialized = true;
            resolve(response.result);
          }
        } catch (error) {
          console.error('❌ Failed to parse MCP response:', error.message);
        }
      });

      // Handle heartbeats
      this.eventSource.addEventListener('heartbeat', (event) => {
        console.log('💓 Heartbeat received:');
        console.log('  Data:', event.data);
      });

      // Handle errors
      this.eventSource.onerror = (error) => {
        console.error('🔥 SSE Error:');
        console.error('  Error object:', error);
        console.error('  ReadyState:', this.eventSource.readyState);
        console.error('  URL:', this.eventSource.url);
        
        // Log readyState meanings
        const states = {
          0: 'CONNECTING',
          1: 'OPEN', 
          2: 'CLOSED'
        };
        console.error(`  State meaning: ${states[this.eventSource.readyState] || 'UNKNOWN'}`);
        
        if (!this.isInitialized) {
          reject(new Error(`SSE connection failed. ReadyState: ${this.eventSource.readyState}`));
        }
      };

      // Handle open event
      this.eventSource.onopen = (event) => {
        console.log('🔓 SSE Connection opened:');
        console.log('  Event:', event);
        console.log('  ReadyState:', this.eventSource.readyState);
      };

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!this.isInitialized) {
          console.log('⏰ Initialization timeout reached');
          console.log('📊 Events received so far:');
          this.receivedEvents.forEach((event, index) => {
            console.log(`  ${index + 1}. [${event.timestamp}] ${event.type}: ${event.data}`);
          });
          
          this.eventSource.close();
          reject(new Error('Initialization timeout - no MCP response received'));
        }
      }, 15000);
    });
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    console.log('🔌 Disconnected');
  }

  getReceivedEvents() {
    return this.receivedEvents;
  }
}

async function debugSSEConnection() {
  const client = new DebugSSEClient();
  
  try {
    console.log('🐛 Starting SSE Debug Session');
    console.log('='.repeat(50));
    
    const result = await client.connect();
    console.log('✅ Connection successful!');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    console.log('\n📊 Final event summary:');
    const events = client.getReceivedEvents();
    if (events.length === 0) {
      console.log('  No events received');
    } else {
      events.forEach((event, index) => {
        console.log(`  ${index + 1}. [${event.timestamp}] ${event.type}: ${event.data.substring(0, 100)}...`);
      });
    }
  } finally {
    client.disconnect();
  }
}

// Run the debug session
if (require.main === module) {
  debugSSEConnection().catch(console.error);
}

module.exports = { DebugSSEClient };