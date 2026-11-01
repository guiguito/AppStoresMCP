/**
 * Tests for the Streamable HTTP transport (POST /mcp) and shared middleware
 */

import request from 'supertest';
import { HTTPTransportHandler } from '../../src/transport/http-transport';
import { MCPHandler } from '../../src/protocol/mcp-handler';
import { ToolRegistry } from '../../src/registry/tool-registry';
import { MCPTool, MCPErrorCode } from '../../src/types/mcp';

function makeApp(options: { corsOrigins?: string[]; requestTimeout?: number; execute?: MCPTool['execute'] } = {}) {
  const registry = new ToolRegistry();
  registry.registerTool({
    name: 'echo',
    description: 'Echo tool',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
    execute: options.execute ?? (async (args: any) => ({ echoed: args.text }))
  });
  const mcpHandler = new MCPHandler(registry);
  const transport = new HTTPTransportHandler(
    { port: 0, enableLogging: false, ...(options.corsOrigins && { corsOrigins: options.corsOrigins }), ...(options.requestTimeout && { requestTimeout: options.requestTimeout }) },
    (req) => mcpHandler.handleRequest(req)
  );
  return transport.getApp();
}

describe('HTTPTransportHandler', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('serves tools/list and tools/call', async () => {
    const app = makeApp();
    const list = await request(app).post('/mcp').send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(list.status).toBe(200);
    expect(list.body.result.tools.map((t: any) => t.name)).toEqual(['echo']);

    const call = await request(app).post('/mcp').send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'echo', arguments: { text: 'hi' } } });
    expect(call.status).toBe(200);
    expect(JSON.parse(call.body.result.content[0].text)).toEqual({ echoed: 'hi' });
  });

  it('answers notifications with 202 and an empty body', async () => {
    const res = await request(makeApp()).post('/mcp').send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(res.status).toBe(202);
    expect(res.text).toBe('');
  });

  it('returns 200 with isError when the tool throws', async () => {
    const app = makeApp({ execute: async () => { throw new Error('upstream failed'); } });
    const res = await request(app).post('/mcp').send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'echo', arguments: {} } });
    expect(res.status).toBe(200);
    expect(res.body.result).toEqual({ content: [{ type: 'text', text: 'upstream failed' }], isError: true });
  });

  it('returns 200 with -32602 for an unknown tool', async () => {
    const res = await request(makeApp()).post('/mcp').send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nope' } });
    expect(res.status).toBe(200);
    expect(res.body.error.code).toBe(MCPErrorCode.INVALID_PARAMS);
  });

  it('returns 400 for invalid JSON and invalid envelopes', async () => {
    const app = makeApp();
    const badJson = await request(app).post('/mcp').set('Content-Type', 'application/json').send('{not json');
    expect(badJson.status).toBe(400);
    expect(badJson.body).toMatchObject({ jsonrpc: '2.0', id: null, error: { code: MCPErrorCode.PARSE_ERROR } });

    const badEnvelope = await request(app).post('/mcp').send({ hello: 'world' });
    expect(badEnvelope.status).toBe(400);
    expect(badEnvelope.body.error.code).toBe(MCPErrorCode.INVALID_REQUEST);
  });

  describe('Origin / CORS', () => {
    const ping = { jsonrpc: '2.0', id: 1, method: 'ping' };

    it('rejects browser origins by default but allows requests without Origin', async () => {
      const app = makeApp();
      expect((await request(app).post('/mcp').set('Origin', 'https://evil.example').send(ping)).status).toBe(403);
      const ok = await request(app).post('/mcp').send(ping);
      expect(ok.status).toBe(200);
      expect(ok.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('allows configured origins and rejects others', async () => {
      const app = makeApp({ corsOrigins: ['https://app.example'] });
      const ok = await request(app).post('/mcp').set('Origin', 'https://app.example').send(ping);
      expect(ok.status).toBe(200);
      expect(ok.headers['access-control-allow-origin']).toBe('https://app.example');
      expect((await request(app).post('/mcp').set('Origin', 'https://evil.example').send(ping)).status).toBe(403);
    });

    it('allows every origin with *', async () => {
      const res = await request(makeApp({ corsOrigins: ['*'] })).post('/mcp').set('Origin', 'https://any.example').send(ping);
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('*');
    });
  });

  it('survives a handler slower than the request timeout', async () => {
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on('unhandledRejection', onRejection);
    try {
      const app = makeApp({ requestTimeout: 50, execute: () => new Promise(resolve => setTimeout(() => resolve('late'), 150)) });
      const res = await request(app).post('/mcp').send({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'echo', arguments: {} } });
      expect(res.status).toBe(408);
      expect(res.body.id).toBeNull();
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(rejections).toEqual([]);
      expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining('unhandled_error'));
    } finally {
      process.off('unhandledRejection', onRejection);
    }
  });

  it('returns JSON, not HTML, from the error handler', async () => {
    const res = await request(makeApp()).post('/mcp').set('Content-Type', 'application/json').send(JSON.stringify({ pad: 'x'.repeat(2 * 1024 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.text).not.toMatch(/<html|at \w+ \(/i);
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(makeApp()).get('/nope');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('fails to start with HTTPS enabled and no certificates', async () => {
    const transport = new HTTPTransportHandler({ port: 0, https: { enabled: true } }, async () => undefined);
    await expect(transport.start()).rejects.toThrow('HTTPS key and certificate paths are required');
  });
});
