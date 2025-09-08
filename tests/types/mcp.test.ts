/**
 * Tests for MCP types and interfaces
 */

import { MCPRequest, MCPResponse, MCPError, MCPTool, MCPErrorCode } from '../../src/types/mcp';
import { JSONSchema7 } from 'json-schema';

describe('MCP Types', () => {
  describe('MCPRequest', () => {
    it('should have correct structure', () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'test_method',
        params: { test: 'value' }
      };

      expect(request.jsonrpc).toBe('2.0');
      expect(request.id).toBe(1);
      expect(request.method).toBe('test_method');
      expect(request.params).toEqual({ test: 'value' });
    });

    it('should work without params', () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-id',
        method: 'test_method'
      };

      expect(request.params).toBeUndefined();
    });
  });

  describe('MCPResponse', () => {
    it('should have correct structure for success response', () => {
      const response: MCPResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: { success: true }
      };

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toEqual({ success: true });
      expect(response.error).toBeUndefined();
    });

    it('should have correct structure for error response', () => {
      const error: MCPError = {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters'
      };

      const response: MCPResponse = {
        jsonrpc: '2.0',
        id: 1,
        error
      };

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.error).toEqual(error);
      expect(response.result).toBeUndefined();
    });
  });

  describe('MCPError', () => {
    it('should have correct structure', () => {
      const error: MCPError = {
        code: MCPErrorCode.INTERNAL_ERROR,
        message: 'Internal server error',
        data: { details: 'Additional error information' }
      };

      expect(error.code).toBe(MCPErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe('Internal server error');
      expect(error.data).toEqual({ details: 'Additional error information' });
    });

    it('should work without data', () => {
      const error: MCPError = {
        code: MCPErrorCode.METHOD_NOT_FOUND,
        message: 'Method not found'
      };

      expect(error.data).toBeUndefined();
    });
  });

  describe('MCPTool', () => {
    it('should have correct interface structure', () => {
      const schema: JSONSchema7 = {
        type: 'object',
        properties: {
          appId: { type: 'string' }
        },
        required: ['appId']
      };

      const tool: MCPTool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: schema,
        execute: async (_params: any) => {
          return { result: 'success' };
        }
      };

      expect(tool.name).toBe('test-tool');
      expect(tool.description).toBe('A test tool');
      expect(tool.inputSchema).toEqual(schema);
      expect(typeof tool.execute).toBe('function');
    });

    it('should execute and return result', async () => {
      const tool: MCPTool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: { type: 'object' },
        execute: async (params: any) => {
          return { input: params, processed: true };
        }
      };

      const result = await tool.execute({ test: 'data' });
      expect(result).toEqual({ input: { test: 'data' }, processed: true });
    });
  });

  describe('MCPErrorCode', () => {
    it('should have correct error codes', () => {
      expect(MCPErrorCode.PARSE_ERROR).toBe(-32700);
      expect(MCPErrorCode.INVALID_REQUEST).toBe(-32600);
      expect(MCPErrorCode.METHOD_NOT_FOUND).toBe(-32601);
      expect(MCPErrorCode.INVALID_PARAMS).toBe(-32602);
      expect(MCPErrorCode.INTERNAL_ERROR).toBe(-32603);
      expect(MCPErrorCode.SERVER_ERROR_START).toBe(-32099);
      expect(MCPErrorCode.SERVER_ERROR_END).toBe(-32000);
    });
  });
});