/**
 * Unit tests for MCPHandler
 */

import { MCPHandler } from '../../src/protocol/mcp-handler';
import { ToolRegistry } from '../../src/registry/tool-registry';
import { MCPRequest, MCPTool, MCPErrorCode } from '../../src/types/mcp';

describe('MCPHandler', () => {
  let handler: MCPHandler;
  let registry: ToolRegistry;
  let mockTool: MCPTool;

  beforeEach(() => {
    registry = new ToolRegistry();
    handler = new MCPHandler(registry);
    
    mockTool = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          param1: { type: 'string' }
        },
        required: ['param1']
      },
      execute: jest.fn().mockResolvedValue('test result')
    };
  });

  describe('handleRequest', () => {
    it('should handle valid requests', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      };

      const response = await handler.handleRequest(request);
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();
    });

    it('should return error for invalid request format', async () => {
      const invalidRequest = {
        jsonrpc: '1.0', // Invalid version
        id: 1,
        method: 'tools/list'
      } as any;

      const response = await handler.handleRequest(invalidRequest);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(MCPErrorCode.INVALID_PARAMS);
      expect(response.error!.message).toBe('Invalid request format');
    });

    it('should return error for missing jsonrpc', async () => {
      const invalidRequest = {
        id: 1,
        method: 'tools/list'
      } as any;

      const response = await handler.handleRequest(invalidRequest);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(MCPErrorCode.INVALID_PARAMS);
    });

    it('should handle missing id (notifications)', async () => {
      const notificationRequest = {
        jsonrpc: '2.0',
        method: 'tools/list'
      } as any;

      const response = await handler.handleRequest(notificationRequest);
      // Notifications without id should be handled successfully
      expect(response.result).toBeDefined();
      expect(response.id).toBe(undefined); // Notifications don't have id in response
    });

    it('should return error for missing method', async () => {
      const invalidRequest = {
        jsonrpc: '2.0',
        id: 1
      } as any;

      const response = await handler.handleRequest(invalidRequest);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(MCPErrorCode.INVALID_PARAMS);
    });

    it('should return error for unknown method', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'unknown/method'
      };

      const response = await handler.handleRequest(request);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(MCPErrorCode.METHOD_NOT_FOUND);
      expect(response.error!.message).toBe("Method 'unknown/method' not found");
    });

    it('should handle internal errors gracefully', async () => {
      // Mock registry to throw an error
      const mockRegistry = {
        getToolsList: jest.fn().mockImplementation(() => {
          throw new Error('Internal error');
        })
      } as any;
      
      const errorHandler = new MCPHandler(mockRegistry);
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      };

      const response = await errorHandler.handleRequest(request);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(MCPErrorCode.INTERNAL_ERROR);
    });
  });

  describe('tools/list method', () => {
    it('should return empty tools list when no tools registered', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      };

      const response = await handler.handleRequest(request);
      expect(response.result).toEqual({ tools: [] });
    });

    it('should return list of registered tools', async () => {
      registry.registerTool(mockTool);
      
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      };

      const response = await handler.handleRequest(request);
      expect(response.result).toEqual({
        tools: [{
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: mockTool.inputSchema
        }]
      });
    });
  });

  describe('tools/call method', () => {
    beforeEach(() => {
      registry.registerTool(mockTool);
    });

    it('should execute tool with valid parameters', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: { param1: 'test value' }
        }
      };

      const response = await handler.handleRequest(request);
      expect(response.result).toBeDefined();
      expect(response.result.content).toEqual([{
        type: 'text',
        text: 'test result'
      }]);
      expect(mockTool.execute).toHaveBeenCalledWith({ param1: 'test value' });
    });

    it('should handle object results by stringifying', async () => {
      const objectResult = { data: 'test', count: 42 };
      (mockTool.execute as jest.Mock).mockResolvedValue(objectResult);

      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: { param1: 'test value' }
        }
      };

      const response = await handler.handleRequest(request);
      expect(response.result.content[0].text).toBe(JSON.stringify(objectResult, null, 2));
    });

    it('should return error for missing parameters', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call'
      };

      const response = await handler.handleRequest(request);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(MCPErrorCode.INVALID_PARAMS);
      expect(response.error!.message).toBe('Tool call requires parameters object');
    });

    it('should return error for missing tool name', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          arguments: { param1: 'test value' }
        }
      };

      const response = await handler.handleRequest(request);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(MCPErrorCode.INVALID_PARAMS);
      expect(response.error!.message).toBe('Tool name is required and must be a string');
    });

    it('should return error for non-existent tool', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'non-existent-tool',
          arguments: { param1: 'test value' }
        }
      };

      const response = await handler.handleRequest(request);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(MCPErrorCode.METHOD_NOT_FOUND);
      expect(response.error!.message).toBe("Tool 'non-existent-tool' not found");
    });

    it('should return error for invalid parameters', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: { param1: 123 } // Should be string
        }
      };

      const response = await handler.handleRequest(request);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(MCPErrorCode.INVALID_PARAMS);
    });

    it('should return error for missing required parameters', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: {} // Missing required param1
        }
      };

      const response = await handler.handleRequest(request);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(MCPErrorCode.INVALID_PARAMS);
    });

    it('should handle tool execution errors', async () => {
      (mockTool.execute as jest.Mock).mockRejectedValue(new Error('Tool execution failed'));

      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: { param1: 'test value' }
        }
      };

      const response = await handler.handleRequest(request);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(MCPErrorCode.INTERNAL_ERROR);
      expect(response.error!.message).toBe('Tool execution failed');
    });

    it('should execute tool with empty arguments when none provided', async () => {
      const simpleTool: MCPTool = {
        name: 'simple-tool',
        description: 'Simple tool',
        inputSchema: { type: 'object' },
        execute: jest.fn().mockResolvedValue('simple result')
      };
      registry.registerTool(simpleTool);

      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'simple-tool'
        }
      };

      const response = await handler.handleRequest(request);
      expect(response.result).toBeDefined();
      expect(simpleTool.execute).toHaveBeenCalledWith({});
    });
  });
});