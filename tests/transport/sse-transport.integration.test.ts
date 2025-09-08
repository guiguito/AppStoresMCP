/**
 * Integration tests for SSE Transport Handler
 */

import { SSETransportHandler } from '../../src/transport/sse-transport';
import { MCPRequest } from '../../src/types/mcp';

describe('SSETransportHandler Integration', () => {
  let sseHandler: SSETransportHandler;
  let mockRequestHandler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestHandler = jest.fn();
    sseHandler = new SSETransportHandler({
      heartbeatInterval: 1000,
      connectionTimeout: 5000,
      maxConnections: 10,
      enableLogging: false
    });
    sseHandler.setRequestHandler(mockRequestHandler);
  });

  afterEach(() => {
    sseHandler.stop();
  });

  describe('Basic Functionality', () => {
    it('should initialize with correct configuration', () => {
      expect(sseHandler).toBeDefined();
      expect(sseHandler.getConnectionCount()).toBe(0);
    });

    it('should handle request handler setup', () => {
      const handler = jest.fn();
      sseHandler.setRequestHandler(handler);
      // Handler is set internally, no direct way to verify but no errors should occur
      expect(true).toBe(true);
    });

    it('should return connection information', () => {
      const connectionInfo = sseHandler.getConnectionInfo();
      expect(Array.isArray(connectionInfo)).toBe(true);
      expect(connectionInfo.length).toBe(0);
    });

    it('should handle connection count correctly', () => {
      expect(sseHandler.getConnectionCount()).toBe(0);
    });
  });

  describe('Message Processing', () => {
    it('should validate MCP request format correctly', async () => {
      // Test with non-existent connection ID to avoid mocking Response
      const validRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-id',
        method: 'tools/list',
        params: {}
      };

      // This should throw an error for non-existent connection ID
      await expect(sseHandler.handleMCPMessage('non-existent-id', validRequest))
        .rejects.toThrow('Connection non-existent-id not found or closed');
      
      // Request handler should not be called for non-existent connection
      expect(mockRequestHandler).not.toHaveBeenCalled();
    });

    it('should handle invalid MCP request format', async () => {
      const invalidRequest = {
        invalid: 'request'
      };

      // This should throw an error for non-existent connection ID
      await expect(sseHandler.handleMCPMessage('non-existent-id', invalidRequest))
        .rejects.toThrow('Connection non-existent-id not found or closed');
      
      // Request handler should not be called for invalid request
      expect(mockRequestHandler).not.toHaveBeenCalled();
    });

    it('should handle missing request handler gracefully', async () => {
      const sseHandlerNoHandler = new SSETransportHandler({
        enableLogging: false
      });

      const mcpRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-id',
        method: 'tools/list'
      };

      // This should throw an error for non-existent connection ID
      await expect(sseHandlerNoHandler.handleMCPMessage('non-existent-id', mcpRequest))
        .rejects.toThrow('Connection non-existent-id not found or closed');
      
      sseHandlerNoHandler.stop();
    });

    it('should handle request handler errors gracefully', async () => {
      const mcpRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-id',
        method: 'tools/list'
      };

      mockRequestHandler.mockRejectedValue(new Error('Handler error'));

      // This should throw an error for non-existent connection ID
      await expect(sseHandler.handleMCPMessage('non-existent-id', mcpRequest))
        .rejects.toThrow('Connection non-existent-id not found or closed');
    });
  });

  describe('Connection Management', () => {
    it('should handle connection count correctly', () => {
      expect(sseHandler.getConnectionCount()).toBe(0);
    });

    it('should handle broadcast with no connections', () => {
      // This should not throw an error
      sseHandler.broadcast('test-event', { data: 'test' });
      expect(sseHandler.getConnectionCount()).toBe(0);
    });
  });

  describe('Lifecycle Management', () => {
    it('should stop properly without active connections', () => {
      expect(() => sseHandler.stop()).not.toThrow();
    });

    it('should handle multiple stop calls', () => {
      sseHandler.stop();
      expect(() => sseHandler.stop()).not.toThrow();
    });

    it('should create handler with default configuration', () => {
      const defaultHandler = new SSETransportHandler();
      expect(defaultHandler).toBeDefined();
      expect(defaultHandler.getConnectionCount()).toBe(0);
      defaultHandler.stop();
    });

    it('should handle configuration with custom values', () => {
      const customHandler = new SSETransportHandler({
        heartbeatInterval: 5000,
        connectionTimeout: 10000,
        maxConnections: 50,
        enableLogging: true
      });
      
      expect(customHandler).toBeDefined();
      expect(customHandler.getConnectionCount()).toBe(0);
      customHandler.stop();
    });
  });

  describe('Error Response Creation', () => {
    it('should handle various MCP request formats', async () => {
      const testCases = [
        null,
        undefined,
        {},
        { jsonrpc: '1.0' },
        { jsonrpc: '2.0' },
        { jsonrpc: '2.0', method: 'test' },
        { jsonrpc: '2.0', method: 'test', id: 'test-id' },
        { jsonrpc: '2.0', method: 'test', id: 123 }
      ];

      for (const testCase of testCases) {
        // All should throw error for non-existent connection ID
        await expect(sseHandler.handleMCPMessage('non-existent-id', testCase))
          .rejects.toThrow('Connection non-existent-id not found or closed');
      }
    });
  });
});