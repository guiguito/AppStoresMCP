/**
 * SSE (Server-Sent Events) MCP Client Example
 *
 * Uses the standard MCP HTTP+SSE transport (protocol 2024-11-05):
 *   1. GET /sse opens the stream; the first event is `endpoint` with the URL to POST messages to
 *   2. POST JSON-RPC messages to that URL (the server answers 202 Accepted)
 *   3. Responses arrive on the stream as `event: message`
 *
 * Production clients should use the official SDK (`SSEClientTransport` from
 * @modelcontextprotocol/sdk), or the Streamable HTTP endpoint at POST /mcp.
 */

const EventSource = require('eventsource'); // npm install eventsource
// Uses Node's built-in fetch (Node 18+)

class SSEMCPClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.endpoint = null;
    this.eventSource = null;
    this.pending = new Map();
    this.nextId = 1;
  }

  /**
   * Open the stream, wait for the `endpoint` event, then run the initialize handshake
   */
  async connect() {
    await new Promise((resolve, reject) => {
      this.eventSource = new EventSource(`${this.baseUrl}/sse`);

      this.eventSource.addEventListener('endpoint', (event) => {
        this.endpoint = new URL(event.data, this.baseUrl).toString();
        console.log(`✅ SSE connected, posting to ${this.endpoint}`);
        resolve();
      });

      this.eventSource.addEventListener('message', (event) => {
        const response = JSON.parse(event.data);
        const handler = this.pending.get(response.id);
        if (!handler) return;
        this.pending.delete(response.id);
        if (response.error) {
          handler.reject(new Error(`${response.error.code}: ${response.error.message}`));
        } else {
          handler.resolve(response.result);
        }
      });

      this.eventSource.onerror = (error) => {
        if (!this.endpoint) reject(new Error(`Failed to establish SSE connection: ${error.message || 'unknown error'}`));
      };
    });

    const init = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'sse-example-client', version: '1.0.0' }
    });
    await this.notify('notifications/initialized');
    console.log(`🚀 Initialized: ${init.serverInfo.name} v${init.serverInfo.version} (protocol ${init.protocolVersion})`);
    return init;
  }

  async post(message) {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    if (res.status !== 202) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
  }

  /**
   * Send a request and wait for its response on the stream
   */
  async request(method, params) {
    const id = this.nextId++;
    const response = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`Request ${id} (${method}) timed out`));
      }, 30000);
    });
    await this.post({ jsonrpc: '2.0', id, method, ...(params && { params }) });
    return response;
  }

  /**
   * Send a notification (no response is ever sent back)
   */
  notify(method, params) {
    return this.post({ jsonrpc: '2.0', method, ...(params && { params }) });
  }

  listTools() {
    return this.request('tools/list');
  }

  /**
   * Call a tool; failures come back as `isError: true` results, not JSON-RPC errors
   */
  async callTool(name, args = {}) {
    const result = await this.request('tools/call', { name, arguments: args });
    const text = result.content[0].text;
    if (result.isError) throw new Error(text);
    return JSON.parse(text);
  }

  disconnect() {
    if (this.eventSource) this.eventSource.close();
    this.eventSource = null;
    this.endpoint = null;
    this.pending.clear();
  }
}

async function main() {
  const client = new SSEMCPClient(process.argv[2] || 'http://localhost:3000');
  try {
    await client.connect();

    const { tools } = await client.listTools();
    console.log(`\n📋 ${tools.length} tools available:`);
    tools.slice(0, 5).forEach(tool => console.log(`  • ${tool.name}`));

    console.log('\n📱 WhatsApp on Google Play:');
    const app = await client.callTool('google-play-app-details', { appId: 'com.whatsapp' });
    console.log(`  ${app.title} by ${app.developer} — ${app.score}⭐`);

    console.log('\n🔍 Search "messaging" (3 results):');
    const results = await client.callTool('google-play-search', { query: 'messaging', num: 3 });
    results.forEach((r, i) => console.log(`  ${i + 1}. ${r.title} by ${r.developer}`));

    console.log('\n❌ Error handling:');
    try {
      await client.callTool('google-play-app-details', {});
    } catch (error) {
      console.log(`  Tool error (isError result): ${error.message}`);
    }
    try {
      await client.request('tools/call', { name: 'non-existent-tool', arguments: {} });
    } catch (error) {
      console.log(`  Unknown tool (JSON-RPC error): ${error.message}`);
    }
  } catch (error) {
    console.error('💥 Example failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { SSEMCPClient };
