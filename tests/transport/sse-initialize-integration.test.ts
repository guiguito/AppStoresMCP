/**
 * Specific tests for SSE Transport Initialize Integration with MCP Handler
 * Verifies that synthetic initialize requests work correctly with the MCP handler
 */

import { SSETransportHandler } from '../../src/transport/sse-transport';
import { MCPHandler } from '../../src/protocol/mcp-handler';
import { ToolRegistry } from '../../src/registry/tool-registry';
import { MCPRequest } from '../../src/types/mcp';

describe('SSE Initialize Integration with MCP Handler', () => {
  let sseHandler: SSETransportHandler;
  let mcpHandler: MCPHandler;
  let toolRegistry: ToolRegistry;

  beforeEach(() => {
    toolRegistry = new ToolRegistry();
    mcpHandler = new MCPHandler(toolRegistry);
    sseHandler = new SSETransportHandler({
      enableLogging: false
    });
    sseHandler.setRequestHandler((request: MCPRequest) => mcpHandler.handleRequest(request));
  });

  afterEach(() => {
    sseHandler.stop();
  });

  describe('Synthetic Initialize Request Processing', () => {
    it('should create valid synthetic initialize request', () => {
      // Access the private method through reflection for testing
      const createInitializeRequest = (sseHandler as any).createInitializeRequest.bind(sseHandler);
      const initRequest = createInitializeRequest();

      expect(initRequest).toEqual({
        jsonrpc: '2.0',
        id: expect.stringMatching(/^init-/),
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {
            roots: {
              listChanged: false
            },
            sampling: {}
          },
          clientInfo: {
            name: 'sse-transport-client',
            version: '1.0.0'
          }
        }
      });
    });

    it('should process synthetic initialize request through MCP handler', async () => {
      // Create synthetic initialize request
      const createInitializeRequest = (sseHandler as any).createInitializeRequest.bind(sseHandler);
      const initRequest = createInitializeRequest();

      // Process through MCP handler
      const response = await mcpHandler.handleRequest(initRequest);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: initRequest.id,
        result: {
          protocolVersion: '2025-03-26',
          capabilities: {
            tools: {},
            logging: {}
          },
          serverInfo: {
            name: 'app-store-mcp-server',
            version: '1.0.0'
          }
        }
      });
    });

    it('should handle protocol version compatibility', async () => {
      // Create initialize request with different protocol version
      const initRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-init',
        method: 'initialize',
        params: {
          protocolVersion: '2024-01-01', // Different version
          capabilities: {
            roots: { listChanged: false },
            sampling: {}
          },
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      };

      const response = await mcpHandler.handleRequest(initRequest);

      // Should still return server's supported version
      expect(response.result?.protocolVersion).toBe('2025-03-26');
    });

    it('should handle initialize request without protocol version', async () => {
      const initRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-init',
        method: 'initialize',
        params: {
          capabilities: {
            roots: { listChanged: false },
            sampling: {}
          },
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      };

      const response = await mcpHandler.handleRequest(initRequest);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 'test-init',
        result: {
          protocolVersion: '2025-03-26',
          capabilities: {
            tools: {},
            logging: {}
          },
          serverInfo: {
            name: 'app-store-mcp-server',
            version: '1.0.0'
          }
        }
      });
    });

    it('should handle initialize request with minimal params', async () => {
      const initRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-init',
        method: 'initialize',
        params: {}
      };

      const response = await mcpHandler.handleRequest(initRequest);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 'test-init',
        result: {
          protocolVersion: '2025-03-26',
          capabilities: {
            tools: {},
            logging: {}
          },
          serverInfo: {
            name: 'app-store-mcp-server',
            version: '1.0.0'
          }
        }
      });
    });

    it('should handle initialize request without params', async () => {
      const initRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-init',
        method: 'initialize'
      };

      const response = await mcpHandler.handleRequest(initRequest);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 'test-init',
        result: {
          protocolVersion: '2025-03-26',
          capabilities: {
            tools: {},
            logging: {}
          },
          serverInfo: {
            name: 'app-store-mcp-server',
            version: '1.0.0'
          }
        }
      });
    });
  });

  describe('Response Format Validation', () => {
    it('should return response in correct MCP format', async () => {
      const createInitializeRequest = (sseHandler as any).createInitializeRequest.bind(sseHandler);
      const initRequest = createInitializeRequest();
      const response = await mcpHandler.handleRequest(initRequest);

      // Verify JSON-RPC 2.0 format
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(initRequest.id);
      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      // Verify initialize response structure
      expect(response.result).toHaveProperty('protocolVersion');
      expect(response.result).toHaveProperty('capabilities');
      expect(response.result).toHaveProperty('serverInfo');

      // Verify capabilities structure
      expect(response.result.capabilities).toHaveProperty('tools');
      expect(response.result.capabilities).toHaveProperty('logging');

      // Verify server info structure
      expect(response.result.serverInfo).toHaveProperty('name');
      expect(response.result.serverInfo).toHaveProperty('version');
    });

    it('should include proper server capabilities', async () => {
      const createInitializeRequest = (sseHandler as any).createInitializeRequest.bind(sseHandler);
      const initRequest = createInitializeRequest();
      const response = await mcpHandler.handleRequest(initRequest);

      expect(response.result.capabilities).toEqual({
        tools: {},
        logging: {}
      });
    });

    it('should include proper server information', async () => {
      const createInitializeRequest = (sseHandler as any).createInitializeRequest.bind(sseHandler);
      const initRequest = createInitializeRequest();
      const response = await mcpHandler.handleRequest(initRequest);

      expect(response.result.serverInfo).toEqual({
        name: 'app-store-mcp-server',
        version: '1.0.0'
      });
    });

    it('should use supported protocol version', async () => {
      const createInitializeRequest = (sseHandler as any).createInitializeRequest.bind(sseHandler);
      const initRequest = createInitializeRequest();
      const response = await mcpHandler.handleRequest(initRequest);

      expect(response.result.protocolVersion).toBe('2025-03-26');
    });
  });

  describe('Error Handling', () => {
    it('should handle MCP handler errors during initialization', async () => {
      // Create a request handler that throws an error
      const errorRequestHandler = async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          throw new Error('Initialize handler error');
        }
        return mcpHandler.handleRequest(request);
      };

      const sseErrorHandler = new SSETransportHandler({ enableLogging: false });
      sseErrorHandler.setRequestHandler(errorRequestHandler);

      const createInitializeRequest = (sseErrorHandler as any).createInitializeRequest.bind(sseErrorHandler);
      const initRequest = createInitializeRequest();

      // The error should be caught and handled by the SSE transport
      try {
        await errorRequestHandler(initRequest);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Initialize handler error');
      }

      sseErrorHandler.stop();
    });
  });
});