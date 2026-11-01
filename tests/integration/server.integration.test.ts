/**
 * One end-to-end pass through MCPServer + HTTP transport (scrapers are mocked via jest moduleNameMapper).
 * Live store behaviour is covered by `npm run test:live` (scripts/live-check.js).
 */
import request from 'supertest';
import { MCPServer } from '../../src/server';
import { ServerConfig } from '../../src/config/server-config';

const config = (tools: Partial<ServerConfig['tools']> = {}): ServerConfig => ({
  port: 0,
  cors: { origins: [] },
  server: { requestTimeout: 5000, enableLogging: false },
  transport: { enableSSE: true, https: { enabled: false }, sse: { heartbeatInterval: 30000, maxConnections: 5 } },
  tools: { enabledTools: new Set(), disabledTools: new Set(), ...tools },
});

const rpc = (app: any, method: string, params?: unknown, id: number | null = 1) =>
  request(app).post('/mcp').send({ jsonrpc: '2.0', ...(id !== null && { id }), method, ...(params !== undefined && { params }) });

describe('MCPServer integration', () => {
  let server: MCPServer;
  afterEach(async () => { if (server?.isServerRunning()) await server.stop(); });

  it('serves the MCP flow over HTTP', async () => {
    server = new MCPServer(config());
    await server.start();
    const app = server.getHttpTransport().getApp();

    const init = await rpc(app, 'initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '1' } });
    expect(init.status).toBe(200);
    expect(init.body.result.protocolVersion).toBe('2024-11-05');
    // serverInfo and /health come from package.json, so a release can't ship a stale version
    const pkg = require('../../package.json');
    expect(init.body.result.serverInfo).toEqual({ name: pkg.name, version: pkg.version });

    const notif = await rpc(app, "notifications/initialized", undefined, null);
    expect(notif.status).toBe(202);
    expect(notif.text).toBe('');

    const list = await rpc(app, 'tools/list');
    expect(list.body.result.tools).toHaveLength(20);

    const call = await rpc(app, 'tools/call', { name: 'google-play-categories', arguments: {} });
    expect(call.status).toBe(200);
    expect(call.body.result.isError).toBeFalsy();

    const bad = await rpc(app, 'tools/call', { name: 'app-store-app-details', arguments: { appId: '1', bogus: true } });
    expect(bad.status).toBe(200);
    expect(bad.body.result.isError).toBe(true);
    expect(bad.body.result.content[0].text).toContain('bogus');

    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body.version).toBe(require('../../package.json').version);
  });

  it('honours enabled/disabled tool configuration', async () => {
    server = new MCPServer(config({ disabledTools: new Set(['app-store-privacy']) }));
    await server.start();
    const names = (await rpc(server.getHttpTransport().getApp(), 'tools/list')).body.result.tools.map((t: any) => t.name);
    expect(names).toHaveLength(19);
    expect(names).not.toContain('app-store-privacy');

    await server.stop();
    server = new MCPServer(config({ enabledTools: new Set(['google-play-search', 'app-store-search']) }));
    await server.start();
    const only = (await rpc(server.getHttpTransport().getApp(), 'tools/list')).body.result.tools.map((t: any) => t.name);
    expect(only.sort()).toEqual(['app-store-search', 'google-play-search']);
  });

});
