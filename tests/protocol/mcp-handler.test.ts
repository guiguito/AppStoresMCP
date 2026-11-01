/**
 * Tests for MCPHandler: routing, initialize negotiation, notifications and tool-call error mapping
 */

import { MCPHandler, isValidMCPRequest } from '../../src/protocol/mcp-handler';
import { ToolRegistry } from '../../src/registry/tool-registry';
import { MCPTool, MCPErrorCode } from '../../src/types/mcp';

describe('MCPHandler', () => {
  let handler: MCPHandler;
  let tool: MCPTool & { execute: jest.Mock };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const registry = new ToolRegistry();
    tool = {
      name: 'echo',
      description: 'Echo tool',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
      execute: jest.fn(async (args: any) => ({ echoed: args.text }))
    };
    registry.registerTool(tool);
    handler = new MCPHandler(registry);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('initialize', () => {
    it('echoes a supported protocol version', async () => {
      const res = await handler.handleRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } });
      expect((res!.result as any).protocolVersion).toBe('2024-11-05');
      expect((res!.result as any).capabilities).toEqual({ tools: {} });
    });

    it('answers with the latest version when the requested one is unsupported', async () => {
      const res = await handler.handleRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } });
      expect((res!.result as any).protocolVersion).toBe('2025-03-26');
    });
  });

  it('returns nothing for notifications, known or unknown', async () => {
    expect(await handler.handleRequest({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeUndefined();
    expect(await handler.handleRequest({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 1 } })).toBeUndefined();
  });

  it('answers ping', async () => {
    expect(await handler.handleRequest({ jsonrpc: '2.0', id: 'p', method: 'ping' })).toEqual({ jsonrpc: '2.0', id: 'p', result: {} });
  });

  it('lists tools', async () => {
    const res = await handler.handleRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect((res!.result as any).tools).toEqual([{ name: 'echo', description: 'Echo tool', inputSchema: tool.inputSchema }]);
  });

  it('returns -32601 for unknown methods', async () => {
    const res = await handler.handleRequest({ jsonrpc: '2.0', id: 3, method: 'resources/list' });
    expect(res!.error!.code).toBe(MCPErrorCode.METHOD_NOT_FOUND);
    expect(res!.id).toBe(3);
  });

  describe('tools/call', () => {
    it('returns the tool result as text content', async () => {
      const res = await handler.handleRequest({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'echo', arguments: { text: 'hi' } } });
      expect(res!.error).toBeUndefined();
      expect((res!.result as any).isError).toBeUndefined();
      expect(JSON.parse((res!.result as any).content[0].text)).toEqual({ echoed: 'hi' });
    });

    it('serialises an undefined result instead of failing', async () => {
      tool.execute.mockResolvedValueOnce(undefined);
      const res = await handler.handleRequest({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'echo', arguments: { text: 'hi' } } });
      expect(res!.result).toEqual({ content: [{ type: 'text', text: 'null' }] });
    });

    it('returns -32602 for an unknown tool', async () => {
      const res = await handler.handleRequest({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'nope' } });
      expect(res!.error!.code).toBe(MCPErrorCode.INVALID_PARAMS);
    });

    it('returns isError with validation details for bad arguments, without calling the tool', async () => {
      const res = await handler.handleRequest({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'echo', arguments: {} } });
      expect(res!.error).toBeUndefined();
      expect((res!.result as any).isError).toBe(true);
      expect((res!.result as any).content[0].text).toMatch(/text/);
      expect(tool.execute).not.toHaveBeenCalled();
    });

    it('returns isError when the tool throws, calling it once (no retries)', async () => {
      tool.execute.mockRejectedValueOnce(new Error('upstream 429'));
      const res = await handler.handleRequest({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'echo', arguments: { text: 'x' } } });
      expect(res!.result).toEqual({ content: [{ type: 'text', text: 'upstream 429' }], isError: true });
      expect(tool.execute).toHaveBeenCalledTimes(1);
    });
  });
});

describe('isValidMCPRequest', () => {
  it('accepts requests and notifications', () => {
    expect(isValidMCPRequest({ jsonrpc: '2.0', id: 1, method: 'x' })).toBe(true);
    expect(isValidMCPRequest({ jsonrpc: '2.0', method: 'x' })).toBe(true);
  });

  it('rejects malformed envelopes', () => {
    expect(isValidMCPRequest(null)).toBe(false);
    expect(isValidMCPRequest([])).toBe(false);
    expect(isValidMCPRequest({ jsonrpc: '1.0', id: 1, method: 'x' })).toBe(false);
    expect(isValidMCPRequest({ jsonrpc: '2.0', id: 1 })).toBe(false);
    expect(isValidMCPRequest({ jsonrpc: '2.0', id: {}, method: 'x' })).toBe(false);
  });
});
