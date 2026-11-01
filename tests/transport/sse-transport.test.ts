/**
 * Tests for the legacy MCP HTTP+SSE transport (endpoint event, 202 + response on the stream)
 */

import * as http from 'http';
import { AddressInfo } from 'net';
import { HTTPTransportHandler } from '../../src/transport/http-transport';
import { SSETransportHandler } from '../../src/transport/sse-transport';
import { MCPHandler } from '../../src/protocol/mcp-handler';
import { ToolRegistry } from '../../src/registry/tool-registry';

interface SSEEvent { event: string; data: string }

/** Open GET /sse and collect parsed events */
function openStream(base: string): Promise<{ events: SSEEvent[]; next: () => Promise<SSEEvent>; close: () => void; status: number }> {
  return new Promise((resolve, reject) => {
    const req = http.get(`${base}/sse`, (res) => {
      const events: SSEEvent[] = [];
      let waiters: Array<(e: SSEEvent) => void> = [];
      let buffer = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => {
        buffer += chunk;
        let idx;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const event = block.match(/^event: (.*)$/m)?.[1];
          const data = block.match(/^data: (.*)$/m)?.[1];
          if (event && data !== undefined) {
            const e = { event, data };
            const waiter = waiters.shift();
            waiter ? waiter(e) : events.push(e);
          }
        }
      });
      const next = () => new Promise<SSEEvent>((r) => {
        const e = events.shift();
        e ? r(e) : waiters.push(r);
      });
      resolve({ events, next, close: () => req.destroy(), status: res.statusCode! });
    });
    req.on('error', reject);
  });
}

async function post(base: string, path: string, body: unknown): Promise<{ status: number; text: string }> {
  const res = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, text: await res.text() };
}

const waitFor = async (cond: () => boolean) => {
  for (let i = 0; i < 50 && !cond(); i++) await new Promise(r => setTimeout(r, 10));
};

describe('SSETransportHandler', () => {
  let server: http.Server;
  let sse: SSETransportHandler;
  let base: string;

  beforeEach(async () => {
    const registry = new ToolRegistry();
    const mcpHandler = new MCPHandler(registry);
    const handle = (req: any) => mcpHandler.handleRequest(req);
    sse = new SSETransportHandler({ maxConnections: 2, heartbeatInterval: 1000, enableLogging: false }, handle);
    const transport = new HTTPTransportHandler({ port: 0, enableLogging: false }, handle, sse);
    server = http.createServer(transport.getApp());
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    sse.stop();
    server.closeAllConnections();
    await new Promise(r => server.close(r));
  });

  it('sends the endpoint event first, then answers POSTs on the stream', async () => {
    const stream = await openStream(base);
    const endpoint = await stream.next();
    expect(endpoint.event).toBe('endpoint');
    expect(endpoint.data).toMatch(/^\/sse\/[0-9a-f-]+\/message$/);

    const accepted = await post(base, endpoint.data, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } });
    expect(accepted.status).toBe(202);

    const message = await stream.next();
    expect(message.event).toBe('message');
    expect(JSON.parse(message.data)).toMatchObject({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2024-11-05' } });

    // A notification is accepted but produces no message; the following ping is the next event
    expect((await post(base, endpoint.data, { jsonrpc: '2.0', method: 'notifications/initialized' })).status).toBe(202);
    expect((await post(base, endpoint.data, { jsonrpc: '2.0', id: 2, method: 'ping' })).status).toBe(202);
    expect(JSON.parse((await stream.next()).data)).toEqual({ jsonrpc: '2.0', id: 2, result: {} });
    stream.close();
  });

  it('returns 404 for an unknown connection', async () => {
    const res = await post(base, '/sse/does-not-exist/message', { jsonrpc: '2.0', id: 1, method: 'ping' });
    expect(res.status).toBe(404);
  });

  it('removes the connection when the client disconnects', async () => {
    const stream = await openStream(base);
    const endpoint = await stream.next();
    expect(sse.getConnectionCount()).toBe(1);
    stream.close();
    await waitFor(() => sse.getConnectionCount() === 0);
    expect(sse.getConnectionCount()).toBe(0);
    expect((await post(base, endpoint.data, { jsonrpc: '2.0', id: 1, method: 'ping' })).status).toBe(404);
  });

  it('enforces the max connection limit', async () => {
    const a = await openStream(base);
    const b = await openStream(base);
    const c = await openStream(base);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(c.status).toBe(503);
    [a, b, c].forEach(s => s.close());
  });
});
